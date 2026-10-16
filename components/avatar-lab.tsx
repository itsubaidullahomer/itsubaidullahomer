"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { ArrowDownToLine, RotateCcw, Play, Pause } from "lucide-react";
import { useAvatarRecording } from "./use-avatar-recording";
import { AvatarPoster } from "./avatar-visual";
import type { RigStatus } from "./avatar-rig";
import {
  visemes,
  validateCues,
  type AvatarExpression,
  type Viseme,
} from "@/lib/avatar/rig";
import { chapterAt, sampleConversation } from "@/lib/avatar/conversation";
import conversation from "@/assets/avatar/ubaid-conversation/conversation.json";

const AvatarRig = dynamic(() => import("./avatar-rig"), {
  ssr: false,
  loading: () => <AvatarPoster />,
});
const cues = validateCues(conversation.cues);
const expressions: [AvatarExpression, string][] = [
  ["neutral", "Neutral"],
  ["warm", "Warm"],
  ["amused", "Amused"],
  ["thinking", "Thinking"],
  ["raised_eyebrow", "Curious"],
  ["focused", "Focused"],
  ["laughing", "Laughing"],
];
const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function AvatarLab() {
  const [status, setStatus] = useState<RigStatus>({ state: "loading" });
  const [expression, setExpression] = useState<AvatarExpression>("neutral");
  const [intensity, setIntensity] = useState(0.8);
  const [yaw, setYaw] = useState(0);
  const [idle, setIdle] = useState(true);
  const [clay, setClay] = useState(false);
  const [closeUp, setCloseUp] = useState(true);
  const [viseme, setViseme] = useState<Viseme>("sil");
  const [playing, setPlaying] = useState(false);
  const [demo, setDemo] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { recording, download, recordError, record, stopRecording } =
    useAvatarRecording();
  const ready = status.state === "ready";
  const chapter = conversation.chapters[chapterAt(conversation.chapters, time)];
  const readMouth = useCallback(
    () => (viseme === "sil" ? {} : { [`viseme_${viseme}`]: 1 }),
    [viseme],
  );
  const readPose = useCallback(
    () =>
      demo
        ? sampleConversation(
            conversation.chapters,
            cues,
            audio.current?.currentTime ?? 0,
          )
        : null,
    [demo],
  );
  function manual() {
    audio.current?.pause();
    setPlaying(false);
    setDemo(false);
  }
  function reset() {
    manual();
    if (audio.current) audio.current.currentTime = 0;
    setTime(0);
    setExpression("neutral");
    setIntensity(0.8);
    setYaw(0);
    setIdle(true);
    setViseme("sil");
  }
  async function play() {
    const element = audio.current;
    if (!element) return;
    if (playing) {
      element.pause();
      return;
    }
    if (element.ended) element.currentTime = 0;
    setDemo(true);
    setViseme("sil");
    setError("");
    try {
      await element.play();
    } catch {
      setError("Playback could not start. Please try again.");
    }
  }
  function seek(seconds: number) {
    if (audio.current) audio.current.currentTime = seconds;
    setTime(seconds);
    setDemo(true);
  }
  return (
    <div className="avatar-lab">
      <header className="avatar-lab-intro">
        <span className="eyebrow">AI Ubaid / Conversation study</span>
        <h1>See the character in conversation.</h1>
        <p>
          A 77-second performance: listening, thinking, speaking, and a small
          smile. Pause anywhere to inspect the face.
        </p>
      </header>
      <div className="avatar-lab-grid">
        <section
          className="avatar-lab-stage"
          aria-label="Interactive 3D avatar preview"
        >
          <div className="avatar-lab-status" aria-live="polite">
            <i />
            {ready
              ? `${status.shapes} facial shapes · real 3D mesh`
              : status.state === "error"
                ? "Portrait fallback"
                : "Loading the rig…"}
          </div>
          <div
            ref={stage}
            className="avatar-lab-render"
            role="img"
            aria-label={`3D avatar: ${demo ? (chapter?.label ?? "At rest") : expression}`}
          >
            <AvatarRig
              expression={expression}
              intensity={intensity}
              yaw={yaw}
              idle={idle && !demo}
              readMouth={readMouth}
              readPose={readPose}
              clay={clay}
              closeUp={closeUp}
              onStatus={setStatus}
            />
          </div>
          <div className="avatar-lab-stage-caption">
            <strong>
              {demo
                ? (chapter?.label ?? "At rest")
                : "Neutral & expression inspection"}
            </strong>
            <span>
              {clay
                ? "Clay view · the underlying geometry"
                : "Character study · reference-derived textures"}
            </span>
          </div>
        </section>
        <section className="avatar-lab-controls" aria-label="Avatar controls">
          <div className="avatar-lab-control-heading">
            <h2>Conversation preview</h2>
            <button onClick={reset} aria-label="Reset avatar controls">
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="conversation-player">
            <button
              className="conversation-play"
              disabled={!ready}
              onClick={() => void play()}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
              {playing
                ? "Pause conversation"
                : time > 0 && time < conversation.duration
                  ? "Resume conversation"
                  : "Play conversation"}
            </button>
            <label className="avatar-range">
              Timeline{" "}
              <span>
                {clock(time)} / {clock(conversation.duration)}
              </span>
              <input
                aria-label="Conversation timeline"
                type="range"
                min="0"
                max={conversation.duration}
                step="0.05"
                value={time}
                disabled={!ready}
                onChange={(e) => seek(Number(e.target.value))}
              />
            </label>
            <audio
              ref={audio}
              preload="metadata"
              src="/audio/avatar/conversation.wav"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                setTime(conversation.duration);
              }}
              onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)}
              onError={() => setError("The preview audio could not be loaded.")}
            />
            <p className="conversation-voice">
              Synthetic macOS system voice, not my voice. This is a scripted
              motion test, not a live AI conversation.
            </p>
            {error && <p role="alert">{error}</p>}
            <div
              className="conversation-caption"
              aria-label="Current speech caption"
            >
              <span>{chapter?.label ?? "Ready when you are"}</span>
              <p>
                {demo
                  ? chapter
                    ? chapter.text || "Listening…"
                    : "Preview complete. Replay or inspect an expression."
                  : "Play the sequence, or choose a moment below."}
              </p>
            </div>
            <div
              className="conversation-chapters"
              aria-label="Jump to a moment"
            >
              {conversation.chapters
                .filter((c) => c.text || c.expression === "thinking")
                .map((c) => (
                  <button
                    key={c.start}
                    aria-pressed={demo && chapter?.start === c.start}
                    onClick={() => seek(c.start + 0.05)}
                    disabled={!ready}
                  >
                    {c.label}
                  </button>
                ))}
            </div>
          </div>
          <fieldset disabled={!ready} className="conversation-inspect">
            <label className="avatar-idle-toggle">
              <input
                type="checkbox"
                checked={closeUp}
                onChange={(e) => setCloseUp(e.target.checked)}
              />
              Face close-up
            </label>
            <label className="avatar-idle-toggle">
              <input
                type="checkbox"
                checked={clay}
                onChange={(e) => setClay(e.target.checked)}
              />
              Show untextured geometry
            </label>
            <label className="avatar-range">
              View angle <span>{yaw}°</span>
              <input
                type="range"
                min="-35"
                max="35"
                step="1"
                value={yaw}
                onChange={(e) => setYaw(Number(e.target.value))}
              />
            </label>
          </fieldset>
          <details className="avatar-manual-controls">
            <summary>Manual expressions & mouth shapes</summary>
            <fieldset disabled={!ready}>
              <legend>Choosing a control stops the sequence.</legend>
              <div className="avatar-expression-options">
                {expressions.map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={!demo && expression === value}
                    onClick={() => {
                      manual();
                      setExpression(value);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="avatar-range">
                Intensity <span>{Math.round(intensity * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={intensity}
                  onChange={(e) => {
                    manual();
                    setIntensity(Number(e.target.value));
                  }}
                />
              </label>
              <label className="avatar-idle-toggle">
                <input
                  type="checkbox"
                  checked={idle}
                  onChange={(e) => {
                    manual();
                    setIdle(e.target.checked);
                  }}
                />
                Natural blinks & small head movements
              </label>
              <div className="avatar-viseme-options">
                {visemes.map((value) => (
                  <button
                    key={value}
                    aria-pressed={!demo && viseme === value}
                    onClick={() => {
                      manual();
                      setViseme(value);
                    }}
                  >
                    {value === "sil" ? "Rest" : value}
                  </button>
                ))}
              </div>
            </fieldset>
          </details>
        </section>
      </div>
      <div className="conversation-export">
        <button
          disabled={!ready}
          onClick={() => {
            if (recording) {
              stopRecording();
              return;
            }
            const canvas = stage.current?.querySelector("canvas");
            if (!canvas || !audio.current) return;
            setDemo(true);
            setYaw(0);
            setClay(false);
            setCloseUp(true);
            void record(canvas, audio.current);
          }}
        >
          {recording ? "Finish recording" : "Record the full preview"}
        </button>
        <span>
          {recording
            ? "Recording the performance locally. Let it play to the end."
            : "Creates a video on this device. No upload or paid service."}
        </span>
        {download && (
          <a href={download} download="ubaid-conversation-study.webm">
            Download recorded preview
          </a>
        )}
        {recordError && <p role="alert">{recordError}</p>}
      </div>
      <footer className="avatar-lab-footer">
        <p>
          Built locally in Blender with free MakeHuman topology. The eyes move
          independently; the skin and hair still use reference-derived
          pigmentation. Side views and extreme expressions remain a work in
          progress.
        </p>
        <a href="/models/avatar/ubaid-conversation.glb" download>
          <ArrowDownToLine size={16} />
          Download this 3D study
        </a>
      </footer>
    </div>
  );
}
