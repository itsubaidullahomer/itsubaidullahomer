import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emailOtpEnabled, ownerAuthResponse, runOwnerAuth, runOwnerPasswordUpdate, runOwnerRecovery, type OwnerAuthStep } from '../lib/jobs/auth';

const ownerId = '57b60d72-c754-4e14-b740-06b174128c80';
const ownerEmail = 'owner@example.com';
const ownerUser = { id: ownerId, email: ownerEmail, is_anonymous: false };
const sessionCookie = { name: 'sb-test-auth-token', value: 'private-session', options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' } };
type FixtureOptions = {
  user?: typeof ownerUser | null;
  currentUser?: typeof ownerUser | null;
  owner?: { user_id: string; enabled: boolean } | null;
  authError?: { status: number; message: string };
  getUserError?: boolean;
  ownerError?: boolean;
  lookupThrows?: boolean;
  signOutThrows?: boolean;
  noSession?: boolean;
};

function request(fields: Record<string, string>, headers: Record<string, string> = {}): Request {
  return new Request('https://admin.example.com/admin/auth/login', {
    method: 'POST',
    headers: { origin: 'https://admin.example.com', 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields),
  });
}

function fixture(options: FixtureOptions = {}) {
  const calls: { method: string; args?: unknown }[] = [];
  const user = options.user === undefined ? ownerUser : options.user;
  const currentUser = options.currentUser === undefined ? user : options.currentUser;
  const owner = options.owner === undefined ? { user_id: ownerId, enabled: true } : options.owner;
  const query = {
    select(args: unknown) { calls.push({ method: 'select', args }); return query; },
    eq(...args: unknown[]) { calls.push({ method: 'eq', args }); return query; },
    async maybeSingle() {
      if (options.lookupThrows) throw new Error('private database error');
      return { data: owner, error: options.ownerError ? new Error('private database error') : null };
    },
  };
  const client = {
    auth: {
      async signInWithPassword(args: unknown) { calls.push({ method: 'password', args }); return { data: { user, session: options.noSession || options.authError ? null : { access_token: 'private-session' } }, error: options.authError ?? null }; },
      async signInWithOtp(args: unknown) { calls.push({ method: 'request', args }); return { error: options.authError ?? null }; },
      async verifyOtp(args: unknown) {
        calls.push({ method: 'verify', args });
        return { data: { user, session: options.noSession || options.authError ? null : { access_token: 'private-session' } }, error: options.authError ?? null };
      },
      async getUser() { calls.push({ method: 'getUser' }); return { data: { user: currentUser }, error: options.getUserError ? new Error('private provider error') : null }; },
      async updateUser(args: unknown) { calls.push({ method: 'updateUser', args }); return { data: { user }, error: options.authError ?? null }; },
      async signOut(args: unknown) { calls.push({ method: 'signOut', args }); if (options.signOutThrows) throw new Error('private provider error'); return { error: null }; },
    },
    from(args: unknown) { calls.push({ method: 'from', args }); return query; },
  } as unknown as SupabaseClient;
  const dependencies = { ownerId, ownerEmail, otpEnabled: true, async createClient() { calls.push({ method: 'createClient' }); return client; } };
  return { calls, dependencies };
}

test('requesting a code uses only the canonical owner email and never creates an account', async () => {
  const { calls, dependencies } = fixture();
  const input = request({ email: ' OWNER@EXAMPLE.COM ' });
  const result = await runOwnerAuth(input, 'request', dependencies);
  assert.equal(result, 'sent');
  assert.deepEqual(calls, [
    { method: 'createClient' },
    { method: 'request', args: { email: ownerEmail, options: { shouldCreateUser: false } } },
  ]);
  const response = ownerAuthResponse(input, result, []);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://admin.example.com/admin/login?method=code&sent=1');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

const recoveryHash = 'a'.repeat(56);
const recoveryRequest = (query = `token_hash=${recoveryHash}&type=recovery`) => new Request(`https://admin.example.com/admin/auth/confirm?${query}`);

test('recovery validates the actual owner session and allowlist with email OTP disabled, then strips the token', async () => {
  const { calls, dependencies } = fixture();
  const input = recoveryRequest();
  const result = await runOwnerRecovery(input, { ...dependencies, otpEnabled: false });
  assert.equal(result, 'recovery-authenticated');
  assert.deepEqual(calls, [
    { method: 'createClient' },
    { method: 'verify', args: { token_hash: recoveryHash, type: 'recovery' } },
    { method: 'getUser' },
    { method: 'from', args: 'jobs_owners' },
    { method: 'select', args: 'user_id, enabled' },
    { method: 'eq', args: ['user_id', ownerId] },
    { method: 'eq', args: ['enabled', true] },
  ]);
  const response = ownerAuthResponse(input, result, [sessionCookie]);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://admin.example.com/admin/account/password');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.cookies.get(sessionCookie.name)?.value, sessionCookie.value);
  assert.doesNotMatch(response.headers.get('location')!, /token_hash|recovery|aaaa/);
});

test('recovery rejects malformed tokens, duplicate parameters, alternate types and redirect injection before Auth', async () => {
  for (const query of [
    '', 'type=recovery', 'token_hash=short&type=recovery',
    `token_hash=${recoveryHash}&type=email`,
    `token_hash=${recoveryHash}&type=recovery&type=recovery`,
    `token_hash=${recoveryHash}&token_hash=${recoveryHash}&type=recovery`,
    `token_hash=${recoveryHash}&type=recovery&next=https://evil.example`,
    `token_hash=${'x'.repeat(600)}&type=recovery`,
    `token_hash=${'x'.repeat(5000)}&type=recovery`,
  ]) {
    const { calls, dependencies } = fixture();
    const input = recoveryRequest(query);
    const result = await runOwnerRecovery(input, dependencies);
    assert.equal(result, 'recovery-error');
    assert.deepEqual(calls, []);
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('location'), 'https://admin.example.com/admin/login?error=recovery');
  }
  const { calls, dependencies } = fixture();
  assert.equal(await runOwnerRecovery(new Request(recoveryRequest().url, { method: 'POST' }), dependencies), 'recovery-error');
  assert.equal(await runOwnerRecovery(recoveryRequest(), { ...dependencies, ownerId: '' }), 'recovery-error');
  assert.deepEqual(calls, []);
});

test('expired, sessionless or unauthorized recovery never commits new cookies, including cleanup failure', async () => {
  const scenarios: FixtureOptions[] = [
    { authError: { status: 403, message: `expired token ${recoveryHash}` } },
    { noSession: true },
    { user: { ...ownerUser, id: 'different-user' } },
    { user: { ...ownerUser, email: 'other@example.com' } },
    { user: { ...ownerUser, is_anonymous: true } },
    { currentUser: null },
    { currentUser: { ...ownerUser, id: 'different-user' } },
    { getUserError: true },
    { owner: null },
    { owner: { user_id: ownerId, enabled: false } },
    { ownerError: true },
    { lookupThrows: true },
    { owner: null, signOutThrows: true },
  ];
  for (const scenario of scenarios) {
    const { calls, dependencies } = fixture(scenario);
    const input = recoveryRequest();
    const result = await runOwnerRecovery(input, dependencies);
    assert.equal(result, 'recovery-error');
    if (!scenario.authError && !scenario.noSession) assert.deepEqual(calls.at(-1), { method: 'signOut', args: { scope: 'local' } });
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(await response.text(), '');
    assert.doesNotMatch(response.headers.get('location')!, /token_hash|aaaa|expired token/);
  }
});

test('only a freshly verified enabled owner can set a matching private password', async () => {
  const { calls, dependencies } = fixture();
  const password = '  a private passphrase  ';
  const input = request({ password, confirmPassword: password });
  const result = await runOwnerPasswordUpdate(input, { ...dependencies, otpEnabled: false });
  assert.equal(result, 'password-updated');
  assert.deepEqual(calls, [
    { method: 'createClient' },
    { method: 'getUser' },
    { method: 'from', args: 'jobs_owners' },
    { method: 'select', args: 'user_id, enabled' },
    { method: 'eq', args: ['user_id', ownerId] },
    { method: 'eq', args: ['enabled', true] },
    { method: 'updateUser', args: { password } },
  ]);
  const response = ownerAuthResponse(input, result, [sessionCookie]);
  assert.equal(response.headers.get('location'), 'https://admin.example.com/admin');
  assert.equal(response.cookies.get(sessionCookie.name)?.value, sessionCookie.value);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('password setup rejects cross-origin, mismatched, short, long, duplicate and oversized forms before Auth', async () => {
  const password = 'valid-private-password';
  const inputs = [
    request({ password, confirmPassword: password }, { origin: 'https://evil.example' }),
    request({ password, confirmPassword: password }, { origin: '' }),
    request({ password, confirmPassword: password }, { 'sec-fetch-site': 'cross-site' }),
    request({ password, confirmPassword: password }, { 'content-type': 'application/json' }),
    request({ password, confirmPassword: 'different-password' }),
    request({ password }),
    request({ password: 'short', confirmPassword: 'short' }),
    request({ password: 'x'.repeat(1025), confirmPassword: 'x'.repeat(1025) }),
    request({ password: 'x'.repeat(40_000), confirmPassword: 'x'.repeat(40_000) }),
    request({ password, confirmPassword: password, userId: 'forged' }),
    new Request('https://admin.example.com/admin/auth/password', { method: 'POST', headers: { origin: 'https://admin.example.com', 'content-type': 'application/x-www-form-urlencoded' }, body: `password=${password}&password=${password}&confirmPassword=${password}` }),
  ];
  for (const input of inputs) {
    const { calls, dependencies } = fixture();
    const result = await runOwnerPasswordUpdate(input, dependencies);
    assert.equal(result, 'password-update-error');
    assert.deepEqual(calls, []);
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.doesNotMatch(response.headers.get('location')!, /valid-private-password|forged/);
  }
});

test('password setup requires actual user validation and enabled database authorization before updateUser', async () => {
  for (const scenario of [
    { currentUser: null },
    { currentUser: { ...ownerUser, id: 'different-user' } },
    { currentUser: { ...ownerUser, email: 'other@example.com' } },
    { currentUser: { ...ownerUser, is_anonymous: true } },
    { getUserError: true },
    { owner: null },
    { owner: { user_id: ownerId, enabled: false } },
    { ownerError: true },
    { lookupThrows: true },
  ] satisfies FixtureOptions[]) {
    const { calls, dependencies } = fixture(scenario);
    const input = request({ password: 'valid-private-password', confirmPassword: 'valid-private-password' });
    const result = await runOwnerPasswordUpdate(input, dependencies);
    assert.notEqual(result, 'password-updated');
    assert.ok(!calls.some((call) => call.method === 'updateUser'));
    assert.equal(ownerAuthResponse(input, result, [sessionCookie]).headers.get('set-cookie'), null);
  }
});

test('a rejected password update or unexpected returned identity does not persist cookie changes', async () => {
  for (const options of [
    { authError: { status: 422, message: 'private password rejected' } },
    { user: { ...ownerUser, id: 'different-user' }, currentUser: ownerUser },
  ]) {
    const { dependencies } = fixture(options);
    const input = request({ password: 'valid-private-password', confirmPassword: 'valid-private-password' });
    const result = await runOwnerPasswordUpdate(input, dependencies);
    assert.equal(result, 'password-update-error');
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(await response.text(), '');
    assert.doesNotMatch(response.headers.get('location')!, /private password|different-user/);
  }
});

test('invalid owner, missing configuration, hostile origin, media type and oversized bodies never call Auth', async () => {
  const inputs = [
    request({ email: 'other@example.com' }),
    request({ email: '' }),
    request({ email: ownerEmail, next: 'https://evil.example' }),
    request({ email: ownerEmail }, { origin: 'https://evil.example' }),
    request({ email: ownerEmail }, { origin: '' }),
    request({ email: ownerEmail }, { 'sec-fetch-site': 'cross-site' }),
    request({ email: ownerEmail }, { 'content-type': 'application/json' }),
    request({ email: ownerEmail }, { 'content-type': 'application/x-www-form-urlencoded-invalid' }),
    request({ email: 'a'.repeat(2100) }),
  ];
  for (const input of inputs) {
    const { calls, dependencies } = fixture();
    assert.equal(await runOwnerAuth(input, 'request', dependencies), 'send-error');
    assert.deepEqual(calls, []);
  }
  for (const missing of [{ ownerId: '' }, { ownerEmail: '' }, { ownerEmail: 'invalid' }]) {
    const { calls, dependencies } = fixture();
    assert.equal(await runOwnerAuth(request({ email: ownerEmail }), 'request', { ...dependencies, ...missing }), 'send-error');
    assert.deepEqual(calls, []);
  }
});

test('verification rejects non-six-digit and duplicate codes before calling Auth', async () => {
  for (const code of ['', '12345', '1234567', '12345a', '１２３４５６', ' 123456']) {
    const { calls, dependencies } = fixture();
    assert.equal(await runOwnerAuth(request({ code }), 'verify', dependencies), 'verify-error');
    assert.deepEqual(calls, []);
  }
  for (const step of ['request', 'verify'] as const) {
    const key = step === 'request' ? 'email' : 'code';
    const value = step === 'request' ? ownerEmail : '123456';
    const { calls, dependencies } = fixture();
    const input = new Request('https://admin.example.com/admin/auth/login', { method: 'POST', headers: { origin: 'https://admin.example.com', 'content-type': 'application/x-www-form-urlencoded' }, body: `${key}=${value}&${key}=${value}` });
    assert.match(await runOwnerAuth(input, step, dependencies), /-error$/);
    assert.deepEqual(calls, []);
  }
});

test('a valid code signs in only after verified UUID/email and enabled database owner checks', async () => {
  const { calls, dependencies } = fixture();
  const input = request({ code: '012345' });
  const result = await runOwnerAuth(input, 'verify', dependencies);
  assert.equal(result, 'authenticated');
  assert.deepEqual(calls, [
    { method: 'createClient' },
    { method: 'verify', args: { email: ownerEmail, token: '012345', type: 'email' } },
    { method: 'getUser' },
    { method: 'from', args: 'jobs_owners' },
    { method: 'select', args: 'user_id, enabled' },
    { method: 'eq', args: ['user_id', ownerId] },
    { method: 'eq', args: ['enabled', true] },
  ]);
  const response = ownerAuthResponse(input, result, [sessionCookie]);
  assert.equal(response.headers.get('location'), 'https://admin.example.com/admin');
  assert.equal(response.cookies.get(sessionCookie.name)?.value, sessionCookie.value);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(response.headers.get('set-cookie')!, /Secure/);
  assert.match(response.headers.get('set-cookie')!, /SameSite=lax/);
});

test('valid passwords and codes for unauthorized users or failed allowlists never persist session cookies', async () => {
  const scenarios: FixtureOptions[] = [
    { user: { ...ownerUser, id: 'other-user' } },
    { user: { ...ownerUser, email: 'other@example.com' } },
    { user: { ...ownerUser, is_anonymous: true } },
    { user: null },
    { currentUser: { ...ownerUser, id: 'other-user' } },
    { currentUser: null },
    { getUserError: true },
    { owner: null },
    { owner: { user_id: ownerId, enabled: false } },
    { owner: { user_id: 'other-user', enabled: true } },
    { ownerError: true },
    { lookupThrows: true },
    { owner: null, signOutThrows: true },
  ];
  for (const step of ['password', 'verify'] as const) for (const scenario of scenarios) {
    const { calls, dependencies } = fixture(scenario);
    const input = request(step === 'password' ? { email: ownerEmail, password: 'test-password' } : { code: '123456' });
    const result = await runOwnerAuth(input, step, dependencies);
    assert.equal(result, step === 'password' ? 'password-error' : 'verify-error');
    assert.deepEqual(calls.at(-1), { method: 'signOut', args: { scope: 'local' } });
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('location'), step === 'password' ? 'https://admin.example.com/admin/login?error=signin' : 'https://admin.example.com/admin/login?method=code&sent=1&error=verify');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('email OTP is disabled unless the server setting is exactly true, for both endpoints', async () => {
  assert.equal(emailOtpEnabled('true'), true);
  for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes', ' true ']) {
    assert.equal(emailOtpEnabled(value), false);
    for (const step of ['request', 'verify'] as const) {
      const { calls, dependencies } = fixture();
      const input = request(step === 'request' ? { email: ownerEmail } : { code: '123456' });
      const result = await runOwnerAuth(input, step, { ...dependencies, otpEnabled: emailOtpEnabled(value) });
      assert.equal(result, 'otp-disabled');
      assert.deepEqual(calls, []);
      const response = ownerAuthResponse(input, result, [sessionCookie]);
      assert.equal(response.headers.get('location'), 'https://admin.example.com/admin/login?error=unavailable');
      assert.equal(response.headers.get('set-cookie'), null);
    }
  }
  const { calls, dependencies } = fixture();
  assert.equal(await runOwnerAuth(request({ email: ownerEmail }), 'request', { ...dependencies, otpEnabled: undefined }), 'otp-disabled');
  assert.deepEqual(calls, []);
});

test('password sign-in works with OTP disabled and preserves the submitted password exactly', async () => {
  const { calls, dependencies } = fixture();
  const password = '  test-password  ';
  const input = request({ email: 'OWNER@EXAMPLE.COM', password });
  const result = await runOwnerAuth(input, 'password', { ...dependencies, otpEnabled: false });
  assert.equal(result, 'authenticated');
  assert.deepEqual(calls, [
    { method: 'createClient' },
    { method: 'password', args: { email: ownerEmail, password } },
    { method: 'getUser' },
    { method: 'from', args: 'jobs_owners' },
    { method: 'select', args: 'user_id, enabled' },
    { method: 'eq', args: ['user_id', ownerId] },
    { method: 'eq', args: ['enabled', true] },
  ]);
  const response = ownerAuthResponse(input, result, [sessionCookie]);
  assert.equal(response.headers.get('location'), 'https://admin.example.com/admin');
  assert.equal(response.cookies.get(sessionCookie.name)?.value, sessionCookie.value);
});

test('invalid password forms and foreign origins never invoke Auth', async () => {
  const inputs = [
    request({ email: ownerEmail }),
    request({ email: ownerEmail, password: '' }),
    request({ email: ownerEmail, password: 'short' }),
    request({ email: ownerEmail, password: 'x'.repeat(1025) }),
    request({ email: ownerEmail, password: 'x'.repeat(20_000) }),
    request({ email: 'other@example.com', password: 'test-password' }),
    request({ email: ownerEmail, password: 'test-password', next: 'https://evil.example' }),
    request({ email: ownerEmail, password: 'test-password' }, { origin: 'https://evil.example' }),
    request({ email: ownerEmail, password: 'test-password' }, { origin: '' }),
    request({ email: ownerEmail, password: 'test-password' }, { 'content-type': 'application/json' }),
    new Request('https://admin.example.com/admin/auth/login', { method: 'POST', headers: { origin: 'https://admin.example.com', 'content-type': 'application/x-www-form-urlencoded' }, body: `email=${ownerEmail}&password=test-password&password=another-password` }),
  ];
  for (const input of inputs) {
    const { calls, dependencies } = fixture();
    assert.equal(await runOwnerAuth(input, 'password', dependencies), 'password-error');
    assert.deepEqual(calls, []);
  }
  for (const missing of [{ ownerId: '' }, { ownerEmail: '' }]) {
    const { calls, dependencies } = fixture();
    assert.equal(await runOwnerAuth(request({ email: ownerEmail, password: 'test-password' }), 'password', { ...dependencies, ...missing }), 'password-error');
    assert.deepEqual(calls, []);
  }
});

test('bad, sessionless and rate-limited password results return no cookies or credential details', async () => {
  for (const options of [{ noSession: true }, { authError: { status: 400, message: 'private credential failure' } }, { authError: { status: 429, message: 'private rate limit details' } }]) {
    const { dependencies } = fixture(options);
    const input = request({ email: ownerEmail, password: 'test-password' });
    const result = await runOwnerAuth(input, 'password', dependencies);
    assert.equal(result, options.authError?.status === 429 ? 'password-limited' : 'password-error');
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.doesNotMatch(response.headers.get('location')!, /test-password|owner@example|private/);
    assert.equal(await response.text(), '');
  }
});

test('expired, reused, sessionless and rate-limited code results cannot persist cookies or expose provider errors', async () => {
  const scenarios: { step: OwnerAuthStep; options: FixtureOptions; result: string }[] = [
    { step: 'verify', options: { authError: { status: 403, message: 'Code 123456 for owner@example.com is expired' } }, result: 'verify-error' },
    { step: 'verify', options: { noSession: true }, result: 'verify-error' },
    { step: 'verify', options: { authError: { status: 429, message: 'private rate limit details' } }, result: 'verify-limited' },
    { step: 'request', options: { authError: { status: 429, message: 'private rate limit details' } }, result: 'send-limited' },
    { step: 'request', options: { authError: { status: 422, message: 'Email address not authorized' } }, result: 'send-error' },
  ];
  for (const scenario of scenarios) {
    const { dependencies } = fixture(scenario.options);
    const input = request(scenario.step === 'request' ? { email: ownerEmail } : { code: '123456' });
    const result = await runOwnerAuth(input, scenario.step, dependencies);
    assert.equal(result, scenario.result);
    const response = ownerAuthResponse(input, result, [sessionCookie]);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.doesNotMatch(response.headers.get('location')!, /123456|owner@example|private/);
    assert.equal(await response.text(), '');
  }
});

test('failed sign-ins report a fixed reason without credentials, and the login redirect names it', async () => {
  const cases: { name: string; input: Request; options?: FixtureOptions; expected: string; overrides?: Record<string, string> }[] = [
    { name: 'foreign origin', input: request({ email: ownerEmail, password: 'test-password' }, { origin: 'https://evil.example' }), expected: 'origin' },
    { name: 'extra field', input: request({ email: ownerEmail, password: 'test-password', extension: 'x' }), expected: 'request' },
    { name: 'other email', input: request({ email: 'other@example.com', password: 'test-password' }), expected: 'email' },
    { name: 'missing owner id', input: request({ email: ownerEmail, password: 'test-password' }), expected: 'config', overrides: { ownerId: '' } },
    { name: 'wrong password', input: request({ email: ownerEmail, password: 'test-password' }), options: { authError: { status: 400, message: 'Invalid login credentials' } }, expected: 'credentials' },
    { name: 'provider outage', input: request({ email: ownerEmail, password: 'test-password' }), options: { authError: { status: 503, message: 'down' } }, expected: 'service' },
    { name: 'other user', input: request({ email: ownerEmail, password: 'test-password' }), options: { user: { ...ownerUser, id: 'other-user' } }, expected: 'not-owner' },
    { name: 'no allowlist row', input: request({ email: ownerEmail, password: 'test-password' }), options: { owner: null }, expected: 'not-allowlisted' },
    { name: 'lookup throws', input: request({ email: ownerEmail, password: 'test-password' }), options: { lookupThrows: true }, expected: 'service' },
  ];
  for (const { name, input, options, expected, overrides } of cases) {
    const { dependencies } = fixture(options);
    const reports: { reason: string; detail: Record<string, unknown> }[] = [];
    const result = await runOwnerAuth(input, 'password', { ...dependencies, ...overrides, report: (reason, detail) => reports.push({ reason, detail }) });
    assert.equal(result, 'password-error', name);
    assert.deepEqual(reports.map((report) => report.reason), [expected], name);
    assert.doesNotMatch(JSON.stringify(reports), /test-password|private-session/, name);
    const response = ownerAuthResponse(input, result, [sessionCookie], reports[0].reason as never);
    assert.equal(response.headers.get('location'), `https://admin.example.com/admin/login?error=signin&reason=${expected}`, name);
    assert.equal(response.headers.get('set-cookie'), null, name);
  }
  const { dependencies } = fixture();
  const reports: string[] = [];
  assert.equal(await runOwnerAuth(request({ email: ownerEmail, password: 'test-password' }), 'password', { ...dependencies, report: (reason) => reports.push(reason) }), 'authenticated');
  assert.deepEqual(reports, []);
});
