import {readFileSync,writeFileSync} from 'node:fs';
import {applyAction,deriveFit,validateJob} from '../../lib/jobs/domain';
import {parseAction,assertJob} from '../../lib/jobs/validation';
import type {Workspace,WorkspaceAction} from '../../lib/jobs/types';
const dir='.job-search/import/';
let workspace: Workspace=JSON.parse(readFileSync(dir+'validated-workspace-preview.json','utf8'));
const actions:WorkspaceAction[]=JSON.parse(readFileSync(dir+'reviewed-actions-kanban.json','utf8'));
const notes=JSON.parse(readFileSync(dir+'reviewed-notes-kanban.json','utf8'));
const knownEvidence=new Set(workspace.profile.evidence.map(e=>e.id));
for(const a of actions){
 if(a.type!=='update_job')throw new Error('Expected update only');
 for(const r of a.patch.requirements??[]){if(r.assessment==='met'&&!r.evidenceIds.length)throw new Error('Met without evidence');for(const id of r.evidenceIds)if(!knownEvidence.has(id))throw new Error('Unknown evidence '+id);}
 a.patch.fit=deriveFit(a.patch.requirements!);
 const parsed=parseAction(a); if(Buffer.byteLength(JSON.stringify(parsed))>150000)throw new Error('Request exceeds limit');
 workspace=applyAction(workspace,parsed);
 const job=workspace.jobs.find(j=>j.id===a.id)!;assertJob(job); const check=validateJob(job);if(!check.valid)throw new Error(check.errors.join(';'));
 if(job.fit!==a.patch.fit)throw new Error('Fit altered unexpectedly');
 if(job.appliedAt||job.status==='approved'||job.status==='applied')throw new Error('Review must not approve or apply');
 notes.jobs.find((j:{jobId:string})=>j.jobId===a.id).fit=job.fit;
}
const reviewed=workspace.jobs.filter(j=>actions.some(a=>a.type==='update_job'&&a.id===j.id));
const counts=reviewed.reduce((c,j)=>({...c,[j.fit]:c[j.fit]+1}),{strong:0,gaps:0,unknown:0,stretch:0});
notes.counts=counts;
writeFileSync(dir+'reviewed-actions-kanban.json',JSON.stringify(actions,null,2)+'\n');
writeFileSync(dir+'reviewed-notes-kanban.json',JSON.stringify(notes,null,2)+'\n');
writeFileSync(dir+'reviewed-preview-kanban.json',JSON.stringify(workspace,null,2)+'\n');
console.log(JSON.stringify({counts,jobs:reviewed.map(j=>({id:j.id,fit:j.fit,eligibility:j.eligibility,requirements:j.requirements.length,met:j.requirements.filter(r=>r.assessment==='met').length})),maxActionBytes:Math.max(...actions.map(a=>Buffer.byteLength(JSON.stringify(a))))},null,2));
