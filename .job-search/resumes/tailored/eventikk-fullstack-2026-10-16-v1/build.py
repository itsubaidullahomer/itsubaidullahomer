import json, hashlib, importlib.util, datetime, urllib.request
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
ROOT=Path.cwd()
D=ROOT/'.job-search/resumes/tailored/eventikk-fullstack-2026-10-16-v1'
OUT=ROOT/'output/pdf/ubaidullah-omer-eventikk-fullstack-2026-10-16-v1-ats.pdf'
if OUT.exists(): raise RuntimeError('Immutable version already exists')
D.mkdir(parents=True,exist_ok=True)
MASTER=ROOT/'.job-search/resumes/masters'
source=MASTER/'2026-10-16-v3/facts.snapshot.json'
facts=json.loads(source.read_text())
confirmationPath=ROOT/'.job-search/private/application-facts.json'
confirmations=json.loads(confirmationPath.read_text())
facts['candidateConfirmations']=confirmations
for skill in facts['skills']:
    if skill['label']=='Backend' and 'PostgreSQL' not in skill['text']:
        skill['text']=skill['text'].replace('SQL (3+ years), GraphQL','SQL (3+ years), PostgreSQL, GraphQL')
facts['titles']['full_stack']='Full-Stack Engineer | React, TypeScript, Node.js'
facts['summaries']['full_stack']='Full-stack engineer building production applications with React, TypeScript, Node.js and MongoDB. Leads engineering at Tututor.ai / EduNova across web products, shared backend services and mobile apps. Experience includes scoped data access, billing, booking interfaces and analytics. Based in Pakistan. Available immediately for remote work.'
config={'focus':'full_stack','slug':'eventikk-fullstack-2026-10-16-v1','projects':['yaksport','illume','viloi'],'experienceBullets':{'tututor':['tututor_backend','tututor_platform','tututor_leadership','tututor_scope'],'danzee':['danzee_components','danzee_jurri']}}
(D/'config.json').write_text(json.dumps(config,indent=2)+'\n')
(D/'facts.snapshot.json').write_text(json.dumps(facts,indent=2)+'\n')
spec=importlib.util.spec_from_file_location('resume_builder',MASTER/'build_resumes.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
focus,slug,experience,projects=mod.select(facts,config)
(D/'resume.md').write_text(mod.markdown(facts,focus,experience,projects))
bottom=mod.render_ats(OUT,facts,focus,experience,projects)
words=mod.verify(OUT,facts)
reader=PdfReader(OUT)
normal=' '.join(' '.join(p.extract_text() or '' for p in reader.pages).split())
for e in experience:
    for b in e['bullets']: assert ' '.join(b['text'].split()) in normal,b['id']
for p in projects: assert ' '.join(p['text'].split()) in normal,p['id']
assert all(s not in normal for s in ['AWS','Azure','Google Cloud','Bachelor','B.Sc'])
with pdfplumber.open(OUT) as pdf:
    outside=[c for p in pdf.pages for c in p.chars if c['x0']<34 or c['x1']>mod.W-34 or c['top']<25 or c['bottom']>mod.H-15]
assert not outside
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda b:hashlib.sha256(b).hexdigest()
sources=[]
for name,url in [('careers','https://eventikk.com/careers.html'),('company','https://eventikk.com/'),('about','https://eventikk.com/about.html')]:
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    html=urllib.request.urlopen(request,timeout=30).read()
    (D/('official-'+name+'.html')).write_bytes(html)
    sources.append({'url':url,'sha256':sha(html),'capturedAt':now})
provenance={'createdAt':now,'sources':sources,'sourceFacts':{'path':str(source),'sha256':sha(source.read_bytes())},'confirmationSource':{'path':str(confirmationPath),'sha256':sha(confirmationPath.read_bytes())},'selectedFactIds':[b['id'] for e in experience for b in e['bullets']]+[p['id'] for p in projects],'tailoring':'Emphasizes React/TypeScript/Node, school-scoped backend access, billing, founder collaboration, booking workflows and analytics relevant to the venue ERP. All experience bullets retain source wording. No claim of prior Eventikk employment or venue-industry ERP work.','boundaries':['No degree','No major-cloud production experience','No specific PostgreSQL tenure','Short employer listing; detailed scope and terms remain unspecified','No verified funding claim','Candidate-reported career evidence, not independent verification'],'submission':False}
(D/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
meta={'createdAt':now,'path':str(OUT),'sha256':sha(OUT.read_bytes()),'bytes':OUT.stat().st_size,'pages':len(reader.pages),'searchableWords':words,'links':len(reader.pages[0].get('/Annots',[])),'contentBottomPt':bottom,'charactersOutsideSafeArea':0,'visualQa':'pending','cloudWrites':False}
(D/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta))
