import {guard,getSession,json} from '@/lib/avatar/server';
// Current @decartai/sdk and public model docs do not expose live_avatar or an
// audio-chunk avatar protocol. Do not mint a billable unrestricted video token.
// Enable only after Decart supplies the documented audio-to-avatar API.
export async function POST(request:Request){const denied=guard(request);if(denied)return denied;try{if(!await getSession(request))return json({error:'Session expired.'},401);return json({fallback:'portrait',reason:'The audio-driven avatar model is not available in the verified Decart SDK.'},501);}catch{return json({fallback:'portrait'},503);}}
