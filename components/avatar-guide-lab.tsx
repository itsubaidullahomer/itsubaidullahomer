"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  EMOTIONS,
  GESTURES,
  STATES,
  type AvatarGuideHandle,
  type Emotion,
  type FaceWeights,
  type GuideSnapshot,
  type GuideStatus,
  type Target,
} from "@/lib/avatar-guide/vocabulary";
import { audioBlobUrl, recordingWav } from "@/lib/avatar-guide/audio";
import type { SpeechOptions } from "@/lib/avatar-guide/vocabulary";
import { EventDecoder } from "@/lib/avatar-guide/stream";
import {
  validateAction,
  type TimelineAction,
} from "@/lib/avatar-guide-server/timeline";
import siteIndex from "@/lib/avatar-guide-server/site-index.json";
import conversation from "@/assets/avatar/ubaid-conversation/conversation.json";
import type { Viseme } from "@/lib/avatar-guide/vocabulary";
const AvatarGuide = dynamic(() => import("./avatar-guide"), { ssr: false });
const targets = siteIndex as Target[];
const faceTests: { label: string; weights: FaceWeights }[] = [
  { label: "Neutral face", weights: {} },
  { label: "Closed blink", weights: { eyeBlinkLeft: 1, eyeBlinkRight: 1 } },
  { label: "Mouth AA", weights: { viseme_aa: 0.8 } },
  { label: "Mouth PP", weights: { viseme_PP: 1 } },
  { label: "Mouth OO", weights: { viseme_O: 0.8 } },
];
const sceneEmotions: Record<string, Emotion> = {
  neutral: "neutral",
  warm: "warm_smile",
  thinking: "thinking",
  focused: "serious",
  amused: "playful",
  raised_eyebrow: "curious",
  laughing: "big_laugh",
};
const scenes: NonNullable<SpeechOptions["scenes"]> = conversation.chapters.map(
  (chapter) => ({
    start: chapter.start,
    end: chapter.end,
    text: chapter.text,
    emotion: sceneEmotions[chapter.expression] ?? "neutral",
    state: chapter.text
      ? "speaking"
      : chapter.expression === "thinking"
        ? "thinking"
        : "listening",
    gesture: chapter.text
      ? chapter.expression === "amused"
        ? "shrug"
        : "open_palm_present"
      : chapter.expression === "thinking"
        ? "hand_to_chin"
        : "nod",
  }),
);
const cues = conversation.cues
  .map((c) => ({
    start: c.start,
    end: c.end,
    value:
      ({ ih: "I", oh: "O", ou: "U" } as Record<string, string>)[c.value] ??
      (c.value as Viseme),
  }))
  .map((c) => ({ ...c, value: c.value as Viseme }));
