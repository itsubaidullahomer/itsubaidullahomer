# Ubaidullah Omer — job-search handoff

Prepared 16 October 2026. This file is a checkpoint, not proof that live state is unchanged.

## First session: read and wait

1. Work in `/Users/ubaidullah/.codex/worktrees/d141/itsubaidullahomer`. This is the live portfolio/job-portal source, repository `itsubaidullahomer/itsubaidullahomer`, distinct from the older `ubaidullah` repository. Read `AGENTS.md` and inspect Git status. There are extensive uncommitted portal and unrelated avatar changes; preserve them.
2. Read the canonical files below and report a short readiness summary. In this initial session, perform read-only orientation only. Wait for the user to say **START TAKEOVER** before edits, account registration, emails, or applications. At takeover, establish that Codex is no longer sending applications; coordinate the existing `continue-ubaid-s-job-search` automation to avoid duplicate writers.
3. The `.job-search` directory and `output/pdf` are ignored local files. A Git pull alone does not include them. If this path is missing, report that exact missing dependency; do not recreate the project from an older checkout or invent application history. Connector/browser sessions may need connecting separately in Claude.

## Read these sources before work

- `docs/jobs/SETUP.md` and `docs/jobs/VERIFICATION.md`: deployment, authentication, security, verification and limitations.
- `.job-search/private/continuation-2026-10-16.json` and `latest-operational-counts.json`: historical operational checkpoint and receipts. Recheck live state when taking over.
- `.job-search/private/application-facts.json`: latest direct candidate answers, including production PostgreSQL experience.
- `.job-search/resumes/masters/facts.json`: candidate history, projects, evidence sources and résumé copy. More recent direct confirmations override older omissions, without expanding claims.
- `.job-search/private/latest-mailbox-reply-check.json` and `mailbox-access.json`: last relevant mail check and account routing. Treat connector identifiers as environment-specific.
- `.job-search/applications/`: application-specific answers, confirmations, hashes and receipts. Read the relevant employer folder before any retry/follow-up.
- `.job-search/resumes/tailored/`, `.job-search/resumes/masters/`, `output/pdf/`: immutable document versions and rendering assets.
- `.job-search/research/2026-10-16-next-remote-review/`: latest reviewed leads and unresolved gaps.
- `.job-search/handoff/platforms-30.md`: ranked source shortlist and registration priorities; this is not a list of created accounts.

## Current outcome and caveats

The owner API was checked on October 16: 91 job records, 12 strong technical fits, 78 unknown, one with gaps, seven applied. Latest checkpoint includes Niyyt and its tailored PDF. Read latest-operational-counts.json for exact receipt and document counts. The 91 records are not 91 verified matches. Recheck counts; never call the whole platform complete from a successful build alone.

First six applications: Codenzy (email), Dynamic Logix (employer form), Appkeeper (email to general company inbox after form failure), Allcancode (confirmed Google Form), Quirky Bit (email fallback to general inbox), TBox Solutionz (official careers email). Appkeeper and Quirky Bit have no hiring-team acknowledgement at the checkpoint. Quirky Bit's web form was NOT submitted; the user corrected an earlier mistaken success report. Allcancode's form had no résumé upload field; its PDF is a private prepared version, not an employer-uploaded attachment.

Niyyt was subsequently submitted through its official employer form after Australian hours, citizenship, employment and salary answers were confirmed. The page displayed Application Submitted; proof and exact PDF record are in .job-search/applications/niyyt-2026-10-16-v1/. No employment contract was accepted.

Review TBox on October 19; the other six on October 23, checking mail first. TBox's possible paid trial has not been accepted. Latest mailbox check found no relevant replies/bounces; this is a historical result, not a promise about current mail.

The live Kanban portal is `https://admin.itsubaidullahomer.com/admin`. It uses the approved existing Veydo Supabase project and isolated Vercel `opportunity-desk` deployment. Server-side Gmail OAuth/reply synchronization is not implemented; local connected Gmail capability is separate. Existing continuation automation depends on a running local runtime and is not an always-on hosted agent.

## Candidate and search rules

Target AI Product Engineer, Full-Stack Engineer and closely matching React/TypeScript/Node roles. Prioritize startups with recent funding and a need for an engineer who delivers across product, frontend, backend and AI integrations. Suggested research window: funding announced in the last six months; verify the date and amount from company/investor sources. Funding alone does not prove an opening, hiring budget or geographic eligibility.

Worldwide remote jobs must permit working from Pakistan. Pakistan on-site is allowed. Overseas on-site requires employer-advertised sponsorship or relocation support. Keep technical fit, location eligibility, missing evidence and personal priority separate. Use strong fit / some gaps / stretch / insufficient information, not invented hiring probabilities.

