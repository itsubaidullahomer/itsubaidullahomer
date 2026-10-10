import {getSession,json,redis,SESSION_COOKIE} from '@/lib/avatar/server';
import {validOrigin} from '@/lib/avatar/policy';
export async function POST(request:Request){if(!validOrigin(request))return json({},403);try{const session=await getSession(request);if(session)await redis().del(`avatar:session:${session.id}`,`avatar:history:${session.id}`,`avatar:busy:${session.id}`);}catch{/* Expiry also cleans up disconnected sessions. */}const response=json({ended:true});response.cookies.delete(SESSION_COOKIE);return response;}
