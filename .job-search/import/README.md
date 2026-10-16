# Private workspace import preparation

Prepared locally on October 15, 2026. No cloud writes, applications, emails or employer messages have been performed by these scripts.

## Ready payload

`workspace-actions.json` is an ordered array of 40 public-API-compatible actions: one `update_profile`, then 39 `add_job` actions. Each action was passed through `parseAction`, `assertProfile` / `assertJob`, and `applyAction` against an empty local workspace. The largest action is 8,238 bytes, below the API's 150,000-byte request limit. Post one action at a time, not the whole array as a single request.

- `profile.json`: confirmed contact, practical experience, no completed degree, immediate availability, evidence and authorized preferences.
- `validated-workspace-preview.json`: exact locally simulated resulting workspace and audit activities.
- `import-report.json`: counts and validation result.
- `import-holds.json`: one URL-collision hold, the research corpus's 15 holds/adjacent leads, and 26 exclusion records. These are not application queue actions.
- `reviewed-requirements.json`: exact requirement texts reviewed when mapping candidate evidence. A changed requirement makes the build fail for re-review.
- `build-actions.ts`: deterministic selection and validation logic; performs no network requests.
- `supplemental-jobs.json`: three separately checked employer listings plus explicit exclusions.

## Counts

| Category | Count |
| --- | ---: |
| Importable opportunities | 39 |
| Strong fit | 0 |
| Some gaps | 0 |
| Needs evidence | 39 |
| Stretch | 0 |
| Individual requirements supported by candidate sources | 44 |
| Individual known gaps | 1 |
| Individual unknown requirements | 87 |
| Confirmed Pakistan work location | 13 |
| Eligibility requiring country, contract or relocation checks | 26 |
| Public contact records | 19 |
| Dated source snapshots | 65 |

The single known gap is a preferred degree at Symmetry Group. That job also has essential unknowns, so the domain correctly derives overall `unknown` rather than `gaps`. Every other role likewise has at least one unresolved essential requirement. No percentage, independently verified skill claim or application-ready assertion is invented.

## Profile policy

Application email is `itsubaidullahomer@gmail.com`, explicitly selected by the candidate. Immediate availability and no degree were directly confirmed. Employment dates match the supplied resume/current portfolio; overlapping employment periods are not added together. Candidate evidence remains `verified: false` because source consistency review is not independent employer or skill verification.

Preferences are remote priority, `remoteOnly: false`, Pakistan as base, overseas on-site sponsorship required, strong-fit-first ranking, no salary floor, and `approvalRequired: false`. The last value records the candidate's authorization for verified matches when every answer is known. It does not approve or submit these records. Every imported job remains `discovered`, with empty draft and no applied date.

## Source and eligibility decisions

The consolidated source is `docs/jobs/research/consolidated-2026-10-15.json`. Its per-job research audit is retained in job notes, including original publication dates versus current availability checks, contact provenance, limitations and application blockers.

TBox's mobile and full-stack vacancies share one careers-page URL. Both are genuine separate listings, but the current domain and database enforce normalized URL uniqueness. The full-stack opening is included; the mobile opening is retained as an import hold. No invented URL query or fragment was used to bypass that rule.

World-wide labels alone do not establish Pakistan-specific hiring/contract terms. Broad remote entries whose source audit flags country-contract uncertainty were downgraded to `eligibility: unknown`. Sponsored overseas listings remain unknown until the actual relocation/visa route is established. A Pakistani workplace does not confirm a particular office-attendance or relocation commitment; those remain in requirements/notes.

Tether/Holepunch explicitly prohibits AI-authored application answers. Its notes preserve that constraint: the candidate must personally author required answers. Do not generate answers or submit AI-authored answers for those roles.

Common unresolved facts include exact TypeScript/mobile/backend tenure, specialized PostgreSQL/GraphQL/Docker/Expo/Redux-Saga experience, employer-specific testing and design expectations, US-hour commitments, travel/relocation arrangements and country-contract terms. Independent research should resolve employer facts; candidate facts must come from truthful source evidence or the candidate.

## Rebuild and inspect

From the repository root:

```sh
npx tsx .job-search/import/build-actions.ts
```

The builder reads the final corpus, applies only explicit reviewed mappings, rejects duplicate normalized URLs, checks every evidence ID, and simulates the same domain logic used by the application. It writes only local private files. It does not call the live workspace or submit anything.

## Authenticated replay contract (not executed)

Use the existing owner session with `POST /api/jobs/workspace`, JSON `Content-Type`, a same-origin `Origin` header and normal authenticated cookies. Submit each action individually in order. There is no service key in this bundle.

Before replay, load the existing workspace and skip any already-present job by ID or normalized URL; do not overwrite existing drafts, approvals, application dates or activity history. The actions use `add_job`, so an accidental duplicate fails safely instead of replacing history. Stop on a failed action, inspect the error, and resume only the remaining actions after reconciliation. The profile update is explicit and should be applied once before jobs so their evidence references resolve.

Validate the resulting job count and classifications against `import-report.json`; save the live workspace response privately for an audit. This preparation does not authorize an employer application on its own.