export default function AvatarGuideLab() {
  const guide = useRef<AvatarGuideHandle>(null);
  const [model, setModel] = useState<"fitted" | "foundation">("fitted");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [framing, setFraming] = useState<"floating" | "fullbody" | "face">(
    "floating",
  );
  const [panels, setPanels] = useState(true);
  const [voice, setVoice] = useState<"device" | "paid">("device");
  const [inviteCode, setInviteCode] = useState("");
  const [capabilities, setCapabilities] = useState({
    voiceConfigured: false,
    transcriptionConfigured: false,
    voiceDisclosure: "",
    provider: "",
  });
  const request = useRef<AbortController | null>(null);
  const run = useRef(0);
  const started = useRef(0);
  const [status, setStatus] = useState<GuideStatus>({
    state: "loading",
    message: "Preparing the scene…",
  });
  const [emotion, setEmotion] = useState<Emotion>("warm_smile"),
    [intensity, setIntensity] = useState(0.65);
  const [question, setQuestion] = useState("What projects have you built?");
  const [line, setLine] = useState(
    "Hi, I’m Ubaid’s portfolio guide. Let me show you the decisions behind my work.",
  );
  const [busy, setBusy] = useState(false),
    [mode, setMode] = useState<"demo" | "live">("demo"),
    [notice, setNotice] = useState(
      "Authored answers and your device’s standard English voice. No AI usage charges in demo mode.",
    );
  const [firstAction, setFirstAction] = useState<number | null>(null),
    [firstAudio, setFirstAudio] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/avatar", { signal: abort.signal })
      .then((r) => r.json())
      .then((data) =>
        setCapabilities({
          provider: typeof data.provider === "string" ? data.provider : "",
          voiceConfigured: Boolean(data.voiceConfigured),
          transcriptionConfigured: Boolean(data.transcriptionConfigured),
          voiceDisclosure:
            typeof data.voiceDisclosure === "string"
              ? data.voiceDisclosure
              : "",
        }),
      )
      .catch(() => {});
    return () => {
      // Cancellation generations intentionally invalidate the latest request on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      run.current++;
      abort.abort();
      request.current?.abort();
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const append = (text: string) => setLog((old) => [text, ...old].slice(0, 12));
  function interrupt() {
    run.current++;
    request.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    guide.current?.interrupt();
    setBusy(false);
  }
  async function action(item: TimelineAction, token: number) {
    if (run.current !== token || !guide.current) return;
    const g = guide.current;
    append(
      `${item.type}: ${"text" in item ? item.text.slice(0, 60) : "selector" in item ? item.selector : "sectionId" in item ? item.sectionId : item.emotion}`,
    );
    if (item.type === "react") {
      g.setEmotion(item.emotion, item.intensity);
      g.playGesture(item.gesture);
    }
    if (item.type === "navigate") {
      await g.navigateTo(item.sectionId);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (item.type === "point") g.pointAt(item.selector);
    if (item.type === "say") {
      if (voice === "paid" && mode === "live" && capabilities.voiceConfigured) {
        const response = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "speech", text: item.text }),
          signal: request.current?.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Speech generation unavailable.");
        if (token !== run.current) return;
        const url = audioBlobUrl(data.audioBase64, data.mimeType);
        try {
          await g.say(data.spokenText ?? item.text, {
            ...item,
            audioUrl: url,
            visemes: data.visemes,
            wordTimings: data.wordTimings,
            timingQuality: data.timingQuality,
          } as SpeechOptions);
        } finally {
          URL.revokeObjectURL(url);
        }
      } else await g.say(item.text, item);
    }
  }
  async function ask(message = question) {
    if (!message.trim()) return;
    interrupt();
    const token = run.current;
    const abort = new AbortController();
    request.current = abort;
    started.current = performance.now();
    setFirstAction(null);
    setFirstAudio(null);
    setBusy(true);
    guide.current?.setState("listening");
    guide.current?.setEmotion("curious", 0.4);
    guide.current?.playGesture("nod");
    setFirstAction(performance.now() - started.current);
    const thinking = setTimeout(() => {
      if (token === run.current) {
        guide.current?.setState("thinking");
        guide.current?.setEmotion("thinking", 0.55);
        guide.current?.playGesture("hand_to_chin");
      }
    }, 120);
    let chain = Promise.resolve();
    try {
      if (mode === "live" && capabilities.provider === "chatgpt")
        await fetch("/api/chatgpt/avatar-session", {
          method: "POST",
          signal: abort.signal,
        });
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body)
        throw new Error(`Conversation unavailable (${response.status}).`);
      const reader = response.body.getReader(),
        decoder = new TextDecoder(),
        events = new EventDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const event of events.push(
          decoder.decode(value, { stream: true }),
        )) {
          if (!event || typeof event !== "object") continue;
          const data = event as Record<string, unknown>;
          if (data.type === "status" && typeof data.notice === "string")
            setNotice(data.notice);
          if (data.type === "error")
            setNotice(
              typeof data.message === "string"
                ? data.message
                : "Conversation request failed. Showing the authored fallback.",
            );
          if (data.type === "action") {
            const checked = validateAction(data.action);
            if (checked) {
              clearTimeout(thinking);
              chain = chain
                .then(() => action(checked, token))
                .catch((error) => {
                  if (token === run.current) {
                    interrupt();
                    setNotice(
                      error instanceof Error
                        ? error.message
                        : "Voice playback failed.",
                    );
                  }
                });
            }
          }
        }
      }
      await chain;
    } catch (error) {
      if (!abort.signal.aborted) {
        interrupt();
        setNotice(error instanceof Error ? error.message : "Unable to answer.");
        guide.current?.setEmotion("embarrassed", 0.35);
      }
    } finally {
      clearTimeout(thinking);
      if (token === run.current) {
        setBusy(false);
        guide.current?.setState("idle");
      }
    }
  }

  function previewSpeech(text: string, options: SpeechOptions = {}) {
    interrupt();
    void guide.current?.say(text, options);
  }

  async function connectInvitation() {
    try {
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "connect", inviteCode }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Invitation unavailable.");
      setInviteCode("");
      setMode("live");
      setNotice(
        "Invitation connected. Configured provider calls use the owner’s capped API budget.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to connect.");
    }
  }
  async function recordQuestion() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    if (mode !== "live" || !capabilities.transcriptionConfigured) return;
    interrupt();
    const token = run.current;
    const abort = new AbortController();
    request.current = abort;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (token !== run.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const take = new MediaRecorder(media);
      recorder.current = take;
      const chunks: Blob[] = [];
      take.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      take.onstop = async () => {
        setRecording(false);
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        media.getTracks().forEach((track) => track.stop());
        if (token !== run.current) return;
        try {
          setNotice("Transcribing your question…");
          const audioBase64 = await recordingWav(
            new Blob(chunks, { type: take.mimeType }),
          );
          if (token !== run.current) return;
          const response = await fetch("/api/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operation: "transcribe", audioBase64 }),
            signal: abort.signal,
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error ?? "Transcription unavailable.");
          if (token !== run.current) return;
          setQuestion(data.text);
          await ask(data.text);
        } catch (error) {
          setNotice(
            error instanceof Error ? error.message : "Unable to transcribe.",
          );
        }
      };
      take.start();
      setRecording(true);
      guide.current?.setState("listening");
      recordingTimer.current = setTimeout(() => {
        if (take.state === "recording") take.stop();
      }, 29500);
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      recorder.current = null;
      setRecording(false);
      setNotice(
        error instanceof Error ? error.message : "Microphone unavailable.",
      );
    }
  }

  async function tour() {
    interrupt();
    const token = run.current;
    setBusy(true);
    for (const id of [
      "project-tututor",
      "project-insight-x",
      "project-ai-humanizer",
      "project-ali-foodies",
    ]) {
      if (token !== run.current) break;
      const target = targets.find((t) => t.sectionId === id);
      if (!target) continue;
      await action({ type: "navigate", sectionId: id }, token);
      await action({ type: "point", selector: target.selector }, token);
      await action(
        {
          type: "say",
          text: target.summary,
          emotion: "proud",
          intensity: 0.65,
          gestures: [{ atWord: 3, name: "open_palm_present" }],
        },
        token,
      );
    }
    if (token === run.current) setBusy(false);
  }
  const snapshot = (next: GuideSnapshot) => {
    if (next.audioStartedAt && started.current)
      setFirstAudio(
        (old) => old ?? Math.max(0, next.audioStartedAt! - started.current),
      );
  };
  const shown = targets.filter(
    (t) =>
      !filter ||
      `${t.title} ${t.summary}`.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <main
      className={`guide-lab ${framing !== "floating" ? "guide-review-mode" : ""} ${!panels ? "guide-panels-hidden" : ""}`}
    >
      <div className="guide-review-toolbar" aria-label="Model review framing">
        <span>Unapproved model study</span>
        <select
          aria-label="Character study"
          value={model}
          onChange={(event) => {
            interrupt();
            setStatus({ state: "loading", message: "Loading the selected study…" });
            setModel(event.target.value as typeof model);
          }}
        >
          <option value="fitted">Fitted face · draft</option>
          <option value="foundation">Earlier foundation · rejected likeness</option>
        </select>
        <select
          aria-label="Review framing"
          value={framing}
          onChange={(event) => {
            interrupt();
            setFraming(event.target.value as typeof framing);
          }}
        >
          <option value="floating">Beside content</option>
          <option value="fullbody">Full body</option>
          <option value="face">Face close-up</option>
        </select>
        <button type="button" onClick={() => setPanels(!panels)}>
          {panels ? "Hide panels" : "Show panels"}
        </button>
        <button
          type="button"
          onClick={() => {
            interrupt();
            setFraming("floating");
            setPanels(true);
          }}
        >
          Back to lab
        </button>
      </div>
      <header className="guide-lab-header">
        <div className="guide-preview-links">
          <Link href="/">← Portfolio</Link>
          <Link href="/?avatarGuide=1">
            Try the guide on the real website ↗
          </Link>
          <Link href="/avatar-identity-lab">Inspect the fitted head ↗</Link>
        </div>
        <p className="guide-eyebrow">AI UBAID / DEVELOPMENT STUDIO</p>
        <h1>Character & conversation study.</h1>
        <p>
          Test the character, conversation and pointing together. The cards
          below use the portfolio’s real content; this lab does not replace the
          public homepage. The fitted face, hair and clothing are still under
          visual review.
        </p>
        <div className="guide-badges">
          <span>
            {status.state === "ready"
              ? `${status.bones} bones · ${status.shapes} facial shapes`
              : "Approved portrait fallback"}
          </span>
          <span>English · device voice preview</span>
        </div>
      </header>
      <section
        className="guide-controls"
        aria-label="Avatar development controls"
      >
        <div className="guide-control-heading">
          <h2>Try a conversation</h2>
          <button type="button" onClick={interrupt}>
            Interrupt
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <label htmlFor="guide-question">Ask about my work</label>
          <div className="guide-input-row">
            <input
              id="guide-question"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                interrupt();
              }}
              maxLength={600}
            />
            <button type="submit">{busy ? "Ask again" : "Ask"}</button>
          </div>
        </form>
        <div className="guide-mode">
          <label>
            Answer source{" "}
            <select
              value={mode}
              onChange={(e) => {
                interrupt();
                setMode(e.target.value as "demo" | "live");
              }}
            >
              <option value="demo">Free authored demo</option>
              <option value="live">Configured live provider</option>
            </select>
          </label>
          <button type="button" onClick={() => void tour()}>
            Take the project tour
          </button>
        </div>
        <div className="guide-mode">
          <label>
            Voice{" "}
            <select
              value={voice}
              onChange={(event) => {
                interrupt();
                setVoice(event.target.value as "device" | "paid");
              }}
            >
              <option value="device">Free device voice</option>
              <option
                value="paid"
                disabled={!capabilities.voiceConfigured || mode !== "live"}
              >
                Configured API voice (paid)
              </option>
            </select>
          </label>
          <button
            type="button"
            disabled={!capabilities.transcriptionConfigured || mode !== "live"}
            onClick={() => void recordQuestion()}
          >
            {recording
              ? "Stop & send recording"
              : "Record a question (paid STT)"}
          </button>
        </div>
        <p className="guide-note">{notice}</p>
        {voice === "paid" ? (
          <p className="guide-note">
            {capabilities.voiceDisclosure} Mouth timing is estimated from
            pronunciation and provider timing, not forced-aligned phonemes.
          </p>
        ) : null}
        <details>
          <summary>Invited live access</summary>
          <p className="guide-note">
            Use an owner-issued invitation to access the configured paid API. A
            ChatGPT sign-in does not enable paid voice automatically.
          </p>
          <label htmlFor="guide-invite">Invitation code</label>
          <div className="guide-input-row">
            <input
              id="guide-invite"
              type="password"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoComplete="off"
            />
            <button type="button" onClick={() => void connectInvitation()}>
              Connect
            </button>
          </div>
        </details>
        <div className="guide-metrics">
          <span>
            Local reaction{" "}
            <strong>
              {firstAction === null ? "—" : `${firstAction.toFixed(0)} ms`}
            </strong>
          </span>
          <span>
            First audio started{" "}
            <strong>
              {firstAudio === null ? "—" : `${firstAudio.toFixed(0)} ms`}
            </strong>
          </span>
          <span>
            Model <strong>{status.state}</strong>
          </span>
        </div>
        <details open>
          <summary>Expression & body controls</summary>
          <label className="guide-range">
            Intensity{" "}
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={intensity}
              onChange={(e) => {
                const n = Number(e.target.value);
                setIntensity(n);
                guide.current?.setEmotion(emotion, n);
              }}
            />
            <output>{intensity.toFixed(2)}</output>
          </label>
          <div className="guide-buttons">
            {EMOTIONS.map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={emotion === name}
                onClick={() => {
                  setEmotion(name);
                  guide.current?.setEmotion(name, intensity);
                }}
              >
                {name.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <div className="guide-buttons guide-gestures">
            {GESTURES.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => guide.current?.playGesture(name)}
              >
                {name.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <p className="guide-note">
            Hold a face test to inspect the exported geometry.
          </p>
          <div className="guide-buttons">
            {faceTests.map(({ label, weights }) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  interrupt();
                  guide.current?.setEmotion("neutral", 0);
                  guide.current?.inspectFace(weights);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
        <details>
          <summary>Gaze, state & speech checks</summary>
          <div className="guide-buttons">
            <button
              type="button"
              onClick={() => guide.current?.lookAt("cursor")}
            >
              Follow cursor
            </button>
            <button
              type="button"
              onClick={() => guide.current?.lookAt("viewer")}
            >
              Look at visitor
            </button>
            {STATES.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => guide.current?.setState(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <label htmlFor="guide-line">Speak this line</label>
          <textarea
            id="guide-line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            rows={3}
          />
          <div className="guide-buttons">
            <button
              type="button"
              onClick={() => previewSpeech(line, { emotion, intensity })}
            >
              Speak with device voice
            </button>
            <button
              type="button"
              onClick={() =>
                previewSpeech(
                  "Recorded conversation study: this local audio includes aligned mouth cues. The voice is a standard preview, not Ubaid’s cloned voice.",
                  {
                    audioUrl: "/audio/avatar/conversation.wav",
                    visemes: cues,
                    scenes,
                    emotion: "warm_smile",
                  },
                )
              }
            >
              Play aligned recording
            </button>
          </div>
          <p className="guide-note">
            Device speech supports captions and word events when the browser
            supplies them. It does not provide phonemes. Use the aligned
            recording to assess visemes.
          </p>
        </details>
        <details>
          <summary>Asset report & action log</summary>
          <p>{status.message}</p>
          {status.missing?.length ? (
            <p>Unavailable channels: {status.missing.join(", ")}</p>
          ) : null}
          <p>
            {status.clips ?? 0} authored animation clips. Procedural pose
            previews are not a substitute for finished gesture clips.
          </p>
          <ol className="guide-log">
            {log.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </details>
      </section>
      <section className="guide-index">
        <div className="guide-control-heading">
          <h2>What I can show you</h2>
          <label>
            Find a section{" "}
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Projects, services, experience…"
            />
          </label>
        </div>
        <p>
          These review cards mirror the indexed portfolio content and make each
          pointing target inspectable.
        </p>
        <div className="guide-targets">
          {shown.map((target) => (
            <article
              key={target.sectionId}
              data-guide-selector={target.selector}
              className="guide-target"
            >
              <span>{target.sectionId}</span>
              <h3>{target.title}</h3>
              <p>{target.summary}</p>
              {target.keyFacts?.length ? (
                <ul>
                  {target.keyFacts.slice(0, 4).map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <button
                  type="button"
                  onClick={() => guide.current?.pointAt(target.selector)}
                >
                  Point here
                </button>
                <a href={target.path ?? "/"}>Open portfolio page ↗</a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <AvatarGuide
        key={model}
        ref={guide}
        assetUrl={
          model === "fitted"
            ? "/models/avatar/studies/fitted-body-v20.glb?v=fitted-draft-1"
            : "/models/avatar/ubaid-fullbody.glb"
        }
        targets={targets}
        onStatus={setStatus}
        onSnapshot={snapshot}
        onInterrupt={interrupt}
        framing={framing}
        avoidPanelSelector=".guide-review-toolbar"
      />
    </main>
  );
}
