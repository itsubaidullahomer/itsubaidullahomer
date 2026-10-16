"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AvatarGuide from "./avatar-guide";
import { EventDecoder } from "@/lib/avatar-guide/stream";
import {
  SITE_INDEX,
  validateAction,
  type TimelineAction,
} from "@/lib/avatar-guide-server/timeline";
import type {
  AvatarGuideHandle,
  GuideStatus,
} from "@/lib/avatar-guide/vocabulary";
import "@/app/avatar-guide-lab/avatar-guide-lab.css";
import "./avatar-guide-portfolio.css";

/** Persistent layout child: navigation never unmounts the active conversation. */
export default function PortfolioGuide({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const guide = useRef<AvatarGuideHandle>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    "Free preview · authored answers · device voice",
  );
  const [status, setStatus] = useState<GuideStatus | null>(null);
  const navigate = useCallback(
    (path: string) => router.push(path, { scroll: false }),
    [router],
  );
  const stop = useCallback(() => {
    generation.current++;
    request.current?.abort();
    guide.current?.interrupt();
    setBusy(false);
  }, []);
  useEffect(
    () => () => {
      // Invalidates asynchronous work when the visitor closes this opt-in preview.
      generation.current++;
      request.current?.abort();
    },
    [],
  );
  async function perform(action: TimelineAction, token: number) {
    if (token !== generation.current || !guide.current) return;
    const g = guide.current;
    if (action.type === "react") {
      g.setEmotion(action.emotion, action.intensity);
      g.playGesture(action.gesture);
    } else if (action.type === "navigate") {
      const found = await g.navigateTo(action.sectionId);
      if (!found && token === generation.current)
        setNotice("That section is unavailable on this page.");
      // Wait for the smooth scroll before pointing and speaking about its contents.
      await new Promise((resolve) => setTimeout(resolve, 600));
    } else if (action.type === "point") {
      g.pointAt(action.selector);
    } else {
      await g.say(action.text, action);
    }
  }
  async function ask(message = question) {
    if (!message.trim()) return;
    stop();
    const token = generation.current;
    const abort = new AbortController();
    request.current = abort;
    setBusy(true);
    setQuestion(message);
    guide.current?.setState("thinking");
    guide.current?.setEmotion("curious", 0.45);
    guide.current?.playGesture("nod");
    let chain = Promise.resolve();
    const failed = (error: unknown) => {
      if (token !== generation.current) return;
      stop();
      setNotice(
        error instanceof Error
          ? error.message
          : "The preview could not answer.",
      );
    };
    try {
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode: "demo" }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body)
        throw new Error("Guide preview unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const events = new EventDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done || token !== generation.current) break;
        for (const raw of events.push(
          decoder.decode(value, { stream: true }),
        )) {
          if (!raw || typeof raw !== "object") continue;
          const event = raw as Record<string, unknown>;
          if (event.type === "error" && typeof event.message === "string")
            setNotice(event.message);
          if (event.type === "action") {
            const action = validateAction(event.action);
            if (action)
              chain = chain.then(() => perform(action, token)).catch(failed);
          }
        }
      }
      await chain;
    } catch (error) {
      if (!abort.signal.aborted) failed(error);
    } finally {
      if (token === generation.current) {
        setBusy(false);
        guide.current?.setState("idle");
      }
    }
  }
  return (
    <div className="portfolio-guide">
      <AvatarGuide
        ref={guide}
        targets={SITE_INDEX}
        mobileBottomOffset={140}
        avoidPanelSelector=".portfolio-guide-panel"
        onNavigate={navigate}
        onInterrupt={stop}
        onStatus={setStatus}
      />
      <section
        className="portfolio-guide-panel"
        aria-label="Portfolio guide preview"
      >
        <div className="portfolio-guide-heading">
          <strong>Explore with Ubaid</strong>
          <button
            type="button"
            aria-label="Close guide preview"
            onClick={() => {
              stop();
              onClose();
            }}
          >
            ×
          </button>
        </div>
        <p>
          {status?.state === "ready"
            ? "Model study · likeness not approved"
            : "Portrait fallback · 3D model pending"}
        </p>
        <div className="portfolio-guide-prompts">
          {["Projects", "Skills", "Experience", "Contact"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void ask(`Tell me about ${item.toLowerCase()}`)}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <label className="sr-only" htmlFor="portfolio-guide-question">
            Ask about this portfolio
          </label>
          <input
            id="portfolio-guide-question"
            value={question}
            onChange={(event) => {
              stop();
              setQuestion(event.target.value);
            }}
            placeholder="Ask about my work…"
            maxLength={1800}
          />
          <button type="submit" disabled={!question.trim()}>
            {busy ? "Replace" : "Ask"}
          </button>
        </form>
        <small role="status">{notice}</small>
        <Link href="/avatar-guide-lab" onClick={stop}>
          Voice and motion lab ↗
        </Link>
      </section>
    </div>
  );
}
