# Claude cloud handoff — read this first

Snapshot prepared 2026-10-16T05:58:43.422856+00:00. Private candidate/application information: keep out of a public repository.

## Read-only now

This ZIP replaces inaccessible Mac paths. Extract it in your current container. Read this file, `reference/CLAUDE-START-HERE.md`, `project-data/.job-search/private/application-facts.json`, `project-data/.job-search/private/latest-operational-counts.json`, and `live-snapshot/workspace.json`. Resolve historical `/Users/ubaidullah/...` paths against this bundle's `project-data/` tree, never against your container root. The source repository is `itsubaidullahomer/itsubaidullahomer`, not `ubaidullah`.

Acknowledge readiness and remain READ ONLY until the user says START TAKEOVER. Codex is still working; this snapshot will become stale. Before takeover establish that Codex has stopped submitting and obtain fresh live data or an updated bundle. Coordinate the existing `continue-ubaid-s-job-search` automation with the user so two agents never send the same application.

## Snapshot

- 91 job records, 7 confirmed applications, 22 private PDFs, 7 receipts.
- Applications: Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz, plus Niyyt.
- Quirky Bit's web form failed; its later email fallback was sent. Appkeeper and Quirky Bit general-inbox sends are not hiring-team acknowledgements.
- Niyyt employer form confirmed Application Submitted; exact PDF and receipt included.
- Current employment ends at the end of October; salary reported PKR260,000 with period unspecified; Pakistani citizen; schedule flexible to any time zone. No completed degree.
- Existing approved numeric salary expectation: USD50,000/year negotiable. USD50–60k is a search preference, not a required minimum.
- Portal https://admin.itsubaidullahomer.com/admin is deployed; connected Gmail agent access is separate from unimplemented server-side reply synchronization.

## Contents and authority

`live-snapshot/`: owner-authorized workspace, document metadata and submission receipts exported now. No cookies or tokens included.

`project-data/`: private facts, immutable application versions, answer/receipt files, résumé PDFs, renderer and focused research. Keep this private. Before using any older fact snapshot, prefer the latest direct candidate confirmation. Form screenshots may show personal application details.

`portal-source/`: isolated portal-release source snapshot, dependencies, migrations and assets, separate from the Mac's mixed uncommitted avatar work. This is a reference copy; compare with your existing GitHub checkout before making changes after takeover. No `.env`, Vercel login state, node_modules, build cache, session or database credential is included. Docs may contain historical counts; latest JSON snapshots take precedence. Baseline Mac Git HEAD: ea3d453aa20ea24a487722317525d9276b652266. This bundle is not a claim that those source changes were pushed.

`reference/`: workflow and ranked 30-platform shortlist. No new job-site accounts were created in the preparation batch. Recheck actual account status.

`MANIFEST.json`: SHA-256 inventory and export checks. Confirm ZIP integrity before use.

## Access after takeover

Authenticate Claude's own tools to itsubaidullahomer@gmail.com and the approved Supabase/Vercel resources. A connector in Codex does not authenticate Claude. The provided owner API helper expects a local owner session which is deliberately NOT exported; do not fabricate or borrow another account. If access is unavailable, continue independent research and prepared drafts, keeping live mutations pending. Do not make the portal public, weaken auth, share secrets in chat, or enable paid services.

After explicit START TAKEOVER, approved verified applications may be submitted without routine reapproval. Re-read the detailed workflow for missing facts, assessment requirements, CAPTCHA/human steps and special commitments. Tailor and visually verify every résumé, preserve immutable versions and record actual external confirmation. Deduplicate against current live board, receipts and Sent mail first.

## Portable résumé tooling

The exported master renderer uses bundled fonts and standard Courier instead of Mac-only paths. Install/use reportlab, pypdf and pdfplumber, plus a PDF renderer. Work inside `project-data` when running it. Existing employer-specific build scripts are provenance, not turnkey cloud commands: some retain historical absolute paths and fetch old pages. Prefer the portable master renderer with a fresh reviewed config. Never overwrite an already-submitted PDF. The already-rendered PDFs require no runtime to inspect.

## First response

Report that the bundle is readable, state the snapshot counts, list missing account access, and wait. Do not register accounts, apply, email, deploy, or edit live records until START TAKEOVER.
