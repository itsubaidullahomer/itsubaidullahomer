import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { assertSameOrigin, isOwner, readLimitedText } from './validation';

export type OwnerAuthStep = 'password' | 'request' | 'verify';
export type OwnerAuthResult = 'sent' | 'authenticated' | 'password-error' | 'password-limited' | 'otp-disabled' | 'send-error' | 'verify-error' | 'send-limited' | 'verify-limited' | 'recovery-authenticated' | 'recovery-error' | 'owner-session-required' | 'password-updated' | 'password-update-error';
/** Why a sign-in failed. A fixed vocabulary, so it is safe in redirects and logs. */
export type OwnerAuthFailure = 'origin' | 'request' | 'config' | 'email' | 'credentials' | 'unconfirmed' | 'no-session' | 'not-owner' | 'not-allowlisted' | 'service';
export const ownerAuthFailures: readonly OwnerAuthFailure[] = ['origin', 'request', 'config', 'email', 'credentials', 'unconfirmed', 'no-session', 'not-owner', 'not-allowlisted', 'service'];
/** Diagnostic detail for server logs only: field names, flags and provider codes, never passwords, codes or tokens. */
export type OwnerAuthDetail = Record<string, string | number | boolean | null | string[]>;
type AuthClient = Pick<SupabaseClient, 'auth' | 'from'>;
export type OwnerAuthDependencies = {
  ownerId?: string;
  ownerEmail?: string;
  otpEnabled?: boolean;
  createClient: () => Promise<AuthClient>;
  report?: (failure: OwnerAuthFailure, detail: OwnerAuthDetail) => void;
};

const destinations: Record<OwnerAuthResult, string> = {
  sent: '/admin/login?method=code&sent=1',
  authenticated: '/admin',
  'password-error': '/admin/login?error=signin',
  'password-limited': '/admin/login?error=limited',
  'otp-disabled': '/admin/login?error=unavailable',
  'send-error': '/admin/login?method=code&error=send',
  'verify-error': '/admin/login?method=code&sent=1&error=verify',
  'send-limited': '/admin/login?method=code&error=limited',
  'verify-limited': '/admin/login?method=code&sent=1&error=limited',
  'recovery-authenticated': '/admin/account/password',
  'recovery-error': '/admin/login?error=recovery',
  'owner-session-required': '/admin/login?error=session',
  'password-updated': '/admin',
  'password-update-error': '/admin/account/password?error=update',
};

export const emailOtpEnabled = (value?: string): boolean => value === 'true';

export function ownerAuthResponse(request: Request, result: OwnerAuthResult, pending: Iterable<{ name: string; value: string; options: CookieOptions }>, failure?: OwnerAuthFailure): NextResponse {
  const destination = new URL(destinations[result], request.url);
  if (failure && ownerAuthFailures.includes(failure) && destination.pathname === '/admin/login') destination.searchParams.set('reason', failure);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  response.headers.set('Referrer-Policy', 'no-referrer');
  if (result === 'sent' || result === 'authenticated' || result === 'recovery-authenticated' || result === 'password-updated') {
    for (const { name, value, options } of pending) response.cookies.set(name, value, options);
  }
  return response;
}

function rateLimited(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'status' in error && error.status === 429;
}

function providerDetail(error: unknown): OwnerAuthDetail {
  if (!error || typeof error !== 'object') return { error: String(error) };
  const value = error as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };
  return {
    name: typeof value.name === 'string' ? value.name : null,
    code: typeof value.code === 'string' ? value.code : null,
    status: typeof value.status === 'number' ? value.status : null,
    message: typeof value.message === 'string' ? value.message.slice(0, 200) : null,
  };
}

function configuredOwner(dependencies: OwnerAuthDependencies): boolean {
  return !!dependencies.ownerId && !!dependencies.ownerEmail && dependencies.ownerEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dependencies.ownerEmail);
}

