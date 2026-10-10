"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ArrowUpRight,
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
          tututor / assistant
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
              answer.slice(0, count)
            )}
            {!paused && <i className="stream-caret" />}
          </div>
        </div>
        <span className="demo-label">
          Illustrative interaction · no API calls
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
          # project-updates
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
            <p>Done. Shorter flow, bigger tap targets. Try it on your phone.</p>
            <Link href="/playground" className="preview-link">
              VIEW AN INTERACTIVE PREVIEW ↗
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
          From preview to production
        </span>
        <span>Sample deployment</span>
      </div>
      <div className="deploy-stage grid-texture">
        <div className="deploy-toast">
          <span className="deploy-check" aria-hidden="true">
            <Check size={16} />
          </span>
          <div>
            <strong>Pushed to prod</strong>
            <p>Vercel · Deployed</p>
            <div className="deploy-lines" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <ArrowUpRight size={16} aria-hidden="true" />
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
const steps = [
  {
    id: "understand",
    title: "Build for the real world.",
    nav: "Think through the hard parts",
    text: "The first answer is easy. I design the waiting, the retry, and what happens when the model has a bad day.",
    ui: StreamingMini,
  },
  {
    id: "collaborate",
    title: "Keep the conversation open.",
    nav: "Work in the open",
    text: "Small updates. Working previews. You see the product taking shape, and we make decisions together.",
    ui: ClientThread,
  },
  {
    id: "ship",
    title: "Make it real. Put it live.",
    nav: "Ship with confidence",
    text: "The last mile counts: performance, deployment, and the details that make a product dependable.",
    ui: DeployMini,
  },
  {
    id: "care",
    title: "Stay close to the people using it.",
    nav: "Keep making it better",
    text: "Shipping is a beginning. I keep an eye on the flows people use every day, on the screens they actually have.",
    ui: PhoneMini,
  },
];
export function Process() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting)
            setActive(Number((e.target as HTMLElement).dataset.index));
        });
      },
      { rootMargin: "-20% 0px -45% 0px" },
    );
    ref.current
      ?.querySelectorAll(".process-item")
      .forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, []);
  return (
    <section id="process" className="section process-section">
      <div className="process-grid">
        <div className="process-left">
          <span className="eyebrow">The way I work</span>
          <h2>
            Good engineering.
            <br />
            No mystery.
          </h2>
          <p>From the first rough idea to the little details after launch.</p>
          <nav className="process-nav" aria-label="Process steps">
            {steps.map((s, i) => (
              <a
                href={`#process-${s.id}`}
                key={s.id}
                className={i === active ? "active" : ""}
              >
                {s.nav}
              </a>
            ))}
          </nav>
        </div>
        <div className="process-items" ref={ref}>
          {steps.map((s, i) => (
            <div
              className="process-item"
              id={`process-${s.id}`}
              data-index={i}
              key={s.id}
            >
              <s.ui />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
