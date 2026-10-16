# Opportunity Desk verification

Latest operational check: **16 October 2026, 06:21 PKT** (`2026-10-16T01:21:42.426Z`). The current-state section uses read-only owner APIs and saved application/document receipts. Deployment, database-policy and visual checks below are dated historical evidence unless explicitly refreshed; anonymous HTTP access was rechecked at `2026-10-16T00:16:46Z`. This documentation update made no deployment, database, Auth, application or email changes.

## Current operational snapshot

<!-- CURRENT_OPERATIONAL_SNAPSHOT: refresh this block from owner workspace/documents/submissions GETs after confirmed changes. -->

| Item | Verified state at the timestamp above |
|---|---|
| Workspace | **90 recorded job rows**: 11 strong technical fits (six also have confirmed eligibility), 78 needing evidence and one with known gaps; 76 discovered, eight drafting and six applied |
| Confirmed applications | **Six** recorded submissions: Codenzy and TBox Solutionz by Gmail, Dynamic Logix and Allcancode by employer forms, and Appkeeper/Quirky Bit by Gmail to published general contacts |
| Private PDFs | **21**: six master versions and 15 tailored versions; document listing reports no further page |
| Appkeeper | Gmail send and read-back confirmed for the general-contact fallback to `hello@appkeeper.ltd`; careers form failed. Hiring-team receipt or forwarding is not confirmed |
| Quirky Bit | Web form was not submitted after its CAPTCHA failure. A later email fallback with the exact tailored PDF was sent to published general contact `hello@quirkybit.io`; Gmail SENT read-back confirmed, hiring-team acknowledgement unconfirmed |
| Allcancode | Employer Google Form confirmed “Your response has been recorded” from the correct account. The user confirmed the React Native integer choice; the original 4.9 rating is retained privately. No résumé-upload field existed, so the PDF remains the prepared private application version |
| Gmail connector | Personal account identity `itsubaidullahomer@gmail.com` selected explicitly; reads and the Codenzy/Appkeeper/Quirky Bit/TBox send/read-back verified |
| Password | Owner reports the password is saved; a fresh normal password login and sign-out have not been independently checked |
| Server automation | Gmail OAuth/inbox synchronization is not implemented in the portal; the configured local Codex continuation is not an always-on server worker |
<!-- END_CURRENT_OPERATIONAL_SNAPSHOT -->

Counts can change while other authorized work runs. The increase from 50 to 90 rows is reconciled: one successful built-in discovery run added 40 feed leads. The completed audit found no demo rows or duplicate recorded URLs/company-title pairs. All 40 entered with unknown fit and eligibility. Five have since received individual source reviews; none of those five was cleared for application, and the remainder require review. No rows were deleted. Refresh this block and the matching SETUP snapshot together, using actual receipts for the confirmed-application count.

## Production capabilities and verification boundaries

