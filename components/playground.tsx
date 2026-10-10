"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Play, RotateCcw, Pause, ArrowRight } from "lucide-react";
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
    <article className="lab-card" id="streaming-lab">
      <div className="lab-heading">
        <div>
          <h2>The space between request and reply.</h2>
          <p>
            Dial up the latency. Break the connection. Watch the interface keep
            its place.
          </p>
        </div>
        <span className="demo-label">Streaming UI lab</span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
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
        <div className="lab-output">
          <div
            className="mini-bar"
            style={{ padding: "0 0 15px", marginBottom: 18 }}
          >
            <span>assistant / response</span>
            <span>
              {state === "done"
                ? "Complete"
                : state === "failed"
                  ? "Connection interrupted"
                  : state === "waiting"
                    ? "Waiting for first token"
                    : state}
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
            <p className="mt-4 text-xs" role="status">
              The connection dropped. Your answer is safe. Retry to continue
              where it stopped.
            </p>
          )}
          <div className="lab-status" aria-live="polite">
            {count} / {words.length} words ·{" "}
            {elapsed > 0 ? (elapsed / 1000).toFixed(1) : "0.0"}s elapsed ·{" "}
            {failed ? "Recovered text preserved" : "Local simulation"}
          </div>
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
        i === old.length - 1 ? { ...l, interrupted: true } : l,
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
    <article className="lab-card" id="voice-lab">
      <div className="lab-heading">
        <div>
          <h2>A conversation has two sides.</h2>
          <p>
            A scripted call you can interrupt. Barge in and the agent stops
            talking, keeps the context, and gives you the floor.
          </p>
        </div>
        <span className="demo-label">Voice agent simulator</span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
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
                  className={`call-line ${line.interrupted ? "interrupted" : ""}`}
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
          <div className="lab-status">
            {running
              ? "Call in progress"
              : index >= script.length
                ? "Call complete"
                : lines.length
                  ? "Listening / paused"
                  : "Ready"}{" "}
            · {interruptions}{" "}
            {interruptions === 1 ? "interruption" : "interruptions"} handled
          </div>
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
  const rows = [
    ["Teacher", "Family", "School office"],
    ["API"],
    ["AI service", "Realtime", "SEPA export"],
    ["Model", "Database"],
  ];
  return (
    <article className="lab-card" id="architecture-lab">
      <div className="lab-heading">
        <div>
          <h2>Follow a request through the system.</h2>
          <p>
            A small, explorable view of Tututor’s architecture. Pick a real
            workflow and see what each part does.
          </p>
        </div>
        <span className="demo-label">Interactive system map</span>
      </div>
      <div className="lab-body">
        <div className="lab-controls">
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
          <div className="architecture" aria-label="Tututor architecture">
            {rows.map((row, i) => (
              <div className="arch-row" key={i}>
                {row.map((node) => (
                  <div
                    key={node}
                    className={`arch-node ${step >= 0 && current.path[step] === node ? "active" : ""}`}
                  >
                    {node}
                    {node === "API" && <small>Express · school-scoped</small>}
                    {node === "Database" && <small>MongoDB</small>}
                    {node === "Realtime" && <small>Socket.io + Redis</small>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="lab-status" aria-live="polite">
            {step < 0
              ? "Select a workflow and start a trace."
              : current.notes[step]}
          </div>
        </div>
      </div>
    </article>
  );
}
