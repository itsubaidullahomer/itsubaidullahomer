import { NextResponse } from "next/server";
import { guard, session, models, json } from "@/lib/chatgpt/server";
import {
  attachGuideSession,
  createGuideSession,
  guideConfigured,
} from "@/lib/avatar-guide-server/session";
export const runtime = "nodejs";
// The existing OAuth cookie is intentionally scoped to /api/chatgpt. This bridge
// shares a revocable server reference, never a provider token, with /api/avatar.
export async function POST(request: Request) {
  const cfg = guard(request);
  if (cfg instanceof NextResponse) return cfg;
  if (process.env.AVATAR_GUIDE_PROVIDER !== "chatgpt" || !guideConfigured())
    return json({ error: "The live portfolio guide is not enabled." }, 503);
  try {
    const current = await session(cfg);
    if (!current)
      return json(
        {
          error: "Connect your ChatGPT account first.",
          code: "sign_in_required",
        },
        401,
      );
    const choices = await models(current);
    const guide = await createGuideSession(
      "chatgpt",
      current.id,
      current.expiresAt,
    );
    return attachGuideSession(
      json({
        connected: true,
        mode: "chatgpt",
        models: choices,
        expiresAt: guide.expiresAt,
        voice: "browser-demo",
        notice:
          "ChatGPT plan usage powers eligible text replies. This preview uses a standard browser voice, not Ubaid’s cloned voice.",
      }),
      guide,
    );
  } catch {
    return json(
      {
        error: "The connection could not be prepared. Reconnect and try again.",
      },
      503,
    );
  }
}
