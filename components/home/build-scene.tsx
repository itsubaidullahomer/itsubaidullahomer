"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import {
  buildAiRules,
  buildComponents,
  buildModels,
  buildNotes,
  buildServices,
  buildStates,
  buildSteps,
} from "@/content/home";
import { prefersReducedMotion, track } from "./track";

/**
 * The wireframe: rough boxes where the real screen's parts are, as [left, top, width, height] in
 * percent of the window. They are drawn in this order.
 */
const WIRE: [number, number, number, number][] = [
  [0, 0, 100, 8.5],
  [0.8, 11, 11.8, 85],
  [14, 11, 84, 5.6],
  [16.5, 17.8, 16, 2.8],
  [33.5, 17.8, 12, 2.8],
  [46.5, 17.8, 14, 2.8],
  [61.5, 17.8, 18, 2.8],
  [14, 28, 84, 35],
  [15, 35, 14.2, 26.5],
  [30.2, 35.6, 33, 5.4],
  [64.2, 35.6, 33, 5.4],
  [30.2, 42, 33, 5.4],
  [64.2, 42, 33, 5.4],
  [30.2, 48.4, 33, 5.4],
  [64.2, 48.4, 33, 5.4],
  [14, 65.5, 84, 34.5],
  [15, 72.5, 14.2, 27.5],
  [30.2, 73, 33, 5.4],
  [64.2, 73, 33, 5.4],
  [30.2, 79.4, 33, 5.4],
  [64.2, 79.4, 33, 5.4],
];

/** Where the pointer is at each moment of the scene: [progress, left %, top %] inside the window. */
const PATH: [number, number, number][] = [
  [0, 30, 34],
  [0.035, 6, 52],
  [0.075, 56, 14],
  [0.115, 22, 48],
  [0.16, 80, 46],
  [0.2, 0, 52],
  [0.4, 100, 44],
  [0.45, 97, 56],
  [0.6, 97, 56],
  [0.66, 52, 88],
  [0.78, 79, 93],
  [0.86, 91, 9],
  [1, 91, 9],
];

const PHASES = buildSteps.length;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * One feature, built in front of you. The section is five screens tall and its content stays
 * pinned; the scroll position becomes one number per step (--a to --e, each 0 → 1) and the
 * stylesheet does the drawing. With reduced motion or no JavaScript the finished product is shown
 * with all five steps listed.
 */
