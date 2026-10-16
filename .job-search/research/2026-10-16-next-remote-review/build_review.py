import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
snap = json.loads((ROOT / 'workspace-snapshot.json').read_text())
workspace = snap['workspace']
jobs = {j['id']: j for j in workspace['jobs']}
now = datetime.now(timezone.utc).isoformat()
evidence_ids = {e['id'] for e in workspace['profile']['evidence']}
postgres_evidence = [e['id'] for e in workspace['profile']['evidence']
                     if 'postgres' in e['skill'].lower()
                     and 'production' in e['statement'].lower()]

def req(key, text, assessment, evidence, explanation, essential=True):
    assert set(evidence) <= evidence_ids
    return dict(id=key, text=text, essential=essential, assessment=assessment,
                evidenceIds=evidence, explanation=explanation)

def source(key, label, url, text, capture='current public page'):
    return dict(id=key, label=label, url=url, text=f'{capture}. {text}',
                capturedAt=now, screenshotUrl='', screenshotPath='')

def incomplete(key):
    return req(key, 'Reconfirm the complete current employer requirements before assigning strong fit', 'unknown', [],
               'The complete live employer role was not retrievable. Assessments below are provisional against the saved feed description; the discovery checklist cannot yet be fully cleared.')

frontend = ['ev-react', 'ev-confirmed-ts-next', 'ev-frontend-foundations']
backend = ['ev-backend', 'ev-integration']
remote = ['ev-remote', 'ev-product', 'ev-confirmed-english']

spotter_sources = [source('next-spotter-role', 'Official Spotter / Teamtailor full-stack listing',
    'https://careers.spotter.ai/jobs/716929-remote-fullstack-engineer-react-django-ai-systems',
    'Live role names Pakistan among six hiring countries and says fully remote. React/MUI and Python/Django are the core stack; REST APIs, non-trivial logic, query/caching performance and independent communication are required. GCP/Redis/Docker, mobile and AI coding assistants are bonuses. Resume precedes assessment; the advertised $100 is conditional assessment compensation, not salary. HTTP 200 also captured locally.'),
    source('next-spotter-jobs', 'Official Spotter current openings', 'https://careers.spotter.ai/jobs',
    'The matching full-stack role is among 18 current openings; company careers site links to spotter.ai. Separate React Native search result is absent from the current list and was not treated as a new active lead.')]

reviews = [dict(
    id='himalayas-ac100394824c4c1ecceeb4d8', companyUrl='https://spotter.ai/', fit='unknown', eligibility='confirmed',
    conclusion='Live, Pakistan-eligible role; hold for Python/Django and Material UI evidence.',
    eligibilityEvidence='2026-10-16 official Spotter Teamtailor role explicitly lists Pakistan and Fully Remote. This establishes advertised country eligibility; employment/contract terms remain subject to the employer.',
    currentOpening='confirmed on current official careers list and exact role page',
    nextAction='Confirm actual Python/Django backend and Material UI experience with concrete examples before tailoring or applying. React/Node experience alone does not meet this role.',
    applicationRoute=dict(url=spotter_sources[0]['url'], method='Official Teamtailor role application', caveat='Only read the public page. Dynamic questionnaire not opened. Assessment offered after resume screening; no assessment commitment made.'),
    requirements=[
        req('next-spotter-react','Production React and responsive frontend development','met',frontend,'React product interfaces, reusable components and responsive CSS are documented in the resume and candidate confirmations.'),
        req('next-spotter-mui','Strong Material UI proficiency','unknown',[],'No named Material UI experience is confirmed; shared component-library experience is not proof of MUI.'),
        req('next-spotter-python','Build Python/Django backend services and APIs','unknown',[],'Node/Express API experience is established; Python/Django delivery is not. The stack is central to the role, although DRF itself is described as a bonus.'),
        req('next-spotter-apis','Design and build RESTful APIs','met',backend,'Candidate reports shared Express/MongoDB APIs, authentication and external service integrations.'),
        req('next-spotter-logic','Non-trivial business logic or algorithms','met',['ev-backend','ev-integration','ev-testing'],'School-scoped data, billing workflows and the tested Plumier export support business-logic experience; no ranking-algorithm expertise is inferred.'),
        req('next-spotter-performance','Query behavior, performance and caching judgement','met',['ev-performance','ev-integration'],'Resume describes query/index optimization, frontend load optimization and Redis use.'),
        req('next-spotter-remote','Independent remote delivery and clear communication','met',remote,'Direct founder collaboration and international remote delivery are reported; advanced English is self-reported.'),
        req('next-spotter-bonus-startup','Shipped complete products in a startup or own projects','met',['ev-product','ev-ai'],'Tututor and independently built SaaS products provide relevant reported examples.',False),
        req('next-spotter-bonus-infra','GCP, Redis or Docker/Kubernetes experience','met',['ev-integration','ev-confirmed-docker'],'Redis and Docker satisfy this alternative bonus. GCP and Kubernetes are not claimed.',False),
        req('next-spotter-bonus-mobile','Shipped React Native mobile apps','met',['ev-mobile','ev-confirmed-mobile'],'Three years React Native and releases on both stores are candidate-reported.',False),
        req('next-spotter-bonus-assistants','Comfort coding with AI assistants','unknown',[],'AI product/API integration evidence does not independently establish a specific coding-assistant workflow.',False)],
    sources=spotter_sources),
]

