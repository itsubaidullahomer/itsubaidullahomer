import { NextResponse } from "next/server";
import {
  guard,
  session,
  store,
  keyFor,
  models,
  readInput,
  instructions,
  providerError,
  ProviderError,
  disconnect,
  json,
} from "@/lib/chatgpt/server";
import {
  validChatInput,
  randomId,
  unseal,
  seal,
  TURN_LIMIT,
  MAX_REPLY,
  RESOURCE,
  UNLOCK,
  COMMIT_HISTORY,
  planError,
  type ChatMessage,
} from "@/lib/chatgpt/security";
import { readSSE } from "@/lib/chatgpt/stream";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const cfg = guard(request);
  if (cfg instanceof NextResponse) return cfg;
  let id = "";
  const owner = randomId();
  let locked = false;
  const release = async () => {
    if (locked) {
      locked = false;
      await store()
        .eval(UNLOCK, [keyFor("lock", id)], [owner])
        .catch(() => {});
    }
  };
  try {
    const input = await readInput(request);
    if (!validChatInput(input))
      return json(
        {
          error: "Use a message of 1–1,200 characters and an available model.",
        },
        400,
      );
    const current = await session(cfg);
    if (!current) return json({ ...planError(401) }, 401);
    id = current.id;
    locked =
      (await store().set(keyFor("lock", id), owner, { ex: 60, nx: true })) ===
      "OK";
    if (!locked)
      return json(
        {
          message: "A reply is already running. Wait for it to finish.",
          action: "retry",
        },
        409,
      );
    const available = await models(current);
    if (!available.some((m) => m.id === input.model)) {
      await release();
      return json(
        {
          message: "Choose a model available to your ChatGPT account.",
          action: "retry",
        },
        400,
      );
    }
    const encrypted = await store().get<string>(keyFor("history", id));
    const history = encrypted ? unseal<ChatMessage[]>(encrypted, cfg.key) : [];
    if (history.length >= TURN_LIMIT * 2) {
      await release();
      return json(
        {
          message:
            "That’s the end of this short demo. The real Ubaid is ready for the next conversation.",
          action: "contact",
        },
        429,
      );
    }
    const abort = new AbortController();
    const signal = AbortSignal.any([
      request.signal,
      abort.signal,
      AbortSignal.timeout(
        Math.max(1, Math.min(45000, current.expiresAt - Date.now())),
      ),
    ]);
    const message: ChatMessage = {
      role: "user",
      content: input.message.trim(),
    };
    const upstream = await fetch(`${RESOURCE}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        instructions: await instructions(input.tone),
        input: [...history, message],
        store: false,
        stream: true,
      }),
      cache: "no-store",
      redirect: "error",
      signal,
    });
    if (!upstream.ok || !upstream.body) {
      const e = await providerError(upstream);
      if (e.status === 401) await disconnect(id);
      await release();
      return json(e.detail, e.status);
    }
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let reply = "";
        let terminal = false;
        const send = (event: unknown) =>
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        try {
          for await (const data of readSSE(upstream.body!)) {
            if (data === "[DONE]") continue;
            const event = JSON.parse(data);
            if (
              event.type === "response.output_text.delta" &&
              typeof event.delta === "string"
            ) {
              if (reply.length + event.delta.length > MAX_REPLY)
                throw new Error("Reply limit");
              reply += event.delta;
              send({ type: "delta", text: event.delta });
            } else if (event.type === "response.completed") {
              if (!reply.trim() || event.response?.status !== "completed")
                throw new Error("Empty or incomplete reply");
              const ttl = Math.floor((current.expiresAt - Date.now()) / 1000);
              if (ttl <= 0) throw new Error("Expired");
              const saved = await store().eval(
                COMMIT_HISTORY,
                [
                  keyFor("session", id),
                  keyFor("lock", id),
                  keyFor("history", id),
                ],
                [
                  owner,
                  seal(
                    [
                      ...history,
                      message,
                      { role: "assistant", content: reply },
                    ],
                    cfg.key,
                  ),
                  ttl,
                ],
              );
              if (saved !== 1) throw new Error("Session ended");
              send({ type: "done" });
              terminal = true;
              break;
            } else if (
              ["response.failed", "response.incomplete", "error"].includes(
                event.type,
              )
            ) {
              const code =
                event.response?.error?.code || event.error?.code || event.code;
              const detail = planError(503, code);
              if (detail.action === "reconnect") await disconnect(id);
              send({ type: "error", ...detail });
              terminal = true;
              break;
            }
          }
          if (!terminal) send({ type: "error", ...planError(503) });
        } catch {
          try {
            send({ type: "error", ...planError(503) });
          } catch {
            /* Client closed the stream. */
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
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    await release();
    if (e instanceof ProviderError) {
      if (e.status === 401 && id) await disconnect(id).catch(() => {});
      return json(e.detail, e.status);
    }
    return json(
      {
        message:
          "The reply couldn’t start. Your message is still here; try again in a moment.",
        action: "retry",
      },
      503,
    );
  }
}
