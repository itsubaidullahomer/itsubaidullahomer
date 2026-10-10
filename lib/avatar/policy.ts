import { createHmac } from 'node:crypto';
export const SESSION_SECONDS = 180;
export const SILENCE_SECONDS = 20;
export const IP_DAILY_LIMIT = 3;
export const TURN_LIMIT = 12;
export function dailyCap(value: string | undefined) { const n = Number(value ?? 30); return Number.isSafeInteger(n) && n >= 0 ? n : 0; }
export function validOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
export function clientIdentity(request: Request, secret: string) {
 // Only Vercel's overwritten header is trusted in production. Other hosts share
 // one bucket until a trusted-proxy integration is explicitly configured.
 const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local-or-unconfigured-proxy';
 return createHmac('sha256', secret).update(`${new Date().toISOString().slice(0,10)}:${ip}`).digest('hex');
}
export function validMessage(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= 1200; }
// One Redis transaction checks both budgets and creates the session. A rejected
// IP does not burn the global budget. Redis is required; no per-instance fallback.
export const RESERVE_SCRIPT = `
local ip = tonumber(redis.call('GET', KEYS[1]) or '0')
local global = tonumber(redis.call('GET', KEYS[2]) or '0')
if ip >= tonumber(ARGV[1]) then return 'ip' end
if global >= tonumber(ARGV[2]) then return 'global' end
redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 90000)
redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 90000)
redis.call('SET', KEYS[3], ARGV[3], 'EX', ARGV[4])
return 'ok'`;
export const TURN_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'expired' end
if redis.call('EXISTS', KEYS[2]) == 1 then return 'busy' end
local count = tonumber(redis.call('GET', KEYS[3]) or '0')
if count >= tonumber(ARGV[1]) then return 'limit' end
redis.call('SET', KEYS[2], '1', 'EX', 30)
redis.call('INCR', KEYS[3]); redis.call('EXPIRE', KEYS[3], 180)
return 'ok'`;
