import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ownerRequest} from '../../../scripts/jobs-agent-client.mjs';
process.umask(0o077);
const dir='.job-search/resumes/tailored/eventikk-fullstack-2026-10-16-v1/';
const metadata=JSON.parse(await fs.readFile(dir+'metadata.json','utf8'));
if(metadata.visualQa!=='passed') throw new Error('Visual review required');
const bytes=await fs.readFile(metadata.path);
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(bytes)!==metadata.sha256) throw new Error('Resume changed');
const {documents}=await(await ownerRequest('/api/jobs/documents')).json();
let document=documents.find(d=>d.jobId==='eventikk-fullstack'&&d.sha256===metadata.sha256);
if(!document){
 const form=new FormData();form.set('file',new Blob([bytes],{type:'application/pdf'}),path.basename(metadata.path));form.set('kind','tailored_resume');form.set('title','Eventikk full-stack — tailored ATS v1 (prepared, not submitted)');form.set('jobId','eventikk-fullstack');
 ({document}=await(await ownerRequest('/api/jobs/documents',{method:'POST',body:form})).json());
}
const saved=Buffer.from(await(await ownerRequest('/api/jobs/documents/'+document.id)).arrayBuffer());
if(sha(saved)!==metadata.sha256) throw new Error('Private document hash mismatch');
await fs.writeFile(dir+'portal-document.json',JSON.stringify({...document,downloadVerifiedAt:new Date().toISOString()},null,2)+'\n');
const {workspace:w}=await(await ownerRequest('/api/jobs/workspace')).json();
const job=w.jobs.find(j=>j.id==='eventikk-fullstack');
const now=new Date().toISOString();
const inquiry={kind:'role_details_inquiry',jobId:job.id,to:'careers@eventikk.com',from:'itsubaidullahomer@gmail.com',subject:'Senior Full-Stack Developer — role details',body:'Hi Eventikk team,\n\nI saw your remote Senior Full-Stack Developer opening for Pakistan. I build production products with React, TypeScript and Node.js, including billing, booking interfaces and analytics. Your venue ERP looks relevant to that experience.\n\nCould you share the full job description and the main experience requirements, and confirm whether you are still hiring for this role?\n\nMy work: https://itsubaidullahomer.com\n\nThanks,\nUbaidullah Omer',preparedAt:now,attachment:null,applicationSubmitted:false};
await fs.writeFile('.job-search/research/2026-10-16-resumed/eventikk-inquiry.json',JSON.stringify(inquiry,null,2)+'\n');
const research=job.research;
const id='eventikk-role-recheck-20261016';
if(!research.sources.some(s=>s.id===id)) research.sources.push({id,label:'Live official role and team recheck',url:job.url,text:'Live careers page offers Senior Full-Stack Developer, React/Node.js/TypeScript, full-time remote Pakistan, and Apply Now mailto careers@eventikk.com. Full specification, experience thresholds, compensation and funding are not published. Team names taken from official About page; no personal referral relationship verified.',capturedAt:now,screenshotUrl:'',screenshotPath:path.resolve('.job-search/research/2026-10-16-resumed/eventikk-careers.png')});
for(const [name,role] of [['Waqas Abbas','Founder & CEO'],['Faizan Tariq','Co-Founder & COO'],['Rana Noman','CTO']]){
 const cid='eventikk-'+name.toLowerCase().replaceAll(' ','-');
 if(!research.contacts.some(c=>c.id===cid)) research.contacts.push({id:cid,name,role,profileUrl:'https://eventikk.com/about.html',sourceUrl:'https://eventikk.com/about.html',referralRoute:'Official careers inbox careers@eventikk.com; ask for the appropriate hiring contact. No personal referral or direct employee inbox verified.',notes:'Employer-published team bio; not an independently verified employee relationship.',capturedAt:now});
}
await ownerRequest('/api/jobs/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'update_job',id:job.id,patch:{research,contactEmail:inquiry.to,status:'drafting',nextAction:'Tailored resume saved privately and visually verified. Request full role details before assessing complete fit or submitting an application.',notes:job.notes+'\n2026-10-16: Prepared and visually verified tailored ATS resume; saved immutable private document '+document.id+'. Detailed scope remains unknown; no application sent.'}})});
console.log(JSON.stringify({documentId:document.id,sha256:document.sha256,fit:job.fit,applicationSubmitted:false}));
