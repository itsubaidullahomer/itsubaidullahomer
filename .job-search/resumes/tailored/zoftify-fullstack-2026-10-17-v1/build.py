"""Zoftify Full Stack Developer (React + Node.js), BambooHR req 41. Run from the repo root."""
import json, hashlib, datetime, types
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
ROOT=Path.cwd()
D=ROOT/'.job-search/resumes/tailored/zoftify-fullstack-2026-10-17-v1'
OUT=ROOT/'output/pdf/ubaidullah-omer-zoftify-fullstack-2026-10-17-v1-ats.pdf'
if OUT.exists(): raise RuntimeError('Immutable version already exists')
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
# Built from scratch and Figma fidelity: candidate confirmed 2026-10-16 (additionalConfirmations.productDelivery).
facts['summaries']['full_stack']='Full-stack engineer building production applications from scratch with React, TypeScript and Node.js, turning Figma designs into precise, responsive interfaces backed by REST APIs and SQL or MongoDB data. Leads engineering at Tututor.ai / EduNova across web products, shared backend services and mobile apps. Built a bilingual travel booking interface for a sports travel agency. Based in Pakistan. Available immediately for remote work.'
config={'focus':'full_stack','slug':'zoftify-fullstack-2026-10-17-v1','projects':['yaksport','viloi','illume'],'experienceBullets':{'tututor':['tututor_scope','tututor_backend','tututor_platform','tututor_leadership'],'danzee':['danzee_components','danzee_jurri']}}
(D/'config.json').write_text(json.dumps(config,indent=2)+'\n')
(D/'facts.snapshot.json').write_text(json.dumps(facts,indent=2)+'\n')
# The master renderer hard-codes macOS font paths; load it with the same Liberation fonts from this machine.
src=(MASTER/'build_resumes.py').read_text()
src=src.replace("Path('/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')","Path('/usr/share/fonts/truetype/liberation')")
src=src.replace("'/System/Library/Fonts/Supplemental/Courier New.ttf'","'/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf'")
mod=types.ModuleType('resume_builder'); mod.__file__=str(MASTER/'build_resumes.py'); exec(compile(src,mod.__file__,'exec'),mod.__dict__)
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
assert len(reader.pages)==1
with pdfplumber.open(OUT) as pdf:
    outside=[c for p in pdf.pages for c in p.chars if c['x0']<34 or c['x1']>mod.W-34 or c['top']<25 or c['bottom']>mod.H-15]
assert not outside
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda b:hashlib.sha256(b).hexdigest()
provenance={'createdAt':now,'job':{'id':'zoftify-41','title':'Full Stack Developer (React + Node.js)','url':'https://zoftify.bamboohr.com/careers/41','descriptionSource':'Codex capture 2026-10-15 (research/2026-10-16-resumed/workspace-before.json); live page not reachable from this session'},'sourceFacts':{'path':str(source),'sha256':sha(source.read_bytes())},'confirmationSource':{'path':str(confirmationPath),'sha256':sha(confirmationPath.read_bytes())},'selectedFactIds':[b['id'] for e in experience for b in e['bullets']]+[p['id'] for p in projects],'tailoring':'Leads with from-scratch delivery, Figma-to-interface work, REST and SQL/PostgreSQL to match the JD; Yaksport travel booking first as the closest domain match. Experience bullets keep source wording.','boundaries':['No degree','No major-cloud production experience','No specific PostgreSQL tenure','No claim of travel-industry employment','Candidate-reported career evidence, not independent verification'],'submission':False}
(D/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
meta={'createdAt':now,'path':str(OUT.relative_to(ROOT)),'sha256':sha(OUT.read_bytes()),'bytes':OUT.stat().st_size,'pages':len(reader.pages),'searchableWords':words,'contentBottomPt':bottom,'charactersOutsideSafeArea':0,'visualQa':'pending'}
(D/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta))
