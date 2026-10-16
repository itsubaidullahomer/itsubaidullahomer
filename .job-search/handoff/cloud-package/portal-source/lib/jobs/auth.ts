import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { assertSameOrigin, isOwner, readLimitedText } from './validation';

export type OwnerAuthStep = 'password' | 'request' | 'verify';
export type OwnerAuthResult = 'sent' | 'authenticated' | 'password-error' | 'password-limited' | 'otp-disabled' | 'send-error' | 'verify-error' | 'send-limited' | 'verify-limited' | 'recovery-authenticated' | 'recovery-error' | 'owner-session-required' | 'password-updated' | 'password-update-error';
type AuthClient = Pick<SupabaseClient, 'auth' | 'from'>;
export type OwnerAuthDependencies = {
  ownerId?: string;
  ownerEmail?: string;
  otpEnabled?: boolean;
  createClient: () => Promise<AuthClient>;
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

export function ownerAuthResponse(request: Request, result: OwnerAuthResult, pending: Iterable<{ name: string; value: string; options: CookieOptions }>): NextResponse {
  const response = NextResponse.redirect(new URL(destinations[result], request.url), 303);
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

function configuredOwner(dependencies: OwnerAuthDependencies): boolean {
  return !!dependencies.ownerId && !!dependencies.ownerEmail && dependencies.ownerEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dependencies.ownerEmail);
}

async function verifiedOwner(client: AuthClient, dependencies: OwnerAuthDependencies): Promise<boolean> {
  if (!configuredOwner(dependencies)) return false;
  const current = await client.auth.getUser();
  if (current.error || !isOwner(current.data.user, dependencies.ownerId, dependencies.ownerEmail)) return false;
  const owner = await client.from('jobs_owners').select('user_id, enabled').eq('user_id', dependencies.ownerId!).eq('enabled', true).maybeSingle();
  return !owner.error && owner.data?.user_id === dependencies.ownerId && owner.data?.enabled === true;
}

// Fixed result values are safe to put in redirects; emails, codes and provider errors are not.
export async function runOwnerAuth(request: Request, step: OwnerAuthStep, dependencies: OwnerAuthDependencies): Promise<OwnerAuthResult> {
  const failure = step === 'password' ? 'password-error' : step === 'request' ? 'send-error' : 'verify-error';
  let client: AuthClient | undefined;
  let verified = false;
  let authorized = false;
  try {
    assertSameOrigin(request);
    if (step !== 'password' && dependencies.otpEnabled !== true) return 'otp-disabled';
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/x-www-form-urlencoded') return failure;
    const form = new URLSearchParams(await readLimitedText(request, step === 'password' ? 16_384 : 2048));
    const { ownerId, ownerEmail } = dependencies;
    if (!ownerId || !ownerEmail || ownerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return failure;

    if (step !== 'verify') {
      const email = form.get('email');
      if (form.getAll('email').length !== 1 || !email || email.length > 254 || email.trim().toLowerCase() !== ownerEmail.toLowerCase()) return failure;
    }

    if (step === 'request') {
      if (form.size !== 1) return failure;
      client = await dependencies.createClient();
      const { error } = await client.auth.signInWithOtp({ email: ownerEmail, options: { shouldCreateUser: false } });
      return error ? (rateLimited(error) ? 'send-limited' : failure) : 'sent';
    }

    const code = form.get('code');
    const password = form.get('password');
    if (step === 'password') {
      if (form.size !== 2 || form.getAll('password').length !== 1 || !password || password.length < 8 || password.length > 1024) return failure;
    } else if (form.size !== 1 || form.getAll('code').length !== 1 || !code || !/^[0-9]{6}$/.test(code)) return failure;
    client = await dependencies.createClient();
    const { data, error } = step === 'password'
      ? await client.auth.signInWithPassword({ email: ownerEmail, password: password! })
      : await client.auth.verifyOtp({ email: ownerEmail, token: code!, type: 'email' });
    verified = !!data.session;
    if (error) return rateLimited(error) ? (step === 'password' ? 'password-limited' : 'verify-limited') : failure;
    if (!verified || !isOwner(data.user, ownerId, ownerEmail)) return failure;
    if (!await verifiedOwner(client, dependencies)) return failure;
    authorized = true;
    return 'authenticated';
  } catch {
    return failure;
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
