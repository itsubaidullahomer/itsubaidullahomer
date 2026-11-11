"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { parcels } from "@/content/site";
import { ArrowDown, Fragile, KeepDry, ThisSideUp } from "./Icons";

/** When each parcel starts to leave the box, as a share of the scroll through the scene. Mirrored in unbox.css. */
const FIRST = 0.26;
const STEP = 0.15;

function Wall({ side, children }: { side: string; children?: React.ReactNode }) {
  return (
    <div className={`wall wall--${side}`}>
      <i className="out">{children}</i>
      <i className="in" />
    </div>
  );
}
function Flap({ side }: { side: string }) {
  return (
    <div className={`flap flap--${side}`}>
      <i className="out" />
      <i className="in" />
    </div>
  );
}

/**
 * A cardboard box, built from CSS planes, that opens as the page scrolls past it.
 * The scroll position becomes one number, --p (0 sealed, 1 unpacked); the stylesheet does the rest.
 * Without JavaScript or with reduced motion, the box is simply shown open.
 */
export function Unbox() {
  const root = useRef<HTMLElement>(null);
  const count = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = 0;
    let current = -1;
    let frame = 0;

    const paint = () => {
      frame = 0;
      // Ease toward the scroll position, so a mouse wheel does not make the box jump.
      current = current < 0 ? target : current + (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0004) current = target;
      el.style.setProperty("--p", current.toFixed(4));
      const out = Math.min(parcels.length, Math.max(0, Math.floor((current - FIRST) / STEP + 0.4)));
      if (count.current) count.current.textContent = String(out);
      el.dataset.stage = current < 0.08 ? "sealed" : out < parcels.length ? "opened" : "unpacked";
      if (current !== target) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      target = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 1;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="unbox" id="manifest" ref={root} data-stage="sealed" aria-labelledby="unbox-title">
      <div className="unbox__stage">
        <p className="kicker unbox__kicker">02 — The manifest</p>
        <p className="mono unbox__count" aria-hidden>
          <span>Parcels out </span>
          <b>
            <b ref={count}>0</b>/{parcels.length}
          </b>
        </p>

        <h2 className="display unbox__title" id="unbox-title">
          What&rsquo;s in
          <br />
          the box?
        </h2>

        <div className="unbox__scene">
          <div className="box">
            <span className="box__shadow" aria-hidden />
            <Wall side="floor" />
            <Wall side="back" />
            <Wall side="left">
              <ThisSideUp />
              <b className="stencil">04 pcs</b>
            </Wall>
            <Wall side="right">
              <ThisSideUp />
              <b className="stencil">04 pcs</b>
            </Wall>

            {parcels.map((parcel, i) => (
              <a
                className={`card${parcel.device === "phone" ? " card--phone" : ""}`}
                href={`#parcel-${parcel.slug}`}
                key={parcel.slug}
              >
                <span className="card__bar" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <span className="mono">{parcel.urlLabel}</span>
                </span>
                <span className="card__shot">
                  <Image
                    src={parcel.image}
                    alt={parcel.imageAlt}
                    fill
                    sizes="(max-width: 760px) 60vw, 440px"
                  />
                </span>
                <span className="card__tag">
                  <b className="mono">{String(i + 1).padStart(2, "0")}</b>
                  {parcel.name}
                </span>
              </a>
            ))}

            <Wall side="front">
              <span className="field box__meta">
                Contents: 4 web products
                <br />
                Origin: Rahim Yar Khan, PK
              </span>
              <b className="stencil box__brand">Ubaid ships</b>
              <span className="box__marks">
                <Fragile />
                <ThisSideUp />
                <KeepDry />
              </span>
              <span className="box__slip">
                <b className="field">To: you</b>
                <i />
                <i />
                <i />
              </span>
            </Wall>

            <Flap side="left" />
            <Flap side="right" />
            <Flap side="back" />
            <Flap side="front" />
          </div>
        </div>

        <ol className="unbox__steps mono" aria-hidden>
          <li data-step="sealed">Sealed</li>
          <li data-step="opened">Opened</li>
          <li data-step="unpacked">Unpacked</li>
        </ol>
        <p className="mono unbox__hint" aria-hidden>
          <span className="unbox__hint-a">Scroll to cut the tape</span>
          <span className="unbox__hint-b">The paperwork is below</span>
          <ArrowDown />
        </p>
      </div>
      <noscript>
        <style>{`.unbox{height:auto!important;--p:1}.unbox__stage{position:relative!important}`}</style>
      </noscript>
    </section>
  );
}
