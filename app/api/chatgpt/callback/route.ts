import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  config,
  store,
  keyFor,
  discovery,
  signingKeys,
  json,
  disconnect,
  cookieOptions,
  FLOW_COOKIE,
  SESSION_COOKIE,
  type Connection,
} from "@/lib/chatgpt/server";
import {
  unseal,
  seal,
  opaqueId,
  randomId,
  validCallback,
  verifyIdentity,
  hasPlanScope,
  RESOURCE,
  SESSION_SECONDS,
  type Transaction,
} from "@/lib/chatgpt/security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const cfg = config();
  if (!cfg)
    return json({ error: "ChatGPT connection is not available yet." }, 503);
  const finish = (result: string, sessionId?: string, ttl = 0) => {
    const url = new URL("/", cfg.redirectUri);
    url.search = new URLSearchParams({ talk: "1", chatgpt: result }).toString();
    const r = NextResponse.redirect(url, 303);
    r.headers.set("Cache-Control", "no-store");
    r.headers.set("Referrer-Policy", "no-referrer");
    r.cookies.set(FLOW_COOKIE, "", cookieOptions(0));
    if (sessionId) r.cookies.set(SESSION_COOKIE, sessionId, cookieOptions(ttl));
    return r;
  };
  try {
    const jar = await cookies();
    const flow = jar.get(FLOW_COOKIE)?.value;
    if (!opaqueId(flow)) return finish("invalid");
    // GETDEL consumes the browser-bound transaction exactly once across instances.
    const encrypted = await store().getdel<string>(keyFor("flow", flow));
    const tx = encrypted ? unseal<Transaction>(encrypted, cfg.key) : null;
    const url = new URL(request.url);
    if (
      !validCallback(tx, url.searchParams.get("state")) ||
      !tx ||
      tx.redirectUri !== cfg.redirectUri
    )
      return finish("invalid");
    if (url.searchParams.has("error"))
      return finish(
        url.searchParams.get("error") === "access_denied"
          ? "cancelled"
          : "failed",
      );
    const returnedClient = url.searchParams.get("client_id");
    if (returnedClient && returnedClient !== cfg.clientId)
      return finish("invalid");
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096) return finish("invalid");
    const endpoints = await discovery();
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    };
    if (cfg.authMethod === "client_secret_basic") {
      const encode = (s: string) =>
        new URLSearchParams({ v: s }).toString().slice(2);
      headers.authorization = `Basic ${Buffer.from(`${encode(cfg.clientId)}:${encode(cfg.secret!)}`).toString("base64")}`;
    }
    const tokenResponse = await fetch(endpoints.token_endpoint, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: cfg.clientId,
        code,
        code_verifier: tx.verifier,
        redirect_uri: tx.redirectUri,
        resource: RESOURCE,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return finish("failed");
    const tokens = await tokenResponse.json();
    if (typeof tokens.id_token !== "string") return finish("invalid");
    const identity = await verifyIdentity(
      tokens.id_token,
      signingKeys(endpoints.jwks_uri),
      cfg.clientId,
      tx.nonce,
    );
    if (!hasPlanScope(tokens.scope)) return finish("permission");
    if (
      typeof tokens.access_token !== "string" ||
      !tokens.access_token ||
      tokens.access_token.length > 32000 ||
      tokens.token_type?.toLowerCase() !== "bearer" ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in < 30
    )
      return finish("invalid");
    // No offline-access permission or refresh token is retained for this short demo.
    const ttl = Math.min(SESSION_SECONDS, Math.floor(tokens.expires_in) - 10);
    const connection: Connection = {
      accessToken: tokens.access_token,
      ...identity,
      expiresAt: Date.now() + ttl * 1000,
    };
    const id = randomId();
    await store().set(keyFor("session", id), seal(connection, cfg.key), {
      ex: ttl,
    });
    const oldId = jar.get(SESSION_COOKIE)?.value;
    if (opaqueId(oldId)) await disconnect(oldId);
    return finish("connected", id, ttl);
  } catch {
    return finish("failed");
  }
}