painter_sources = [source('next-painter-careers', 'Official Painter Marketing Pros careers list', 'https://careers.paintermarketingpros.com/',
    'Retrieved public careers page lists nine openings: account management, appointment setting, CRM, SEO, QA and operations. The full-stack role is absent. It offers an open application, which is not confirmation that this engineering vacancy is active. Main company homepage links to this careers subdomain. Later direct HTTP fetch returned 403.', 'Web retrieval succeeded this turn; a later retry timed out'),
    source('next-painter-board', 'Himalayas listing, secondary evidence', jobs['himalayas-fb60906bf4e48f501d8010b7']['url'],
    'Board advertises Pakistan/Philippines, React/Node alternatives, PostgreSQL and cloud/microservices skills, US Eastern 9am–6pm Monday–Friday. Degree is preferred. Board salary cadence/amount is suspect and unverified; do not treat $1K/year as an agreed term. Apply redirects to Himalayas sign-up.')]
reviews.append(dict(
    id='himalayas-fb60906bf4e48f501d8010b7',companyUrl='https://paintermarketingpros.com/',fit='unknown',eligibility='unknown',
    conclusion='Hold: employer careers list does not currently show this role; provider-specific cloud and microservices evidence remain unresolved. Candidate now confirms production PostgreSQL use.',
    eligibilityEvidence='Himalayas advertises Pakistan and Philippines. The official company careers list does not include this engineering role, so current role-specific country eligibility is not independently confirmed.',
    currentOpening='unconfirmed; absent from nine-role official careers list; do not declare closed solely from absence',
    nextAction='Verify the exact full-stack opening is still active and accepts Pakistan; then confirm relevant cloud provider and microservices examples. Production PostgreSQL use is candidate-confirmed, with no tenure or specific-feature claim. Do not submit an open application as if it were this vacancy.',
    applicationRoute=dict(url='https://careers.paintermarketingpros.com/',method='Official careers site with open-application option',caveat='No current exact engineering application route found; secondary Apply leads to Himalayas sign-up.'),
    requirements=[
        req('next-painter-frontend','Production frontend framework experience','met',frontend,'React and responsive production interfaces support the alternative React/Angular/Vue criterion.'),
        req('next-painter-backend','Production backend framework and API experience','met',backend,'Node.js/Express and REST APIs meet the named alternatives.'),
        req('next-painter-databases','PostgreSQL plus SQL/NoSQL database proficiency','met' if postgres_evidence else 'unknown',['ev-backend','ev-confirmed-sql']+postgres_evidence,'Candidate directly confirmed production PostgreSQL use on October 16, 2026; MongoDB and 3+ years SQL are also reported. This supports the broad database requirement without claiming PostgreSQL tenure, vendor-specific features or advanced administration.' + ('' if postgres_evidence else ' The accurate live PostgreSQL evidence entry is pending; do not import this assessment as met until it is linked.')),
        req('next-painter-cloud','Build secure cloud applications using AWS, Azure or GCP','unknown',[],'Vercel/DigitalOcean and Docker do not establish named-provider experience.'),
        req('next-painter-microservices','Strong microservices architecture understanding','unknown',[],'A shared Express backend and API count do not prove microservices architecture experience.'),
        req('next-painter-remote','Distributed delivery, communication and collaboration','met',remote,'Remote product ownership and advanced English are reported.'),
        req('next-painter-schedule','Work US Eastern 9am–6pm weekdays','met',['ev-confirmed-schedule'],'Candidate explicitly confirmed full US business hours; no extra on-call commitment inferred.'),
        req('next-painter-degree','Related bachelor degree preferred','gap',[],'Candidate confirmed no degree. This is preferred, not an essential exclusion.',False),
        incomplete('next-painter-complete')],sources=painter_sources))

