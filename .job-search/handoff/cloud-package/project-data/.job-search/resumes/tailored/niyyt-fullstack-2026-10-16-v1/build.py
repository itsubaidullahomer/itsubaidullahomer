import json, hashlib, importlib.util, datetime, urllib.request
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
ROOT=Path.cwd()
D=ROOT/'.job-search/resumes/tailored/niyyt-fullstack-2026-10-16-v1'
OUT=ROOT/'output/pdf/ubaidullah-omer-niyyt-fullstack-2026-10-16-v1-ats.pdf'
if OUT.exists(): raise RuntimeError('Immutable version already exists')
MASTER=ROOT/'.job-search/resumes/masters'
source=MASTER/'2026-10-16-v3/facts.snapshot.json'
facts=json.loads(source.read_text())
confirmationPath=ROOT/'.job-search/private/application-facts.json'
confirmations=json.loads(confirmationPath.read_text())
pg=confirmations['skills']['postgresql']
assert pg['productionExperience'] is True and pg['years'] is None
# Update only the new user-confirmed skill. SQL tenure is kept separate.
for skill in facts['skills']:
    if skill['label']=='Backend':
        skill['text']=skill['text'].replace('SQL (3+ years), GraphQL','SQL (3+ years), PostgreSQL, GraphQL')
facts['candidateConfirmations']['skills']['postgresql']=pg
facts['sources'].append({'path':str(confirmationPath),'note':'Direct user confirmed production PostgreSQL experience on October 16, 2026; no tenure or feature-specialism inferred.'})
config={'focus':'full_stack','slug':'niyyt-fullstack-2026-10-16-v1','projects':['illume','viloi','yaksport'],'experienceBullets':{'tututor':['tututor_backend','tututor_leadership','tututor_platform','tututor_scope'],'danzee':['danzee_components','danzee_jurri']}}
(D/'config.json').write_text(json.dumps(config,indent=2)+'\n')
(D/'facts.snapshot.json').write_text(json.dumps(facts,indent=2)+'\n')
spec=importlib.util.spec_from_file_location('resume_builder',MASTER/'build_resumes.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
facts['titles']['full_stack']='Full-Stack Engineer | Next.js, TypeScript, Node.js'
facts['summaries']['full_stack']=facts['summaries']['full_stack'].replace('React, TypeScript, Node.js and MongoDB','Next.js, React, TypeScript, Node.js and MongoDB').replace('Available immediately.','Available immediately; flexible to Australian business hours.')
facts['candidateConfirmations']['schedule']=confirmations['schedule']
(D/'facts.snapshot.json').write_text(json.dumps(facts,indent=2)+'\n')
focus,slug,experience,projects=mod.select(facts,config)
(D/'resume.md').write_text(mod.markdown(facts,focus,experience,projects))
bottom=mod.render_ats(OUT,facts,focus,experience,projects)
words=mod.verify(OUT,facts)
reader=PdfReader(OUT)
text='\n'.join(p.extract_text() or '' for p in reader.pages)
assert 'PostgreSQL' in text and 'SQL (3+ years)' in text
normal=' '.join(text.split())
for e in experience:
    for b in e['bullets']: assert ' '.join(b['text'].split()) in normal,b['id']
for p in projects: assert ' '.join(p['text'].split()) in normal,p['id']
with pdfplumber.open(OUT) as pdf:
    outside=[c for p in pdf.pages for c in p.chars if c['x0']<34 or c['x1']>mod.W-34 or c['top']<25 or c['bottom']>mod.H-15]
assert not outside
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda b:hashlib.sha256(b).hexdigest()
html=urllib.request.urlopen('https://niyyt.com/apply-as-developer').read()
(D/'official-careers.html').write_bytes(html)
provenance={'createdAt':now,'sourceUrl':'https://niyyt.com/apply-as-developer','sourceHtmlSha256':sha(html),'sourceFacts':{'path':str(source),'sha256':sha(source.read_bytes())},'confirmationSource':{'path':str(confirmationPath),'sha256':sha(confirmationPath.read_bytes()),'postgresql':pg},'selectedFactIds':[b['id'] for e in experience for b in e['bullets']]+[p['id'] for p in projects],'tailoring':'Niyyt-specific Next.js headline, Australian-hours availability, production PostgreSQL and backend/API ownership; shipped AI SaaS and analytics projects support MVP-to-production work. Employment dates remain candidate-reported and current employment answer is pending.','boundaries':['No degree','No PostgreSQL tenure or migrations, performance tuning or row-level-security claim','No simultaneous-client availability promise','No acceptance of probationary employment contract; required personal form answers pending','No Expo, native-module or TestFlight claim','Candidate-reported employment and project metrics, not independently verified'],'renderer':{'path':str(MASTER/'build_resumes.py'),'sha256':sha((MASTER/'build_resumes.py').read_bytes())},'cloudWrites':False,'submission':False}
(D/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
meta={'createdAt':now,'path':str(OUT),'sha256':sha(OUT.read_bytes()),'bytes':OUT.stat().st_size,'pages':len(reader.pages),'searchableWords':words,'links':len(reader.pages[0].get('/Annots',[])),'contentBottomPt':bottom,'charactersOutsideSafeArea':0,'sourceFactsPreserved':True,'visualQa':'pending','cloudWrites':False}
(D/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
