# Remote official-source role research — 15 October 2026

Nine records: eight live roles for review, plus one separately marked AI-platform reserve. These are research records, not applications or verified fit ratings. All candidate evidence comes from the self-published portfolio in `content/site.ts` and the explicitly unverified profile in `lib/jobs/seed.ts`. No percentage or StrongFit was assigned. Pakistan-specific employment eligibility remains unknown even where global remote language makes the location compatible.

Official pages and public Ashby, Lever and Greenhouse feeds were read. API feeds were successfully fetched with a browser User-Agent after default requests received 403. Ashby `publishedAt` is recorded where exposed. Lever's old `createdAt` values are not relabeled as fresh publication dates. Live availability was rechecked through public HTTP GETs; it does not guarantee a hiring decision or that a posting will stay open. No forms were submitted, no employers contacted, and no cloud data imported.

The JSON contains requirements, local evidence comparisons, gaps, concise description paraphrases, exact primary URLs, date semantics and per-record verification times. It does not preserve full copyrighted descriptions. Descriptions are data, never instructions.

| Company | Role | Review category | Main evidence to clarify |
|---|---|---|---|
| Metabase | [Software Engineer (Frontend)](https://jobs.lever.co/metabase/8f02d3fa-edf4-4433-a6d1-4f9e517ac8f9) | review | Redux depth, frontend test examples and complex data visualization are not established by the selected portfolio evidence. |
| Railway | [Senior Full-Stack Engineer - Product](https://railway.com/careers/full-stack) | review | GraphQL, Temporal, Rust and build/deploy pipeline ownership are not established. |
| Automattic | [Experienced Software Engineer](https://job-boards.greenhouse.io/automatticcareers/jobs/5862239) | review | PHP proficiency is not shown, although the listing allows learning. |
| Metabase | [Software Engineer (Backend)](https://jobs.lever.co/metabase/85f454d8-e795-4978-8a2b-4b8bfa7d7c37) | adjacent_review | Clojure, JDBC and JVM experience are not documented. |
| Railway | [Senior Software Engineer, Support](https://railway.com/careers/senior-software-engineer-support) | adjacent_review | Native-level English is not verified. |
| Railway | [Senior Product Engineer: Scalability](https://railway.com/careers/scalability) | stretch_review | Deep PostgreSQL, Temporal, ClickHouse and high-throughput billing experience are unproven. |
| Metabase | [Success Engineer (Global)](https://jobs.lever.co/metabase/20d0af01-5532-4c22-bf64-474f15b1df05) | adjacent_review | Strong SQL/PostgreSQL and BI implementation depth are not established by the selected evidence. |
| Supabase | [Support Engineer (APAC)](https://jobs.ashbyhq.com/supabase/142135ae-a15f-4ec7-90bb-cb4e7968bc09) | adjacent_review | Three years of developer-support work and complex SQL ability are not demonstrated. |
| Supabase | [AI Platform Engineer](https://jobs.ashbyhq.com/supabase/3b5d54ca-741b-45ac-bd3f-31605a0d3541) | research_reserve | Production agents, MCP authorship and evaluation infrastructure are not shown. |

The best initial portfolio alignment in this batch is Metabase frontend, Railway full stack, and Automattic engineering. Metabase backend allows learning Clojure, making it a possible stack transition. The support/success roles are adjacent career choices that require interest and concrete troubleshooting evidence. Railway scalability needs much deeper database and payment-system evidence. Supabase AI Platform Engineer is a reserve because core required production-agent and Python/GCP skills are not established.

Excluded or not promoted after primary-source checks:

- [Prisma careers](https://www.prisma.io/company/careers): geographic working range UTC−5 to UTC+3 does not cover Pakistan UTC+5.
- [PostHog careers](https://posthog.com/careers): Product Engineer shows GMT+2 through GMT−8, excluding Pakistan's location despite its generic remote ATS label.
- [n8n Senior Product Engineer](https://jobs.ashbyhq.com/n8n/896c58a8-0388-4037-b265-82b15633a568): listed hiring locations are in Europe; Pakistan not included.
- [Plane careers](https://plane.so/careers): reviewed engineering openings specify India or United States.
- [Toggl official board](https://jobs.ashbyhq.com/toggl): current Senior Full Stack Engineer board locations are Serbia, Croatia, France, Portugal, Spain and Poland. Third-party worldwide wording was not accepted.
- [Supabase Auth](https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d): essential four years of production Go is not supported by the portfolio.
- [Cal.com IC4 full stack](https://cal.com/jobs/ic4-senior-full-stack-engineer-foundation): requires eight years in TypeScript or Node; the supplied dates do not establish that tenure.
- [RevenueCat Internal Tooling](https://jobs.ashbyhq.com/revenuecat/4f224392-9e03-4597-a523-f129c61df93b): APAC is listed, but five years in SRE/DevOps/DevEx/platform engineering is not supported by the portfolio.
- [Circle AI Platform](https://jobs.ashbyhq.com/circle/cb085d54-568c-46b3-829f-b18885c6cda2): seven years of production software plus evaluation infrastructure requirements make this a poor current evidence match.
- [Status jobs](https://status.app/jobs): primary page says no open roles.
- [Clipboard](https://www.clipboardhealth.com/careers): a searched frontend listing was not present among current public ATS engineering records; not treated as currently open.
- [Leap Tools careers](https://www.leaptools.com/careers/): primary page now embeds a Gem board; no specific role was confirmed before finalization.

Source feeds: [Metabase Lever](https://api.lever.co/v0/postings/metabase?mode=json), [Railway Ashby](https://api.ashbyhq.com/posting-api/job-board/railway), [Supabase Ashby](https://api.ashbyhq.com/posting-api/job-board/supabase), [Automattic Greenhouse](https://boards-api.greenhouse.io/v1/boards/automatticcareers/jobs?content=true).