chasi_sources=[source('next-chasi-careers','Official Chasi careers page','https://chasi.ai/careers',
    'Live company careers page embeds jobs.gem.com/chasi-ai and retains a legacy Dover careers link. Both raw pages returned HTTP 200, but the job list depends on JavaScript; this research did not manipulate a browser.'),
    source('next-chasi-legacy','Employer Dover role, indexed snapshot','https://app.dover.com/apply/chasi/34f74441-51aa-4d85-9c94-462335df6420',
    'Indexed exact Senior Software Engineer role says Remote (International), React/TypeScript, at least two years, backend/API knowledge and a completed related degree. Current direct retrieval is a JavaScript shell. Treat the indexed listing as historical role evidence, not present hiring confirmation.', 'Search index reports crawl four months ago'),
    source('next-chasi-yc','Chasi employer listing on Y Combinator','https://www.ycombinator.com/companies/chasi/jobs/VLTx71b-founding-engineer',
    'Different current Founding Engineer listing is San Francisco in person, six days weekly, with travel. It does not confirm or replace the older remote Senior Software Engineer vacancy.')]
reviews.append(dict(
    id='himalayas-1e7ecc9cbc7d867e890ef8a7',companyUrl='https://chasi.ai/',fit='gaps',eligibility='unknown',
    conclusion='Known degree gap in the matching old employer JD, plus uncertain current remote vacancy; do not apply.',
    eligibilityEvidence='Historical exact Dover listing says Remote (International); current official careers route has migrated to Gem and exact role availability is unconfirmed. A separate current YC role requires San Francisco attendance. No Pakistan eligibility inferred from that different role.',
    currentOpening='exact remote vacancy unconfirmed; cached employer JD only',
    nextAction='Deprioritize unless employer explicitly accepts equivalent experience without a degree and confirms the exact role remains remote from Pakistan. Do not conflate the separate onsite founding role.',
    applicationRoute=dict(url=chasi_sources[0]['url'],method='Official Gem careers embed; legacy Dover role retained as evidence',caveat='No current exact role application verified.'),
    requirements=[
        req('next-chasi-degree','Completed Computer Science, Software Engineering or similar degree','gap',[],'Matching employer JD requires graduation without an equivalent-experience alternative; candidate explicitly has no degree.'),
        req('next-chasi-frontend','React, JavaScript/TypeScript and web fundamentals','met',frontend,'Documented React/TypeScript product work and four years TypeScript/Next.js support these requirements.'),
        req('next-chasi-years','At least two years building applications','met',['ev-experience','ev-product'],'Supported calendar chronology starts January 2022, without adding overlapping roles.'),
        req('next-chasi-backend','Backend APIs, databases, authentication and REST/GraphQL','met',backend+['ev-confirmed-graphql'],'Express/MongoDB, JWT, REST and hands-on GraphQL are reported.'),
        req('next-chasi-postgres','Deliver PostgreSQL with Drizzle/Prisma data models','unknown',postgres_evidence,'Production PostgreSQL use is now directly candidate-confirmed. Drizzle/Prisma experience and the specific scalable data-modelling work remain unconfirmed; no PostgreSQL tenure or feature expertise is inferred.'),
        req('next-chasi-ai','Work with LangChain, retrieval and voice AI','unknown',['ev-ai'],'AI API work is relevant, but LangChain, retrieval systems and voice pipelines are not confirmed.'),
        incomplete('next-chasi-complete')],sources=chasi_sources))

