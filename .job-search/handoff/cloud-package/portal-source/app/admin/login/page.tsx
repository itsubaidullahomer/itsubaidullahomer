import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PasswordSignInForm } from '@/components/jobs/login-form';
import { getPortalSession } from '@/lib/jobs/server';
import { emailOtpEnabled, ownerAuthFailures, type OwnerAuthFailure } from '@/lib/jobs/auth';
export const dynamic = 'force-dynamic';

type Notice = { title: string; body: string };

/** What each failure means and what to do about it. Reasons come from lib/jobs/auth.ts. */
const reasons: Record<OwnerAuthFailure, Notice> = {
  credentials: { title: 'Wrong password', body: 'Supabase rejected this password for the owner account. Check it and try again.' },
  email: { title: 'Not the owner email', body: 'This email is not the owner account. Use the address set as JOBS_ADMIN_EMAIL.' },
  unconfirmed: { title: 'Email not confirmed', body: 'The owner account exists but its email is not confirmed in Supabase Auth.' },
  'not-owner': { title: 'Password correct, owner settings mismatch', body: 'Supabase accepted the password, but the account does not match JOBS_ADMIN_USER_ID or JOBS_ADMIN_EMAIL on the server. Fix the values in Vercel and redeploy.' },
  'not-allowlisted': { title: 'Password correct, account not enabled', body: 'Supabase accepted the password, but the account has no enabled row in public.jobs_owners, or the table could not be read.' },
  'no-session': { title: 'Session not created', body: 'Supabase did not return a usable session for this sign-in. Try again; if it repeats, check the Supabase Auth logs.' },
  config: { title: 'Portal not configured', body: 'JOBS_ADMIN_USER_ID or JOBS_ADMIN_EMAIL is missing or invalid on the server. Set them in Vercel and redeploy.' },
  origin: { title: 'Request blocked', body: 'The sign-in did not come from this page (origin check). Reload the page and try again, without a proxy or extension rewriting requests.' },
  request: { title: 'Form not accepted', body: 'The form arrived with missing or extra fields. A browser extension may be adding fields; try a private window.' },
  service: { title: 'Sign-in service unavailable', body: 'Supabase could not be reached or returned an error. Try again in a minute.' },
};

function notice(error: string | undefined, reason: string | undefined, useCode: boolean): Notice | null {
  if (!error) return null;
  if (error === 'limited') return { title: 'Too many attempts', body: 'Wait a little before trying again.' };
  if (error === 'unavailable') return { title: 'Email codes are off', body: 'Sign in with your password.' };
  if (error === 'recovery') return { title: 'Setup link expired', body: 'This password setup link is invalid or has expired. Request a fresh owner setup link.' };
  if (error === 'session') return { title: 'Sign in again', body: 'Sign in again or open a fresh owner setup link to change your password.' };
  const known = ownerAuthFailures.find((value) => value === reason);
  // A rejected email code is not a wrong password; the code messages below fit it better.
  if (known && !(useCode && known === 'credentials')) return reasons[known];
  if (!useCode) return { title: 'Sign-in failed', body: 'Check your owner email and password.' };
  if (error === 'verify') return { title: 'Code not accepted', body: 'Check the latest code or request a new one.' };
  return { title: 'Code not sent', body: 'Check your owner email and try again shortly.' };
}

export default async function JobsLogin({ searchParams }: { searchParams: Promise<{ error?: string; reason?: string; sent?: string; method?: string }> }) {
  const [session, params] = await Promise.all([getPortalSession(), searchParams]);
  if (session.authenticated) redirect('/admin');
  const otpEnabled = emailOtpEnabled(process.env.JOBS_EMAIL_OTP_ENABLED);
  const useCode = otpEnabled && (params.method === 'code' || params.sent === '1');
  const sent = useCode && params.sent === '1';
  const message = notice(params.error, params.reason, useCode);
  const alerts = (
    <>
      {message && (
        <div className="jobs-login-alert" role="alert">
          <strong>{message.title}</strong>
          <span>{message.body}</span>
          {params.reason && <code>Reason: {params.reason}</code>}
        </div>
      )}
      {session.error && (
        <div className="jobs-login-alert" role="alert">
          <strong>Portal unavailable</strong>
          <span>{session.error}</span>
        </div>
      )}
    </>
  );
  return (
    <main className="jobs-login">
      <div className="jobs-login-card">
        <p className="jobs-eyebrow">UBAID / WORKSPACE</p>
        <h1>Your next chapter starts here.</h1>
        <p>A private home for opportunities, thoughtful applications, and every step forward.</p>
        {!session.configured ? (
          <div className="jobs-login-alert is-info" role="status">
            <strong>Private workspace setup</strong>
            <span>Sign-in becomes available after the Supabase project and owner account are connected (JOBS_ADMIN_USER_ID, JOBS_ADMIN_EMAIL and the Supabase URL and key).</span>
            {process.env.NODE_ENV === 'development' && <Link href="/admin/preview">Explore the clearly labeled demo</Link>}
          </div>
        ) : !useCode ? (
          <>
            <PasswordSignInForm>{alerts}</PasswordSignInForm>
            {otpEnabled && <Link href="/admin/login?method=code">Use an email code instead</Link>}
          </>
        ) : (
          <form action={sent ? '/admin/auth/verify' : '/admin/auth/request-code'} method="post">
            {alerts}
            {sent ? (
              <>
                <p role="status">Check your email for your sign-in code. Enter the latest six-digit code below.</p>
                <label htmlFor="code">Email code</label>
                <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus aria-describedby="code-help" />
                <small id="code-help">Codes expire and work only once.</small>
                <button type="submit">Sign in to workspace</button>
                <Link href="/admin/login?method=code">Request a new code</Link>
              </>
            ) : (
              <>
                <label htmlFor="email">Owner email</label>
                <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required />
                <button type="submit">Email me a sign-in code</button>
                <small>Wait at least a minute before requesting another code.</small>
              </>
            )}
            <Link href="/admin/login">Sign in with a password</Link>
          </form>
        )}
        <small>Owner access only. No public registration.</small>
      </div>
    </main>
  );
}
