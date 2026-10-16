import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {ownerRequest} from '../../../scripts/jobs-agent-client.mjs';
process.umask(0o077);
const dir='.job-search/research/2026-10-16-resumed/';
const now=new Date().toISOString();
const facts=JSON.parse(await fs.readFile('.job-search/private/application-facts.json','utf8'));
let {workspace:w}=await(await ownerRequest('/api/jobs/workspace')).json();
const write=async action=>await(await ownerRequest('/api/jobs/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(action)})).json();
const cloud={id:'ev-confirmed-cloud-study',skill:'AWS / Azure / Google Cloud — study only, no production experience',level:'unverified',source:'https://admin.itsubaidullahomer.com/admin',verified:false,statement:'Candidate clarified on October 16, 2026 that they have studied cloud platforms and believe they can work with them, but do not have proper production working experience. No specific platform, service, certification or tenure was confirmed. Do not present this as production AWS, Azure or GCP experience.'};
if(!w.profile.evidence.some(e=>e.id===cloud.id)){
  w.profile.evidence.push(cloud);
  await write({type:'update_profile',profile:w.profile});
}
const acknowledgement={messageId:'1a1433ab0a616580',from:'info@niyyt.com',to:'itsubaidullahomer@gmail.com',subject:'Application Received: Full Stack Engineer (Next.js & Node.js) - niyyt',receivedAt:'2026-10-16T05:41:17Z',checkedAt:now,classification:'automated_receipt',summary:'Employer confirms receipt of application and resume. Hiring team will review; technical discussion is conditional. Typical response window 5–7 business days. No interview invitation or offer.',url:'https://mail.google.com/mail/u/?authuser=itsubaidullahomer%40gmail.com#all/1a1433ab0a616580'};
await fs.writeFile('.job-search/applications/niyyt-2026-10-16-v1/employer-acknowledgement.json',JSON.stringify(acknowledgement,null,2)+'\n');
if(!w.activities.some(a=>a.body?.includes(acknowledgement.messageId))){
  await write({type:'add_activity',activity:{id:randomUUID(),jobId:'niyyt-fullstack-pakistan-20261016',type:'email_received',title:'Niyyt acknowledged the application and resume',body:JSON.stringify(acknowledgement),actor:'agent',createdAt:now}});
  const job=w.jobs.find(j=>j.id==='niyyt-fullstack-pakistan-20261016');
  await write({type:'update_job',id:job.id,patch:{notes:job.notes+'\nEmployer automated acknowledgement received. No interview yet.',nextAction:'Employer acknowledged application and resume; allow the stated 5–7 business-day review window. Check for a response before considering a follow-up on October 27. Do not duplicate the application.',nextActionDate:'2026-10-27'}});
}
await fs.writeFile(dir+'resumption.json',JSON.stringify({recordedAt:now,activeAgent:'Codex',claudeSubmitting:false,source:'Direct user confirmation: No—keep Codex as the active agent',automation:'ACTIVE',cloudConfirmation:facts.skills.majorCloudPlatforms,niyytAcknowledgement:acknowledgement},null,2)+'\n');
console.log(JSON.stringify({cloudStudyRecorded:true,niyytAcknowledgementRecorded:true,followUpReview:'2026-10-27'}));
