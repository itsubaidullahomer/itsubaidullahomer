"""Save bounded public-source research. GET only; never submit any application."""
import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
import requests

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
NOW = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
FACTS = REPO / '.job-search/resumes/masters/facts.json'
PROFILE = json.loads((REPO / '.job-search/import/profile.json').read_text())
EXISTING = json.loads((REPO / '.job-search/import/reviewed-preview-readiness.json').read_text())['jobs']

sources = [
 ('codevente-careers', 'https://codevente.com/careers', 'Employer career page. Remote/Karachi frontend opening and application form. The initial HTTP response is a JavaScript shell; the current linked application bundle supplies the role and form.'),
 ('codevente-client', 'https://codevente.com/assets/index-BDP_4NyY.js', 'Public bundle linked by the employer page. Frontend role; form requires name, email, position, experience category, resume and motivation text. Experience categories include 3–5 and 6–10 years. Optional compensation selector uses USD ranges, unlike the advertised PKR amount. No request was submitted.'),
 ('codevente-linkedin', 'https://www.linkedin.com/company/codevente', 'Employer-controlled company profile links to codevente.com, describes a small software company and publishes ERP/product delivery updates. This corroborates the domain, not every employer claim.'),
 ('gtsol-careers', 'https://www.gtsol360.com/careers', 'Employer lists a full-time remote/Karachi React/Next opening. TypeScript, Tailwind and Supabase are preferred. Application route is an email with resume and a short explanation of fit. No degree, tenure, salary amount, schedule or AI-answer restriction is published.'),
 ('gtsol-about', 'https://www.gtsol360.com/about', 'Employer team page names Abrar Ahmed and Umaar Ahmed and links their public professional profiles. Umaar is described as leading engineering and delivery. Generic marketing statistics and unnamed team cards were not treated as verified evidence.'),
 ('gtsol-linkedin', 'https://pk.linkedin.com/company/gtsol360', 'Employer-controlled company profile links the same domain and describes Karachi-based AI/web/mobile services. Some organization metadata differs across public pages; actual employment terms remain unverified.'),
 ('idev-mobile', 'https://idevnerds.com/careers/mobile-engineer/', 'Remote mobile role accepts React Native/TypeScript or Flutter/Dart. It asks for at least three years of production mobile delivery; native integration and store releases are duties. Form requires identity/contact details and resume; motivation text is optional.'),
 ('idev-fullstack', 'https://idevnerds.com/careers/senior-full-stack-engineer/', 'Live opening requires at least five years, relational database fundamentals and cloud deployment using AWS/Azure/GCP. These are not established by the current candidate facts.'),
 ('idev-lead', 'https://idevnerds.com/careers/mean-mern-stack-team-lead/', 'Live opening requires at least five years plus Angular and PostgreSQL. Excluded from the viable shortlist against confirmed candidate experience.'),
 ('drhud-board', 'https://emp.jobylon.com/companies/2639-dr-hud/', 'Official Jobylon company board did not list an available opening during this check. A current Pakistan AI-role mirror therefore remains unverified at the employer source.'),
 ('fasset-board', 'https://fasset.bamboohr.com/careers/list', 'Employer career listing API contains three current roles, none engineering. The React/Node role seen on mirrors is not available on this canonical board.'),
 ('instech-26', 'https://instechsol.com/portal/submit_cv.php?job_id=26', 'MERN backend role is live; mandatory AWS/Azure/GCP experience is unsupported. Night schedule is 19:00–04:00 Pakistan time. Submission would create an account. No account was created.'),
 ('keepcoders-board', 'https://keepcoders.com/careers/', 'Employer board links separate senior MERN and React/React Native forms. These require Google sign-in, so current detailed requirements and questions could not be verified anonymously.'),
 ('keepcoders-mern-form', 'https://docs.google.com/forms/d/e/1FAIpQLSdCByh-6t6HAWSdFudarFcjXWnpqDXlz3sjZi1qwiXma3yKtw/viewform', 'Public GET returned HTTP401 and a Google sign-in requirement. Stopped without signing in or creating an account.'),
 ('keepcoders-frontend-form', 'https://docs.google.com/forms/d/e/1FAIpQLScsL6b-d0eWs5qtOjAWYPu6SOh9HCUpEsFtYmpzsaVltvMzzA/viewform', 'Public GET returned HTTP401 and a Google sign-in requirement. Stopped without signing in or creating an account.'),
]

