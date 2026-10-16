# Pakistan additions — 16 October 2026

Prepared four new, reviewable `add_job` actions. Two have supported essential technical requirements; two retain essential evidence questions. No application, email, upload, cloud mutation or UI action was performed.

Recorded at 2026-10-15T23:23:10Z (16 October in Pakistan). Live workspace GET initially contained 41 jobs; a final GET contained 42. The four additions passed the real domain/validation functions against that final snapshot, with no duplicate URL, ID or source ID and no invented evidence IDs. Local simulation produced 46 jobs. See `validation-report.json`.

## Selected roles

| Employer and vacancy | Work arrangement | Fit | Main evidence question |
| --- | --- | --- | --- |
| [Quirky Bit — Frontend Developer (React)](https://www.quirkybit.io/careers/apply?id=frontend-developer-react) | Lahore, onsite | Strong technical match | Lahore attendance logistics; optional WCAG/WebGL |
| [Dynamic Logix — Senior Frontend Developer](https://dynamiclogix.com/careers) | Sahiwal, onsite | Strong technical match | Salary period, schedule and attendance logistics |
| [BearPlex — Senior Full-Stack Engineer](https://www.bearplex.com/careers/senior-full-stack-engineer) | Remote Pakistan or Lahore hybrid | Needs evidence | PostgreSQL operations, background jobs, observability |
| [AFNEXIS — Full Stack Developer](https://afnexis.com/career) | Remote / Multan | Needs evidence | PostgreSQL and AWS/Azure/GCP |

The employer pages currently list these roles. None of these published descriptions stipulates a degree. This confirms the text available now, not a guarantee about later screening. BearPlex's selected vacancy is separate from the existing MERN Stack Developer record. Fit is a requirement assessment, not an offer probability. Pakistan location eligibility is distinct from accepting a particular commute or employment arrangement.

Individual requirements, candidate evidence IDs, missing facts, concise job descriptions, source URLs, capture dates and public contacts are in `findings.json` and the import actions. Candidate claims come from the canonical resume facts and direct confirmations; they are not independent employment or skills verification.

## Application routes and contacts

**Quirky Bit:** use the [job application page](https://www.quirkybit.io/careers/apply?id=frontend-developer-react). Required fields are name, email, cover letter, resume and consent to application-data processing; phone and LinkedIn are optional. Resume limit is 5 MB. The label specifies PDF although the public input accepts PDF/DOC/DOCX. The form and complete role data were inspected in publicly served JavaScript, without submitting anything. [Employer listing](https://www.quirkybit.io/careers), [employer LinkedIn vacancy](https://pk.linkedin.com/jobs/view/frontend-developer-react-at-quirky-bit-4459117752).

The [company LinkedIn page](https://www.linkedin.com/company/quirky-bit) lists Rabia Asad and links [her public profile](https://pk.linkedin.com/in/rabia-asad333). This is a possible introduction route; her exact current title and willingness to refer were not established. The profile fetch returned HTTP 999. General company email `hello@quirkybit.io` is not presented as a recruiting inbox.

**Dynamic Logix:** the [career form](https://dynamiclogix.com/careers) requires name, email, mobile, selected role, resume and a cover letter of at most 500 characters. Current fetched HTML limits PDF/DOCX files to 1 MB; an older web snapshot says 10 MB, so the conservative operational limit is 1 MB. The listed amount is Rs.80,000–120,000 with no period shown. Its [About page](https://dynamiclogix.com/about) names Muhammad Jabbar as founder/CEO and publishes `hr@dynamiclogix.com`. This supports an HR routing request; the vacancy itself directs applicants to the form. The [company LinkedIn page](https://pk.linkedin.com/company/dynamic-logix) corroborates the company and staff association.

**BearPlex:** the [role page](https://www.bearplex.com/careers/senior-full-stack-engineer) starts with PDF upload, up to 10 MB, and offers manual entry. Later questionnaire fields were not inspected; no resume was uploaded or parsed. Public web retrieval exposed the vacancy and [open-role index](https://www.bearplex.com/careers); direct shell retrieval returned 403. The [official founder profile](https://www.bearplex.com/authors/hamad-pervaiz) identifies Hamad Pervaiz. His [public LinkedIn profile](https://www.linkedin.com/in/hamadpervaiz) is a possible approved introduction route; no personal relationship or referral promise is assumed.

**AFNEXIS:** use the recruitment form on the [careers page](https://afnexis.com/career), under “Apply to join Afnexis.” Required fields: name, email, position and experience band; phone, LinkedIn and a motivation response are optional. The current form has no visible resume upload. Candidate experience supports the 3–5 years band. Job-card buttons lead to a general customer contact page, so the recruitment form is the appropriate route. The [official About page](https://afnexis.com/about) links [Muhammad Aashir Tariq's LinkedIn](https://www.linkedin.com/in/muhammad-aashir-tariq/); his [official profile](https://afnexis.com/about/aashir-tariq) identifies him as founder and Head of Engineering. General `info@afnexis.com` is not labelled a recruiting inbox.

## Discovery and held alternatives

LinkedIn and Indeed were used for discovery, with company-primary verification determining imports. Discovery included [LinkedIn Next.js Pakistan](https://pk.linkedin.com/jobs/next.js-jobs) and [Indeed remote Next.js](https://pk.indeed.com/q-remote-next-js-jobs.html?q=remote+next+js). Indeed surfaced Angular Quantum and Incube leads; no sufficient matching first-party vacancy was established for inclusion.

- [AZKY's employer LinkedIn role](https://pk.linkedin.com/jobs/view/full-stack-developer-backend-focused-100%25-remote-at-azky-tech-labs-custom-software-for-businesses-4478872039) is remote and relevant. Held because SQL vendor depth/database architecture, algorithms, and its restriction on current full-time employment need clarification. Its [careers page](https://www.azkytech.com/careers) uses the different title Backend Engineer and links a ClickUp form. Do not assume the two titles identify the same requisition.
- [Decklaration's employer LinkedIn role](https://pk.linkedin.com/jobs/view/product-engineer-front-end-at-decklaration-4474611342) is attractive for product frontend work. Held because a matching company-site vacancy/ATS could not be independently reached, and specific AI coding-tool experience remains unrecorded. The role accepts shipped work as an alternative to its preferred degree. Do not use the email asserted only by secondary aggregators.
- [Coding Souls](https://codingsouls.com/careers): full-stack role asks for five-plus years, exceeding the documented four-plus calendar years. Mobile role leaves native-module/push-notification depth unconfirmed.
- [Realium](https://realium.org/careers/): PostgreSQL/AWS evidence questions and quarterly Karachi meetups remain.
- [Xeven Labs](https://xevenlabs.org/careers): search snapshot advertised a relevant role but current direct request returned 404; excluded as unverified-open.
- Pukaar requires Python/FastAPI; Quirky Bit full-stack asks for NestJS, named clouds and other unconfirmed technologies; these were weaker than the selected frontend opening.

## Files and verification boundary

- Import: `.job-search/import/pakistan-additions-20261016.json` — four local `add_job` actions, all `discovered`, blank drafts and null application dates.
- `findings.json` — detailed records and scope.
- `workspace-dedupe.json` — initial live job identifiers and actual profile evidence IDs; no authentication data.
- `validation-report.json` — final live dedupe and pure local application of all four actions.
- Saved HTML/text/bundles provide first-party source captures where direct HTTP succeeded. No screenshots were generated; screenshot fields are intentionally blank.

No full application questionnaire is claimed beyond inspected public form fields. No new skills, qualification, special schedule, relocation, compensation minimum or staff relationship was inferred.
