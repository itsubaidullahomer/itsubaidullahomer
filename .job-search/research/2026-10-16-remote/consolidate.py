import json,pathlib,hashlib,datetime
p=pathlib.Path('.job-search/research/2026-10-16-remote');d=json.loads((p/'findings-main.json').read_text());c=json.loads((p/'agent-new/research.json').read_text());j=json.loads((p/'laralink-job.json').read_text());r=json.loads((p/'laralink-review.json').read_text())
laralink={'id':j['id'],'company':j['company'],'title':j['title'],'companyUrl':j['research']['companyUrl'],'jobUrl':j['url'],'disposition':'strong_technical_match_eligibility_unconfirmed','fit':j['fit'],'applicationReady':False,'whyCloser':'Six essentials align with the existing React career, frontend foundation, Redux, Git/CI and product collaboration evidence. TypeScript and named test frameworks are optional, so no unreported tenure, SQL or infrastructure specialization is needed.','availability':{'status':'Open on official site','checkedAt':j['discoveredAt'],'evidence':r['currentOpeningEvidence']},'location':r['eligibility'],'degreeRequirement':r['eligibility']['degree'],'requirements':[], 'application':r['application'],'publicRoutes':r['publicReferralRoutes'],'missingAnswers':r['missingAnswers'],'responsibilityEvidence':r['responsibilityEvidence'],'nextAction':j['nextAction'],'sourceIds':['laralink-frontend','laralink-careers','laralink-about','laralink-form-script'],'jobSchemaRecord':'laralink-job.json'}
for x in r['requirements']:
 ev=[]
 for ref in x['candidateSourceReferences']:
  if 'facts.json#' in ref:ev.append({'path':'.job-search/resumes/masters/facts.json','pointer':ref.split('#',1)[1]})
  elif ':' in ref: path,lines=ref.rsplit(':',1);ev.append({'path':path,'lines':lines})
 laralink['requirements'].append({'id':x['requirementId'],'text':x['requirement'],'essential':x['essential'],'assessment':x['assessment'],'evidence':ev,'reason':x['rationale'],'employerSourceId':x['sourceId'],'employerSourceLocator':x['sourceLocator']})
d['shortlist'].insert(0,laralink)
for x in c['reserves']:x['applicationReady']=False;x['fit']='unknown';d['reserves'].append(x)
d['excluded'].extend(x for x in c['excluded'] if x['company']!='Appkeeper')
d['childFindings']='agent-new/research.json';d['preparedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
manifest=json.loads((p/'source-manifest.json').read_text())+c['sourceManifest']+c['boardSourceManifest']
for x in manifest:
 assert hashlib.sha256(pathlib.Path(x['path']).read_bytes()).hexdigest()==x['sha256'],x
(p/'all-source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');d['sourceManifest']='all-source-manifest.json'
ptrcount=0
for job in d['shortlist']+[d['reserves'][0]]:
 for req in job['requirements']:
  for e in req['evidence']:
   path=pathlib.Path(e['path']);assert path.exists()
   if 'pointer' in e:
    obj=json.loads(path.read_text())
    for token in e['pointer'].strip('/').split('/'):
     token=token.replace('~1','/').replace('~0','~');obj=obj[int(token)] if isinstance(obj,list) else obj[token]
    ptrcount+=1
corpora=['docs/jobs/research/consolidated-2026-10-15.json','.job-search/import/workspace-actions.json','.job-search/import/new-leads-kanban.json','.job-search/import/reviewed-preview-readiness.json','.job-search/heartbeat/workspace-2026-10-16.json'];checks=[]
for name in corpora:
 path=pathlib.Path(name)
 if not path.exists():continue
 raw=path.read_bytes();text=raw.decode().lower();overlap=[j['company'] for j in d['shortlist'] if j['company'].lower() in text];assert not overlap,overlap
 checks.append({'path':name,'sha256':hashlib.sha256(raw).hexdigest(),'companyOrUrlOverlap':overlap})
d['validation']={'sourceHashesVerified':len(manifest),'factsJsonPointersVerified':ptrcount,'deduplication':checks,'candidateFactsUnchanged':hashlib.sha256(pathlib.Path(d['candidateFactsPath']).read_bytes()).hexdigest()==d['candidateFactsSha256']}
d['counts']={'shortlisted':2,'strongTechnicalFit':1,'unknownTechnicalFit':1,'applicationReady':0,'reservesNotShortlisted':2,'excludedOrNotAdvanced':len(d['excluded'])}
(p/'findings.json').write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'counts':d['counts'],'validation':d['validation']},indent=2))
