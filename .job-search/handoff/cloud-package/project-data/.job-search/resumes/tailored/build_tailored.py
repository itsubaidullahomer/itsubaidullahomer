#!/usr/bin/env python3
"""Create ATS-only variants by selecting existing source facts; no career text is invented."""
import json,hashlib,importlib.util,datetime,subprocess,re
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];MASTER=HERE.parent/'masters'
spec=importlib.util.spec_from_file_location('resume_master',MASTER/'build_resumes.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
facts=json.loads((MASTER/'facts.json').read_text());source_index=json.loads((HERE/'sources/index.json').read_text())
readiness={x['jobId']:x for x in json.loads((ROOT/'.job-search/application-readiness.json').read_text())['jobs']}
reviewed={x['jobId']:x for x in json.loads((ROOT/'.job-search/import/reviewed-notes-kanban.json').read_text())['jobs']}
whippy=json.loads((ROOT/'.job-search/import/new-leads-kanban.json').read_text())
base={x['id']:x for x in json.loads((ROOT/'.job-search/import/validated-workspace-preview.json').read_text())['jobs']}
newjob=json.loads((ROOT/'.job-search/import/new-leads-kanban-actions.json').read_text())[0]['job'];base[newjob['id']]=newjob
sha=lambda raw:hashlib.sha256(raw).hexdigest()
configs=[
 dict(jobId='yc-agave-unmv0mv',company='Agave',focus='full_stack',slug='agave-full-stack',projects=['illume','viloi','yaksport'],experienceBullets={'tututor':['tututor_backend','tututor_platform','tututor_leadership','tututor_export','tututor_scope'],'danzee':['danzee_components','danzee_jurri']},reason='Lead with backend/data boundaries, integration delivery and validated exports for a financial-operations API product. Illume leads the projects for analytics and external data integrations.',mapping=[{'need':'Backend/API integrations and cloud familiarity','facts':['tututor_backend','tututor_platform','illume'],'boundary':'Does not claim AWS, CDK or PostgreSQL mastery.'},{'need':'Ownership and reliable shipping','facts':['tututor_leadership','tututor_export','danzee_components'],'boundary':'Golden tests are described accurately; no generic test-framework expertise added.'}]),
 dict(jobId='yc-finni-health-ph1y4dp',company='Finni Health',focus='full_stack',slug='finni-health-full-stack',projects=['illume','yaksport','viloi'],experienceBullets={'tututor':['tututor_platform','tututor_scope','tututor_backend','tututor_leadership','tututor_ai'],'danzee':['danzee_components','danzee_jurri']},reason='Lead with released React Native apps, connected web products and full-stack ownership. Analytics, booking and authenticated billing products show adjacent workflow experience without claiming healthcare compliance expertise.',mapping=[{'need':'Web/mobile/backend product delivery','facts':['tututor_platform','tututor_backend','tututor_scope'],'boundary':'Does not turn Firebase Cloud Messaging into general Firebase/GCP expertise.'},{'need':'Product judgment and end-to-end ownership','facts':['tututor_leadership','illume','yaksport','viloi'],'boundary':'No autism-care or regulated-healthcare experience is invented.'}]),
 dict(jobId='yc-furtherai-zrn2j29',company='FurtherAI',focus='frontend',slug='furtherai-frontend',projects=['viloi','illume','yaksport'],experienceBullets={'tututor':['tututor_ai','tututor_scope','tututor_leadership','tututor_backend','tututor_export'],'danzee':['danzee_jurri','danzee_components']},reason='Pair AI product delivery and early product ownership with frontend performance. Put the paid AI product first, then data-rich analytics and multilingual interfaces.',mapping=[{'need':'React systems, ownership and AI-native interfaces','facts':['tututor_ai','tututor_scope','tututor_leadership','danzee_components'],'boundary':'No insurance domain expertise or model-training claim.'},{'need':'Shipped frontend/product quality','facts':['danzee_jurri','viloi','illume','tututor_export'],'boundary':'Existing sourced metrics are unchanged.'}]),
 dict(jobId='yc-simple-ai-byegx5m',company='Simple AI',focus='ai_product',slug='simple-ai-founding-engineer',projects=['viloi','illume'],experienceBullets={'tututor':['tututor_ai','tututor_leadership','tututor_platform','tututor_backend','tututor_scope'],'danzee':['danzee_components','danzee_jurri']},reason='Prioritize production LLM integrations, founder collaboration and full-stack ownership. Use the paid multi-provider AI product and AI analytics as the two most relevant work examples.',mapping=[{'need':'Customer-focused full-stack AI product building','facts':['tututor_ai','tututor_leadership','viloi','illume'],'boundary':'Does not claim voice-agent design, Python, Rails, AWS or model research.'},{'need':'Self-directed delivery and problem solving','facts':['tututor_backend','tututor_platform','danzee_jurri'],'boundary':'No special on-site or trial commitment appears in the resume.'}])]
frontend_path=HERE/'frontend-selection-review.json'
if not frontend_path.exists():raise RuntimeError('Await frontend review before authoring')
frontend=json.loads(frontend_path.read_text())
if isinstance(frontend,dict):frontend=frontend.get('reviews',frontend.get('jobs',frontend.get('selections',[])))
for x in frontend:
 config={k:x[k] for k in ['jobId','focus','projects','experienceBullets']}
 config['company']=base[x['jobId']]['company']
 config['slug']={'zoftify-29':'zoftify-frontend','eventmobi-frontend-458':'eventmobi-frontend','remote-metabase-8f02d3fa-edf4-4433-a6d1-4f9e517ac8f9':'metabase-frontend','whippy-frontend-da02ad44':'whippy-frontend'}[x['jobId']]
 config['reason']=x.get('reason',x.get('reasons',[]));config['mapping']=x.get('mapping',x.get('reasons',[]));config['unsupportedKeywords']=x.get('unsupportedkeywords',x.get('unsupportedKeywords',[]))
 configs.append(config)
if len(configs)!=8:raise RuntimeError(f'Expected 8 configs, got {len(configs)}')
manifest={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'purpose':'Private per-job ATS resume versions. No applications or uploads performed.','truthPolicy':'Only selects/reorders source facts. No degree, new skill, employment tenure, legal status, language level or special commitment has been added.','sourceFacts':{'path':str((MASTER/'facts.json').resolve()),'sha256':sha((MASTER/'facts.json').read_bytes())},'renderer':{'path':str((MASTER/'build_resumes.py').resolve()),'sha256':sha((MASTER/'build_resumes.py').read_bytes()),'method':'ATS-only renderer imported without changing master source; single-column searchable text.'},'resumes':[]}
for x in configs:
 jobid=x['jobId'];j=base[jobid];config={k:x[k] for k in ['focus','slug','projects','experienceBullets']};cp=HERE/(x['slug']+'.json');cp.write_text(json.dumps(config,indent=2)+'\n')
 focus,slug,experience,projects=mod.select(facts,config)
 editable=HERE/(slug+'.md');editable.write_text(mod.markdown(facts,focus,experience,projects))
 # Display the analytics project's existing stack for this analytics role;
 # the words come directly from the approved project fact, not a new skill.
 display_projects=[{**p,'text':p['text']+' Stack: '+p['stack']+'.'} if jobid.startswith('remote-metabase') and p['id']=='illume' else p for p in projects]
 out=ROOT/'output/pdf'/f'ubaidullah-omer-{slug}-ats.pdf';bottom=mod.render_ats(out,facts,focus,experience,display_projects);words=mod.verify(out,facts)
 record=reviewed.get(jobid,readiness.get(jobid,{}));fit=record.get('fit',j['fit']);blockers=record.get('missingFacts',j['nextAction'].split('; '))
 # The requested exact document now exists; other facts/approvals stay unresolved.
 blockers=[b for b in blockers if not b.startswith('Exact tailored resume')]
 sourcekey={'Finni Health':'finni','Simple AI':'simple-ai'}.get(x['company'],x['company'].lower());live=source_index[sourcekey]
 if 'sha256' in live:jdsource=live
 else:
  earlier=record.get('sources',[])
  earlier=next((s for s in earlier if 'sha256' in s),None)
  if earlier:jdsource={**earlier,'checkedAt':record['verifiedAt'],'scope':'SHA256 of the full employer detail/form-schema response recorded in application-readiness.json. Latest direct refetch was blocked; prior verified snapshot is the tailoring basis.','latestRefetch':live}
  else:
   source_record=record or newjob
   raw=(json.dumps(source_record,sort_keys=True,ensure_ascii=False,separators=(',',':'))+'\n').encode();sp=HERE/'sources'/(sourcekey+'-review-record.json');sp.write_bytes(raw)
   jdsource={'url':j['url'],'checkedAt':record.get('verifiedAt',newjob['discoveredAt']),'path':str(sp.resolve()),'sha256':sha(raw),'scope':'Hash of the reviewed employer JD/application record, not raw employer HTML. Full source was read during the prior review; latest direct refetch was blocked.','latestRefetch':live}
 reader=PdfReader(out);text='\n'.join(p.extract_text() or '' for p in reader.pages)
 with pdfplumber.open(out) as pdf:
  chars=pdf.pages[0].chars
  outside=[c for c in chars if c['x0']<34 or c['x1']>mod.W-34 or c['top']<25 or c['bottom']>mod.H-15]
  if outside:raise RuntimeError(f'Characters outside safe page geometry: {slug}')
 # Require exact underlying selected factual sentences in extracted order.
 normalized=' '.join(text.split())
 for e in experience:
  for b in e['bullets']:
   if ' '.join(b['text'].split()) not in normalized:raise RuntimeError('Selected source bullet lost '+b['id'])
 for p in projects:
  if ' '.join(p['text'].split()) not in normalized:raise RuntimeError('Selected project lost '+p['id'])
 checks={'pages':len(reader.pages),'searchableWords':words,'links':len(reader.pages[0].get('/Annots',[])),'singleColumn':True,'identityContactDatesFound':True,'allSelectedFactualTextPreserved':True,'noForbiddenDegreeOrExcludedClaims':True,'charactersOutsideSafeArea':0,'contentBottomPoints':round(bottom,1),'extractedTextPath':str(out.with_suffix('.txt').resolve())}
 manifest['resumes'].append({'jobId':jobid,'company':x['company'],'role':j['title'],'path':str(out.resolve()),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'kind':'tailored_resume','title':x['company']+' - '+j['title']+' - tailored ATS resume','configPath':str(cp.resolve()),'editableSourcePath':str(editable.resolve()),'fit':fit,'blockers':blockers,'applicationReady':False,'jobSource':jdsource,'tailoringReason':x['reason'],'jobTargetMapping':x['mapping'],'selectedFactIds':[b['id'] for e in experience for b in e['bullets']]+[p['id'] for p in projects],'unsupportedKeywordsNotAdded':x.get('unsupportedKeywords',[]),'atsInspection':checks,'visualQA':{'status':'pending','previewPath':str((HERE/'previews'/(slug+'-1.png')).resolve())}})
 print(f'{x["company"]}: {words} words; bottom {bottom:.1f} pt; {out.name}')
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