Latest search preference: roughly USD 50,000–60,000 annually for US startups, flexible and subordinate to fit. The approved numeric application answer remains **USD 50,000/year, negotiable**. No hard minimum was set. Lower salary does not establish lower competition; position demonstrated delivery and ownership.

Candidate previously confirmed immediate availability and has now confirmed flexibility to align with any employer time zone, including Australian and US business hours; this is not 24/7 on-call availability. Pakistani citizenship confirmed. Currently employed, with contract ending at the end of October 2026. Reported salary PKR 260,000; period not explicitly confirmed, so do not annualize. Advanced English. TypeScript and Next.js: four years each. React Native: three years. Docker and SQL: three-plus years. PostgreSQL production use is confirmed, but specific PostgreSQL tenure, tuning, migrations and RLS are not. Jest/React Testing Library, GraphQL, design-system/component-library maintenance, CSS Grid/Flexbox and code reviews are confirmed hands-on. Use canonical facts for exact employment dates; overlapping periods cannot be added together. There is no completed university degree. Use truthful evidence and omit a fabricated BS degree. Candidate-reported project metrics are not independently audited facts.

## Authorized execution after takeover

The user authorizes creating useful job-site profiles and submitting verified matching applications without repeated routine approval. Use **itsubaidullahomer@gmail.com** only. Check existing accounts first. Follow the active browser/tool rules for account creation, new passwords, CAPTCHA, contractual acceptance and assessments; hand off human-only steps. No paid subscriptions, trials with billing, infrastructure upgrades or new spending without user approval. Authentication secrets belong in existing secure session mechanisms, never in prompts, logs, Git or this handoff.

For each application:
1. Confirm the current official role, location eligibility and every mandatory requirement. Preserve the source URL, dated description, company website, funding evidence where available and public referral routes. Do not invent contact addresses or claim a referral relationship.
2. Check the live board, receipts and authorized mailbox Sent history for duplicates.
3. Tailor the résumé to the actual JD using supported facts. Render and visually inspect it. Save/upload a new immutable PDF version; verify its hash. Preserve both ATS and human-outreach master formats. The v3 masters predate the PostgreSQL confirmation; review before reuse.
4. Review required answers and special commitments. Pause for missing facts, CAPTCHA/user verification, human-authored responses, assessment rules or trial/contract commitments. Continue independent research while waiting.
5. Submit once through a permitted route. Record applied only after actual confirmation, including destination, timestamp, exact document version/hash, receipt URL/ID and activity. Distinguish email delivery from hiring-team acknowledgement and form submission.
6. Update the next action and follow-up date. Check only job-related mail in the authorized mailbox. Report meaningful matches, submissions, replies and required user actions; avoid repeating unchanged blockers.

## Portal operation and engineering

Use `node scripts/jobs-agent-client.mjs status` for a read-only summary. `ownerRequest` exported by this helper supports the workspace, documents, submissions and discover endpoints. It validates the owner and uses the existing private session; do not print or copy the session contents. On expiry, request owner sign-in and continue independent research. Read `lib/jobs/types.ts`, `domain.ts`, `validation.ts` and the relevant route before mutations.

Submission POST responses can include the entire workspace: persist only the needed receipt. Submission creation sets applied but does not clear stale nextAction. Workspace patches do not accept updatedAt. Editing role descriptions/URLs or linked profile evidence can invalidate requirement assessments; reassess after changes instead of silently restoring unverified matches.

Before code changes, follow AGENTS.md and read applicable installed Next.js docs under `node_modules/next/dist/docs/`. Verify actual browser → API → storage behavior and authentication, not only build output. Inspect the isolated deployment setup before release; do not deploy the dirty root containing unrelated avatar work. Preserve the portfolio theme and Kanban-first admin design. User requested the apple-design-skill from `https://github.com/dickwu/apple-design-skill`; read its actual instructions if doing design work.

## Immediate work order after START TAKEOVER

1. Confirm owner access and live counts; resolve any real portal failure before claiming completion.
2. Audit existing profiles; complete priority candidate profiles in the 30-source ledger, recording profile URLs and actual verification status. Use direct employer applications where a board needs no profile. Keep account credentials out of the ledger.
3. Research funded startups, check unreviewed leads and add genuinely qualified new opportunities. Complete company/referral/source records.
4. Tailor, verify and submit eligible applications; record proof. Quality and truthful eligibility take priority over an arbitrary application count.
5. Keep this handoff and private checkpoints current so another model can resume. Report counts separately for researched leads, vetted matches, completed profiles, prepared applications and confirmed submissions.
