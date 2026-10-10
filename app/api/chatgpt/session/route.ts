import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  config,
  guard,
  session,
  models,
  disconnect,
  welcomeId,
  store,
  keyFor,
  cookieOptions,
  json,
  ProviderError,
  SESSION_COOKIE,
  WELCOME_COOKIE,
} from "@/lib/chatgpt/server";
import { unseal, type ChatMessage } from "@/lib/chatgpt/security";
export const runtime = "nodejs";
export async function GET() {
  const cfg = config();
  if (!cfg) return json({ available: false, connected: false });
  try {
    const current = await session(cfg);
    if (!current) return json({ available: true, connected: false });
    const encrypted = await store().get<string>(keyFor("history", current.id));
    const messages = encrypted ? unseal<ChatMessage[]>(encrypted, cfg.key) : [];
    const identity = {
      messages,
      name: current.name,
      expiresAt: current.expiresAt,
      welcome:
        (await cookies()).get(WELCOME_COOKIE)?.value !==
        welcomeId(current.subject, cfg),
    };
    try {
      return json({
        available: true,
        connected: true,
        ...identity,
        models: await models(current),
      });
    } catch (e) {
      if (e instanceof ProviderError && e.status === 401) {
        await disconnect(current.id);
        return json({ available: true, connected: false, issue: e.detail });
      }
      return json({
        available: true,
        connected: true,
        ...identity,
        models: [],
        issue:
          e instanceof ProviderError
            ? e.detail
            : {
                message: "Couldn’t load your models. Try again in a moment.",
                action: "retry",
              },
      });
    }
  } catch {
    return json(
      { error: "Couldn’t check the connection. Try again in a moment." },
      503,
    );
  }
}
export async function PATCH(request: Request) {
  const cfg = guard(request);
  if (cfg instanceof NextResponse) return cfg;
  try {
    const current = await session(cfg);
    if (!current) return json({ error: "Reconnect to continue." }, 401);
    const r = json({ ok: true });
    r.cookies.set(
      WELCOME_COOKIE,
      welcomeId(current.subject, cfg),
      cookieOptions(30 * 86400),
    );
    return r;
  } catch {
    return json({ error: "Couldn’t save that preference." }, 503);
  }
}
export async function DELETE(request: Request) {
  const cfg = guard(request);
  if (cfg instanceof NextResponse) return cfg;
  try {
    const current = await session(cfg);
    if (current) await disconnect(current.id);
    const r = json({ ok: true });
    r.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
    return r;
  } catch {
    return json({ error: "Couldn’t disconnect yet. Please try again." }, 503);
  }
}
