import { NextResponse } from "next/server";
import { clientIdentity, validOrigin } from "@/lib/avatar/policy";
import {
  store,
  keyFor,
  models,
  disconnect,
  providerError,
} from "@/lib/chatgpt/server";
import {
  RESOURCE,
  randomId,
  seal,
  unseal,
  UNLOCK,
  COMMIT_HISTORY,
} from "@/lib/chatgpt/security";
import { readSSE } from "@/lib/chatgpt/stream";
import { API_FALLBACK, demoTimeline } from "@/lib/avatar-guide-server/demo";
import {
  GUIDE_MAX_BODY_BYTES,
  GUIDE_TURN_LIMIT,
  RESERVE_GUIDE_TURN,
  paidConfig,
  reserveMicros,
  validGuideInput,
} from "@/lib/avatar-guide-server/policy";
import {
  attachGuideSession,
  createGuideSession,
  guideConfigured,
  guideEncryptionKey,
  guideKey,
  readGuideSession,
  validInvite,
} from "@/lib/avatar-guide-server/session";
import {
  responsesBody,
  type GuideMessage,
} from "@/lib/avatar-guide-server/provider";
import {
  SITE_INDEX,
  TimelineDecoder,
} from "@/lib/avatar-guide-server/timeline";
import {
  voiceConfig,
  transcriptionConfig,
} from "@/lib/avatar-guide-server/voice-policy";
import { voiceOperation } from "@/lib/avatar-guide-server/voice";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
const streamHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};
const encodeEvent = (value: unknown) =>
  new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
export async function GET() {
  return json({
    targets: SITE_INDEX,
    liveConfigured: guideConfigured(),
    provider: guideConfigured() ? process.env.AVATAR_GUIDE_PROVIDER : "demo",
    voice: "browser-demo",
    voiceConfigured: guideConfigured() && !!voiceConfig(process.env),
    transcriptionConfigured:
      guideConfigured() && !!transcriptionConfig(process.env),
    voiceDisclosure:
      "Provider voice is separately billed to the site and requires an invitation plus explicit opt-in. Phoneme timings are estimated; this is not verified voice cloning or forced alignment.",
    notice:
      "The free preview uses authored answers and a standard device voice. Live text replies require a configured provider and a connected or invited session; cloned voice is not connected.",
  });
}
async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > 1_300_000)
    throw new Error("Input too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing input");
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_300_000) throw new Error("Input too large");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
// This no-network preview has a per-process throttle; durable quotas below are
// mandatory for every provider-backed turn, including user-plan inference.
let demoMinute = 0,
  demoCount = 0;
