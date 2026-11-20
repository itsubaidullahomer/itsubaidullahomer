"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { play, type SoundName } from "@/lib/sound";

/**
 * pin   0 → 1 while a tall section scrolls past its pinned, screen-high child
 * view  0 → 1 from the moment the element enters the screen until it has left
 * read  0 → 1 while the element crosses the middle band of the screen
 * exit  0 → 1 while an element that starts at the top of the page scrolls away
 */
export type TrackMode = "pin" | "view" | "read" | "exit";
/** A mode, or a function that works out the progress itself. */
export type Measure = TrackMode | ((el: HTMLElement) => number);

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function progressOf(el: HTMLElement, mode: TrackMode) {
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  if (mode === "pin") {
    const travel = r.height - vh;
    return travel > 0 ? clamp01(-r.top / travel) : r.top <= 0 ? 1 : 0;
  }
  if (mode === "view") return clamp01((vh - r.top) / (vh + r.height));
  if (mode === "exit") return r.height > 0 ? clamp01(-r.top / r.height) : 0;
  return clamp01((vh * 0.86 - r.top) / (vh * 0.42 + r.height));
}

type Sub = {
  el: HTMLElement;
  read: () => number;
  cur: number;
  tgt: number;
  ease: number;
  on: (p: number) => void;
  /** Within half a screen of the viewport. Only these are measured while scrolling. */
  near: boolean;
};
const subs = new Set<Sub>();
const byEl = new Map<Element, Set<Sub>>();
let frame = 0;
let listening = false;
let watcher: IntersectionObserver | null = null;

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
function schedule() {
  if (!frame) frame = requestAnimationFrame(tick);
}
/** Reading positions forces layout, so only what is near the screen is read on each scroll. */
function measure() {
  for (const s of subs) if (s.near) s.tgt = s.read();
  schedule();
}
function watch(sub: Sub) {
  if (!("IntersectionObserver" in window)) {
    sub.near = true;
    return;
  }
  watcher ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        for (const s of byEl.get(entry.target) ?? []) {
          const was = s.near;
          s.near = entry.isIntersecting;
          // Read on the way in, and once on the way out so it comes to rest at 0 or 1 rather than
          // part-way. Something that starts far away is not read at all: it keeps its stylesheet default.
          if (s.near || was) s.tgt = s.read();
        }
      }
      schedule();
    },
    { rootMargin: "50% 0px" },
  );
  let set = byEl.get(sub.el);
  if (!set) byEl.set(sub.el, (set = new Set()));
  set.add(sub);
  watcher.observe(sub.el);
}

/**
 * Follow an element's scroll progress. One scroll listener, one intersection observer and one animation
 * frame serve every caller. Progress is only read while the element is within half a screen of view.
 */
export function track(el: HTMLElement, mode: Measure, on: (p: number) => void, ease = 0.18) {
  const read = typeof mode === "function" ? () => mode(el) : () => progressOf(el, mode);
  // -1 means "not read yet": nothing is written until the first real reading.
  const sub: Sub = { el, read, cur: -1, tgt: -1, ease, on, near: false };
  subs.add(sub);
  if (!listening) {
    listening = true;
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
  }
  watch(sub);
  return () => {
    subs.delete(sub);
    const set = byEl.get(el);
    set?.delete(sub);
    if (set && !set.size) {
      byEl.delete(el);
      watcher?.unobserve(el);
    }
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
  as: Tag = "div",
  className,
  id,
  style,
  sound,
  soundAt = 0.25,
  soundRate = 1,
  soundGain = 1,
  children,
}: {
  mode?: TrackMode;
  as?: "div" | "section" | "li" | "article" | "header" | "h2" | "p";
  className?: string;
  id?: string;
  style?: CSSProperties;
  /**
   * A sound played as the progress passes soundAt on the way in. soundAt can list several moments (with a
   * soundRate for each), for a section whose parts arrive one after another.
   */
  sound?: SoundName;
  soundAt?: number | number[];
  soundRate?: number | number[];
  soundGain?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  // Arrays are compared by value, so a re-render with the same moments keeps the same subscription.
  const cues = JSON.stringify([soundAt, soundRate]);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.dataset.live = "1";
    const [at, rate] = JSON.parse(cues) as [number | number[], number | number[]];
    const moments = Array.isArray(at) ? at : [at];
    const rates = moments.map((_, i) => (Array.isArray(rate) ? (rate[i] ?? 1) : rate));
    // Each moment is armed only once it has been seen before it, so nothing sounds for what was already there.
    const armed = moments.map(() => false);
    return track(el, mode, (p) => {
      el.style.setProperty("--p", p.toFixed(4));
      if (!sound) return;
      moments.forEach((moment, i) => {
        if (p < moment - Math.min(0.08, moment / 2)) armed[i] = true;
        else if (armed[i] && p >= moment) {
          armed[i] = false;
          play(sound, { rate: rates[i], gain: soundGain, ambient: true });
        }
      });
    });
  }, [mode, sound, cues, soundGain]);
  return (
    // The element type is fixed per call site, so one ref type covers all of them.
    <Tag ref={ref as never} id={id} className={className} style={style}>
      {children}
    </Tag>
  );
}

