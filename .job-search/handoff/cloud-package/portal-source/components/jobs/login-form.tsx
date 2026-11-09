'use client';

import { useEffect, useState } from 'react';

/** Password sign-in: a plain POST form, with a show-password toggle and a pending state. */
export function PasswordSignInForm({ children }: { children?: React.ReactNode }) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  // A page restored from the back/forward cache keeps its old state; let the owner try again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => { if (event.persisted) setPending(false); };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);
  return (
    <form action="/admin/auth/login" method="post" onSubmit={() => setPending(true)} aria-busy={pending}>
      {children}
      <label htmlFor="email">Owner email</label>
      <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required autoFocus />
      <label htmlFor="password">Password</label>
      <div className="jobs-login-password">
        <input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" minLength={8} maxLength={1024} required />
        <button type="button" className="jobs-login-reveal" onClick={() => setVisible((value) => !value)} aria-pressed={visible} aria-controls="password">
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <button type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in to workspace'}</button>
    </form>
  );
}
