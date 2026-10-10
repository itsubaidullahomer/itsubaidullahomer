import 'server-only';
import {Redis} from '@upstash/redis';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {GoogleGenAI,Modality,Type,type FunctionDeclaration,type LiveConnectConfig} from '@google/genai';
import {clientIdentity,dailyCap,validOrigin,RESERVE_SCRIPT,SESSION_SECONDS,IP_DAILY_LIMIT} from './policy';
import {projects} from '@/content/projects';
export type AvatarSession = {id:string;identity:string;mode:'polite'|'unfiltered';expiresAt:number};
export const SESSION_COOKIE='ubaid-avatar';
export const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function redis(){return new Redis({url:process.env.UPSTASH_REDIS_REST_URL!,token:process.env.UPSTASH_REDIS_REST_TOKEN!});}
export function configured(){return process.env.AVATAR_ENABLED==='true'&&!!process.env.GEMINI_API_KEY&&!!process.env.UPSTASH_REDIS_REST_URL&&!!process.env.UPSTASH_REDIS_REST_TOKEN&&dailyCap(process.env.AVATAR_DAILY_SESSION_CAP)>0;}
export function guard(request:Request){if(!validOrigin(request))return json({error:'This conversation needs to start on this site.'},403);if(!configured())return json({error:'The AI me is off duty. Tell the real me what you’re building — no token budget required.',booking:true},503);return null;}
export async function readBody(request:Request){if(Number(request.headers.get('content-length')||0)>5000)throw new Error('body');const text=await request.text();if(text.length>5000)throw new Error('body');return JSON.parse(text);}
export async function reserve(request:Request,mode:AvatarSession['mode']){
 const id=randomUUID();const identity=clientIdentity(request,process.env.GEMINI_API_KEY!);const day=new Date().toISOString().slice(0,10);const session:AvatarSession={id,identity,mode,expiresAt:Date.now()+SESSION_SECONDS*1000};
 const result=await redis().eval(RESERVE_SCRIPT,[`avatar:ip:${day}:${identity}`,`avatar:daily:${day}`,`avatar:session:${id}`],[IP_DAILY_LIMIT,dailyCap(process.env.AVATAR_DAILY_SESSION_CAP),JSON.stringify(session),SESSION_SECONDS]);
 if(result!=='ok')return null;return session;
}
export async function getSession(request:Request){const id=(await cookies()).get(SESSION_COOKIE)?.value;if(!id||!/^[a-f0-9-]{36}$/.test(id))return null;const session=await redis().get<AvatarSession>(`avatar:session:${id}`);if(!session||session.expiresAt<=Date.now()||session.identity!==clientIdentity(request,process.env.GEMINI_API_KEY!))return null;return session;}
export function attachSession(response:NextResponse,session:AvatarSession){response.cookies.set(SESSION_COOKIE,session.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/avatar',maxAge:SESSION_SECONDS});return response;}
export const ai=()=>new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY!,httpOptions:{apiVersion:'v1beta',timeout:15000}});
export const liveModel=()=>process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live';
export async function systemPrompt(mode:AvatarSession['mode']){const [persona,knowledge]=await Promise.all(['persona.md','knowledge.md'].map(n=>readFile(join(process.cwd(),'content/avatar',n),'utf8')));return `${persona}\n\nActive tone: ${mode}.\n\n${knowledge}`;}
export const functions:FunctionDeclaration[]=[
 {name:'show_project',description:'Show a project the visitor is discussing.',parameters:{type:Type.OBJECT,properties:{slug:{type:Type.STRING,enum:projects.map(p=>p.slug)}},required:['slug']}},
 {name:'open_booking',description:'Open booking after the visitor asks or accepts.',parameters:{type:Type.OBJECT,properties:{}}},
 {name:'copy_email',description:'Copy the email after the visitor asks or accepts.',parameters:{type:Type.OBJECT,properties:{}}},
 {name:'set_expression',description:'Set a subtle expression cue.',parameters:{type:Type.OBJECT,properties:{name:{type:Type.STRING,enum:['warm','amused','thinking','raised_eyebrow','focused','laughing']}},required:['name']}},
];
export async function liveConfig(mode:AvatarSession['mode']):Promise<LiveConnectConfig>{return {responseModalities:[Modality.AUDIO],systemInstruction:await systemPrompt(mode),inputAudioTranscription:{},outputAudioTranscription:{},maxOutputTokens:400,tools:[{functionDeclarations:functions}],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Charon'}}}};}
