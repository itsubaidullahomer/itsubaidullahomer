"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Sparkles,
  MessageSquare,
  Rocket,
  Smartphone,
  BookOpen,
  CalendarDays,
  Bell,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
const answer =
  "Start with the lesson, not the model. Here’s a plan your students can actually follow.";
export function StreamingMini() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(answer.length);
  const [retry, setRetry] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduce || paused) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    let tick = 0;
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !interval) {
          interval = setInterval(() => {
            tick = (tick + 1) % 85;
            setCount(Math.min(Math.max(tick - 5, 0) * 2, answer.length));
            setRetry(tick >= 21 && tick <= 29);
          }, 95);
        } else if (!e.isIntersecting && interval) {
          clearInterval(interval);
          interval = undefined;
        }
      },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [reduce, paused]);
  return (
    <div className="mini-window process-assistant" ref={ref}>
      <div className="mini-bar">
        <span className="process-window-title">
          <span className="process-window-icon" aria-hidden="true">
            <Sparkles size={13} />
          </span>
          Lesson-planning assistant
        </span>
        <button
          onClick={() => setPaused(!paused)}
          className="pause-mini"
          aria-label={paused ? "Play streaming demo" : "Pause streaming demo"}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
      <div className="mini-content">
        <div className="chat-request">Help me plan tomorrow’s lesson.</div>
        <div className="chat-answer">
          <span className="mini-mark" aria-hidden="true">
            <Sparkles size={15} />
          </span>
          <div>
            {retry ? (
              <>
                <span className="mono stream-retry">
                  Connection interrupted. Retrying…
                </span>
                <br />
                {answer.slice(0, 32)}
              </>
            ) : (
              answer.slice(0, count) || "Preparing your lesson plan…"
            )}
            {!paused && <i className="stream-caret" />}
          </div>
        </div>
        <span className="demo-label">
          Example: a dropped connection is retried automatically.
        </span>
      </div>
    </div>
  );
}
export function ClientThread() {
  return (
    <div className="mini-window process-thread">
      <div className="mini-bar">
        <span className="process-window-title">
          <span className="process-window-icon" aria-hidden="true">
            <MessageSquare size={13} />
          </span>
          Project update
        </span>
        <span>Sample conversation</span>
      </div>
      <div className="mini-content">
        <div className="thread-message">
          <div
            className="thread-avatar thread-avatar-client"
            aria-hidden="true"
          >
            C
          </div>
          <div>
            <strong>Client</strong>
            <p>Could we make that work better on mobile?</p>
          </div>
        </div>
        <div className="thread-message">
          <div className="thread-avatar">
            <Image src="/images/avatar.png" width={27} height={27} alt="" />
          </div>
          <div>
            <strong>Ubaid</strong>
            <p>
              I shortened the flow and made the tap targets bigger. Try the
              preview on your phone and tell me how it feels.
            </p>
            <Link href="/playground" className="preview-link">
              Explore my interactive demos ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export function DeployMini() {
  return (
    <div className="mini-window process-deploy">
      <div className="mini-bar">
        <span className="process-window-title">
          <span className="process-window-icon" aria-hidden="true">
            <Rocket size={13} />
          </span>
          Ready for launch
        </span>
        <span>Example checklist</span>
      </div>
      <div className="deploy-stage grid-texture">
        <div className="deploy-toast">
          <span className="deploy-check" aria-hidden="true">
            <Check size={16} />
          </span>
          <div>
            <strong>Ready for real users</strong>
            <ul className="launch-checks">
              {[
                "Key flows tested",
                "Mobile experience checked",
                "Product is live",
              ].map((item) => (
                <li key={item}>
                  <Check size={12} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
export function PhoneMini() {
  return (
    <div className="mini-window process-mobile">
      <div className="mini-bar">
        <span className="process-window-title">
          <span className="process-window-icon" aria-hidden="true">
            <Smartphone size={13} />
          </span>
          Tututor · a day at school
        </span>
        <span>Scroll the phone ↓</span>
      </div>
      <div className="process-phone-stage">
        <div
          className="mini-phone"
          tabIndex={0}
          role="region"
          aria-label="Scrollable Tututor interface illustration"
        >
          <div className="phone-speaker" aria-hidden="true" />
          <p>TUTUTOR · FAMILIAS</p>
          <h4>
            A little closer
            <br />
            to their day.
          </h4>
          <p>Homework, messages and the moments that matter.</p>
          {[
            {
              title: "Today at school",
              text: "Everything in one place",
              icon: Bell,
            },
            {
              title: "New homework",
              text: "Ready when you are",
              icon: BookOpen,
            },
            {
              title: "A note from the teacher",
              text: "Keep the conversation going",
              icon: MessageSquare,
            },
            {
              title: "The week ahead",
              text: "Your school timetable",
              icon: CalendarDays,
            },
            {
              title: "Attendance",
              text: "A clear view of their day",
              icon: Check,
            },
          ].map(({ title, text, icon: Icon }) => (
            <div className="phone-tile" key={title}>
              <Icon className="phone-tile-icon" size={13} aria-hidden="true" />
              {title}
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const promises = [
  {
    id: "understand",
    title: "Your product handles the unexpected.",
    text: "I plan for loading, errors and retries, so people know what’s happening and can keep going when something fails.",
    example: "Recovering from an interrupted AI reply",
    ui: StreamingMini,
  },
  {
    id: "collaborate",
    title: "You see progress as it happens.",
    text: "You get regular updates and working previews. We review the product together and use your feedback to decide what comes next.",
    example: "Turning your feedback into a working preview",
    ui: ClientThread,
  },
  {
    id: "ship",
    title: "You get a product ready for real users.",
    text: "I test the important flows, check performance and handle deployment, so the product works beyond the demo.",
    example: "Checking the essentials before launch",
    ui: DeployMini,
  },
  {
    id: "care",
    title: "You have support after launch.",
    text: "After launch, I help improve the flows people use every day, with attention to feedback, real devices and changing needs.",
    example: "Improving the everyday experience on mobile",
    ui: PhoneMini,
  },
];
export function Process() {
  return (
    <section
      id="process"
      className="section process-section"
      aria-labelledby="process-title"
    >
      <div className="process-intro">
        <span className="eyebrow">Working together</span>
        <h2 id="process-title">What you can expect when we work together.</h2>
        <p>Working previews, clear communication, and care beyond launch.</p>
      </div>
      <div className="process-grid">
        {promises.map((promise) => (
          <article
            className="process-item"
            id={`process-${promise.id}`}
            aria-labelledby={`promise-${promise.id}`}
            key={promise.id}
          >
            <div className="process-promise">
              <h3 id={`promise-${promise.id}`}>{promise.title}</h3>
              <p>{promise.text}</p>
            </div>
            <figure className="process-example">
              <figcaption>
                <span>Example</span>
                {promise.example}
              </figcaption>
              <promise.ui />
            </figure>
          </article>
        ))}
      </div>
    </section>
  );
}