function allowDemo() {
  const minute = Math.floor(Date.now() / 60000);
  if (minute !== demoMinute) {
    demoMinute = minute;
    demoCount = 0;
  }
  return ++demoCount <= 120;
}
export async function POST(request: Request) {
  if (!validOrigin(request))
    return json({ error: "Start this request on Ubaid’s site." }, 403);
  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return json({ error: "Use a small JSON request with a message." }, 400);
  }
  if (
    body &&
    typeof body === "object" &&
    "operation" in body &&
    ["speech", "transcribe"].includes(body.operation as string)
  )
    return voiceOperation(request, body as Record<string, unknown>);
  if (
    new TextEncoder().encode(JSON.stringify(body)).length > GUIDE_MAX_BODY_BYTES
  )
    return json({ error: "This request is too large." }, 400);
  if (
    body &&
    typeof body === "object" &&
    "operation" in body &&
    body.operation === "connect"
  ) {
    if (!guideConfigured() || !paidConfig(process.env))
      return json({ error: "Invited API access is not enabled." }, 503);
    try {
      const b = body as Record<string, unknown>;
      if (
        !Object.keys(b).every((key) =>
          ["operation", "inviteCode"].includes(key),
        )
      )
        return json({ error: "Invalid invitation request." }, 400);
      const identity = clientIdentity(
        request,
        guideEncryptionKey().toString("hex"),
      );
      const attempts = Number(
        await store().eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],600) end; return n",
          [guideKey("invite-attempts", identity)],
          [],
        ),
      );
      if (attempts > 10)
        return json(
          { error: "Please wait before trying another invitation." },
          429,
        );
      if (!validInvite(b.inviteCode))
        return json({ error: "That invitation is not valid." }, 401);
      return attachGuideSession(
        json({ connected: true, mode: "openai", voice: "browser-demo" }),
        await createGuideSession("openai"),
      );
    } catch {
      return json({ error: "The session could not start." }, 503);
    }
  }
  if (!validGuideInput(body))
    return json(
      {
        error:
          "Use a message of 1–1,200 characters and an optional available model.",
      },
      400,
    );
  if (body.mode !== "live") {
    if (!allowDemo())
      return json({ error: "The preview is busy. Please wait a moment." }, 429);
    const events = [
      {
        type: "status",
        mode: "demo",
        voice: "browser-demo",
        notice: "Authored preview, with no AI request or cloned voice.",
      },
      ...demoTimeline(body.message).map((action) => ({
        type: "action",
        action,
      })),
      { type: "done" },
    ];
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const event of events) controller.enqueue(encodeEvent(event));
          controller.close();
        },
      }),
      { headers: streamHeaders },
    );
  }
  if (!guideConfigured())
    return json(
      {
        error:
          "Live conversation is not configured. The authored preview is available.",
        code: "not_configured",
      },
      503,
    );
  const owner = randomId();
  let lock = "",
    locked = false;
  const release = async () => {
    if (!locked) return;
    locked = false;
    await store()
      .eval(UNLOCK, [lock], [owner])
      .catch(() => {});
  };
  try {
    const current = await readGuideSession();
    if (!current)
      return json(
        {
          error:
            "Connect ChatGPT or use an invitation to start a live session.",
          code: "sign_in_required",
        },
        401,
      );
    const provider = current.guide.kind;
    if (provider !== process.env.AVATAR_GUIDE_PROVIDER)
      return json(
        {
          error:
            "This session uses a different provider. Reconnect to continue.",
        },
        401,
      );
    const paid = provider === "openai" ? paidConfig(process.env) : null;
    let model = paid?.model || "";
    if (provider === "chatgpt" && current.connection) {
      const choices = await models(current.connection);
      model =
        body.model || process.env.AVATAR_GUIDE_MODEL || choices[0]?.id || "";
      if (!choices.some((choice) => choice.id === model))
        return json(
          { error: "Choose a model available to your ChatGPT account." },
          400,
        );
    }
    if (!model) return json({ error: "No eligible model is configured." }, 503);
    const stableId = current.connection?.id || current.guide.id;
    const sessionKey = current.connection
      ? keyFor("session", stableId)
      : guideKey("session", stableId);
    lock = current.connection
      ? keyFor("lock", stableId)
      : guideKey("lock", stableId);
    const historyKey = guideKey("history", stableId);
    const encrypted = await store().get<string>(historyKey);
    const history = encrypted
      ? unseal<GuideMessage[]>(encrypted, guideEncryptionKey()).slice(-12)
      : [];
    const message: GuideMessage = {
      role: "user",
      content: body.message.trim(),
    };
    const payload = responsesBody(provider, model, [...history, message]);
    const reserved = paid ? reserveMicros(payload, paid) : 0;
    const identity = clientIdentity(
      request,
      guideEncryptionKey().toString("hex"),
    );
    const reserve = await store().eval(
      RESERVE_GUIDE_TURN,
      [
        sessionKey,
        lock,
        guideKey("ip", identity),
        guideKey("turns", stableId),
        guideKey("budget", stableId),
        guideKey("daily-budget", new Date().toISOString().slice(0, 10)),
      ],
      [
        owner,
        12,
        GUIDE_TURN_LIMIT,
        reserved,
        paid?.sessionMicros || 0,
        paid?.dailyMicros || 0,
      ],
    );
    if (reserve !== "ok")
      return json(
        {
          error:
            reserve === "busy"
              ? "A reply is already running. Interrupt it or let it finish."
              : "This conversation has reached its configured limit. The free preview is still available.",
          code: reserve,
        },
        reserve === "busy" ? 409 : 429,
      );
    locked = true;
    const abort = new AbortController();
    const signal = AbortSignal.any([
      request.signal,
      abort.signal,
      AbortSignal.timeout(
        Math.max(1, Math.min(45000, current.guide.expiresAt - Date.now())),
      ),
    ]);
    const upstream = await fetch(`${RESOURCE}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current.connection?.accessToken || process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!upstream.ok || !upstream.body) {
      if (upstream.status === 401 && current.connection)
        await disconnect(current.connection.id);
      await providerError(upstream).catch(() => null);
      throw new Error("Provider unavailable");
    }
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const decoder = new TimelineDecoder();
        let complete = false;
        const send = (event: unknown) => controller.enqueue(encodeEvent(event));
        try {
          send({
            type: "status",
            mode: provider,
            voice: "browser-demo",
            notice: "Live text decisions; voice playback is selected separately.",
          });
          for await (const data of readSSE(upstream.body!)) {
            if (data === "[DONE]") continue;
            const event = JSON.parse(data);
            if (
              event.type === "response.output_text.delta" &&
              typeof event.delta === "string"
            ) {
              for (const action of decoder.push(event.delta))
                send({ type: "action", action });
            } else if (event.type === "response.completed") {
              if (event.response?.status !== "completed")
                throw new Error("Incomplete response");
              const timeline = decoder.finish();
              const reply = timeline
                .filter((action) => action.type === "say")
                .map((action) => action.text)
                .join(" ");
              const ttl = Math.floor(
                (current.guide.expiresAt - Date.now()) / 1000,
              );
              if (ttl <= 0) throw new Error("Expired session");
              const saved = await store().eval(
                COMMIT_HISTORY,
                [sessionKey, lock, historyKey],
                [
                  owner,
                  seal(
                    [
                      ...history,
                      message,
                      { role: "assistant", content: reply },
                    ],
                    guideEncryptionKey(),
                  ),
                  ttl,
                ],
              );
              if (saved !== 1) throw new Error("Session ended");
              complete = true;
              send({ type: "done" });
              break;
            } else if (
              ["response.failed", "response.incomplete", "error"].includes(
                event.type,
              )
            )
              throw new Error("Provider response failed");
          }
          if (!complete) throw new Error("Stream ended early");
        } catch {
          if (!signal.aborted) {
            try {
              send({
                type: "error",
                message:
                  "The live reply could not finish. Showing an authored fallback.",
              });
              for (const action of API_FALLBACK)
                send({ type: "action", action });
              send({ type: "done" });
            } catch {
              /* The browser disconnected. */
            }
          }
        } finally {
          abort.abort();
          await release();
          try {
            controller.close();
          } catch {
            /* Already cancelled. */
          }
        }
      },
      cancel() {
        abort.abort();
        void release();
      },
    });
    return new Response(stream, { headers: streamHeaders });
  } catch {
    await release();
    return json(
      {
        error:
          "The live connection is unavailable. You can use the authored preview.",
        fallback: API_FALLBACK,
      },
      503,
    );
  }
}
