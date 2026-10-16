import { readFileSync, writeFileSync } from 'node:fs';
import { deriveFit, normalizeUrl } from '../../../lib/jobs/domain';
import { parseAction, assertJob } from '../../../lib/jobs/validation';
import { ownerRequest } from '../../../scripts/jobs-agent-client.mjs';
async function main() {
 const { workspace } = await (await ownerRequest('/api/jobs/workspace')).json();
 const actions = JSON.parse(readFileSync('.job-search/import/remote-additions-20261016.json','utf8'));
 const ids = new Set(workspace.jobs.map((job:any) => job.id));
 const urls = new Set(workspace.jobs.map((job:any) => normalizeUrl(job.url)));
 const evidence = new Set(workspace.profile.evidence.map((item:any) => item.id));
 for (const raw of actions) {
  const action = parseAction(raw);
  if (action.type !== 'add_job') throw new Error('Unexpected mutation');
  const job=action.job; assertJob(job);
  if(ids.has(job.id) || urls.has(normalizeUrl(job.url))) throw new Error('Duplicate: '+job.id);
  if(deriveFit(job.requirements)!==job.fit) throw new Error('Fit mismatch: '+job.id);
  for(const requirement of job.requirements) for(const id of requirement.evidenceIds) if(!evidence.has(id)) throw new Error('Unknown evidence: '+id);
  if(job.appliedAt || job.status!=='discovered' || job.draft) throw new Error('Research must not imply submission/approval');
  ids.add(job.id);urls.add(normalizeUrl(job.url));
 }
 const result={checkedAt:new Date().toISOString(),actions:actions.length,liveExistingJobs:workspace.jobs.length,uniqueAgainstLive:true,validSchema:true,evidenceIdsExist:true,fitMatchesDeriveFit:true,portalWrites:0,submissions:0};
 writeFileSync('.job-search/research/2026-10-16-remote-additions/validation.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}
main();