def capture(row):
    sid, url, note = row
    data = {'id': sid, 'url': url, 'capturedAt': NOW, 'captureType': 'public GET metadata plus researcher paraphrase', 'text': note}
    try:
        r = requests.get(url, timeout=25)
        data.update(status=r.status_code, finalUrl=r.url, bytes=len(r.content), sha256=hashlib.sha256(r.content).hexdigest())
        if sid == 'fasset-board' and r.status_code == 200:
            data['currentRoleTitles'] = [x['jobOpeningName'] for x in r.json().get('result', [])]
        if sid == 'codevente-client':
            data['liveChecks'] = {s: s in r.text for s in ['senior-frontend-developer', 'Senior Frontend Developer', 'Mid Level (3-5 years)', 'Senior Level (6-10 years)', 'Cover letter must be at least 50 characters long']}
    except requests.RequestException as error:
        data['fetchError'] = type(error).__name__
    if sid in ['codevente-linkedin', 'gtsol-linkedin']:
        data['webInspection'] = {'method': 'web search/open rendered text', 'retrieved': True, 'note': 'Public profile content was returned by the web tool; later direct HTTP GET returned999. Paraphrase comes from that web inspection.'}
    return data

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    captures = list(pool.map(capture, sources))
for item in captures:
    (ROOT / 'sources' / f"{item['id']}.json").write_text(json.dumps(item, indent=2, ensure_ascii=False)+'\n')

def evidence(requirement, status, ids, pointers, assessment):
    return {'requirement': requirement, 'status': status, 'evidenceIds': ids, 'factPointers': pointers, 'assessment': assessment}

def contact(cid, name, role, url, source, note):
    return {'id': cid, 'name': name, 'role': role, 'profileUrl': url, 'sourceUrl': source, 'referralRoute': 'Public professional profile only; no relationship or referral availability established.', 'notes': note, 'capturedAt': NOW}

