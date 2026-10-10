"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import { Send, Mic, MicOff } from "lucide-react";
import type { Session, LiveServerMessage } from "@google/genai";
import { useContact } from "./providers";
import { Button } from "./ui/button";
import { AudioOutput, pcmBase64 } from "@/lib/avatar/audio";
import { expressions } from "@/lib/avatar/expressions";
import { projects } from "@/content/projects";
type Token = {
  token?: string;
  model?: string;
  mode?: "text" | "voice";
  expiresAt?: number;
  error?: string;
  notice?: string;
};
export default function AvatarSession({
  mode,
  textOnly,
  onEnd,
}: {
  mode: "polite" | "unfiltered";
  textOnly: boolean;
  onEnd: () => void;
}) {
  const { book } = useContact();
  const bookRef = useRef(book);
  const live = useRef<Session | null>(null);
  const output = useRef<AudioOutput | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const capture = useRef<AudioContext | null>(null);
  const request = useRef<Promise<Token> | null>(null);
  const expires = useRef(0);
  const spoken = useRef("");
  const heard = useRef("");
  const activity = useRef(0);
  const ended = useRef(false);
  const stopRef = useRef<() => void>(() => {});
  const [state, setState] = useState<
    "connecting" | "voice" | "text" | "unavailable" | "ended"
  >("connecting");
  const [caption, setCaption] = useState(
    "I’m the AI version of Ubaid. Let’s talk about what you’re building.",
  );
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [history, setHistory] = useState<{ who: string; text: string }[]>([]);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    ended.current = false;
    function cleanup() {
      live.current?.close();
      live.current = null;
      mic.current?.getTracks().forEach((t) => t.stop());
      mic.current = null;
      if (capture.current?.state !== "closed") void capture.current?.close();
      capture.current = null;
      output.current?.close();
      output.current = null;
      clearInterval(interval);
    }
    function finish(reason: string) {
      if (cancelled || ended.current) return;
      ended.current = true;
      cleanup();
      setLevel(0);
      setState("ended");
      setCaption(reason);
      void fetch("/api/avatar/end", { method: "POST", keepalive: true });
    }
    stopRef.current = () =>
      finish(
        "Thanks for the conversation. Want to pick it up with the real me?",
      );
    async function tool(name: string, args: Record<string, unknown> = {}) {
      if (cancelled || ended.current) return { ok: false };
      if (name === "open_booking") {
        bookRef.current();
        return { ok: true };
      }
      if (name === "copy_email") {
        try {
          await navigator.clipboard.writeText("itsubaidullahomer@gmail.com");
          return { ok: true };
        } catch {
          return { ok: false, email: "itsubaidullahomer@gmail.com" };
        }
      }
      if (name === "show_project") {
        const slug = String(args.slug);
        if (!projects.some((p) => p.slug === slug)) return { ok: false };
        const element = document.getElementById(`project-${slug}`);
        if (!element) return { ok: false, url: `/work/${slug}` };
        element.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "center",
        });
        element.classList.add("project-highlight");
        setTimeout(() => element.classList.remove("project-highlight"), 3500);
        return { ok: true };
      }
      if (name === "set_expression") {
        const expression = String(args.name);
        if (!(expression in expressions)) return { ok: false };
        document
          .getElementById("avatar")
          ?.setAttribute("data-expression", expression);
        return { ok: true, renderer: "portrait" };
      }
      return { ok: false };
    }
    function message(m: LiveServerMessage) {
      if (cancelled || ended.current) return;
      const server = m.serverContent;
      if (server?.interrupted) output.current?.interrupt();
      const transcript = server?.outputTranscription?.text;
      if (transcript) {
        activity.current = Date.now();
        spoken.current += transcript;
        setCaption(spoken.current.slice(-350));
      }
      if (server?.inputTranscription?.text) {
        activity.current = Date.now();
        heard.current += server.inputTranscription.text;
      }
      if (server?.turnComplete) {
        const userText = heard.current;
        const modelText = spoken.current;
        setHistory((old) =>
          [
            ...old,
            ...(userText ? [{ who: "You", text: userText }] : []),
            ...(modelText ? [{ who: "AI Ubaid", text: modelText }] : []),
          ].slice(-24),
        );
        heard.current = "";
        spoken.current = "";
      }
      for (const part of server?.modelTurn?.parts || []) {
        if (
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("audio/")
        ) {
          activity.current = Date.now();
          output.current?.play(part.inlineData.data);
        }
      }
      if (m.toolCall?.functionCalls) {
        for (const call of m.toolCall.functionCalls) {
          void tool(call.name || "", call.args).then((response) => {
            if (!cancelled && !ended.current)
              live.current?.sendToolResponse({
                functionResponses: [{ id: call.id, name: call.name, response }],
              });
          });
        }
      }
    }
    if (!request.current)
      request.current = fetch("/api/avatar/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, textOnly }),
      }).then((r) => r.json());
    void request.current
      .then(async (data) => {
        if (cancelled) return;
        if (data.error || !data.expiresAt) {
          setState("unavailable");
          setCaption(
            data.error || "The AI me is off duty. The real me is still here.",
          );
          return;
        }
        expires.current = data.expiresAt;
        activity.current = Date.now();
        interval = setInterval(() => {
          if (Date.now() >= expires.current)
            finish(
              "Three minutes, already. Let’s carry this on with the real me.",
            );
          else if (Date.now() - activity.current >= 20000)
            finish(
              "I’ll give you some thinking room. Book a call when you’re ready.",
            );
        }, 500);
        if (data.mode === "text" || !data.token) {
          setState("text");
          setCaption(
            data.notice ||
              "I’m the AI version of Ubaid. What are you building?",
          );
          return;
        }
        try {
          const { GoogleGenAI } = await import("@google/genai");
          if (cancelled) return;
          output.current = new AudioOutput((value) => {
            document
              .getElementById("avatar")
              ?.style.setProperty("--voice-level", String(value));
          });
          await output.current.resume();
          const ai = new GoogleGenAI({
            apiKey: data.token,
            httpOptions: { apiVersion: "v1beta" },
          });
          const connection = await ai.live.connect({
            model: data.model!,
            callbacks: {
              onmessage: message,
              onerror: () => {
                if (!cancelled && !ended.current) {
                  setState("text");
                  setCaption("Voice stumbled. Let’s keep talking here.");
                  mic.current?.getTracks().forEach((t) => t.stop());
                  output.current?.interrupt();
                  live.current?.close();
                  live.current = null;
                  if (capture.current?.state !== "closed")
                    void capture.current?.close();
                  capture.current = null;
                }
              },
              onclose: () => {
                if (!cancelled && !ended.current) {
                  setState("text");
                  setCaption("Voice disconnected. You can still type here.");
                  mic.current?.getTracks().forEach((t) => t.stop());
                  live.current = null;
                  output.current?.interrupt();
                  if (capture.current?.state !== "closed")
                    void capture.current?.close();
                  capture.current = null;
                }
              },
            },
          });
          if (cancelled || ended.current) {
            connection.close();
            return;
          }
          live.current = connection;
          setState("voice");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            if (cancelled || ended.current) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            mic.current = stream;
            const context = new AudioContext({ sampleRate: 16000 });
            capture.current = context;
            await context.audioWorklet.addModule("/audio-capture.js");
            if (cancelled || ended.current) return;
            const worklet = new AudioWorkletNode(context, "pcm-capture");
            const source = context.createMediaStreamSource(stream);
            const silent = context.createGain();
            silent.gain.value = 0;
            source.connect(worklet);
            worklet.connect(silent);
            silent.connect(context.destination);
            worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
              if (
                cancelled ||
                ended.current ||
                !stream.getAudioTracks().some((t) => t.enabled)
              )
                return;
              const samples = event.data;
              const rms = Math.sqrt(
                samples.reduce((sum, n) => sum + n * n, 0) / samples.length,
              );
              setLevel(Math.min(1, rms * 8));
              if (rms > 0.018) activity.current = Date.now();
              connection.sendRealtimeInput({
                audio: {
                  data: pcmBase64(samples),
                  mimeType: `audio/pcm;rate=${context.sampleRate}`,
                },
              });
            };
            await context.resume();
          } catch {
            if (!cancelled) {
              setMuted(true);
              setCaption(
                "No microphone? No problem. Type below; I can still reply.",
              );
            }
          }
          connection.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: "Introduce yourself briefly as the AI version of Ubaid and ask what I am building.",
                  },
                ],
              },
            ],
            turnComplete: true,
          });
        } catch {
          if (!cancelled) {
            live.current?.close();
            live.current = null;
            output.current?.close();
            output.current = null;
            setState("text");
            setCaption(
              "Voice is taking a break. I’m the AI version of Ubaid — tell me what you’re building.",
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("unavailable");
          setCaption(
            "The AI me couldn’t connect. The real me is one email away.",
          );
        }
      });
    return () => {
      cancelled = true;
      ended.current = true;
      cleanup();
    };
    // A tone change is sent inside the current bounded session, without creating a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (live.current)
      live.current.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `Switch the conversational tone to ${mode}. Keep all factual boundaries.`,
              },
            ],
          },
        ],
        turnComplete: false,
      });
  }, [mode]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || ended.current) return;
    const text = input.trim();
    setInput("");
    setError("");
    activity.current = Date.now();
    setHistory((h) => [...h, { who: "You", text }]);
    if (state === "voice" && live.current) {
      await output.current?.resume();
      live.current.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/avatar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode }),
      });
      const data = await response.json();
      if (ended.current) return;
      if (data.reply) {
        setHistory((h) => [...h, { who: "AI Ubaid", text: data.reply }]);
        setCaption(data.reply);
        activity.current = Date.now();
      } else {
        setError(data.error || "That connection stumbled. Try again.");
        if (response.status === 401 || response.status === 429) {
          stopRef.current();
        }
      }
    } catch {
      setError("That message didn’t get through. Try again or book a call.");
    } finally {
      setBusy(false);
    }
  }
  const available = state === "voice" || state === "text";
  return (
    <>
      <p className="avatar-caption" role="status" aria-live="polite">
        {caption}
      </p>
      {history.length > 0 && (
        <div
          className="avatar-chat"
          role="log"
          aria-label="Conversation transcript"
        >
          {history.map((h, i) => (
            <p key={i}>
              <strong>{h.who}: </strong>
              {h.text}
            </p>
          ))}
        </div>
      )}
      {error && (
        <p className="avatar-error" role="alert">
          {error}
        </p>
      )}
      {available && (
        <form onSubmit={send} className="avatar-text-form">
          <input
            aria-label="Message AI Ubaid"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              activity.current = Date.now();
            }}
            maxLength={1200}
            placeholder="What are you building?"
            disabled={busy}
          />
          <button aria-label="Send message" disabled={!input.trim() || busy}>
            <Send size={13} />
          </button>
        </form>
      )}
      <div className="button-row" style={{ marginTop: 12 }}>
        {state === "voice" && (
          <>
            <span
              className="audio-ring"
              aria-label="Microphone level"
              style={{ "--level": level } as CSSProperties}
            />
            <button
              className="button button-secondary"
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              onClick={() => {
                const next = !muted;
                setMuted(next);
                mic.current
                  ?.getAudioTracks()
                  .forEach((t) => (t.enabled = !next));
              }}
            >
              {muted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
          </>
        )}
        {available ? (
          <button
            className="button button-secondary"
            onClick={() => stopRef.current()}
          >
            End conversation
          </button>
        ) : state === "connecting" ? (
          <button className="button button-secondary" onClick={onEnd}>
            Cancel
          </button>
        ) : (
          <>
            <Button onClick={book}>Book a call</Button>
            <button className="button button-secondary" onClick={onEnd}>
              Back
            </button>
          </>
        )}
      </div>
      <p className="avatar-privacy">
        {available
          ? "3-minute limit · audio goes to Google · no recordings stored"
          : "Starts only when you choose. Always an AI version."}
      </p>
    </>
  );
}