export function BuildScene() {
  const root = useRef<HTMLElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const role = useRef<HTMLElement>(null);
  const users = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    el.dataset.live = "1";

    return track(el, "pin", (p) => {
      const scaled = p * PHASES;
      const phase = Math.min(PHASES - 1, Math.floor(scaled));
      "abcde".split("").forEach((name, i) => el.style.setProperty(`--${name}`, clamp(scaled - i).toFixed(4)));
      el.style.setProperty("--p", p.toFixed(4));
      el.dataset.phase = String(phase);

      let i = 0;
      while (i < PATH.length - 2 && p > PATH[i + 1][0]) i++;
      const [p0, x0, y0] = PATH[i];
      const [p1, x1, y1] = PATH[i + 1];
      const t = clamp((p - p0) / (p1 - p0 || 1));
      const eased = t * t * (3 - 2 * t);
      // While the interface is being revealed, the pointer is the wipe: it moves at a steady pace.
      const k = phase === 1 ? t : eased;
      const wobble = phase === 1 ? Math.sin(t * 9) * 9 : 0;
      if (cursor.current) {
        const x = x0 + (x1 - x0) * k;
        cursor.current.style.left = `${x}%`;
        cursor.current.style.top = `${y0 + (y1 - y0) * k + wobble}%`;
        // Near the right edge the name tag sits to the left of the pointer, inside the window.
        cursor.current.dataset.flip = x > 70 ? "1" : "0";
      }
      if (role.current) role.current.textContent = buildSteps[phase].cursor;
      if (users.current) users.current.textContent = `${Math.round(20 * clamp((scaled - 4.15) / 0.6))}k+`;
    });
  }, []);

  return (
    <section className="hx-build" ref={root} data-phase="4" aria-labelledby="hx-build-title">
      <div className="hx-build__pin">
        <header className="hx-build__head">
          <div>
            <span className="eyebrow">How I work</span>
            <h2 id="hx-build-title">One engineer. The whole product.</h2>
          </div>
          <p>
            Keep scrolling. One screen of Tututor goes from a sketch to something 20k+ people use, and I do every
            part of it.
          </p>
        </header>

        <div className="hx-stage">
          <div className="hx-win">
            <div className="hx-win__bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="mono hx-win__url">
                <span>sketch</span>
                <span>localhost</span>
                <span>tututor.ai</span>
              </span>
              <b className="hx-live mono">
                <i />
                Live
              </b>
            </div>
            <div className="hx-win__body">
              <div className="hx-wire" aria-hidden="true">
                {WIRE.map(([left, top, width, height], i) => (
                  <i
                    key={i}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      ["--n" as string]: i / WIRE.length,
                    }}
                  />
                ))}
              </div>
              <Image
                className="hx-shot hx-shot--ui"
                src="/images/tututor/showcase/tututor-catalog.jpg"
                alt="Tututor’s AI tools for teachers, the finished screen"
                fill
                sizes="(max-width: 820px) 92vw, 700px"
              />
              <Image
                className="hx-shot hx-shot--ai"
                src="/images/tututor/showcase/tututor-assistant.jpg"
                alt="Tututor’s teaching assistant answering a question"
                fill
                sizes="(max-width: 820px) 92vw, 700px"
              />
              <span className="hx-wipe" aria-hidden="true" />
              <span className="hx-stream mono" aria-hidden="true">
                <i />
                <span>streaming</span>
                <span>done</span>
              </span>
              <div className="hx-cursor" ref={cursor} aria-hidden="true">
                <svg viewBox="0 0 16 18" width="16" height="18">
                  <path d="M1 1l5.2 15 2.3-6.3L15 7.4 1 1z" fill="#171717" stroke="#fff" strokeWidth="1.4" />
                </svg>
                <span>
                  <Image src="/images/ubaid-portrait.jpg" alt="" width={36} height={39} />
                  Ubaid · <b ref={role}>{buildSteps[PHASES - 1].cursor}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="hx-side" aria-hidden="true">
            <div className="hx-panel hx-panel--a">
              <span className="mono hx-panel__label">Before any code</span>
              <ul className="hx-notes">
                {buildNotes.map((note, i) => (
                  <li key={note} style={{ ["--n" as string]: i }}>
                    <i>
                      <Check size={11} strokeWidth={3} />
                    </i>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hx-panel hx-panel--b">
              <span className="mono hx-panel__label">Components</span>
              <ul className="hx-tree mono">
                {buildComponents.map((name, i) => (
                  <li key={name} style={{ ["--n" as string]: i }}>
                    <span>&lt;{name} /&gt;</span>
                    <Check size={12} strokeWidth={3} />
                  </li>
                ))}
              </ul>
              <ul className="hx-chips mono">
                {buildStates.map((state, i) => (
                  <li key={state} style={{ ["--n" as string]: i }}>
                    {state}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hx-panel hx-panel--c">
              <span className="mono hx-panel__label">One backend</span>
              <div className="hx-sys">
                <div className="hx-sys__clients mono">
                  <span>Web</span>
                  <span>3 mobile apps</span>
                  <span>8 products</span>
                </div>
                <i className="hx-sys__wire" />
                <div className="hx-sys__api">
                  <strong>API</strong>
                  <span className="mono">Express · ~1,000 endpoints</span>
                </div>
                <i className="hx-sys__wire hx-sys__wire--fan" />
                <ul className="hx-sys__services mono">
                  {buildServices.map((service, i) => (
                    <li key={service} style={{ ["--n" as string]: i }}>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hx-panel hx-panel--d">
              <span className="mono hx-panel__label">Every AI call</span>
              <ul className="hx-models mono">
                {buildModels.map((model) => (
                  <li key={model}>{model}</li>
                ))}
              </ul>
              <ul className="hx-rules">
                {buildAiRules.map((rule, i) => (
                  <li key={rule} style={{ ["--n" as string]: i }}>
                    <i>
                      <Check size={11} strokeWidth={3} />
                    </i>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hx-panel hx-panel--e">
              <div className="hx-phones">
                {["profesores-home", "familias-tareas", "alumnos-home"].map((name) => (
                  <span key={name}>
                    <Image src={`/images/tututor/mobile/${name}.jpg`} alt="" width={360} height={778} sizes="160px" />
                  </span>
                ))}
              </div>
              <p className="hx-users">
                <strong ref={users}>20k+</strong>
                <span className="mono">people using it</span>
              </p>
            </div>
          </div>
        </div>

        <ol className="hx-steps">
          {buildSteps.map((step, i) => (
            <li key={step.key} data-step={i}>
              <span className="hx-steps__bar" aria-hidden="true" />
              <span className="mono hx-steps__no">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
      <noscript>
        <style>{`.hx-build{height:auto!important}.hx-build__pin{position:static!important;height:auto!important}`}</style>
      </noscript>
    </section>
  );
}