emetlab_sources=[source('next-emetlab-careers','Official Emetlab careers page, indexed content','https://www.emetlab.com/careers',
    'Official indexed careers page lists Junior and Senior Software Engineer among four positions and says it hires globally. It publishes careers@emetlab.com for open applications with CV, introduction and desired role. Direct live fetch returned HTTP 522; web open repeatedly timed out. Role-level requirements and current country terms were not independently retrievable.', 'Official-domain search index, crawl age two weeks; live verification unavailable')]
emet_common=[
    req('next-emet-language','TypeScript/JavaScript programming','met',['ev-confirmed-ts-next','ev-react'],'Four years TypeScript and production JavaScript/React work are candidate-reported.'),
    req('next-emet-web','APIs, databases and Git fundamentals','met',['ev-backend','ev-git-deploy']+postgres_evidence,'Shared backend services, MongoDB, REST APIs and Git are documented. Candidate also directly confirmed production PostgreSQL use; no PostgreSQL tenure or specific-feature claim is made.'),
    req('next-emet-collab','Collaborative communication and learning','met',remote+['ev-confirmed-code-review'],'Remote founder/team work, code-review participation and advanced English support the broad requirement.'),
]
reviews.append(dict(
    id='himalayas-c79f67f2b5f11ab85943e765',companyUrl='https://www.emetlab.com/',fit='unknown',eligibility='unknown',
    conclusion='Most promising technical match in the feed text, but junior seniority and current employer verification need resolution.',
    eligibilityEvidence='Official indexed careers page says global hiring; direct current site is unavailable (HTTP 522). Saved Himalayas role says fully remote/worldwide. Retain unknown until live role/country conditions can be confirmed.',
    currentOpening='listed by official search-index snapshot two weeks old; live site unavailable',
    nextAction='Recheck official careers page when available; confirm current global/Pakistan terms and junior-level scope/compensation before pursuing. Existing reported experience covers the saved foundational requirements.',
    applicationRoute=dict(url='https://www.emetlab.com/careers',method='Indexed official careers@emetlab.com open-application route',caveat='Published hiring inbox, but live role/application requirements are not yet verified. Nothing sent.'),
    requirements=[
        req('next-emet-junior-equivalent','Relevant degree OR equivalent practical/self-directed experience','met',['ev-experience','ev-product'],'Saved JD explicitly permits self-directed/equivalent experience. No degree claimed.'),
        *emet_common,
        req('next-emet-junior-quality','Write tested code, debug and participate in code reviews','met',['ev-testing','ev-confirmed-testing','ev-confirmed-code-review'],'Cypress, golden export tests, Jest/RTL and code review are reported.'),
        req('next-emet-junior-ai','Interest in AI/data infrastructure','met',['ev-ai','ev-product'],'Shipped AI product integrations support interest; no model-training expertise is claimed.',False),
        incomplete('next-emet-junior-complete')],sources=emetlab_sources))
