# Private job workspace setup

The Opportunity Desk is live at [admin.itsubaidullahomer.com](https://admin.itsubaidullahomer.com). It runs in the isolated `opportunity-desk` Vercel Hobby project and uses the existing, owner-approved Veydo Supabase project (`xhzzmiicctlbtclfkflp`). The separate release preserves unrelated portfolio/avatar work.

This is an owner-only workspace for research, evidence review, tailored documents and application tracking. A technical fit label is separate from location eligibility, missing answers and permission to submit. A saved draft or approval is not an application receipt. See [VERIFICATION.md](VERIFICATION.md) for the dated production snapshot and remaining checks.

## Database and storage

Three tracked migrations are applied in Veydo:

| Migration | Purpose | Production status |
|---|---|---|
| `20261015112043_jobs_portal.sql` | Owner allowlist, profile, jobs, activity, agent runs and discovery guard | Applied |
| `20261015151329_jobs_documents.sql` | Document metadata and private `job-documents` bucket | Applied |
| `20261015155637_jobs_submissions.sql` | Immutable external-submission receipts tied to an exact tailored PDF | Applied; receipt-feature deployment/live checks pending |

Do not reapply these migrations blindly. Check migration history before changes. The applied migrations define eight application tables with RLS: six base workspace/authorization tables, document metadata and submission receipts. Owner-restricted policies also protect `storage.objects`. Authenticated grants and ownership policies are both required; authentication alone does not grant access to another owner's rows. The app uses a publishable key and does not require a service-role key.

For a new environment, provision and verify the owner through privileged Auth administration, disable public signups, and insert the owner's immutable Auth UUID into `public.jobs_owners`. Never allow the client to enroll itself. The UUID, configured email and enabled database allowlist row must all match. Disable access by setting `jobs_owners.enabled = false` and revoke sessions when appropriate.

## Environment and host

Configure these values privately in the deployment environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE
JOBS_ADMIN_USER_ID=REPLACE_WITH_OWNER_AUTH_UUID
JOBS_ADMIN_EMAIL=owner@example.com
JOBS_EMAIL_OTP_ENABLED=false
```

These are placeholders, not the production values. Do not commit passwords, recovery links, session material or privileged keys. Missing owner configuration fails closed.

The production domain is already attached to `opportunity-desk`. Keep Supabase's Site URL and allowed authentication redirects aligned with this HTTPS host; localhost entries are for development only. Host routing directs the admin subdomain into the private area, while API authorization is enforced independently. Private responses use `private, no-store`; `/admin` uses `Referrer-Policy: no-referrer` and is excluded from indexing. The fictional `/admin/preview` route is development-only and returns 404 in production.

## Owner password and recovery

The owner is provisioned and allowlisted, and public signup is disabled. **The owner still needs to enter a private password.** The configured password minimum is 12 characters; leaked-password protection and secure password change are enabled in the project settings. The in-app setup form and server validation require matching entries of 12–1024 characters. Configuration is not a completed password-login test.

Password sign-in is the default at `/admin/login`. An authorized recovery link can enter through `/admin/auth/confirm`; the server exchanges the recovery token, verifies the user UUID/email and enabled allowlist row, and redirects to `/admin/account/password` with the token removed from the URL. The owner then enters the password directly in that form. The app has no public recovery-email request endpoint. Obtain recovery access through the existing authorized administration process and deliver any link privately; never record it in these docs or logs.

Auth cookies are staged until owner authorization succeeds. Cookies are HTTP-only and secure in production. Password updates require an authenticated owner, same-origin POST and bounded matching fields. Secure password change may require a recent session; use fresh owner recovery access when needed rather than weakening the setting. After setup, verify normal password sign-in and sign-out on the deployed host. Do not mark password authentication verified until the owner completes that check.

Reference: [Supabase password security](https://supabase.com/docs/guides/auth/password-security). Supabase documents plan-dependent availability for leaked-password protection; the configured setting and its eventual password-validation behavior are distinct checks.

### Optional email codes

`JOBS_EMAIL_OTP_ENABLED` is disabled when omitted and enabled only by the exact value `true`. Keep it `false` for the current installation. Both OTP endpoints and the alternate login UI are disabled; password sign-in remains available.

Before enabling codes, confirm the existing owner's email delivery, use a template containing `{{ .Token }}`, preserve `shouldCreateUser: false`, and verify a complete send/verify/reuse-failure flow. Confirm current SMTP and Auth rate limits through [Supabase's email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) documentation. An account or a recovery link does not prove OTP delivery works. Do not add organization members or paid sending services merely to bypass delivery limits.

## Private documents

Two master PDFs and eight job-specific tailored PDFs are stored in the private `job-documents` bucket. Owner upload/download requests were exercised, and downloaded bytes matched the uploaded files. Documents are accessed through authenticated owner routes; they are not public portfolio assets. Private bucket downloads remain subject to [Storage access controls](https://supabase.com/docs/guides/storage/buckets/fundamentals).

The document module validates file signatures, MIME types, extensions and size. Current application limits are 3,800,000 bytes per file and 4,000,000 bytes for the multipart body. Master and tailored resumes must be PDFs; screenshots may be PNG, JPEG or WebP. Versions have immutable metadata and a SHA-256 digest. Uploading another version does not overwrite the prior file. Keep the exact tailored version attached to its opportunity before applying.

## Research, tailoring and scheduling

The live workspace currently contains 40 real leads: four have a strong **technical** fit assessment and 36 remain unknown. No applications have been submitted. Geography, visa support, required answers and candidate evidence remain separate checks. Source snapshots, public links, observed availability dates and original publication dates are retained so an old requisition is not presented as newly posted.

Built-in discovery reads public Remotive, Jobicy and Himalayas sources. Per-source caching, request timeouts and byte limits constrain access; unavailable sources can fail without discarding successful results. The database guard permits one discovery start per six hours, including failed starts. This is a refresh guard, not a server-side scheduler.

Code-assisted research, resume tailoring and local review tools are in use. A local Codex heartbeat is configured to run every six hours. **The desktop app and its execution environment must remain running and available.** This is not a Vercel cron or an always-on cloud worker. It does not remove the need for truthful answers, current eligibility checks, employer-specific restrictions or an exact saved resume version.

Dedicated server-side Gmail OAuth and inbox synchronization are not implemented. Sign-in to the correct mailbox is still pending, and live email sending/reply synchronization has not been verified. Manual email records remain manual. Do not label Gmail as connected or invent sent/replied events. New paid services require approval.

## Submission receipts — migration applied, deployment checks pending

The source includes receipt validation, and the submissions migration is now applied in Veydo. It binds an external application to a specific tailored PDF and digest; it does not itself send an email or submit an employer form. The second deployment carrying the receipt feature and its final live checks remain **pending**. Do not describe the complete receipt flow as verified until those checks succeed.

The intended workflow is: confirm eligibility and all required facts, save the exact tailored resume, complete only an authorized application, then record the real destination, timestamp and confirmation. An agent receipt requires the source-defined evidence, eligibility and authorization checks. Do not mark an opportunity submitted merely because its resume or draft exists.

## Verification after changes

1. Run the relevant jobs tests, typecheck and production build from the intended release. `npx tsx --test tests/jobs*.test.ts` selects jobs tests without unrelated avatar tests. Record actual output for that source revision instead of copying an old test total.
2. Verify anonymous access is denied, foreign-origin writes fail, disabled owners lose access, and private responses are not cached. Confirm the admin referrer policy on the deployed host.
3. Complete the pending owner password setup and verify real password login/sign-out. Keep OTP disabled unless its separate delivery test succeeds.
4. Exercise owner workspace persistence and private document upload/download. Compare file bytes or digests and verify unauthorized document access is denied.
5. Recheck RLS, grants, storage policies, revision/transaction assertions and Security Advisor after a migration. All three migrations are applied; submission receipt persistence still needs the pending feature deployment and dedicated live checks.
6. Verify any mailbox connection, heartbeat run and external submission separately. A build, a technical fit label or a local session does not establish those integrations.

Source boundaries are in `lib/jobs/auth.ts`, `lib/jobs/server.ts`, `lib/jobs/documents.ts`, `lib/jobs/discovery.ts`, `lib/jobs/submissions.ts`, the corresponding API routes, and tracked SQL migrations. Preserve unrelated working-tree changes when preparing another release.
