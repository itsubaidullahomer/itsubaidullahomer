import "server-only";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { clientIdentity, validOrigin } from "@/lib/avatar/policy";
import {
  ISSUER,
  RESOURCE,
  SESSION_SECONDS,
  unseal,
  opaqueId,
  modelChoices,
  planError,
  type ModelChoice,
  type Tone,
  readConfig,
  type Config,
} from "./security";

export const SESSION_COOKIE = "ubaid-chatgpt";
export const FLOW_COOKIE = "ubaid-chatgpt-flow";
export const WELCOME_COOKIE = "ubaid-chatgpt-welcome";
export type Connection = {
  accessToken: string;
  subject: string;
  name: string;
  expiresAt: number;
};
export function config() {
  return readConfig(process.env);
}
export function store() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}
export const keyFor = (kind: string, id: string) => `chatgpt:${kind}:${id}`;
export const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/chatgpt",
  maxAge,
});
export function guard(request: Request) {
  if (!validOrigin(request))
    return json({ error: "Start this request on Ubaid’s site." }, 403);
  const cfg = config();
  if (!cfg)
    return json(
      {
        error: "ChatGPT connection is not available yet.",
        code: "not_configured",
      },
      503,
    );
  if (
    new URL(request.headers.get("origin")!).origin !==
    new URL(cfg.redirectUri).origin
  )
    return json({ error: "Use the registered site to connect." }, 403);
  return cfg;
}
export async function readInput(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 6000)
    throw new Error("Input too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing input");
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 6000) throw new Error("Input too large");
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function session(cfg: Config) {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!opaqueId(id)) return null;
  const encrypted = await store().get<string>(keyFor("session", id));
  if (!encrypted) return null;
  const connection = unseal<Connection>(encrypted, cfg.key);
  if (connection.expiresAt <= Date.now()) {
    await disconnect(id);
    return null;
  }
  return { id, ...connection };
}
export async function disconnect(id: string) {
  await store().del(
    ...["session", "history", "lock", "models"].map((k) => keyFor(k, id)),
  );
}
export function welcomeId(subject: string, cfg: Config) {
  return createHmac("sha256", cfg.key)
    .update(`${cfg.clientId}:${subject}`)
    .digest("base64url");
}
let discoveryCache:
  | {
      value: {
        authorization_endpoint: string;
        token_endpoint: string;
        jwks_uri: string;
      };
      expires: number;
    }
  | undefined;
export async function discovery() {
  if (discoveryCache && discoveryCache.expires > Date.now())
    return discoveryCache.value;
  const r = await fetch(`${ISSUER}/.well-known/openid-configuration`, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("Discovery unavailable");
  const d = await r.json();
  if (d.issuer !== ISSUER) throw new Error("Wrong issuer");
  for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri"]) {
    if (
      typeof d[key] !== "string" ||
      new URL(d[key]).origin !== ISSUER ||
      new URL(d[key]).username ||
      new URL(d[key]).password
    )
      throw new Error("Untrusted OAuth endpoint");
  }
  const value = {
    authorization_endpoint: d.authorization_endpoint as string,
    token_endpoint: d.token_endpoint as string,
    jwks_uri: d.jwks_uri as string,
  };
  discoveryCache = { value, expires: Date.now() + 3600000 };
  return value;
}
let jwks:
  { url: string; value: ReturnType<typeof createRemoteJWKSet> } | undefined;
export function signingKeys(url: string) {
  if (!jwks || jwks.url !== url)
    jwks = {
      url,
      value: createRemoteJWKSet(new URL(url), { timeoutDuration: 10000 }),
    };
  return jwks.value;
}
export async function startBudget(request: Request, cfg: Config) {
  const id = clientIdentity(request, cfg.key.toString("hex"));
  return (
    Number(
      await store().eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],600) end; return n",
        [keyFor("starts", id)],
        [],
      ),
    ) <= 10
  );
}
export class ProviderError extends Error {
  detail: ReturnType<typeof planError>;
  constructor(
    public status: number,
    code?: string,
  ) {
    super("ChatGPT request failed");
    this.detail = planError(status, code);
  }
}
export async function providerError(response: Response) {
  const data = await response.json().catch(() => ({}));
  // Never surface raw provider text, credentials, or account-specific context.
  return new ProviderError(
    response.status,
    typeof data?.error?.code === "string" ? data.error.code : undefined,
  );
}
export async function models(
  connection: Connection & { id: string },
): Promise<ModelChoice[]> {
  const cached = await store().get<ModelChoice[]>(
    keyFor("models", connection.id),
  );
  if (cached) return cached;
  const r = await fetch(`${RESOURCE}/models`, {
    headers: { Authorization: `Bearer ${connection.accessToken}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw await providerError(r);
  const choices = modelChoices(await r.json());
  await store().set(keyFor("models", connection.id), choices, {
    ex: Math.max(
      1,
      Math.min(120, Math.floor((connection.expiresAt - Date.now()) / 1000)),
    ),
  });
  return choices;
}
export async function instructions(tone: Tone) {
  const [persona, knowledge] = await Promise.all(
    ["persona.md", "knowledge.md"].map((f) =>
      readFile(join(process.cwd(), "content/avatar", f), "utf8"),
    ),
  );
  return `${persona}\n\n${knowledge}\n\nCurrent experience: a text-only portfolio demo using the visitor's ChatGPT plan. Active tone: ${tone}. No page tools or browsing tools are available in this session. Do not claim to operate the page, microphone, avatar, or clipboard. Override the voice-session timing references above: this connection lasts up to 15 minutes and 24 turns. Use short replies, usually under 150 words. For relevant project details, give its relative case-study URL as plain text. Booking and email controls are beside the chat. Never claim to know the visitor's private ChatGPT history or memories.`;
}
export { SESSION_SECONDS };

export type { Config } from "./security";