/**
 * Marks [data-reveal] elements with data-in once they come on screen. The observer's first report covers
 * every element, so what is already on screen is marked before the hiding style is switched on: nothing
 * that was visible gets hidden. Positions come from the observer, so nothing forces a layout.
 */
export function Reveals() {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    let armed = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "1";
          io.unobserve(entry.target);
        }
        if (!armed) {
          armed = true;
          root.classList.add("js");
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const node of document.querySelectorAll("[data-reveal]")) io.observe(node);
    return () => {
      io.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}

/**
 * Same-page links (#contact, #work…) jump to the right place even though sections far down the page are
 * not laid out until they come near (content-visibility in sections.css): the first click lays out the
 * whole page, just before the browser works out where to scroll. A page opened at an #anchor is laid out
 * in full by the script in the layout; once the work reel has taken its real height, the jump is made
 * again, unless the visitor has already started scrolling.
 */
export function AnchorFix() {
  useEffect(() => {
    const root = document.documentElement;
    const click = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) root.classList.add("cv-all");
    };
    document.addEventListener("click", click, true);

    const id = decodeURIComponent(location.hash.slice(1));
    const moves = ["wheel", "touchstart", "keydown", "pointerdown"];
    let moved = false;
    const move = () => {
      moved = true;
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (id) {
      for (const name of moves) window.addEventListener(name, move, { once: true, passive: true });
      timer = setTimeout(() => {
        const target = document.getElementById(id);
        if (target && !moved) {
          const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - pad, behavior: "instant" });
        }
        root.classList.remove("jump");
      }, 150);
    }
    return () => {
      document.removeEventListener("click", click, true);
      for (const name of moves) window.removeEventListener(name, move);
      clearTimeout(timer);
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
    let raf = 0;
    let shown = "";
    // Only touch the text when the number changes: each write costs a layout, so 0 → 20 is 21 writes, not 60.
    // Each change ticks, a little higher as the number climbs, like a mechanical counter.
    const show = (text: string, t = 0) => {
      if (text === shown) return;
      el.textContent = shown = text;
      if (t > 0) play("tick", { rate: 0.85 + t * 0.5, gain: 0.75, ambient: true });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 1100);
          show(format(value * (1 - Math.pow(1 - t, 3))), t);
          if (t < 1) raf = requestAnimationFrame(step);
        };
        show(format(0));
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    // Behind the opening curtain, wait until the visitor is in and the hero has started to land.
    const root = document.documentElement;
    const opened = (window as Window & { __entered?: { at: number } }).__entered;
    // If the visitor came in a while before this script arrived, the number simply stays as it is.
    if (opened && performance.now() - opened.at > 1500) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const begin = () => {
      timer = setTimeout(() => io.observe(el), root.classList.contains("gate") ? 700 : 0);
    };
    if (root.classList.contains("gate") && !root.classList.contains("entered")) {
      window.addEventListener("enter", begin, { once: true });
    } else begin();
    return () => {
      window.removeEventListener("enter", begin);
      clearTimeout(timer);
      io.disconnect();
      cancelAnimationFrame(raf);
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