jobs = [
 {
  'id': 'codevente-senior-frontend-20261016', 'company': 'CodeVente', 'title': 'Senior Frontend Developer',
  'companyUrl': 'https://codevente.com', 'jobUrl': 'https://codevente.com/careers', 'finalApplyUrl': 'https://codevente.com/careers',
  'sourceBoard': 'Employer careers; company LinkedIn corroboration', 'location': 'Remote / Karachi, Pakistan', 'employmentType': 'Full-time',
  'employerType': 'Small software/product-delivery agency; own product work is publicly described. Not established as a venture-backed product startup.',
  'availability': {'verifiedAt': NOW, 'status': 'listed_on_current_employer_page_and_public_client_bundle', 'publishedAt': None, 'closingAt': None},
  'eligibility': {'pakistan': 'listed', 'degree': 'No degree condition in the short listing or visible form; no general no-degree policy established.', 'experience': 'No minimum in listing. Form offers a truthful 3–5-year category; the Senior category means 6–10, so do not select it.', 'overseasVisa': 'not applicable'},
  'compensation': {'advertised': 'PKR 150,000–250,000 per month', 'candidateExpectation': 'unanswered', 'issue': 'Optional form selector instead uses USD ranges. Do not infer a conversion or choose a value without the candidate.'},
  'requirements': [
   evidence('React, TypeScript, Next.js and Tailwind', 'met_candidate_reported', ['ev-react','ev-frontend-foundations'], ['/skills/0/text','/experience/1/bullets/0','/projects/2'], 'All are named in approved facts; reusable React interfaces and multilingual Tailwind delivery support the match. Exact TypeScript/Next.js tenure remains unknown.'),
   evidence('Frontend ownership and mentoring', 'met_candidate_reported', ['ev-product','ev-react'], ['/experience/0/bullets/0','/experience/0/bullets/4','/experience/1/bullets/1'], 'Small-team leadership, direct founder work and interface performance delivery support the published duties.'),
   evidence('Complete seniority and employment terms', 'unknown', [], [], 'Short listing does not define a minimum, working overlap, full-time exclusivity or Karachi attendance. Obtain full terms before declaring an eligible match.')],
  'application': {'method': 'employer web form', 'requiredQuestions': ['given and family name', 'contact email', 'role selection', 'experience bracket', 'resume upload: PDF/DOC/DOCX, at most 5 MB', 'motivation statement: at least 50 characters'], 'optionalQuestions': ['phone','portfolio link','LinkedIn link','start-date category','expected compensation','remote preference'], 'aiAnswerRestriction': 'None found in published role/form; this is not a blanket permission claim.', 'formInspected': True, 'inspectionMethod': 'Public current client bundle linked by employer page; no form interaction or submission.'},
  'technicalFit': 'supported_for_published_scope', 'overallFit': 'unknown', 'readyToApply': False,
  'missingFacts': ['Candidate compensation expectation','Working-hour overlap and other commitments if required','Employer confirmation of full criteria and whether 4+ years meets this senior opening','Employer confirmation of remote work from Rahim Yar Khan'],
  'blockers': ['The employer publishes only a short role summary; seniority policy is ambiguous.','Resolve the listing/form compensation mismatch if that optional field is used.'],
  'research': {'companyUrl':'https://codevente.com','contacts':[contact('codevente-company','CodeVente','Company recruiting route','https://www.linkedin.com/company/codevente','https://codevente.com/careers','No specific recruiter profile established; apply via the official form.')], 'sources': []},
  'sourceIds': ['codevente-careers','codevente-client','codevente-linkedin']
 },
 {
  'id': 'gtsol360-react-next-20261016', 'company': 'GTSol360', 'title': 'Full-Stack Developer (React / Next.js)',
  'companyUrl': 'https://www.gtsol360.com', 'jobUrl': 'https://www.gtsol360.com/careers', 'finalApplyUrl': 'https://www.gtsol360.com/careers',
  'sourceBoard': 'Employer careers; company LinkedIn corroboration', 'location': 'Remote / Karachi, Pakistan', 'employmentType': 'Full-time',
  'employerType': 'Founder-led AI/web/mobile services agency. Product startup status is not established.',
  'availability': {'verifiedAt': NOW, 'status': 'listed_on_current_employer_page', 'publishedAt': None, 'closingAt': None},
  'eligibility': {'pakistan': 'Company describes remote staff across Pakistan.', 'degree': 'No degree condition published in the short role description.', 'experience': 'No minimum tenure published.', 'overseasVisa': 'not applicable'},
  'compensation': {'advertised': 'No numerical range published', 'candidateExpectation': 'unanswered'},
  'requirements': [
   evidence('React / Next.js web product delivery', 'met_candidate_reported', ['ev-react','ev-product'], ['/skills/0/text','/experience/0/bullets/0','/experience/1/bullets/0'], 'Approved React/Next.js skills and shipped web-product scope support the listed work.'),
   evidence('Responsive interface performance and engineering leadership', 'met_candidate_reported', ['ev-performance','ev-product','ev-frontend-foundations'], ['/experience/1/bullets/1','/experience/0/bullets/4','/projects/2'], 'Candidate reports load-time improvements, team leadership and Tailwind delivery.'),
   evidence('Preferred TypeScript / Tailwind / Supabase', 'partially_supported_preference', ['ev-react','ev-frontend-foundations'], ['/skills/0/text','/projects/2'], 'TypeScript and Tailwind are supported. Production Supabase experience is not in the approved facts and must not be claimed.'),
   evidence('Complete role requirements and employment terms', 'unknown', [], [], 'The public description is brief; backend stack, seniority expectations, schedule and compensation need clarification.')],
  'application': {'method': 'email as instructed on employer careers page', 'publicRecruitingEmail': 'info@gtsol360.com', 'requiredQuestions': ['resume attachment','brief explanation of role fit'], 'optionalQuestions': [], 'aiAnswerRestriction': 'None found in published application instructions.', 'formInspected': True, 'inspectionMethod': 'Employer careers page explicitly specifies email; no separate application questionnaire is advertised.'},
  'technicalFit': 'supported_for_published_scope', 'overallFit': 'unknown', 'readyToApply': False,
  'missingFacts': ['Full role criteria and backend scope','Employer confirmation of salary and contract terms','Required working overlap','Candidate compensation expectation if asked','Whether employer requires production Supabase beyond its stated preference'],
  'blockers': ['The short listing does not establish full application eligibility; keep as a research lead.'],
  'research': {'companyUrl':'https://www.gtsol360.com','contacts':[contact('gtsol-umaar','Umaar Ahmed','AI & Full Stack Developer; engineering delivery lead','https://www.linkedin.com/in/umaar-ahmed-a3b252266/','https://www.gtsol360.com/about','Linked directly by official team page. LinkedIn fetch returned999; relationship and current referral availability are unverified.'),contact('gtsol-abrar','Abrar Ahmed','Founder','https://www.linkedin.com/in/aaawithu/','https://www.gtsol360.com/about','Linked directly by official team page. LinkedIn fetch returned999; no outreach.')], 'sources': []},
  'sourceIds': ['gtsol-careers','gtsol-about','gtsol-linkedin']
 }
]
for job in jobs:
    job['research']['sources'] = [{'id': c['id'], 'label': c['id'], 'url': c['url'], 'text': c['text'], 'capturedAt': c['capturedAt'], 'screenshotUrl':'', 'screenshotPath':''} for c in captures if c['id'] in job['sourceIds']]