function configDetail(dependencies: OwnerAuthDependencies): OwnerAuthDetail {
  return { ownerIdSet: !!dependencies.ownerId, ownerEmailSet: !!dependencies.ownerEmail, ownerEmailValid: configuredOwner(dependencies) };
}

/** Null when the signed-in user is the enabled owner; otherwise why not. */
async function ownerProblem(client: AuthClient, dependencies: OwnerAuthDependencies): Promise<[OwnerAuthFailure, OwnerAuthDetail] | null> {
  if (!configuredOwner(dependencies)) return ['config', configDetail(dependencies)];
  const current = await client.auth.getUser();
  if (current.error) return ['no-session', { stage: 'getUser', ...providerDetail(current.error) }];
  const user = current.data.user;
  if (!isOwner(user, dependencies.ownerId, dependencies.ownerEmail)) {
    return ['not-owner', { stage: 'getUser', userPresent: !!user, idMatches: user?.id === dependencies.ownerId, emailMatches: user?.email?.toLowerCase() === dependencies.ownerEmail?.toLowerCase(), anonymous: !!user?.is_anonymous }];
  }
  const owner = await client.from('jobs_owners').select('user_id, enabled').eq('user_id', dependencies.ownerId!).eq('enabled', true).maybeSingle();
  if (owner.error) return ['not-allowlisted', { stage: 'jobs_owners', ...providerDetail(owner.error) }];
  if (owner.data?.user_id !== dependencies.ownerId || owner.data?.enabled !== true) return ['not-allowlisted', { stage: 'jobs_owners', rowFound: !!owner.data }];
  return null;
}

async function verifiedOwner(client: AuthClient, dependencies: OwnerAuthDependencies): Promise<boolean> {
  return (await ownerProblem(client, dependencies)) === null;
}

// Fixed result values are safe to put in redirects; emails, codes and provider errors are not.
export async function runOwnerAuth(request: Request, step: OwnerAuthStep, dependencies: OwnerAuthDependencies): Promise<OwnerAuthResult> {
  const failure = step === 'password' ? 'password-error' : step === 'request' ? 'send-error' : 'verify-error';
  const fail = (reason: OwnerAuthFailure, detail: OwnerAuthDetail = {}, result: OwnerAuthResult = failure): OwnerAuthResult => {
    try { dependencies.report?.(reason, { step, ...detail }); } catch { /* Reporting must never change the outcome. */ }
    return result;
  };
  let client: AuthClient | undefined;
  let verified = false;
  let authorized = false;
  try {
    try { assertSameOrigin(request); } catch {
      let expected: string | null = null;
      try { expected = new URL(request.url).origin; } catch { /* Reported as null. */ }
      return fail('origin', { origin: request.headers.get('origin'), expected, fetchSite: request.headers.get('sec-fetch-site') });
    }
    if (step !== 'password' && dependencies.otpEnabled !== true) return 'otp-disabled';
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/x-www-form-urlencoded') return fail('request', { contentType: contentType ?? null });
    const form = new URLSearchParams(await readLimitedText(request, step === 'password' ? 16_384 : 2048));
    const fields = [...form.keys()];
    const { ownerId, ownerEmail } = dependencies;
    if (!ownerId || !ownerEmail || ownerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return fail('config', configDetail(dependencies));

    if (step !== 'verify') {
      const email = form.get('email');
      if (form.getAll('email').length !== 1 || !email || email.length > 254) return fail('request', { fields });
      if (email.trim().toLowerCase() !== ownerEmail.toLowerCase()) return fail('email');
    }

    if (step === 'request') {
      if (form.size !== 1) return fail('request', { fields });
      client = await dependencies.createClient();
      const { error } = await client.auth.signInWithOtp({ email: ownerEmail, options: { shouldCreateUser: false } });
      if (!error) return 'sent';
      return fail('service', providerDetail(error), rateLimited(error) ? 'send-limited' : failure);
    }

    const code = form.get('code');
    const password = form.get('password');
    if (step === 'password') {
      if (form.size !== 2 || form.getAll('password').length !== 1 || !password || password.length < 8 || password.length > 1024) return fail('request', { fields, passwordLength: password?.length ?? 0 });
    } else if (form.size !== 1 || form.getAll('code').length !== 1 || !code || !/^[0-9]{6}$/.test(code)) return fail('request', { fields });
    client = await dependencies.createClient();
    const { data, error } = step === 'password'
      ? await client.auth.signInWithPassword({ email: ownerEmail, password: password! })
      : await client.auth.verifyOtp({ email: ownerEmail, token: code!, type: 'email' });
    verified = !!data.session;
    if (error) {
      const detail = providerDetail(error);
      if (rateLimited(error)) return fail('service', detail, step === 'password' ? 'password-limited' : 'verify-limited');
      if (detail.code === 'email_not_confirmed') return fail('unconfirmed', detail);
      return fail(typeof detail.status === 'number' && detail.status >= 500 ? 'service' : 'credentials', detail);
    }
    if (!verified) return fail('no-session', { stage: 'signIn' });
    if (!isOwner(data.user, ownerId, ownerEmail)) {
      return fail('not-owner', { stage: 'signIn', userPresent: !!data.user, idMatches: data.user?.id === ownerId, emailMatches: data.user?.email?.toLowerCase() === ownerEmail.toLowerCase(), anonymous: !!data.user?.is_anonymous });
    }
    const problem = await ownerProblem(client, dependencies);
    if (problem) return fail(problem[0], problem[1]);
    authorized = true;
    return 'authenticated';
  } catch (error) {
    return fail('service', providerDetail(error));
  } finally {
    if (client && verified && !authorized) {
      // Revoke the new session when possible; the route also discards its buffered cookies.
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* Never expose a rejected session. */ }
    }
  }
}

