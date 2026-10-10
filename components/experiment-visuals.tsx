import {
  AudioLines,
  Check,
  Cpu,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";

export function StreamVisual({
  state,
  count,
  total,
  latency,
}: {
  state: string;
  count: number;
  total: number;
  latency: number;
}) {
  return (
    <div
      className="stream-visual"
      data-state={state}
      aria-hidden="true"
      style={{ "--packet-duration": `${600 + latency / 2}ms` } as CSSProperties}
    >
      <div className="stream-pipeline">
        <div className="pipeline-station">
          <div className="pipeline-key request-key">
            <Send size={21} />
          </div>
          <span>Request</span>
        </div>
        <div className="pipeline-wire">
          <i />
        </div>
        <div className="pipeline-station">
          <div className="pipeline-key model-key">
            <Cpu size={28} />
            <i />
          </div>
          <span>Model</span>
        </div>
        <div className="pipeline-wire">
          <i />
        </div>
        <div className="pipeline-station">
          <div className="pipeline-key response-key">
            {state === "done" ? (
              <Check size={23} />
            ) : (
              <MessageSquare size={21} />
            )}
          </div>
          <span>Response</span>
        </div>
      </div>
      <div className="word-buffer">
        <span>
          <ShieldCheck size={12} /> Text buffer
        </span>
        <div className="buffer-cells">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i < count ? "filled" : ""} />
          ))}
        </div>
        <span>
          {state === "failed"
            ? "Kept safe"
            : `${Math.round((count / total) * 100)}%`}
        </span>
      </div>
    </div>
  );
}

const waveHeights = [7, 13, 24, 15, 32, 21, 12, 27, 36, 18, 28, 11];
export function VoiceVisual({
  phase,
  speaker,
}: {
  phase: string;
  speaker: string;
}) {
  const label =
    phase === "active"
      ? `${speaker}’s turn`
      : phase === "listening"
        ? "You have the floor"
        : phase === "complete"
          ? "Conversation complete"
          : phase === "paused"
            ? "Conversation paused"
            : "Ready to connect";
  return (
    <div className="voice-visual" data-phase={phase}>
      <div className="voice-sculpture" aria-hidden="true">
        <div className="voice-wave">
          {waveHeights.map((height, i) => (
            <i
              key={i}
              style={{ height, "--bar-delay": `${i * -85}ms` } as CSSProperties}
            />
          ))}
        </div>
        <div className="voice-orbit">
          <div className="voice-sphere">
            <AudioLines size={34} strokeWidth={1.5} />
          </div>
        </div>
        <div className="voice-wave">
          {[...waveHeights].reverse().map((height, i) => (
            <i
              key={i}
              style={
                { height, "--bar-delay": `${i * -110}ms` } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      <div className="voice-stage-caption">
        <span className="lab-state-dot" />
        {label}
      </div>
      <span className="voice-stage-note">
        Scripted conversation · audio optional
      </span>
    </div>
  );
}