holds = [
 {'company':'iDevNerds','title':'Mobile Engineer, Flutter & React Native','jobUrl':'https://idevnerds.com/careers/mobile-engineer/','sourceIds':['idev-mobile'],'readyToApply':False,'reason':'Three production mobile years are required; candidate has three shipped React Native apps but exact tenure is unknown. Remote Pakistan contracting and native-module scope also need confirmation. Do not infer 3 years from overall 4+ years.','candidateFactPointers':['/experience/0/bullets/3','/skills/0/text'],'evidenceIds':['ev-mobile','ev-react'],'applicationQuestions':['full name','email','phone','resume'],'degree':'No degree condition published.','publishedAt':None,'verifiedAt':NOW},
 {'company':'Dr Hud','title':'Full-Stack AI Developer','jobUrl':'https://www.glassdoor.co.in/job-listing/full-stack-ai-developer-dr-hud-JV_IC3139539_KO0%2C23_KE24%2C30.htm?jl=1010279486532','canonicalBoard':'https://emp.jobylon.com/companies/2639-dr-hud/','sourceIds':['drhud-board'],'readyToApply':False,'reason':'Current-looking mirror describes a strong AI/product overlap, but no matching official opening/form was found. A separate older Dr Hud role mirror also requires a degree. Do not transfer that policy or treat the new role as verified.','candidateFactPointers':['/experience/0/bullets/2','/projects/1'],'evidenceIds':['ev-ai','ev-product'],'missingFacts':['Canonical role/form and degree policy','Personal real-user AI failure/fix narrative','Islamabad attendance'],'publishedAt':None,'verifiedAt':NOW},
 {'company':'KeepCoders','title':'Senior MERN / Frontend roles','jobUrl':'https://keepcoders.com/careers/','sourceIds':['keepcoders-board','keepcoders-mern-form','keepcoders-frontend-form'],'readyToApply':False,'reason':'Employer listings remain visible, but linked role-specific Google Forms require sign-in. Detailed current questions and criteria are not verified. Older LinkedIn versions are closed. No sign-in or account creation attempted.','publishedAt':None,'verifiedAt':NOW},
 {'company':'Incube Technologies','title':'Full Stack Developer (Next.js & Node.js)','jobUrl':'https://pk.indeed.com/viewjob?jk=70ff7429ffd961c3','readyToApply':False,'reason':'Indeed shows in-person Islamabad role with plausible 4+ years/React/Node/Stripe match, but employer canonical role/form is not located and full e-commerce cart/order ownership is not established. Do not substitute SaaS subscription work for complete e-commerce ownership.','candidateFactPointers':['/experience/0/bullets/3','/projects/1'],'publishedAt':None,'verifiedAt':NOW}
]
exclusions = [
 {'company':'iDevNerds','title':'Senior Full-Stack Engineer','url':'https://idevnerds.com/careers/senior-full-stack-engineer/','reason':'Mandatory5+ years; unproven relational DB and AWS/Azure/GCP.'},
 {'company':'iDevNerds','title':'MEAN/MERN Stack Team Lead','url':'https://idevnerds.com/careers/mean-mern-stack-team-lead/','reason':'Mandatory5+ years; unproven Angular/PostgreSQL.'},
 {'company':'Fasset','title':'Full-Stack Engineer React/Node','url':'https://fasset.bamboohr.com/careers','reason':'Current official board has only three unrelated roles; not a live canonical engineering opening.'},
 {'company':'Exora AI','title':'Full Stack Developer','url':'https://www.glassdoor.com/job-listing/full-stack-developer-exora-ai-JV_KO0%2C20_KE21%2C29.htm?jl=1010177805421','reason':'Mirror explicitly requires bachelor degree and PostgreSQL; candidate has no degree.'},
 {'company':'TechEmulsion','title':'Software Engineer','url':'https://www.emulsionlimited.com/careers/software-engineer','reason':'Official JD explicitly requires BS/MS; candidate has no degree.'},
 {'company':'InstechSol','title':'Full Stack Developer Night Shift','url':'https://instechsol.com/portal/submit_cv.php?job_id=26','reason':'Mandatory AWS/Azure/GCP not in facts; night schedule unconfirmed; submission creates account.'},
 {'company':'Nostro','title':'Full Stack Engineer Fintech','url':'https://pk.linkedin.com/jobs/view/full-stack-engineer-fintech-at-nostro-4478062965','reason':'Employer LinkedIn explicitly closed; required financial ledger/reconciliation and SQL experience not established.'},
 {'company':'Nexterse','title':'Prompt Engineer / AI Full-Stack Engineer','url':'https://pk.linkedin.com/jobs/view/prompt-engineer-ai-full-stack-engineer-at-nexterse-4469370194','reason':'Closed listing; production AWS and model-training requirements unsupported.'},
 {'company':'Krank','title':'React Developer','url':'https://pk.linkedin.com/jobs/view/react-developer-at-krank-4198710135','reason':'Employer LinkedIn explicitly no longer accepts applications.'},
 {'company':'Tecmyer','title':'Senior-Level Full Stack Software Developer','url':'https://www.rozee.pk/EN/tecmyer-senior-level-full-stack-software-developer-remote-jobs-1873483','reason':'Board deadline2026-10-09 has passed; no newer canonical role verified.'},
 {'company':'Xentric AI','title':'Senior Backend Developer Part-Time','url':'https://pk.indeed.com/jobs?fromage=3&q=Walk+Interview','reason':'Required PostgreSQL fluency/schema/indexing unproven. Six-day EST-overlap commitment and PKR30–50k expectation unanswered.'},
 {'company':'SME Careers','title':'React/Next and Node/React roles','url':'https://pk.linkedin.com/jobs/view/react-and-next-js-engineer-at-sme-careers-4424725773','reason':'Closed; also explicitly has no immediate project. Do not count a future talent pool as a current job.'}
]

