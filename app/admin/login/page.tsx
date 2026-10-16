import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/jobs/server';
import { emailOtpEnabled } from '@/lib/jobs/auth';
export const dynamic = 'force-dynamic';
export default async function JobsLogin({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; method?: string }> }) {
  const [session, params] = await Promise.all([getPortalSession(), searchParams]);
  if (session.authenticated) redirect('/admin');
  const otpEnabled = emailOtpEnabled(process.env.JOBS_EMAIL_OTP_ENABLED);
  const useCode = otpEnabled && (params.method === 'code' || params.sent === '1');
  const sent = useCode && params.sent === '1';
  const message = params.error === 'limited'
    ? 'Too many attempts. Wait a little before trying again.'
    : params.error === 'unavailable'
      ? 'Email codes are not available. Sign in with your password.'
      : params.error === 'recovery'
        ? 'This password setup link is invalid or has expired. Request a fresh owner setup link.'
        : params.error === 'session'
          ? 'Sign in again or open a fresh owner setup link to change your password.'
      : !useCode && params.error
        ? 'Sign-in was unsuccessful. Check your owner email and password.'
        : params.error === 'verify'
          ? 'That code could not sign you in. Check the latest code or request a new one.'
          : params.error ? 'A sign-in code could not be sent. Check your owner email and try again shortly.' : null;
  return (
    <main className="jobs-login">
      <div className="jobs-login-card">
        <p className="jobs-eyebrow">UBAID / WORKSPACE</p>
        <h1>Your next chapter starts here.</h1>
        <p>A private home for opportunities, thoughtful applications, and every step forward.</p>
        {!session.configured ? (
          <div role="status">
            <h2>Private workspace setup</h2>
            <p>Sign-in becomes available after the Supabase project and owner account are connected.</p>
            {process.env.NODE_ENV === 'development' && <Link href="/admin/preview">Explore the clearly labeled demo</Link>}
          </div>
        ) : (
          <form action={sent ? '/admin/auth/verify' : useCode ? '/admin/auth/request-code' : '/admin/auth/login'} method="post">
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
                {useCode ? (
                  <>
                    <button type="submit">Email me a sign-in code</button>
                    <small>Wait at least a minute before requesting another code.</small>
                  </>
                ) : (
                  <>
                    <label htmlFor="password">Password</label>
                    <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={1024} required />
                    <button type="submit">Sign in to workspace</button>
                  </>
                )}
              </>
            )}
            {message && <p role="alert">{message}</p>}
            {session.error && <p role="alert">{session.error}</p>}
            {otpEnabled && <Link href={useCode ? '/admin/login' : '/admin/login?method=code'}>{useCode ? 'Sign in with a password' : 'Use an email code instead'}</Link>}
          </form>
        )}
        <small>Owner access only. No public registration.</small>
      </div>
    </main>
  );
}
