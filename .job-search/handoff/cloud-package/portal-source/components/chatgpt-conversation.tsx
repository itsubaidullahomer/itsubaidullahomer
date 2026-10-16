"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Square,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { CopyEmail, useContact } from "./providers";
import { readSSE } from "@/lib/chatgpt/stream";

type Tone = "polite" | "unfiltered";
type Issue = { message: string; action?: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
};
type Connection = {
  available: boolean;
  connected: boolean;
  name?: string;
  expiresAt?: number;
  welcome?: boolean;
  models?: { id: string; name: string }[];
  messages?: Message[];
  issue?: Issue;
};
const callbackErrors: Record<string, string> = {
  cancelled: "Connection cancelled. You can try again whenever you’re ready.",
  permission:
    "Sign-in worked, but permission to use your ChatGPT plan wasn’t granted. Connect again to enable it.",
  invalid: "That sign-in couldn’t be verified. Start a fresh connection below.",
  failed: "The connection couldn’t finish. Please try again in a moment.",
};
const prompts = [
  "What did you build at Tututor?",
  "How would you approach my AI feature?",
  "What is it like to work with you?",
];
const usageUrl = "https://chatgpt.com/settings/usage";
export default function ChatGPTConversation({
  onClose,
  mode,
  onModeChange,
  result,
}: {
  onClose: () => void;
  mode: Tone;
  onModeChange: (tone: Tone) => void;
  result?: string;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [issue, setIssue] = useState<Issue | null>(
    result && callbackErrors[result]
      ? { message: callbackErrors[result] }
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const { book } = useContact();
  const load = useCallback((signal?: AbortSignal) => {
    return fetch("/api/chatgpt/session", { cache: "no-store", signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Couldn’t check the connection.");
        return data as Connection;
      })
      .then((data) => {
        if (signal?.aborted || !mounted.current) return;
        setConnection(data);
        setModel((current) =>
          data.models?.some((m) => m.id === current)
            ? current
            : data.models?.[0]?.id || "",
        );
        setMessages(data.messages || []);
        if (data.issue) setIssue(data.issue);
      })
      .catch((error) => {
        if (!signal?.aborted && mounted.current)
          setIssue({
            message:
              error instanceof Error
                ? error.message
                : "Couldn’t check the connection.",
            action: "retry_connection",
          });
      })
      .finally(() => {
        if (!signal?.aborted && mounted.current) setLoading(false);
      });
  }, []);
  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    void load(abort.signal);
    return () => {
      mounted.current = false;
      abort.abort();
      abortRef.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    if (!connection?.expiresAt) return;
    const timeout = setTimeout(
      () => {
        const active = abortRef.current;
        abortRef.current = null;
        active?.abort();
        setBusy(false);
        setDraft("");
        setConnection({ available: true, connected: false });
        setMessages([]);
        setIssue({
          message:
            "This short demo session has ended. Reconnect to start another conversation.",
          action: "reconnect",
        });
      },
      Math.max(0, connection.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [connection?.expiresAt]);
  useEffect(() => {
    if (transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages]);
  async function connect() {
    setConnecting(true);
    setIssue(null);
    try {
      const r = await fetch("/api/chatgpt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconsent: result === "permission" }),
      });
      const data = await r.json();
      if (!r.ok || !data.url)
        throw new Error(data.error || "Couldn’t start sign-in.");
      const url = new URL(data.url);
      if (url.origin !== "https://auth.openai.com")
        throw new Error("Couldn’t verify the sign-in destination.");
      window.location.assign(url.toString());
    } catch (e) {
      setIssue({
        message: e instanceof Error ? e.message : "Couldn’t start sign-in.",
      });
      setConnecting(false);
    }
  }
  async function acknowledge() {
    setConnecting(true);
    try {
      const r = await fetch("/api/chatgpt/session", { method: "PATCH" });
      if (!r.ok) throw new Error();
      setConnection((current) => current && { ...current, welcome: false });
      setIssue(null);
    } catch {
      setIssue({
        message: "Couldn’t confirm the connection. Please try again.",
      });
    } finally {
      setConnecting(false);
    }
  }
  async function disconnect() {
    abortRef.current?.abort();
    setDisconnecting(true);
    try {
      const r = await fetch("/api/chatgpt/session", { method: "DELETE" });
      if (!r.ok) throw new Error();
      abortRef.current = null;
      setBusy(false);
      setConnection({ available: true, connected: false });
      setMessages([]);
      setDraft("");
      setIssue(null);
    } catch {
      setIssue({
        message: "Couldn’t disconnect yet. Please try again.",
        action: "usage",
      });
    } finally {
      setDisconnecting(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      busy ||
      !draft.trim() ||
      !model ||
      !connection?.connected ||
      connection.welcome
    )
      return;
    const message = draft.trim();
    const history = messages.at(-1)?.failed ? messages.slice(0, -2) : messages;
    const abort = new AbortController();
    abortRef.current = abort;
    const isCurrent = () => mounted.current && abortRef.current === abort;
    setMessages([
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setDraft("");
    setBusy(true);
    setIssue(null);
    let done = false;
    try {
      const r = await fetch("/api/chatgpt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, model, tone: mode }),
        signal: abort.signal,
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}));
        if (!isCurrent()) return;
        setIssue({
          message: data.message || data.error || "The reply couldn’t start.",
          action: data.action,
        });
        return;
      }
      for await (const frame of readSSE(r.body)) {
        if (!isCurrent()) break;
        const data = JSON.parse(frame);
        if (data.type === "delta" && typeof data.text === "string")
          setMessages((current) =>
            current.map((m, i) =>
              i === current.length - 1
                ? { ...m, content: m.content + data.text }
                : m,
            ),
          );
        if (data.type === "done") {
          done = true;
          break;
        }
        if (data.type === "error") {
          setIssue({
            message: data.message || "The reply stopped early.",
            action: data.action,
          });
          break;
        }
      }
    } catch {
      if (isCurrent())
        setIssue({
          message: abort.signal.aborted
            ? "Reply stopped. Your draft is ready if you want to try again."
            : "The connection dropped. Your draft is ready to retry.",
          action: "retry",
        });
    } finally {
      if (isCurrent()) {
        if (!done) {
          setDraft(message);
          setMessages((current) =>
            current.map((m, i) =>
              i === current.length - 1 ? { ...m, failed: true } : m,
            ),
          );
          setIssue(
            (current) =>
              current || {
                message: "The reply ended early. Your draft is ready to retry.",
                action: "retry",
              },
          );
        }
        setBusy(false);
      }
      if (abortRef.current === abort) abortRef.current = null;
    }
  }
  const bookHuman = () => {
    onClose();
    book();
  };
  const chatReady = connection?.connected && !connection.welcome;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content chatgpt-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document
              .querySelector<HTMLButtonElement>(
                "#avatar-start:not(:disabled), [data-ai-trigger]",
              )
              ?.focus();
          }}
        >
          <Dialog.Close
            className="dialog-close"
            aria-label="Close AI conversation"
          >
            <X size={18} />
          </Dialog.Close>
          <div className="chatgpt-intro">
            <span className="eyebrow">Experience my work</span>
            <Dialog.Title>A conversation with the AI me.</Dialog.Title>
            <Dialog.Description>
              Connect your ChatGPT account to experience my work through a
              conversation with AI Ubaid.
            </Dialog.Description>
          </div>
          <div className="chatgpt-layout">
            <aside className="chatgpt-about">
              <div className="chatgpt-person">
                <Image src="/images/avatar.png" width={48} height={48} alt="" />
                <div>
                  <strong>Ubaid, the AI version.</strong>
                  <span>Same work. A different interface.</span>
                </div>
              </div>
              <p>
                Ask how I built Tututor, explore an idea, or see how I think
                through a product problem.
              </p>
              <div className="chatgpt-facts">
                <span>
                  <Check size={14} /> Grounded in my actual work
                </span>
                <span>
                  <Check size={14} /> Streamed replies, in your browser
                </span>
                <span>
                  <LockKeyhole size={14} /> No access to your ChatGPT history
                </span>
              </div>
              <div className="chatgpt-human">
                <span className="mono">Prefer the human?</span>
                <button className="text-link" onClick={bookHuman}>
                  Book a call <ArrowUpRight size={13} />
                </button>
                <CopyEmail compact />
                <Link href="/work" className="text-link" onClick={onClose}>
                  Explore the work <ArrowUpRight size={13} />
                </Link>
              </div>
            </aside>
            <div className="chatgpt-panel">
              {loading ? (
                <div className="chatgpt-loading" role="status">
                  <LoaderCircle className="chatgpt-spinner" size={23} />
                  <p>Checking your connection…</p>
                </div>
              ) : !connection?.connected ? (
                <div className="chatgpt-connect">
                  <div className="chatgpt-demo-mark">
                    <MessageSquare size={25} strokeWidth={1.4} />
                  </div>
                  <h3>
                    Bring your curiosity.
                    <br />
                    And your ChatGPT account.
                  </h3>
                  <p>
                    Use your eligible ChatGPT Plus or Pro plan for this text
                    conversation. Replies count toward your plan’s limits.
                  </p>
                  <Button
                    className="chatgpt-signin"
                    disabled={!connection?.available || connecting}
                    onClick={connect}
                  >
                    {connecting ? (
                      <LoaderCircle size={18} className="chatgpt-spinner" />
                    ) : (
                      <Image
                        src="/images/brands/chatgpt-white.svg"
                        width={20}
                        height={20}
                        alt=""
                      />
                    )}{" "}
                    Continue with ChatGPT
                  </Button>
                  {connection && !connection.available && (
                    <p className="chatgpt-availability" role="status">
                      Connection opens soon. You can explore the work or talk to
                      the real me in the meantime.
                    </p>
                  )}
                  {connection?.available && (
                    <p className="chatgpt-note">
                      You’ll sign in securely with OpenAI and choose whether to
                      allow plan usage.
                    </p>
                  )}
                  <p className="chatgpt-note">
                    Text chat · No microphone needed · No charge from this site
                  </p>
                  <a
                    className="text-link chatgpt-learn"
                    href="https://learn.chatgpt.com/docs/sign-in-with-chatgpt"
                    target="_blank"
                    rel="noreferrer"
                  >
                    How ChatGPT plan usage works <ArrowUpRight size={12} />
                  </a>
                </div>
              ) : connection.welcome ? (
                <div className="chatgpt-connect">
                  <div className="chatgpt-demo-mark">
                    <Check size={26} />
                  </div>
                  <h3>You’re using your ChatGPT plan.</h3>
                  <p>
                    This conversation uses your existing plan allowance. You can
                    review usage and adjust this app’s limit in ChatGPT
                    settings.
                  </p>
                  <Button disabled={connecting} onClick={acknowledge}>
                    Got it — let’s talk <ArrowUpRight size={15} />
                  </Button>
                  <a
                    className="text-link"
                    href={usageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Manage usage <ArrowUpRight size={12} />
                  </a>
                </div>
              ) : (
                <div className="chatgpt-chat">
                  <div className="chatgpt-toolbar">
                    <span>
                      <i className="status-dot" /> Connected as{" "}
                      {connection.name}
                    </span>
                    <button onClick={disconnect} disabled={disconnecting}>
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </div>
                  <div
                    className="chatgpt-transcript"
                    role="log"
                    tabIndex={0}
                    aria-label="AI Ubaid conversation"
                    aria-live="polite"
                    aria-busy={busy}
                    ref={transcript}
                  >
                    <div className="chatgpt-message assistant">
                      <span className="mono">AI Ubaid</span>
                      <p>
                        I’m the AI version of Ubaid. Same interest in your
                        project, considerably fewer coffee breaks. What are you
                        building?
                      </p>
                    </div>
                    {messages.map((message, i) => (
                      <div
                        className={`chatgpt-message ${message.role}`}
                        key={i}
                      >
                        <span className="mono">
                          {message.role === "user" ? "You" : "AI Ubaid"}
                        </span>
                        <p>
                          {message.content ||
                            (busy
                              ? "Thinking it through…"
                              : "Reply unavailable.")}
                        </p>
                        {message.failed && <small>Unfinished reply</small>}
                      </div>
                    ))}
                    {!messages.length && (
                      <div className="chatgpt-suggestions">
                        {prompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => {
                              setDraft(prompt);
                              composer.current?.focus();
                            }}
                          >
                            {prompt}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <form className="chatgpt-composer" onSubmit={submit}>
                    <div className="chatgpt-options">
                      <label className="sr-only" htmlFor="chatgpt-model">
                        ChatGPT model
                      </label>
                      <select
                        id="chatgpt-model"
                        value={model}
                        disabled={busy || !connection.models?.length}
                        onChange={(e) => setModel(e.target.value)}
                      >
                        {!connection.models?.length && (
                          <option value="">Models unavailable</option>
                        )}
                        {connection.models?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <div
                        className="chatgpt-tone"
                        aria-label="Conversation tone"
                      >
                        {(["polite", "unfiltered"] as const).map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            disabled={busy}
                            aria-pressed={mode === tone}
                            onClick={() => onModeChange(tone)}
                          >
                            {tone === "polite" ? "Polite" : "Unfiltered"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="sr-only" htmlFor="chatgpt-message">
                      Message AI Ubaid
                    </label>
                    <textarea
                      id="chatgpt-message"
                      ref={composer}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={1200}
                      placeholder="Tell me what you’re building…"
                      rows={2}
                      disabled={busy || disconnecting}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <div className="chatgpt-composer-bottom">
                      <span className="mono">{draft.length}/1200</span>
                      {busy ? (
                        <button
                          key="stop"
                          className="chatgpt-send"
                          type="button"
                          aria-label="Stop reply"
                          onClick={(event) => {
                            event.preventDefault();
                            abortRef.current?.abort();
                          }}
                        >
                          <Square size={14} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          key="send"
                          className="chatgpt-send"
                          type="submit"
                          aria-label="Send message"
                          disabled={!draft.trim() || !model || disconnecting}
                        >
                          <ArrowUp size={19} />
                        </button>
                      )}
                    </div>
                    <div className="chatgpt-plan">
                      <span>Using ChatGPT plan</span>
                      <a href={usageUrl} target="_blank" rel="noreferrer">
                        Manage usage <ArrowUpRight size={11} />
                      </a>
                    </div>
                  </form>
                </div>
              )}
              {issue && (
                <div className="chatgpt-issue" role="alert">
                  <p>{issue.message}</p>
                  {issue.action === "usage" && (
                    <a
                      className="text-link"
                      href={usageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Manage usage <ArrowUpRight size={12} />
                    </a>
                  )}
                  {issue.action === "reconnect" && connection?.connected && (
                    <button
                      className="text-link"
                      onClick={connect}
                      disabled={connecting}
                    >
                      Reconnect ChatGPT
                    </button>
                  )}
                  {(issue.action === "retry_connection" ||
                    (issue.action === "retry" && chatReady && !model)) && (
                    <button
                      className="text-link"
                      onClick={() => {
                        setIssue(null);
                        setLoading(true);
                        void load();
                      }}
                    >
                      Check connection again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="chatgpt-privacy">
            An AI demo, with real project context. Messages are sent to OpenAI
            to generate replies. This site keeps an encrypted connection and
            chat for up to 15 minutes; disconnect to clear them.{" "}
            <a href={usageUrl} target="_blank" rel="noreferrer">
              Manage your ChatGPT access.
            </a>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