reviews.append(dict(
    id='himalayas-e5b76a0bd73c0b10ab22f94e',companyUrl='https://www.emetlab.com/',fit='unknown',eligibility='unknown',
    conclusion='Relevant TypeScript/backend experience, with unresolved distributed-systems, pipeline and named-cloud requirements.',
    eligibilityEvidence='Official indexed careers page says global hiring, but current exact role/country conditions could not be checked because the live site returned HTTP 522. Do not treat worldwide feed metadata as current employer confirmation.',
    currentOpening='listed by official search-index snapshot two weeks old; live site unavailable',
    nextAction='Await live employer verification and candidate evidence of distributed systems at scale, data pipeline tooling, AWS/GCP/Azure and Kubernetes familiarity. Avoid sending both Emetlab applications without choosing appropriate level.',
    applicationRoute=dict(url='https://www.emetlab.com/careers',method='Indexed official careers@emetlab.com open-application route',caveat='Live exact role and questionnaire unverified; no external action.'),
    requirements=[
        req('next-emet-senior-years','Four-plus years engineering with a named language such as TypeScript','met',['ev-experience','ev-confirmed-ts-next'],'Calendar chronology supports four-plus years; TypeScript is explicitly four years. Ratings are not converted into years.'),
        req('next-emet-senior-distributed','Production APIs, services and distributed systems operating at scale','unknown',['ev-backend'],'API delivery is established, but scale/architecture of distributed systems is not evidenced by endpoint counts alone.'),
        req('next-emet-senior-cloud','AWS/GCP/Azure and Docker/Kubernetes familiarity','unknown',['ev-confirmed-docker'],'Docker is confirmed; named-provider and Kubernetes experience are not.'),
        req('next-emet-senior-pipelines','Databases, caching, messaging and data pipeline tooling','unknown',['ev-backend','ev-integration','ev-confirmed-sql']+postgres_evidence,'MongoDB/SQL, newly confirmed production PostgreSQL use, Redis and Socket.io are relevant. Data-pipeline tooling depth remains unconfirmed; no PostgreSQL tenure or specific features are inferred.'),
        req('next-emet-senior-lead','Mentoring, technical leadership and collaboration','unknown',['ev-product','ev-confirmed-code-review','ev-remote'],'Leading a small mobile/web team, product ownership and code reviews are reported. Specific mentoring/pairing/architectural guidance examples required by this role are not established.'),
        incomplete('next-emet-senior-complete')],sources=emetlab_sources))

actions=[]
for r in reviews:
    old=jobs[r['id']]
    note=f'Read-only review {now}: {r["conclusion"]} {r["nextAction"]} No application, outreach or portal write performed.'
    research=dict(companyUrl=r['companyUrl'],contacts=old.get('research',{}).get('contacts',[]),
                  sources=old.get('research',{}).get('sources',[])+r['sources'])
    actions.append(dict(type='update_job',id=r['id'],patch=dict(
        fit=r['fit'],eligibility=r['eligibility'],eligibilityEvidence=r['eligibilityEvidence'],
        requirements=r['requirements'],notes='\n\n'.join(x for x in [old.get('notes',''),note] if x),
        nextAction=r['nextAction'],research=research)))

report=dict(schemaVersion=1,capturedAt=now,scope='Five previously unreviewed live-board leads; read-only research and local proposed updates only',
    selection='Chose React/TypeScript/Node or language-alternative engineering roles with worldwide/Pakistan feed claims. Excluded applied jobs and known audited restrictions. Screened out eight-year Agile Monkeys role and unrelated/.NET/unpaid/country-restricted feed leads before detailed review.',
    sourceLimitations='Search-index content is explicitly dated and distinguished from current HTTP/page evidence. Missing skills are unknown, not fabricated negative experience. All candidate evidence is candidate-reported rather than independent employment verification.',
    candidateSources=['.job-search/private/application-facts.json','.job-search/resumes/masters/facts.json','workspace-snapshot.json profile evidence'],
    latestCandidateConfirmation=dict(skill='PostgreSQL',claim='I have used PostgreSQL in production',source='.job-search/private/application-facts.json skills.postgresql',confirmedAt='2026-10-16T01:07:52.993Z',years=None,specificFeaturesUnspecified=True,liveEvidenceIds=postgres_evidence),
    results=reviews,counts=dict(reviewed=5,newStrongFits=0,confirmedPakistan=1,knownEssentialDegreeGap=1),
    externalActions=dict(portalMutations=0,emails=0,applications=0,browserActions=0),
    proposedActionsFile='proposed-workspace-actions.json',dedupeFile='dedupe.json')
(ROOT/'findings.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
(ROOT/'proposed-workspace-actions.json').write_text(json.dumps(actions,indent=2,ensure_ascii=False)+'\n')
(ROOT/'sources'/'evidence-summaries.json').write_text(json.dumps({s['id']:s for r in reviews for s in r['sources']},indent=2,ensure_ascii=False)+'\n')
print(json.dumps([dict(company=jobs[r['id']]['company'],title=jobs[r['id']]['title'],fit=r['fit'],eligibility=r['eligibility']) for r in reviews],indent=2))
