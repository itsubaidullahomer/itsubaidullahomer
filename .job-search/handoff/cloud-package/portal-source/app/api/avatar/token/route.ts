import {
  ai,
  liveConfig,
  liveModel,
  guard,
  reserve,
  attachSession,
  json,
  readBody,
} from "@/lib/avatar/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const body = await readBody(request);
    const mode = body.mode === "unfiltered" ? "unfiltered" : "polite";
    const session = await reserve(request, mode);
    if (!session)
      return json(
        {
          error:
            "My tiny conversation budget has called time for today. The real me has a calendar.",
          booking: true,
        },
        429,
      );
    if (body.textOnly)
      return attachSession(
        json({ mode: "text", expiresAt: session.expiresAt }),
        session,
      );
    try {
      const model = liveModel();
      const token = await ai().authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(session.expiresAt).toISOString(),
          newSessionExpireTime: new Date(
            Math.min(session.expiresAt, Date.now() + 30000),
          ).toISOString(),
          liveConnectConstraints: { model, config: await liveConfig(mode) },
          lockAdditionalFields: ["sessionResumption"],
        },
      });
      if (!token.name) throw new Error("No token");
      return attachSession(
        json({
          token: token.name,
          model,
          mode: "voice",
          expiresAt: session.expiresAt,
        }),
        session,
      );
    } catch {
      return attachSession(
        json({
          mode: "text",
          expiresAt: session.expiresAt,
          notice: "Voice is taking a break. We can still talk here.",
        }),
        session,
      );
    }
  } catch {
    return json(
      {
        error:
          "I couldn’t start that conversation. The real me is still available.",
        booking: true,
      },
      503,
    );
  }
}