def normalized(url):
    p=urlsplit(url)
    return (p.hostname or '').lower().removeprefix('www.') + p.path.rstrip('/') + ('?'+p.query if p.query else '')
existing_urls={normalized(j['url']) for j in EXISTING}
existing_companies={j.get('company','').casefold() for j in EXISTING}
for job in jobs:
    assert normalized(job['jobUrl']) not in existing_urls
    assert job['company'].casefold() not in existing_companies
    for req in job['requirements']:
        assert set(req['evidenceIds']) <= {e['id'] for e in PROFILE['evidence']}
        facts=json.loads(FACTS.read_text())
        for pointer in req['factPointers']:
            obj=facts
            for token in pointer.lstrip('/').split('/'):
                obj=obj[int(token)] if isinstance(obj,list) else obj[token]

data={'schemaVersion':1,'researchedAt':NOW,'localDate':'2026-10-16','scope':'New Pakistan-compatible React/TypeScript/full-stack leads; read-only research. No submissions, mail, account creation, or live import.',
 'candidateFactsPath':'.job-search/resumes/masters/facts.json','candidateFactsSha256':hashlib.sha256(FACTS.read_bytes()).hexdigest(),'evidenceProfilePath':'.job-search/import/profile.json',
 'candidateConstraints':{'degree':'none','availability':'immediate','experience':'4+ years; do not round to5','claims':'Candidate-reported; not independently verified. No new skills inferred from agent-built portal.'},
 'dedup':{'importedSnapshot':'.job-search/import/reviewed-preview-readiness.json','importedJobCount':len(EXISTING),'alsoSearched':['docs/jobs/research/','.job-search/application-readiness.json','.job-search/readiness-primary.json','.job-search/readiness-bamboo.json'],'newPrimaryLeadCount':len(jobs),'applicationReadyCount':0,'method':'Employer/title and normalized canonical URL. Neither new employer appears in prior40 or prior research text.'},
 'interpretation':'Two live employer-listed leads with supported published technical scope, not verified application-ready matches. Short JDs limit eligibility certainty; holds and exclusions are not shortlist padding.',
 'jobs':jobs,'verificationHolds':holds,'excluded':exclusions,'sources':captures,'validation':{'candidateFactPointersResolve':True,'profileEvidenceIdsValid':True,'existing40DedupPassed':True,'noNetworkWrites':True}}
(ROOT/'findings.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
(ROOT/'sources'/'manifest.json').write_text(json.dumps(captures,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'path':str(ROOT/'findings.json'),'newPrimaryLeads':len(jobs),'readyToApply':0,'holds':len(holds),'exclusions':len(exclusions),'sources':len(captures),'statusCounts':{str(code):sum(c.get('status')==code for c in captures) for code in set(c.get('status') for c in captures)}}))
