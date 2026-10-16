export const GUIDE_COOKIE = "ubaid-avatar-guide";
export const GUIDE_SECONDS = 900;
export const GUIDE_TURN_LIMIT = 24;
export const GUIDE_OUTPUT_TOKENS = 1600;
export const GUIDE_MAX_BODY_BYTES = 5000;
export type GuideInput = {
  message: string;
  mode?: "demo" | "live";
  model?: string;
};
export function validGuideInput(value: unknown): value is GuideInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.message === "string" &&
    b.message.trim().length > 0 &&
    b.message.length <= 1200 &&
    (b.mode === undefined || b.mode === "demo" || b.mode === "live") &&
    (b.model === undefined ||
      (typeof b.model === "string" &&
        /^[a-zA-Z0-9._:-]{1,100}$/.test(b.model))) &&
    Object.keys(b).every((key) => ["message", "mode", "model"].includes(key))
  );
}
export type PaidConfig = {
  model: string;
  inputMicrosPerToken: number;
  outputMicrosPerToken: number;
  sessionMicros: number;
  dailyMicros: number;
};
export function paidConfig(
  env: Record<string, string | undefined>,
): PaidConfig | null {
  if (
    env.AVATAR_GUIDE_PROVIDER !== "openai" ||
    env.AVATAR_GUIDE_PAID_ENABLED !== "true" ||
    !env.OPENAI_API_KEY ||
    !env.AVATAR_GUIDE_INVITE_CODE ||
    env.AVATAR_GUIDE_INVITE_CODE.length < 24
  )
    return null;
  const model = env.AVATAR_GUIDE_MODEL || "";
  const input = Number(env.AVATAR_GUIDE_INPUT_USD_PER_MILLION);
  const output = Number(env.AVATAR_GUIDE_OUTPUT_USD_PER_MILLION);
  const session = Number(env.AVATAR_GUIDE_SESSION_USD);
  const daily = Number(env.AVATAR_GUIDE_DAILY_USD);
  if (
    !/^[a-zA-Z0-9._:-]{1,100}$/.test(model) ||
    ![input, output, session, daily].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    session > daily ||
    daily > 10
  )
    return null;
  // One dollar per million tokens is one micro-dollar per token.
  return {
    model,
    inputMicrosPerToken: input,
    outputMicrosPerToken: output,
    sessionMicros: Math.floor(session * 1e6),
    dailyMicros: Math.floor(daily * 1e6),
  };
}
export function reserveMicros(input: unknown, config: PaidConfig) {
  // UTF-8 bytes plus per-message overhead is a deliberately conservative token
  // reservation. Never refund in-flight failures: some usage may already be billed.
  const bytes = new TextEncoder().encode(JSON.stringify(input)).length + 1024;
  return Math.ceil(
    bytes * config.inputMicrosPerToken +
      GUIDE_OUTPUT_TOKENS * config.outputMicrosPerToken,
  );
}
export const RESERVE_GUIDE_TURN = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'expired' end
if redis.call('EXISTS', KEYS[2]) == 1 then return 'busy' end
local ip = tonumber(redis.call('GET', KEYS[3]) or '0')
local turns = tonumber(redis.call('GET', KEYS[4]) or '0')
local spent = tonumber(redis.call('GET', KEYS[5]) or '0')
local daily = tonumber(redis.call('GET', KEYS[6]) or '0')
local reserve = tonumber(ARGV[4])
if ip >= tonumber(ARGV[2]) then return 'ip' end
if turns >= tonumber(ARGV[3]) then return 'turns' end
if spent + reserve > tonumber(ARGV[5]) or daily + reserve > tonumber(ARGV[6]) then return 'budget' end
redis.call('SET', KEYS[2], ARGV[1], 'EX', 60)
redis.call('INCR', KEYS[3]); redis.call('EXPIRE', KEYS[3], 60)
redis.call('INCR', KEYS[4]); redis.call('EXPIRE', KEYS[4], 900)
redis.call('INCRBY', KEYS[5], reserve); redis.call('EXPIRE', KEYS[5], 900)
redis.call('INCRBY', KEYS[6], reserve); redis.call('EXPIRE', KEYS[6], 90000)
return 'ok'`;