/** Exchange only a Supabase recovery hash; no email sending or privileged key is involved. */
export async function runOwnerRecovery(request: Request, dependencies: OwnerAuthDependencies): Promise<OwnerAuthResult> {
  let client: AuthClient | undefined;
  let verified = false;
  let authorized = false;
  try {
    if (request.method !== 'GET' || request.url.length > 4096 || !configuredOwner(dependencies)) return 'recovery-error';
    const params = new URL(request.url).searchParams;
    const tokenHash = params.get('token_hash');
    if (params.size !== 2 || params.getAll('token_hash').length !== 1 || params.getAll('type').length !== 1 || params.get('type') !== 'recovery' || !tokenHash || !/^[a-zA-Z0-9_-]{20,512}$/.test(tokenHash)) return 'recovery-error';
    client = await dependencies.createClient();
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    verified = !!data.session;
    if (error || !verified || !isOwner(data.user, dependencies.ownerId, dependencies.ownerEmail) || !await verifiedOwner(client, dependencies)) return 'recovery-error';
    authorized = true;
    return 'recovery-authenticated';
  } catch {
    return 'recovery-error';
  } finally {
    if (client && verified && !authorized) {
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* Buffered cookies are always discarded. */ }
    }
  }
}

export async function runOwnerPasswordUpdate(request: Request, dependencies: OwnerAuthDependencies): Promise<OwnerAuthResult> {
  try {
    assertSameOrigin(request);
    if (request.method !== 'POST' || !configuredOwner(dependencies)) return 'owner-session-required';
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return 'password-update-error';
    const form = new URLSearchParams(await readLimitedText(request, 32_768));
    const password = form.get('password');
    const confirmation = form.get('confirmPassword');
    if (form.size !== 2 || form.getAll('password').length !== 1 || form.getAll('confirmPassword').length !== 1 || !password || password.length < 12 || password.length > 1024 || password !== confirmation) return 'password-update-error';
    const client = await dependencies.createClient();
    if (!await verifiedOwner(client, dependencies)) return 'owner-session-required';
    const { data, error } = await client.auth.updateUser({ password });
    if (error || !isOwner(data.user, dependencies.ownerId, dependencies.ownerEmail)) return 'password-update-error';
    return 'password-updated';
  } catch {
    return 'password-update-error';
  }
}
