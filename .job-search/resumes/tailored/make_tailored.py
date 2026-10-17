"""Build one immutable tailored ATS résumé from the v3 facts + private confirmations.
Usage (repo root): python3 .job-search/resumes/tailored/make_tailored.py <config.json>
Config keys: slug, focus, title, summary, projects, experienceBullets, job{id,company,title,url}, tailoring.
Only selects/reorders existing fact IDs; summary must stay within confirmed facts."""
import json, hashlib, datetime, types, sys
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
ROOT=Path.cwd()
cfg=json.loads(Path(sys.argv[1]).read_text())
D=ROOT/'.job-search/resumes/tailored'/cfg['slug']; D.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'output/pdf'/f"ubaidullah-omer-{cfg['slug']}-ats.pdf"
if OUT.exists(): raise RuntimeError('Immutable version already exists: '+str(OUT))
MASTER=ROOT/'.job-search/resumes/masters'; source=MASTER/'2026-10-16-v3/facts.snapshot.json'
facts=json.loads(source.read_text())
conf=ROOT/'.job-search/private/application-facts.json'; facts['candidateConfirmations']=json.loads(conf.read_text())
for s in facts['skills']:
    if s['label']=='Backend' and 'PostgreSQL' not in s['text']: s['text']=s['text'].replace('SQL (3+ years), GraphQL','SQL (3+ years), PostgreSQL, GraphQL')
facts['titles'][cfg['focus']]=cfg['title']; facts['summaries'][cfg['focus']]=cfg['summary']
config={k:cfg[k] for k in ('focus','slug','projects','experienceBullets')}
(D/'config.json').write_text(json.dumps(cfg,indent=2)+'\n'); (D/'facts.snapshot.json').write_text(json.dumps(facts,indent=2)+'\n')
src=(MASTER/'build_resumes.py').read_text()
src=src.replace("Path('/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')","Path('/usr/share/fonts/truetype/liberation')")
src=src.replace("'/System/Library/Fonts/Supplemental/Courier New.ttf'","'/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf'")
mod=types.ModuleType('resume_builder'); mod.__file__=str(MASTER/'build_resumes.py'); exec(compile(src,mod.__file__,'exec'),mod.__dict__)
focus,slug,experience,projects=mod.select(facts,config)
(D/'resume.md').write_text(mod.markdown(facts,focus,experience,projects))
bottom=mod.render_ats(OUT,facts,focus,experience,projects); words=mod.verify(OUT,facts)
reader=PdfReader(OUT); normal=' '.join(' '.join(p.extract_text() or '' for p in reader.pages).split())
for e in experience:
    for b in e['bullets']: assert ' '.join(b['text'].split()) in normal,b['id']
for p in projects: assert ' '.join(p['text'].split()) in normal,p['id']
assert all(s not in normal for s in ['AWS','Azure','Google Cloud','Bachelor','B.Sc']) and len(reader.pages)==1
with pdfplumber.open(OUT) as pdf:
    assert not [c for p in pdf.pages for c in p.chars if c['x0']<34 or c['x1']>mod.W-34 or c['top']<25 or c['bottom']>mod.H-15]
now=datetime.datetime.now(datetime.timezone.utc).isoformat(); sha=lambda b:hashlib.sha256(b).hexdigest()
(D/'provenance.json').write_text(json.dumps({'createdAt':now,'job':cfg.get('job'),'sourceFacts':{'path':str(source.relative_to(ROOT)),'sha256':sha(source.read_bytes())},'confirmationSource':{'sha256':sha(conf.read_bytes())},'selectedFactIds':[b['id'] for e in experience for b in e['bullets']]+[p['id'] for p in projects],'tailoring':cfg.get('tailoring',''),'boundaries':['No degree','No major-cloud production experience','No specific PostgreSQL tenure','Candidate-reported career evidence, not independent verification'],'submission':False},indent=2)+'\n')
import pypdfium2 as pdfium
pdfium.PdfDocument(str(OUT))[0].render(scale=1.6).to_pil().save(D/'page-1.png')
meta={'createdAt':now,'path':str(OUT.relative_to(ROOT)),'sha256':sha(OUT.read_bytes()),'bytes':OUT.stat().st_size,'pages':1,'searchableWords':words,'contentBottomPt':bottom,'visualQa':'pending'}
(D/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n'); print(json.dumps(meta))
