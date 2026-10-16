# Private job workspace setup

The Opportunity Desk is live at [admin.itsubaidullahomer.com](https://admin.itsubaidullahomer.com). It runs in the isolated `opportunity-desk` Vercel Hobby project and uses the existing, owner-approved Veydo Supabase project (`xhzzmiicctlbtclfkflp`). The separate release preserves unrelated portfolio/avatar work.

This is an owner-only workspace for research, evidence review, tailored documents and application tracking. A technical fit label is separate from location eligibility, missing answers and permission to submit. A saved draft or approval is not an application receipt. See [VERIFICATION.md](VERIFICATION.md) for the dated production snapshot and remaining checks.

## Current operational snapshot

<!-- CURRENT_OPERATIONAL_SNAPSHOT: refresh together with VERIFICATION.md after confirmed changes. -->

Read-only owner check: **16 October 2026, 06:21 PKT** (`2026-10-16T01:21:42.426Z`). The workspace returned **90 recorded job rows** (11 strong technical fits, six of them also eligible, 78 needing evidence and one with known gaps; 76 discovered, eight drafting and six applied). The submissions endpoint returned **six submission receipts**: Codenzy and TBox Solutionz by Gmail, Dynamic Logix and Allcancode by employer forms, and Appkeeper/Quirky Bit by Gmail to their published general company contacts. The document endpoint returned **21 PDFs** (six master versions and 15 tailored versions), with no further page. Appkeeper's send/read-back is confirmed, but the careers form failed and hiring-team receipt is not confirmed. Quirky Bit's web form failed CAPTCHA and was not submitted. Its later email fallback to `hello@quirkybit.io` at `2026-10-16T00:42:43Z` has verified Gmail SENT read-back and the exact PDF attachment; hiring-team receipt is not confirmed. Allcancode's Google Form confirmed “Your response has been recorded” from `itsubaidullahomer@gmail.com` at `2026-10-16T00:37:20.327Z`. The user explicitly confirmed 5 for the integer React Native scale, with the original 4.9 self-rating retained privately. The form had no résumé-upload field; its linked PDF is the prepared private application version. The two general-company-inbox fallbacks must not be represented as successful employer-form submissions.
<!-- END_CURRENT_OPERATIONAL_SNAPSHOT -->

These are timestamped operational counts, not configuration constants. The completed audit reconciled the 50-to-90 increase to one successful built-in discovery run: 40 feed leads, no demo rows, and no duplicate recorded URLs or company/title pairs. All 40 entered with unknown fit and eligibility. Five now have individual source reviews, without clearance for application; other feed leads still need review. No rows were deleted. Refresh both docs from the owner workspace, documents and submissions GETs. Count a new application only after its real external confirmation and exact PDF are retained. Detailed dated evidence is in [VERIFICATION.md](VERIFICATION.md).

## Database and storage

Three tracked migrations are applied in Veydo:

| Migration | Purpose | Production status |
|---|---|---|
| `20261015112043_jobs_portal.sql` | Owner allowlist, profile, jobs, activity, agent runs and discovery guard | Applied |
| `20261015151329_jobs_documents.sql` | Document metadata and private `job-documents` bucket | Applied |
| `20261015155637_jobs_submissions.sql` | Immutable external-submission receipts tied to an exact tailored PDF | Applied; real receipt creation verified for Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz |

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

The production domain is already attached to `opportunity-desk`. Keep Supabase's Site URL and allowed authentication redirects aligned with this HTTPS host; localhost entries are for development only. Host routing directs the admin subdomain into the private area, while API authorization is enforced independently. Private responses use `private, no-store`; `/admin` uses `Referrer-Policy: no-referrer` and is excluded from indexing. The fictional `/admin/preview` route is development-only and returns 404 in production. A fresh anonymous HTTP check at `2026-10-16T00:16:46Z` confirmed `/admin` redirects to `/admin/login`, preview returns 404, and workspace/documents/submissions APIs return 401; all checked responses carried no-store and noindex/nofollow. This does not replace fresh password login/sign-out or database-policy verification.

## Owner password and recovery

The owner is provisioned and allowlisted, and public signup is disabled. **The owner reports that the password is saved. A fresh normal password login and sign-out have not been independently checked.** The configured password minimum is 12 characters; leaked-password protection and secure password change are enabled in the project settings. The in-app setup form and server validation require matching entries of 12–1024 characters. Configuration is not a completed password-login test.

Password sign-in is the default at `/admin/login`. An authorized recovery link can enter through `/admin/auth/confirm`; the server exchanges the recovery token, verifies the user UUID/email and enabled allowlist row, and redirects to `/admin/account/password` with the token removed from the URL. The owner then enters the password directly in that form. The app has no public recovery-email request endpoint. Obtain recovery access through the existing authorized administration process and deliver any link privately; never record it in these docs or logs.

Auth cookies are staged until owner authorization succeeds. Cookies are HTTP-only and secure in production. Password updates require an authenticated owner, same-origin POST and bounded matching fields. Secure password change may require a recent session; use fresh owner recovery access when needed rather than weakening the setting. Verify a fresh normal password sign-in and sign-out on the deployed host; the existing authenticated session has been verified separately. Do not mark password authentication verified until the owner completes that check.

Reference: [Supabase password security](https://supabase.com/docs/guides/auth/password-security). Supabase documents plan-dependent availability for leaked-password protection; the configured setting and its eventual password-validation behavior are distinct checks.

### Optional email codes

`JOBS_EMAIL_OTP_ENABLED` is disabled when omitted and enabled only by the exact value `true`. Keep it `false` for the current installation. Both OTP endpoints and the alternate login UI are disabled; password sign-in remains available.

Before enabling codes, confirm the existing owner's email delivery, use a template containing `{{ .Token }}`, preserve `shouldCreateUser: false`, and verify a complete send/verify/reuse-failure flow. Confirm current SMTP and Auth rate limits through [Supabase's email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) documentation. An account or a recovery link does not prove OTP delivery works. Do not add organization members or paid sending services merely to bypass delivery limits.

## Private documents

The current private `job-documents` inventory contains 21 PDFs: six master versions and 14 job-specific tailored versions. Original and October 16 v2 masters are retained alongside the latest v3 ATS and outreach masters. Both v3 uploads have verified matching download hashes. The Allcancode tailored PDF is stored privately and linked to its confirmed employer-form receipt. Its form had no résumé-upload field, so the PDF was not sent to the employer. Owner upload/download requests were exercised, and downloaded bytes matched the uploaded files. Documents are accessed through authenticated owner routes; they are not public portfolio assets. Private bucket downloads remain subject to [Storage access controls](https://supabase.com/docs/guides/storage/buckets/fundamentals).

The document module validates file signatures, MIME types, extensions and size. Current application limits are 3,800,000 bytes per file and 4,000,000 bytes for the multipart body. Master and tailored resumes must be PDFs; screenshots may be PNG, JPEG or WebP. Versions have immutable metadata and a SHA-256 digest. Uploading another version does not overwrite the prior file. Keep the exact tailored version attached to its opportunity before applying.

## Research, tailoring and scheduling

The current workspace and confirmed-application counts are recorded in the timestamped snapshot above. Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz have recorded submissions with external confirmation. Appkeeper and Quirky Bit confirm general-contact email sends only, not hiring-team receipt. Other records remain research or drafting unless backed by their own real receipt. Geography, visa support, required answers and candidate evidence remain separate checks. Source snapshots, public links, observed availability dates and original publication dates are retained so an old requisition is not presented as newly posted.

Built-in discovery reads public Remotive, Jobicy and Himalayas sources. Per-source caching, request timeouts and byte limits constrain access; unavailable sources can fail without discarding successful results. The database guard permits one discovery start per six hours, including failed starts. This is a refresh guard, not a server-side scheduler.

Code-assisted research, resume tailoring and local review tools are in use. A local Codex heartbeat is configured to run every six hours. **The desktop app and its execution environment must remain running and available.** This is not a Vercel cron or an always-on cloud worker. It does not remove the need for truthful answers, current eligibility checks, employer-specific restrictions or an exact saved resume version.

The Personal Gmail connector is connected to the authorized `itsubaidullahomer@gmail.com` account. Its identity, read access and Codenzy/Appkeeper send/read-back are verified. Explicitly select that account and check identity before mailbox operations; a default or differently named connected account is not interchangeable. Dedicated server-side Gmail OAuth and inbox/reply synchronization remain unimplemented in the portal. Local connector access does not make the deployed app a background mailbox worker. Manual email records remain manual, and a send receipt does not imply an employer reply. New paid services require approval.

## Submission receipts

Receipt validation and the submissions migration are deployed. A receipt binds an external application to a specific tailored PDF and digest; it does not itself send an email or submit an employer form. At the October 15 release checkpoint, the empty receipt list and a nonexistent-job/document rejection were verified without changing the workspace; the atomic path was also tested in isolated PostgreSQL. On October 16, production receipt creation and listing were verified for Codenzy email, Dynamic Logix employer form, Appkeeper general-contact email and Allcancode employer-form applications. Each saved receipt includes the exact document identity and digest plus actual external confirmation. Allcancode's correct-account Google Form accepted application answers and links, without any résumé-upload field; its receipt links the prepared private PDF and does not claim it was uploaded to the employer. Appkeeper's failed careers form has no successful form receipt; the separate Gmail fallback went to the published `hello@appkeeper.ltd` general inbox, and hiring-team receipt/forwarding remains unconfirmed. Current receipt counts are in the snapshot above.

The intended workflow is: confirm eligibility and all required facts, save the exact tailored resume, complete only an authorized application, then record the real destination, timestamp and confirmation. An agent receipt requires the source-defined evidence, eligibility and authorization checks. Do not mark an opportunity submitted merely because its resume or draft exists.

## Verification after changes

1. Run the relevant jobs tests, typecheck and production build from the intended release. `npx tsx --test tests/jobs*.test.ts` selects jobs tests without unrelated avatar tests. Record actual output for that source revision instead of copying an old test total.
2. Anonymous access denial and no-store/noindex headers were refreshed on October 16 at `00:16:46Z`; repeat after relevant changes. Separately verify foreign-origin writes fail, disabled owners lose access, and the deployed admin referrer policy remains correct.
3. Verify a fresh real password login/sign-out. Password saving is already user-reported; existing owner-session access is separately verified. Keep OTP disabled unless its separate delivery test succeeds.
4. Exercise owner workspace persistence and private document upload/download. Compare file bytes or digests and verify unauthorized document access is denied.
5. Recheck RLS, grants, storage policies, revision/transaction assertions and Security Advisor after a migration. All three migrations are applied. Receipt read/rejection and actual creation checks passed in production. Record further receipts only after real authorized applications, without fabricating submission history.
6. Verify any mailbox connection, heartbeat run and external submission separately. A build, a technical fit label or a local session does not establish those integrations.

Source boundaries are in `lib/jobs/auth.ts`, `lib/jobs/server.ts`, `lib/jobs/documents.ts`, `lib/jobs/discovery.ts`, `lib/jobs/submissions.ts`, the corresponding API routes, and tracked SQL migrations. Preserve unrelated working-tree changes when preparing another release.
