import {readFileSync,writeFileSync} from 'node:fs';
import {parseAction,assertJob} from '../../../lib/jobs/validation';
import {deriveFit} from '../../../lib/jobs/domain';
const dir='.job-search/research/2026-10-16-wise-ai/';
const before=JSON.parse(readFileSync(dir+'live-job-before.json','utf8'));
const actions=JSON.parse(readFileSync(dir+'proposed-update.json','utf8'));
const ids=new Set(before.evidence.map((e:{id:string})=>e.id));
for(const input of actions){
 const action=parseAction(input);
 if(action.type!=='update_job') throw new Error('Unexpected action');
 const result={...before.job,...action.patch};
 assertJob(result);
 if(deriveFit(result.requirements)!==result.fit) throw new Error('Fit mismatch');
 for(const requirement of result.requirements) for(const id of requirement.evidenceIds) if(!ids.has(id)) throw new Error('Unknown evidence '+id);
}
const result={valid:true,actionCount:actions.length,fit:'unknown',evidenceReferencesValid:true,liveWritesPerformed:false,checkedAt:new Date().toISOString()};
writeFileSync(dir+'validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