| Area | Verified or recorded state | Remaining boundary |
|---|---|---|
| Hosting | Live owner APIs at [admin.itsubaidullahomer.com](https://admin.itsubaidullahomer.com); isolated `opportunity-desk` Vercel Hobby project recorded in the October 15 release | Deployment identity was not re-queried in this documentation pass; preserve release separation from unrelated avatar work |
| Database | Existing owner-approved Veydo project, `xhzzmiicctlbtclfkflp` | No new Supabase project is needed |
| Schema | Portal, documents and submissions migrations applied; eight application tables protected by RLS, with private Storage policies | Six actual submission receipts now exist; earlier rejection and isolated transaction checks remain historical evidence |
| Security | October 16 anonymous HTTP checks deny private access with no-store/noindex; current owner workspace/documents/submissions reads succeed | RLS, transaction/security assertions and Security Advisor results remain October 15 evidence; these deeper checks were not rerun |
| Owner account | Provisioned, allowlisted and usable through the existing owner session; owner reports password saved | Fresh password login/sign-out remains independently unchecked; a working session does not establish that flow |
| Workspace | Current counts are in the snapshot above | Technical fit does not establish eligibility or complete required answers |
| Applications | Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz submissions recorded with external confirmation | Appkeeper and Quirky Bit confirm sends to general company inboxes; no hiring-team receipt or employer reply is implied |
| Documents | 21 stored PDFs; original, v2 and v3 masters retained; latest v3 upload/download hashes checked | Preserve each exact application-version PDF and its digest; Allcancode's linked PDF was not uploaded to its employer form |
| Research/tailoring | Code-assisted research and tailoring completed; source/evidence reviews retained | Missing candidate facts and employer-specific conditions remain explicit |
| Scheduling | Local six-hour Codex heartbeat configured | Desktop/execution environment must be running; not an always-on server worker |
| Mailbox | Correct Personal connector identity and read/send behavior verified | Portal-managed Gmail OAuth and inbox/reply sync remain unimplemented; connector access is a separate capability |

## Auth and access evidence

Fresh anonymous HTTP checks at `2026-10-16T00:16:46.933Z` returned `/admin` 307 to `/admin/login`, `/admin/preview` 404, and workspace/documents/submissions APIs 401. All five responses carried no-store and noindex/nofollow protections. These checks are recorded in the ignored `.job-search/private/continuation-2026-10-16.json`; they did not exercise password login, sign-out, foreign-origin writes or database policies. The current owner API reads succeeded separately. The login page's 200 response below belongs to the earlier release check.

Historical production HTTP checks on the October 15 second deployment: anonymous `/admin` returned 307, `/admin/login` returned 200, and `/admin/preview` returned 404. Anonymous workspace, documents and submissions APIs each returned 401. These private responses carried no-store/noindex protections. The authenticated owner receipt endpoint returned 200 with an empty list at that earlier checkpoint; the current endpoint returns six receipts.

Verified-owner sessions were used for protected workspace and document operations. Anonymous access was rejected, and private data remained owner-restricted. Earlier local integration returned 200 for an owner workspace GET and 401 anonymously; disabled OTP redirected without setting new cookies, and a revoked refresh session was rejected. These session checks did not exercise the owner's password.

Current source has an owner-only recovery exchange at `/admin/auth/confirm` and an authenticated password setup page at `/admin/account/password`. Recovery validates the token type and bounded input, verifies the Auth user and enabled owner, then redirects without the token query. New password validation requires matching 12–1024-character values. Auth cookies are buffered until authorization succeeds. `/admin` has a `no-referrer` override in `next.config.ts`; private responses use no-store protections.

On October 16 the owner reported that the password was saved. Treat password entry as user-reported, not as an observed fresh password login/sign-out. The live owner session successfully read workspace, documents and submissions in this pass. Optional email-code sign-in remains disabled with `JOBS_EMAIL_OTP_ENABLED=false`; owner provisioning or the separate Gmail connector does not establish Auth OTP delivery.

## Database and document evidence

Applied migrations:

- `supabase/migrations/20261015112043_jobs_portal.sql`
- `supabase/migrations/20261015151329_jobs_documents.sql`
- `supabase/migrations/20261015155637_jobs_submissions.sql`

The first migration defines six workspace/authorization tables; the second adds document metadata and the private `job-documents` bucket; the third adds submission receipts. All eight application tables have RLS. Row policies and explicit authenticated grants are present. Storage read/write policies require the enabled owner and owner-scoped object paths. File replacement is not allowed; cleanup is limited to objects without immutable metadata references.

Private document checks covered owner upload/download and matching bytes. The source validates multipart limits, filename/path safety, declared MIME versus file signature, document kind and download headers. Public asset URLs are not used for these PDFs. The October 15 release stored ten PDFs: two masters and eight tailored versions. The current list contains 21 PDFs: six master versions (original, v2 and v3 ATS/outreach pairs) and 15 tailored versions. The v2 and latest v3 master upload receipts include matching downloaded SHA-256 digests. The Allcancode tailored PDF is stored as document `e73a3fd3-367d-4e40-880a-225db466021b`. Its employer form had no résumé-upload field; this PDF is the prepared private application version linked to the confirmed form receipt, not an employer-uploaded attachment. Latest master evidence is retained in `.job-search/resumes/masters/2026-10-16-v3/upload-receipts.json`.

Historical October 15 release: `supabase/migrations/20261015155637_jobs_submissions.sql` was successfully applied to Veydo. The second deployment was recorded READY (`dpl_DpyL74GvNK1mATTCGpuyDrWQP1JH`) on the admin domain. Authenticated receipt listing returned 200 with an empty list. An attempted receipt for a nonexistent job/document returned 404, and the complete workspace remained unchanged. At that release checkpoint, production database verification found 40 jobs, ten documents and zero receipts; RLS is enabled and Security Advisor returned no findings. Actual receipt creation was not performed at that checkpoint because no external application had yet been sent. This historical zero-receipt state is superseded by the confirmed submissions below. The atomic receipt write path was tested in isolated PostgreSQL using the dedicated security assertions.

## Confirmed external applications and Gmail access

The October 16 read-only submissions API returns six immutable receipts with no further page. Each corresponds to saved external confirmation and an exact private application-version PDF. The confirmation proves different things by channel: email sends for Codenzy/Appkeeper/Quirky Bit/TBox Solutionz, and successful employer-form acknowledgements for Dynamic Logix/Allcancode. Allcancode's form accepted answers and links without a résumé-upload field; its linked PDF was retained privately.

| Employer | External confirmation | Production receipt | Linked private resume SHA-256 |
|---|---|---|---|
| Codenzy | Email sent at `2026-10-15T23:13:42Z` from the verified Personal Gmail account to the employer HR inbox; sent message read back with `SENT` and the expected PDF attachment | `0261aa2a-c43a-4451-a1fa-65a246b9c6db` | `0abf77612bc5b5ded9a75d9952d8b1a638c13794b40f60d7cc69937e732f5d97` |
| Dynamic Logix | Employer form displayed its successful-application acknowledgement at `2026-10-15T23:34:55.952Z` | `d4e439bd-c0f5-4e36-a7bb-8ea5ceed658d` | `04c7aa94a3aa6c6fc3965a2d4a50f618bac904dcb634ccbd09753757f3c95ff1` |
| Appkeeper | Email sent at `2026-10-15T23:51:19Z` with Gmail `SENT` read-back verified, to published general contact `hello@appkeeper.ltd`, with the 88,236-byte tailored v2 PDF; hiring-team receipt is unconfirmed | `84036ccd-d913-4532-af57-77e02535be6c` | `fe8d2f13198a14bd8e560c7ce0b0ca5d13b260a301bd1a9dbd4f9bcd4a3fd4a0` |
| Allcancode | Google Form displayed “Your response has been recorded” at `2026-10-16T00:37:20.327Z` from `itsubaidullahomer@gmail.com`; answers and links were submitted, with no résumé-upload field | `0fa1b224-eccb-45f1-bda7-3cc2309b72a8` | `8bcdc943d720fc72a8ce391daf37d18bd8214bcce90e8e43045c133fd6757415` (prepared private PDF; not uploaded to employer) |
| Quirky Bit | Email sent at `2026-10-16T00:42:43Z`, with Gmail SENT read-back and the 88,348-byte tailored PDF attachment verified, to published general contact `hello@quirkybit.io`; web form failed and hiring-team acknowledgement is unconfirmed | `14812112-7a10-4ec5-bbe2-3dce226e9633` | `8fcba6ee0f7c945bc1d24585105e745992788a343df654d26ea263cf7b594b91` |
| TBox Solutionz | Official careers email sent at `2026-10-16T01:16:38Z`, Gmail SENT read-back and 88,527-byte tailored PDF attachment verified; later paid trial not accepted | `ca31ba7a-1594-453d-83b2-c213f802d7ad` | `fca2776a5ea23821827f5c2da6826e81b9f8bee8344a9be70a9b37c143ecc639` |

Appkeeper's careers form did not produce a confirmed submission. The subsequent email was an explicit fallback to a published general company contact, asking to be routed to hiring; it is not evidence that the hiring team received or reviewed the application. Quirky Bit used the same explicit email fallback after its CAPTCHA failure. Neither failed form should receive an employer-form receipt.

Private supporting files remain under `.job-search/applications/codenzy-react-2026-10-16/`, `.job-search/applications/dynamic-logix-2026-10-16/`, `.job-search/applications/appkeeper-2026-10-16/`, `.job-search/applications/allcancode-2026-10-16/` `.job-search/applications/quirkybit-2026-10-16/` and `.job-search/applications/tbox-fullstack-2026-10-16-v1/`; those ignored files contain the full confirmations and saved receipt records. Do not commit session material or detailed candidate answers.

The Gmail connector exposes multiple accounts. The Personal account was explicitly selected with its account selector, and `get_profile` verified `itsubaidullahomer@gmail.com` before sending. Read access and the Codenzy/Appkeeper/Quirky Bit/TBox send/read-back are verified; an employer response is not. The earlier continuation that found a different default mailbox is historical and did not authorize reading it.

The portal still has no dedicated server-side Gmail OAuth or inbox synchronization implementation. Connector reads/sends by the local agent do not establish background reply ingestion or mailbox access from the deployed server.

## Completed discovery-count audit

The audit completed at `2026-10-15T23:51:11Z` reconciles the 50-to-90 increase to one completed discovery run, `93a6382b-180c-4aca-94f0-4f169de46394`, started at `2026-10-15T23:45:32.837Z`. It added 40 feed records: 15 Himalayas, 21 Jobicy and four Remotive. No demo records, duplicate IDs, normalized recorded URLs or normalized company/title pairs were found across the 90 rows. The API does not expose the exact initiating caller.

At that discovery checkpoint, all 40 added records had unknown technical fit and Pakistan eligibility. The audit did not follow aggregator links to verify employer destinations, and the batch includes country-restricted and unpaid listings. Treat them as unreviewed feed leads until individually checked. Private audit evidence: `.job-search/research/2026-10-16-workspace-count-audit/audit.json`. Its historical two-application count preceded the Appkeeper email and is superseded by the current six-receipt snapshot.

The October 16 follow-up review covers Spotter, Painter Marketing Pros, Chasi, and Emetlab junior/senior. Spotter explicitly accepts Pakistan but needs Python/Django and Material UI evidence. Chasi has a degree gap in historical role evidence. Painter's matching opening is absent from current employer careers, and Emetlab's live site was unavailable. These records retain the source/availability distinctions; see private `.job-search/research/2026-10-16-next-remote-review/import-result.json`. TBox is a separate pre-existing lead; newly confirmed production PostgreSQL and existing GraphQL evidence cleared its published requirements before the recorded application.

## Tests and visual checks

The October 15 second release passed **79 jobs tests**, ESLint, the production build and TypeScript. Coverage includes authentication, security, domain actions, discovery, research, review, documents and submissions. This count belongs to the release verified here; record fresh output after subsequent changes.

Recorded database checks include anonymous/non-owner/disabled-owner denial, blocked self-enrollment and ownership reassignment, immutable audit behavior, atomic rollback, revision conflicts and persistent discovery cooldown. The document tests add MIME/signature mismatch, multipart size/cancellation, storage path and download-header cases.

The deployed receipt panel and the exact Agave tailored PDF display were confirmed in the UI. The portfolio-based theme was visually checked at desktop widths of 1280px and approximately 921px. Drag/drop and the Move to control succeeded. The initial 390px override was not honored by the inactive browser. On the October 16 heartbeat, an active-browser check measured an actual 390 × 844 CSS-pixel viewport: the board body was 375px wide, fit filtering returned four of 40 roles, and the job drawer filled exactly 390 × 844 without page overflow. The temporary override was reset afterward. The fictional preview is development-only and is unavailable in production.

## Remaining completion checks

Quirky Bit's web form remains unsubmitted following the CAPTCHA failure and the user's correction. Its later email fallback is now separately evidenced and counted; hiring-team acknowledgement remains unconfirmed. Allcancode's account access and integer-scale choice were resolved before its confirmed submission; the user explicitly selected 5 while preserving the original React Native self-rating of 4.9 privately. The AI opinion and numerical self-ratings remain application answers, not independent proficiency evidence or resume claims.

1. Independently check a fresh normal deployed password login and sign-out; the owner has already reported saving the password.
2. Continue recording only real authorized applications against the exact tailored PDF and external confirmation. Production receipt creation is now verified for Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz, with the general-contact boundary retained for Appkeeper and Quirky Bit and the no-résumé-upload boundary retained for Allcancode.
3. Implement and verify dedicated server Gmail OAuth/inbox synchronization before claiming server email integration; the separate Personal connector already has verified read/send access.
4. Resolve missing application facts and employer restrictions before submitting; retain the exact tailored PDF and real confirmation afterward.
5. Local heartbeat execution and the effective 390px mobile check were observed on October 16. These checks do not establish always-on server execution.

Operational setup and source references: [SETUP.md](SETUP.md). Private passwords, recovery/session material and detailed candidate application answers are intentionally absent from these documents.

## Historical first scheduled continuation — October 16, 2026

The six-hour continuation ran at 2026-10-15T22:00Z (October 16 in Pakistan). The existing owner session successfully loaded the live 40-job board. No new candidate answers or workspace edits were present since the previous release. Mailbox identity was checked without reading messages; the connected mailbox was not the authorized application account, so no inbox access or sending occurred. Previously reported human sign-in and missing-answer blockers were not re-requested. New research was captured privately before import.

This continuation added one deduplicated Laralink React frontend lead with evidence-backed technical fit and unknown Pakistan eligibility. Historical counts immediately after that import: 41 jobs, five technical strong fits, zero submissions. These are superseded by the current snapshot above. Other newly researched roles remained private research holds at that checkpoint. No production code or deployment changed during that continuation.
