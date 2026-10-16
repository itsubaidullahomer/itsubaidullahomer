import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { emailOtpEnabled, ownerAuthResponse, runOwnerAuth, runOwnerPasswordUpdate, runOwnerRecovery, type OwnerAuthDependencies, type OwnerAuthResult, type OwnerAuthStep } from './auth';
import { portalConfigured } from './server';

async function handleOwnerOperation(request: Request, operation: (dependencies: OwnerAuthDependencies) => Promise<OwnerAuthResult>): Promise<NextResponse> {
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const result = await operation({
    ownerId: process.env.JOBS_ADMIN_USER_ID,
    ownerEmail: process.env.JOBS_ADMIN_EMAIL,
    otpEnabled: emailOtpEnabled(process.env.JOBS_EMAIL_OTP_ENABLED),
    async createClient() {
      if (!portalConfigured()) throw new Error('Portal is not configured.');
      const store = await cookies();
      return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/' },
        cookies: {
          getAll: () => store.getAll(),
          // Password/OTP auth signs in before the allowlist check. Do not write to Next's cookie store:
          // it would merge those cookies into failure responses as well as successful ones.
          setAll(values) { for (const cookie of values) pending.set(cookie.name, cookie); },
        },
      });
    },
  });
  return ownerAuthResponse(request, result, pending.values());
}

export const handleOwnerAuth = (request: Request, step: OwnerAuthStep) => handleOwnerOperation(request, (dependencies) => runOwnerAuth(request, step, dependencies));
export const handleOwnerRecovery = (request: Request) => handleOwnerOperation(request, (dependencies) => runOwnerRecovery(request, dependencies));
export const handleOwnerPasswordUpdate = (request: Request) => handleOwnerOperation(request, (dependencies) => runOwnerPasswordUpdate(request, dependencies));
