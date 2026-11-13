"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * pin   0 → 1 while a tall section scrolls past its pinned, screen-high child
 * view  0 → 1 from the moment the element enters the screen until it has left
 * read  0 → 1 while the element crosses the middle band of the screen
 */
export type TrackMode = "pin" | "view" | "read";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function progressOf(el: HTMLElement, mode: TrackMode) {
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  if (mode === "pin") {
    const travel = r.height - vh;
    return travel > 0 ? clamp(-r.top / travel) : r.top <= 0 ? 1 : 0;
  }
  if (mode === "view") return clamp((vh - r.top) / (vh + r.height));
  return clamp((vh * 0.86 - r.top) / (vh * 0.42 + r.height));
}

type Sub = {
  el: HTMLElement;
  mode: TrackMode;
  cur: number;
  tgt: number;
  ease: number;
  on: (p: number) => void;
};
const subs = new Set<Sub>();
let frame = 0;
let listening = false;

function tick() {
  frame = 0;
  let busy = false;
  for (const s of subs) {
    if (s.cur === s.tgt) continue;
    // Ease toward the scroll position, so a mouse wheel does not make things jump.
    s.cur = s.cur < 0 ? s.tgt : s.cur + (s.tgt - s.cur) * s.ease;
    if (Math.abs(s.tgt - s.cur) < 0.0005) s.cur = s.tgt;
    else busy = true;
    s.on(s.cur);
  }
  if (busy) frame = requestAnimationFrame(tick);
}
function measure() {
  for (const s of subs) s.tgt = progressOf(s.el, s.mode);
  if (!frame) frame = requestAnimationFrame(tick);
}

/** Follow an element's scroll progress. One scroll listener and one animation frame serve every caller. */
export function track(el: HTMLElement, mode: TrackMode, on: (p: number) => void, ease = 0.16) {
  const sub: Sub = { el, mode, cur: -1, tgt: 0, ease, on };
  subs.add(sub);
  if (!listening) {
    listening = true;
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
  }
  measure();
  return () => {
    subs.delete(sub);
  };
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Writes its scroll progress to the CSS variable --p on a wrapper element, and nothing else:
 * the stylesheet decides what moves. Without JavaScript, or with reduced motion, --p stays at its
 * stylesheet default, which is the finished state.
 */
export function Track({
  mode = "view",
  className,
  id,
  children,
}: {
  mode?: TrackMode;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.dataset.live = "1";
    return track(el, mode, (p) => el.style.setProperty("--p", p.toFixed(4)));
  }, [mode]);
  return (
    <div ref={ref} id={id} className={className}>
      {children}
    </div>
  );
}

/**
 * Marks [data-reveal] elements with data-in once they come on screen. Elements already on screen
 * when the page becomes interactive are marked first, so nothing that was visible gets hidden.
 */
export function Reveals() {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "1";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    for (const node of nodes) {
      if (node.getBoundingClientRect().top < window.innerHeight * 0.9) node.dataset.in = "1";
      else io.observe(node);
    }
    document.documentElement.classList.add("hx-js");
    return () => {
      io.disconnect();
      document.documentElement.classList.remove("hx-js");
    };
  }, []);
  return null;
}

/** A number that counts up the first time it is seen. The final value is what is in the HTML. */
export function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const format = (n: number) => `${prefix}${Math.round(n).toLocaleString("en")}${suffix}`;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 1100);
          el.textContent = format(value * (1 - Math.pow(1 - t, 3)));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        el.textContent = format(0);
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, prefix, suffix]);
  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("en")}
      {suffix}
    </span>
  );
}
