"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Play,
  RotateCcw,
  Pause,
  ArrowRight,
  Waves,
  AudioLines,
  Network,
  UserRound,
  Users,
  Building2,
  Server,
  Sparkles,
  Radio,
  FileDown,
  Cpu,
  Database,
} from "lucide-react";
import { StreamVisual, VoiceVisual } from "./experiment-visuals";
import { Button } from "./ui/button";
const sample =
  "A good AI interface stays with you while the model thinks. It streams the first useful words, keeps the text you already received, and tells you what happened when the connection drops. Retrying should continue the thought, not erase the conversation. The prompt is rarely the hard part.";
export function StreamingLab() {
  const [latency, setLatency] = useState(450);
  const [chunk, setChunk] = useState(3);
  const [failure, setFailure] = useState(true);
  const [state, setState] = useState<
    "idle" | "waiting" | "streaming" | "failed" | "paused" | "done"
  >("idle");
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(0);
  const words = sample.split(" ");
  const active = state === "waiting" || state === "streaming";
  useEffect(() => {
    if (!active) return;
    const tick = setTimeout(
      () => {
        if (state === "waiting") {
          setState("streaming");
          return;
        }
        if (failure && !failed && count >= Math.floor(words.length * 0.4)) {
          setFailed(true);
          setState("failed");
          return;
        }
        const next = Math.min(count + chunk, words.length);
        setCount(next);
        setElapsed(Math.round(performance.now() - started));
        if (next === words.length) setState("done");
      },
      state === "waiting" ? latency : 85 + latency / 10,
    );
    return () => clearTimeout(tick);
  }, [
    state,
    count,
    chunk,
    latency,
    failure,
    failed,
    started,
    words.length,
    active,
  ]);
  function start() {
    setCount(0);
    setFailed(false);
    setStarted(performance.now());
    setElapsed(0);
    setState("waiting");
  }
  return (
    <article className="lab-card stream-lab" id="streaming-lab">
      <div className="lab-heading">
        <div>
          <h2>The space between request and reply.</h2>
          <p>
            Dial up the latency. Break the connection. Watch the interface keep
            its place.
          </p>
        </div>
        <span className="demo-label">
          <Waves size={14} aria-hidden="true" /> 01 / Streaming
        </span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
          <span className="lab-control-title">Tune the response</span>
          <label>
            Initial latency <span className="mono">{latency} ms</span>
            <input
              aria-label="Initial latency"
              type="range"
              min="0"
              max="2500"
              step="50"
              value={latency}
              onChange={(e) => setLatency(+e.target.value)}
            />
          </label>
          <label>
            Chunk size <span className="mono">{chunk} words</span>
            <input
              aria-label="Chunk size"
              type="range"
              min="1"
              max="12"
              value={chunk}
              onChange={(e) => setChunk(+e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={failure}
              onChange={(e) => setFailure(e.target.checked)}
            />{" "}
            Drop the connection midway
          </label>
          <div className="button-row">
            <Button
              onClick={
                active
                  ? () => setState("paused")
                  : state === "paused" || state === "failed"
                    ? () => {
                        setStarted(performance.now() - elapsed);
                        setState("streaming");
                      }
                    : start
              }
            >
              {active ? (
                <>
                  <Pause size={13} /> Pause
                </>
              ) : state === "failed" ? (
                "Retry from here"
              ) : state === "paused" ? (
                "Resume"
              ) : (
                <>
                  <Play size={13} /> Run stream
                </>
              )}
            </Button>
            {state !== "idle" && (
              <Button
                variant="secondary"
                aria-label="Reset streaming experiment"
                onClick={() => {
                  setState("idle");
                  setCount(0);
                  setElapsed(0);
                  setFailed(false);
                }}
              >
                <RotateCcw size={13} />
              </Button>
            )}
          </div>
        </div>
        <div className="lab-output" data-state={state}>
          <StreamVisual
            state={state}
            count={count}
            total={words.length}
            latency={latency}
          />
          <div className="experiment-console">
            <div className="experiment-console-bar">
              <span>assistant / response</span>
              <span className="experiment-state" role="status">
                <i className="lab-state-dot" />
                {state === "done"
                  ? "Complete"
                  : state === "failed"
                    ? "Connection interrupted"
                    : state === "waiting"
                      ? "Waiting for first token"
                      : state === "idle"
                        ? "Ready"
                        : state === "paused"
                          ? "Paused"
                          : "Receiving words"}
              </span>
            </div>
            <div className="output-text" aria-label="Streamed response">
              {state === "idle" ? (
                <p>
                  Ready when you are. This response is local, so you can
                  experiment without using API credits.
                </p>
              ) : state === "waiting" ? (
                <p>
                  Getting the first words ready
                  <span className="stream-caret" />
                </p>
              ) : (
                <>
                  {words.slice(0, count).join(" ")}
                  {active && <span className="stream-caret" />}
                </>
              )}
            </div>
            {state === "failed" && (
              <p className="stream-recovery" role="status">
                The connection dropped. Your answer is safe. Retry to continue
                where it stopped.
              </p>
            )}
          </div>
          <div className="stream-metrics">
            <span>
              <strong>
                {count}
                <small> / {words.length}</small>
              </strong>
              Words received
            </span>
            <span>
              <strong>
                {(elapsed / 1000).toFixed(1)}
                <small> s</small>
              </strong>
              Active time
            </span>
            <span>
              <strong>{failed ? "Preserved" : "Local"}</strong>
              {failed ? "Context on retry" : "No API credits"}
            </span>
          </div>
          <p className="lab-takeaway">
            <span>Try this</span> Leave the connection drop on, then retry. The
            buffer keeps every word.
          </p>
        </div>
      </div>
    </article>
  );
}
const subscribeSpeech = () => () => {};
type CallLine = { who: string; text: string; interrupted?: boolean };
const script: CallLine[] = [
  {
    who: "Agent",
    text: "Hi, this is a demo of a booking assistant. Is now a good time?",
  },
  { who: "Visitor", text: "I have a minute. What is this about?" },
  {
    who: "Agent",
    text: "I’m following up on your product engineering enquiry. I can help find a time to talk through the project.",
  },
  { who: "Visitor", text: "Next week could work. What do you need from me?" },
  {
    who: "Agent",
    text: "Just the product you’re building and your timezone. The actual scope is a conversation with Ubaid.",
  },
  { who: "Visitor", text: "Great. Send me the booking link." },
  {
    who: "Agent",
    text: "That’s the handoff. A real agent would open the booking flow here, with your permission.",
  },
];
export function VoiceLab() {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [lines, setLines] = useState<CallLine[]>([]);
  const [speak, setSpeak] = useState(false);
  const [interruptions, setInterruptions] = useState(0);
  const supported = useSyncExternalStore(
    subscribeSpeech,
    () => "speechSynthesis" in window,
    () => false,
  );
  const log = useRef<HTMLDivElement>(null);
  const listening =
    !running && lines.at(-1)?.text === "Of course. Go ahead — I’m listening.";
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    if (!running) return;
    const timeout = setTimeout(
      () => {
        if (index >= script.length) {
          setRunning(false);
          return;
        }
        const line = script[index];
        setLines((old) => [...old, line]);
        setIndex((i) => i + 1);
        if (speak && supported) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(line.text);
          utterance.rate = 1.03;
          window.speechSynthesis.speak(utterance);
        }
      },
      index === 0 ? 200 : 3600,
    );
    return () => clearTimeout(timeout);
  }, [running, index, speak, supported]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lines]);
  function interrupt() {
    window.speechSynthesis?.cancel();
    setInterruptions((n) => n + 1);
    setLines((old) => [
      ...old.map((l, i) =>
        i === old.length - 1 && l.who === "Agent"
          ? { ...l, interrupted: true }
          : l,
      ),
      {
        who: "Visitor",
        text: "Actually, can we pause? I need to explain something.",
      },
      { who: "Agent", text: "Of course. Go ahead — I’m listening." },
    ]);
    setRunning(false);
  }
  return (
    <article className="lab-card voice-lab" id="voice-lab">
      <div className="lab-heading">
        <div>
          <h2>A conversation has two sides.</h2>
          <p>
            A scripted call you can interrupt. Barge in and the agent stops
            talking, keeps the context, and gives you the floor.
          </p>
        </div>
        <span className="demo-label">
          <AudioLines size={14} aria-hidden="true" /> 02 / Voice
        </span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
          <span className="lab-control-title">
            Take the conversation off script
          </span>
          <p className="text-sm">
            No calls are made. Optional audio uses your browser’s built-in
            speech.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={speak}
              disabled={!supported}
              onChange={(e) => {
                setSpeak(e.target.checked);
                if (!e.target.checked) window.speechSynthesis.cancel();
              }}
            />{" "}
            Read the transcript aloud
          </label>
          <div className="button-row">
            <Button
              onClick={() => {
                if (index >= script.length) {
                  setIndex(0);
                  setLines([]);
                  setInterruptions(0);
                }
                if (running) window.speechSynthesis?.cancel();
                setRunning(!running);
              }}
            >
              {running ? (
                <>
                  <Pause size={13} /> Pause call
                </>
              ) : (
                <>
                  <Play size={13} />{" "}
                  {lines.length && index < script.length
                    ? "Continue call"
                    : "Start demo call"}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              disabled={!running || !lines.length}
              onClick={interrupt}
            >
              Interrupt
            </Button>
            <Button
              variant="secondary"
              aria-label="Reset call simulation"
              onClick={() => {
                window.speechSynthesis?.cancel();
                setRunning(false);
                setIndex(0);
                setLines([]);
                setInterruptions(0);
              }}
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        </div>
        <div className="lab-output">
          <VoiceVisual
            phase={
              running
                ? "active"
                : listening
                  ? "listening"
                  : index >= script.length
                    ? "complete"
                    : lines.length
                      ? "paused"
                      : "idle"
            }
            speaker={lines.at(-1)?.who ?? "Agent"}
          />
          <div className="experiment-console">
            <div className="experiment-console-bar">
              <span>call / transcript</span>
              <span>Local simulation</span>
            </div>
            <div
              ref={log}
              className="call-transcript"
              role="log"
              aria-live="polite"
              aria-label="Simulated call transcript"
            >
              {lines.length ? (
                lines.map((line, i) => (
                  <div
                    key={i}
                    className={`call-line ${line.who === "Visitor" ? "visitor-line" : "agent-line"} ${line.interrupted ? "interrupted" : ""}`}
                  >
                    <strong>{line.who}</strong>
                    {line.text}
                    {line.interrupted && (
                      <small>Stopped by visitor interruption</small>
                    )}
                  </div>
                ))
              ) : (
                <p>
                  The line is quiet. Start a demo call to see the conversation
                  unfold.
                </p>
              )}
            </div>
          </div>
          <div className="lab-status" role="status">
            {running
              ? "Call in progress"
              : listening
                ? "Listening / paused"
                : index >= script.length
                  ? "Call complete"
                  : lines.length
                    ? "Listening / paused"
                    : "Ready"}{" "}
            · {interruptions}{" "}
            {interruptions === 1 ? "interruption" : "interruptions"} handled
          </div>
          <p className="lab-takeaway">
            <span>Try this</span> Interrupt mid-sentence. The transcript stays,
            but the agent gives you the floor.
          </p>
        </div>
      </div>
    </article>
  );
}
const scenarios = [
  {
    name: "Generate a lesson",
    path: ["Teacher", "API", "AI service", "Model", "Database", "Teacher"],
    notes: [
      "A teacher asks for a didactic unit.",
      "The API checks school scope and available credits.",
      "The AI service builds the prompt from curriculum context.",
      "A provider streams the generated material.",
      "The result is saved with its conversation context.",
      "The teacher sees the result in the editor.",
    ],
  },
  {
    name: "Send a family message",
    path: ["Teacher", "API", "Database", "Realtime", "Family"],
    notes: [
      "A teacher writes a message to a family.",
      "The API checks access to this school and conversation.",
      "The message is stored before it is broadcast.",
      "Socket.io and Redis deliver the event across instances.",
      "The family’s app receives the message.",
    ],
  },
  {
    name: "Collect school fees",
    path: ["School office", "API", "Database", "SEPA export", "School office"],
    notes: [
      "The office starts the monthly billing batch.",
      "The API checks the school and billing permissions.",
      "Eligible receipts and bank mandates are loaded.",
      "The finance module produces a SEPA direct-debit file.",
      "The office can download the batch for the bank.",
    ],
  },
];
const systemNodes = [
  {
    name: "Teacher",
    icon: UserRound,
    x: 100,
    y: 38,
    column: "1 / span 2",
    row: 1,
  },
  { name: "Family", icon: Users, x: 300, y: 38, column: "3 / span 2", row: 1 },
  {
    name: "School office",
    icon: Building2,
    x: 500,
    y: 38,
    column: "5 / span 2",
    row: 1,
  },
  { name: "API", icon: Server, x: 300, y: 142, column: "3 / span 2", row: 2 },
  {
    name: "AI service",
    icon: Sparkles,
    x: 100,
    y: 246,
    column: "1 / span 2",
    row: 3,
  },
  {
    name: "Realtime",
    icon: Radio,
    x: 300,
    y: 246,
    column: "3 / span 2",
    row: 3,
  },
  {
    name: "SEPA export",
    icon: FileDown,
    x: 500,
    y: 246,
    column: "5 / span 2",
    row: 3,
  },
  { name: "Model", icon: Cpu, x: 200, y: 350, column: "2 / span 2", row: 4 },
  {
    name: "Database",
    icon: Database,
    x: 400,
    y: 350,
    column: "4 / span 2",
    row: 4,
  },
];
function routePath(from: string, to: string) {
  const a = systemNodes.find((node) => node.name === from)!;
  const b = systemNodes.find((node) => node.name === to)!;
  if (Math.abs(a.y - b.y) > 220) {
    const side = b.x < 300 ? 12 : 588;
    return `M ${a.x} ${a.y} C ${side} ${a.y}, ${side} ${b.y}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
}
export function ArchitectureLab() {
  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const current = scenarios[scenario];
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step >= current.path.length - 1) {
        setPlaying(false);
        return;
      }
      setStep((s) => s + 1);
    }, 1100);
    return () => clearTimeout(timer);
  }, [playing, step, current]);
  return (
    <article className="lab-card system-lab" id="architecture-lab">
      <div className="lab-heading">
        <div>
          <h2>Follow a request through the system.</h2>
          <p>
            A small, explorable view of Tututor’s architecture. Pick a real
            workflow and see what each part does.
          </p>
        </div>
        <span className="demo-label">
          <Network size={14} aria-hidden="true" /> 03 / Systems
        </span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
          <span className="lab-control-title">
            One product. Different paths.
          </span>
          <label htmlFor="scenario">Choose a workflow</label>
          <select
            id="scenario"
            className="button button-secondary"
            value={scenario}
            onChange={(e) => {
              setScenario(+e.target.value);
              setStep(-1);
              setPlaying(false);
            }}
          >
            {scenarios.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="button-row">
            <Button
              onClick={() => {
                setStep(-1);
                setPlaying(true);
              }}
            >
              <Play size={13} /> Trace request
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setStep((s) => (s + 1) % current.path.length);
              }}
            >
              Step <ArrowRight size={13} />
            </Button>
            {playing && (
              <Button
                variant="secondary"
                onClick={() => setPlaying(false)}
                aria-label="Pause request trace"
              >
                <Pause size={13} />
              </Button>
            )}
          </div>
        </div>
        <div className="lab-output">
          <div className="experiment-console-bar">
            <span>tututor / system map</span>
            <span>
              {step < 0
                ? "Workflow ready"
                : `Step ${step + 1} / ${current.path.length}`}
            </span>
          </div>
          <div className="system-board" aria-label="Tututor architecture">
            <svg
              className="system-routes"
              viewBox="0 0 600 388"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {current.path.slice(1).map((to, i) => (
                <path
                  key={`${scenario}-${i}`}
                  d={routePath(current.path[i], to)}
                  className={step > i ? "route-visited" : ""}
                />
              ))}
            </svg>
            {systemNodes.map((node) => {
              const active = step >= 0 && current.path[step] === node.name;
              const visited = current.path
                .slice(0, step + 1)
                .includes(node.name);
              const onRoute = current.path.includes(node.name);
              const Icon = node.icon;
              return (
                <div
                  key={node.name}
                  className={`system-node ${active ? "active" : visited ? "visited" : ""} ${onRoute ? "on-route" : ""}`}
                  style={{ gridColumn: node.column, gridRow: node.row }}
                >
                  <Icon size={21} aria-hidden="true" />
                  <span>{node.name}</span>
                </div>
              );
            })}
          </div>
          <div className="trace-itinerary" aria-label="Request steps">
            {current.path.map((node, i) => (
              <button
                type="button"
                key={`${scenario}-${i}`}
                className={i === step ? "active" : i < step ? "visited" : ""}
                aria-label={`Step ${i + 1}: ${node}`}
                aria-current={i === step ? "step" : undefined}
                onClick={() => {
                  setPlaying(false);
                  setStep(i);
                }}
              >
                <span>{i + 1}</span>
                {node}
              </button>
            ))}
          </div>
          <div className="lab-status trace-note" aria-live="polite">
            {step < 0
              ? "Trace the request, or select any numbered step to explore."
              : current.notes[step]}
          </div>
        </div>
      </div>
    </article>
  );
}
