"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { compare } from "@/content/studio";
import { prefersReducedMotion, Track } from "./fx";
import { Label } from "./label";
import { Rich } from "./rich";

const clamp = (n: number) => Math.round(Math.min(96, Math.max(4, n)));

/** How wide the phone's screen is drawn: it grows with the type on very large monitors (see base.css). */
const SCREEN = "(min-width: 1600px) calc(11.33vw + 124px), (min-width: 440px) 310px, calc(76vw - 20px)";

/**
 * A real before and after, in one phone. Drag the handle sideways (or use the arrow keys) to wipe
 * between the old site and the new one. The first time it is seen, the handle sweeps once to show it moves.
 */
export function Compare() {
  const [x, setX] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touched = useRef(false);

  useEffect(() => {
    const el = frame.current;
    if (!el || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          if (touched.current) return;
          const t = Math.min(1, (now - start) / 2400);
          setX(clamp(50 + Math.sin(t * Math.PI * 2) * 32 * (1 - t * 0.4)));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  function place(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setX(clamp(((event.clientX - box.left) / box.width) * 100));
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    touched.current = true;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    place(event);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current) place(event);
  }
  function up() {
    dragging.current = false;
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowLeft" ? -6 : event.key === "ArrowRight" ? 6 : 0;
    if (!step) return;
    event.preventDefault();
    touched.current = true;
    setX((value) => clamp(value + step));
  }

  return (
    <Track as="section" mode="view" className="section compare" id="before-after">
      <div className="wrap compare__grid">
        <div className="section__head">
          <Label n="03">{compare.kicker}</Label>
          <Track as="h2" mode="read" className="h2 h2--fill">
            <Rich text={compare.title} />
          </Track>
          <p className="lede" data-reveal>
            {compare.text}
          </p>
          <p className="compare__who" data-reveal>
            <b>{compare.name}</b>
            <span>{compare.place}</span>
          </p>
        </div>
        {/* The floating "get in touch" button on phones steps aside while the phone is on screen. */}
        <div className="ba-wrap" data-reveal="right" data-nosticky>
          <p className="ba__labels" aria-hidden="true">
            <span>{compare.before.label}</span>
            <span>{compare.after.label}</span>
          </p>
          <div
            className="ba"
            ref={frame}
            style={{ "--x": `${x}%` } as CSSProperties}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <div className="ba__screen">
              <Image
                className="ba__img"
                src={compare.before.image}
                alt={`${compare.name}: the old website`}
                sizes={SCREEN}
                placeholder="blur"
              />
              <div className="ba__after">
                <Image
                  className="ba__img"
                  src={compare.after.image}
                  alt={`${compare.name}: the redesigned website`}
                  sizes={SCREEN}
                  placeholder="blur"
                />
                {/* The new site keeps its top bar and tab bar on screen while the page moves under them. */}
                <div
                  className="ba__pin ba__pin--top"
                  style={{ "--head": compare.after.head / compare.after.image.width } as CSSProperties}
                  aria-hidden="true"
                >
                  <Image src={compare.after.image} alt="" sizes={SCREEN} />
                </div>
                <div className="ba__pin ba__pin--bottom" aria-hidden="true">
                  <Image src={compare.after.nav} alt="" sizes={SCREEN} />
                </div>
              </div>
              <div
                className="ba__handle"
                role="slider"
                tabIndex={0}
                aria-label="Slide between the old website and the new one"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={x}
                onKeyDown={key}
              >
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <p className="ba__hint" aria-hidden="true">
            {compare.hint}
          </p>
        </div>
      </div>
    </Track>
  );
}
