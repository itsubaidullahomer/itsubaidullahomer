import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { jwtVerify, type JWTVerifyGetKey } from "jose";

export const ISSUER = "https://auth.openai.com";
export const RESOURCE = "https://api.openai.com/v1";
export const PLAN_SCOPE = "chatgpt.tokens.use.direct";
export const SESSION_SECONDS = 900;
export const TRANSACTION_SECONDS = 600;
export const TURN_LIMIT = 24;
export const MAX_REPLY = 6000;
export type Tone = "polite" | "unfiltered";
export type ModelChoice = { id: string; name: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Transaction = {
  state: string;
  verifier: string;
  challenge: string;
  nonce: string;
  redirectUri: string;
  expiresAt: number;
};
export const randomId = () => randomBytes(32).toString("base64url");
export const opaqueId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function transaction(redirectUri: string): Transaction {
  const verifier = randomBytes(64).toString("base64url");
  return {
    state: randomId(),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    nonce: randomId(),
    redirectUri,
    expiresAt: Date.now() + TRANSACTION_SECONDS * 1000,
  };
}
export function validCallback(
  tx: Transaction | null,
  state: string | null,
  now = Date.now(),
) {
  return !!tx && !!state && tx.expiresAt > now && sameSecret(tx.state, state);
}
export function encryptionKey(value: string | undefined) {
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value))
    throw new Error("A 32-byte encryption key is required");
  return Buffer.from(value, "hex");
}
export function seal(value: unknown, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}
export function unseal<T>(value: string, key: Buffer): T {
  const raw = Buffer.from(value, "base64url");
  if (raw.length < 29) throw new Error("Invalid encrypted record");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  ) as T;
}
export function hasPlanScope(scope: unknown) {
  if (typeof scope !== "string") return false;
  const scopes = new Set(scope.split(/\s+/));
  return scopes.has(PLAN_SCOPE) && scopes.has("resource.invoke");
}
export async function verifyIdentity(
  token: string,
  key: JWTVerifyGetKey,
  clientId: string,
  nonce: string,
) {
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: clientId,
    algorithms: ["RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat", "nonce"],
    clockTolerance: 5,
  });
  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.nonce !== nonce ||
    (payload.azp !== undefined && payload.azp !== clientId) ||
    (Array.isArray(payload.aud) &&
      payload.aud.length > 1 &&
      payload.azp !== clientId)
  )
    throw new Error("Invalid identity");
  return {
    subject: payload.sub,
    name: typeof payload.name === "string" ? payload.name.slice(0, 80) : "You",
  };
}
export function modelChoices(value: unknown): ModelChoice[] {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { models?: unknown }).models)
  )
    return [];
  return (value as { models: unknown[] }).models
    .flatMap((item): ModelChoice[] => {
      if (!item || typeof item !== "object") return [];
      const m = item as Record<string, unknown>;
      return m.visibility === "list" &&
        typeof m.slug === "string" &&
        /^[a-zA-Z0-9._:-]{1,100}$/.test(m.slug) &&
        typeof m.display_name === "string"
        ? [{ id: m.slug, name: m.display_name.slice(0, 100) }]
        : [];
    })
    .slice(0, 40);
}
export function validChatInput(
  value: unknown,
): value is { message: string; model: string; tone: Tone } {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.message === "string" &&
    !!b.message.trim() &&
    b.message.length <= 1200 &&
    typeof b.model === "string" &&
    /^[a-zA-Z0-9._:-]{1,100}$/.test(b.model) &&
    (b.tone === "polite" || b.tone === "unfiltered") &&
    Object.keys(b).every((k) => ["message", "model", "tone"].includes(k))
  );
}
export function planError(status: number, code?: string) {
  if (code === "subscription_sharing_usage_limit_exceeded" || status === 429)
    return {
      code: "usage_limit",
      message:
        "Your ChatGPT plan or this app has reached a usage limit. Review your limits in ChatGPT.",
      action: "usage",
    };
  if (status === 401 || code === "subscription_sharing_invalid_user")
    return {
      code: "reconnect",
      message: "Your connection needs a fresh sign-in. Reconnect to continue.",
      action: "reconnect",
    };
  if (status === 403 || code === "subscription_sharing_user_not_eligible")
    return {
      code: "ineligible",
      message:
        "ChatGPT plan usage isn’t available for this account, workspace, or connection. You can still contact the real Ubaid.",
      action: "contact",
    };
  return {
    code: "unavailable",
    message:
      "The reply couldn’t finish. Your message is still here; try again in a moment.",
    action: "retry",
  };
}
// Locks have owners. A late request cannot release a newer request's lock.
export const UNLOCK =
  "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
export const COMMIT_HISTORY =
  "if redis.call('EXISTS',KEYS[1]) == 1 and redis.call('GET',KEYS[2]) == ARGV[1] then redis.call('SET',KEYS[3],ARGV[2],'EX',ARGV[3]); return 1 else return 0 end";

export type Config = {
  clientId: string;
  redirectUri: string;
  secret?: string;
  authMethod: "none" | "client_secret_basic";
  key: Buffer;
};
export function readConfig(
  env: Record<string, string | undefined>,
): Config | null {
  try {
    if (
      env.CHATGPT_ENABLED !== "true" ||
      env.CHATGPT_PLAN_USAGE_APPROVED !== "true" ||
      env.CHATGPT_PLAN_SCOPE !== PLAN_SCOPE ||
      !env.UPSTASH_REDIS_REST_URL ||
      !env.UPSTASH_REDIS_REST_TOKEN
    )
      return null;
    const clientId = env.CHATGPT_CLIENT_ID || "";
    const redirectUri = env.CHATGPT_REDIRECT_URI || "";
    const url = new URL(redirectUri);
    if (
      !/^oaiapp_[A-Za-z0-9_-]+$/.test(clientId) ||
      url.pathname !== "/api/chatgpt/callback" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          env.NODE_ENV !== "production" &&
          url.protocol === "http:" &&
          url.hostname === "127.0.0.1"
        ))
    )
      return null;
    const authMethod = env.CHATGPT_TOKEN_AUTH_METHOD;
    if (authMethod !== "none" && authMethod !== "client_secret_basic")
      return null;
    const secret = env.CHATGPT_CLIENT_SECRET;
    if (authMethod === "client_secret_basic" && !secret) return null;
    return {
      clientId,
      redirectUri,
      authMethod,
      secret,
      key: encryptionKey(env.CHATGPT_SESSION_SECRET),
    };
  } catch {
    return null;
  }
}
