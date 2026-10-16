import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/jobs/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Set your workspace password', referrer: 'no-referrer' };

export default async function OwnerPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, params] = await Promise.all([getPortalSession(), searchParams]);
  if (!session.authenticated) redirect('/admin/login');
  return (
    <main className="jobs-login">
      <div className="jobs-login-card">
        <p className="jobs-eyebrow">UBAID / WORKSPACE</p>
        <h1>Set your password.</h1>
        <p>Choose a private password for your owner account. You’ll use it to sign in to your workspace.</p>
        <form action="/admin/auth/password" method="post">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required aria-describedby="password-help" />
          <small id="password-help">Use at least 12 characters. A unique passphrase works well.</small>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required />
          <button type="submit">Save password and open workspace</button>
          {params.error && <p role="alert">Your password could not be saved. Check that both entries match and contain at least 12 characters, then try again.</p>}
        </form>
        <Link href="/admin">Back to workspace</Link>
      </div>
    </main>
  );
}
