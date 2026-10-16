import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const directory = new URL('./', import.meta.url);
const html = fs.readFileSync(new URL('job.html', directory), 'utf8');
const source = fs.readFileSync(new URL('application.js', directory), 'utf8');
function test(shimToggle, shimStats) {
 const calls=[];
 const tags=[...html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map(match=>({tag:match[1],attrs:Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]))}));
 function node(tag) {
  if(!tag) return null;
  return { dataset:{position:tag.attrs['data-position']}, classList:{contains:()=>false,add(){},remove(){},toggle(){}},style:{},getBoundingClientRect:()=>({top:9999}),addEventListener:(event)=>calls.push({event,tag:tag.tag,className:tag.attrs.class??''}),querySelector:select,querySelectorAll:()=>[] };
 }
 function select(selector){
  if(selector==='.nav__toggle' && shimToggle)return node({tag:'button',attrs:{class:'nav__toggle'}});
  if(selector.startsWith('.'))return node(tags.find(t=>(t.attrs.class??'').split(/\s+/).includes(selector.slice(1))));
  const match=selector.match(/^(\w+)\[type="([^"]+)"\]$/);if(match)return node(tags.find(t=>t.tag===match[1]&&t.attrs.type===match[2]));
  return null;
 }
 const document={createElement:()=>({relList:{supports:()=>true}}),getElementById(id){if(id==='stats'&&shimStats)return node({tag:'section',attrs:{id:'stats'}});return node(tags.find(t=>t.attrs.id===id))},querySelector:select,querySelectorAll:()=>[],addEventListener(){}};
 let error=null;let networkCalls=0;
 try{vm.runInNewContext(source,{document,window:{addEventListener(){},matchMedia:()=>({matches:true}),innerHeight:800,scrollY:0},fetch(){networkCalls++;throw new Error('Network disabled in offline diagnosis')},FormData:class{},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},localStorage:{getItem:()=>null}}, {filename:'captured-employer-application.js'});}catch(e){error={name:e.name,message:e.message};}
 return {shimToggle,shimStats,error,applicationSubmitHandlerAttached:calls.some(c=>c.event==='submit'&&c.className==='job-apply-form'),networkCalls};
}
const cases=[test(false,false),test(true,false),test(true,true)];
assert.equal(cases[0].applicationSubmitHandlerAttached,false);assert.match(cases[0].error.message,/addEventListener/);
assert.equal(cases[1].applicationSubmitHandlerAttached,false);assert.match(cases[1].error.message,/getBoundingClientRect/);
assert.equal(cases[2].applicationSubmitHandlerAttached,true);assert.equal(cases[2].error,null);
assert.ok(cases.every(c=>c.networkCalls===0));
const result={checkedAt:new Date().toISOString(),method:'Offline vm execution of captured public script with a minimal DOM derived from the captured HTML; no browser, no form submit, no network. Shims are diagnostic only and do not modify employer files.',cases,formTag:html.match(/<form\b[^>]*class="job-apply-form"[^>]*>/)?.[0],diagnosis:'The captured page lacks nav toggle and stats nodes. The unchanged shared script stops at the missing nav toggle before registering form submit. Adding only that node exposes a second failure at stats. With both simulated nodes present, the actual script registers the form handler.'};
fs.writeFileSync(new URL('diagnosis-bootstrap-result.json',directory),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
