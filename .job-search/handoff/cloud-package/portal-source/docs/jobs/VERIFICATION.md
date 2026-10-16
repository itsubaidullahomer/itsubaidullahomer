# Opportunity Desk verification

Snapshot: **15 October 2026**. This document combines the deployment/database checks recorded during this session with a review of the current source. The documentation update itself made no deployment, database, Auth or email changes. Counts describe this snapshot, not a permanent guarantee.

## Production state

| Area | Verified or recorded state | Remaining boundary |
|---|---|---|
| Hosting | Live at [admin.itsubaidullahomer.com](https://admin.itsubaidullahomer.com), isolated `opportunity-desk` Vercel Hobby project | Preserve the release separation from unrelated avatar work |
| Database | Existing owner-approved Veydo project, `xhzzmiicctlbtclfkflp` | No new Supabase project is needed |
| Schema | Portal, documents and submissions migrations applied; eight application tables protected by RLS, with private Storage policies | Second deployment of the receipt feature and final live checks pending |
| Security | Owner authorization and RLS verified; cloud transaction/security assertions passed; Security Advisor reported no findings | Recheck after subsequent schema or policy changes |
| Owner account | Provisioned, allowlisted, signup disabled; configured 12-character minimum, leaked-password protection and secure password change | Human password entry and ordinary deployed password-login verification remain pending |
| Workspace | 40 real leads: four strong technical fits, 36 unknown | Technical fit does not establish eligibility or complete required answers |
| Applications | Zero submitted | No invented receipt, sent email or reply status |
| Documents | Two master PDFs and eight tailored PDFs in private Storage; authenticated upload/download bytes checked | Preserve exact per-job versions when submitting |
| Research/tailoring | Code-assisted research and tailoring completed; source/evidence reviews retained | Missing candidate facts and employer-specific conditions remain explicit |
| Scheduling | Local six-hour Codex heartbeat configured | Desktop/execution environment must be running; not an always-on server worker |
| Mailbox | Correct-mailbox sign-in pending | Dedicated server Gmail OAuth/inbox sync is not implemented; live sending/reply sync unverified |

## Auth and access evidence

Verified-owner sessions were used for protected workspace and document operations. Anonymous access was rejected, and private data remained owner-restricted. Earlier local integration returned 200 for an owner workspace GET and 401 anonymously; disabled OTP redirected without setting new cookies, and a revoked refresh session was rejected. These session checks did not exercise the owner's password.

Current source has an owner-only recovery exchange at `/admin/auth/confirm` and an authenticated password setup page at `/admin/account/password`. Recovery validates the token type and bounded input, verifies the Auth user and enabled owner, then redirects without the token query. New password validation requires matching 12–1024-character values. Auth cookies are buffered until authorization succeeds. `/admin` has a `no-referrer` override in `next.config.ts`; private responses use no-store protections.

The human still needs to choose the password privately. Do not describe that action, a recovery-token handoff, or a real password login as completed. Optional email-code sign-in remains disabled with `JOBS_EMAIL_OTP_ENABLED=false`; email delivery has not been established by owner provisioning.

## Database and document evidence

Applied migrations:

- `supabase/migrations/20261015112043_jobs_portal.sql`
- `supabase/migrations/20261015151329_jobs_documents.sql`
- `supabase/migrations/20261015155637_jobs_submissions.sql`

The first migration defines six workspace/authorization tables; the second adds document metadata and the private `job-documents` bucket; the third adds submission receipts. All eight application tables have RLS. Row policies and explicit authenticated grants are present. Storage read/write policies require the enabled owner and owner-scoped object paths. File replacement is not allowed; cleanup is limited to objects without immutable metadata references.

Private document checks covered owner upload/download and matching bytes. The source validates multipart limits, filename/path safety, declared MIME versus file signature, document kind and download headers. Public asset URLs are not used for these PDFs. Ten PDFs are stored: two masters and eight tailored versions.

`supabase/migrations/20261015155637_jobs_submissions.sql` was successfully applied to Veydo during this documentation pass. The receipt feature's second deployment and final live checks are still **pending**. The applied table is not evidence that the deployed receipt route has passed end-to-end verification. Use `supabase/tests/jobs_submissions_security.sql` for its dedicated security assertions. No external applications were submitted to create test receipts.

## Tests and visual checks

The source contains jobs tests for authentication, security, domain actions, discovery, research, review, documents and submissions. Production build/typecheck and targeted jobs checks have been run during implementation. There is deliberately no inherited fixed test count here: record the result for the exact release revision when checks are rerun. Submission-specific source/tests do not prove the pending receipt-feature deployment has passed live checks.

Recorded database checks include anonymous/non-owner/disabled-owner denial, blocked self-enrollment and ownership reassignment, immutable audit behavior, atomic rollback, revision conflicts and persistent discovery cooldown. The document tests add MIME/signature mismatch, multipart size/cancellation, storage path and download-header cases.

The portfolio-based theme was visually checked at desktop widths of 1280px and approximately 921px. Drag/drop and the Move to control succeeded. A requested 390px viewport override was not honored by the browser, so that run does **not** verify mobile layout. The fictional preview is development-only and is unavailable in production.

## Remaining completion checks

1. Human password entry, followed by normal deployed password login and sign-out.
2. Complete the receipt-feature deployment, security assertions and live receipt-route verification without fabricating an external application.
3. Correct mailbox sign-in; implement and verify dedicated Gmail OAuth/synchronization before claiming server email integration.
4. Resolve missing application facts and employer restrictions before submitting; retain the exact tailored PDF and real confirmation afterward.
5. Observe an actual local heartbeat run with the desktop available, and repeat the mobile visual check using an effective viewport or device.

Operational setup and source references: [SETUP.md](SETUP.md). Private passwords, recovery/session material and detailed candidate application answers are intentionally absent from these documents.
