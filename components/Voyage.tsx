"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { parcels } from "@/content/site";
import { ArrowDown, ThisSideUp } from "./Icons";

/** Camera distance in px. Mirrored in voyage.css. */
const P = 1500;
/**
 * The shot list, in screen heights of scroll:
 * pull back from the label, pause on the sealed box, open and unpack it, then drop inside.
 * The section's height in voyage.css is the last number plus one screen, plus the overlap of the next section.
 */
const PULL_END = 1.1;
const OPEN_START = 1.3;
const OPEN_END = 3.9;
const DIVE_START = 4.15;
const DIVE_END = 5;
/** Cards are laid out at this multiple of their size and scaled back down. Mirrored in voyage.css (--n). */
const CARD_DENSITY = 2;
/** When each parcel starts to leave the box, as a share of the open phase. Mirrored in voyage.css. */
const FIRST = 0.26;
const STEP = 0.15;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Wall({ side, children, inside }: { side: string; children?: ReactNode; inside?: ReactNode }) {
  return (
    <div className={`wall wall--${side}`}>
      <i className="out">{children}</i>
      <i className="in">{inside}</i>
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
 * The opening shot. The first screen (the shipping label, passed in as children) is the front of a
 * cardboard box. Scrolling pulls the camera back until the box shows, opens it, lifts the four
 * projects out and finally drops into the empty box, which becomes the next section's background.
 *
 * The label is laid out at full size; everything else is a small box scaled up to meet it, so the
 * browser only ever keeps one big layer. With reduced motion or no JavaScript the label is a plain page.
 */
export function Voyage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLElement>(null);
  // Screenshots load once the visitor starts moving, so they do not weigh on the first paint.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    const boxEl = box.current;
    const rigEl = rig.current;
    if (!el || !stageEl || !boxEl || !rigEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const arm = () => setArmed(true);
    const idle = setTimeout(arm, 2600);

    let vw = 0;
    let vh = 0;
    let faceH = 0;
    let over = 0; // how much taller the label is than the screen: scrolled past first, like a normal page
    let rolled = false; // tall screens: the box is put down on its side
    let k = 1; // how much the small box is scaled up to meet the label
    let W = 0;
    let H = 0;
    let D = 0;
    let dz = 0;
    let restY = 0;
    let diveScale = 6;

    let target = 0;
    let current = -1;
    let pan = 0;
    let frame = 0;

    const measure = () => {
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      faceH = boxEl.offsetHeight;
      rolled = faceH > vw * 1.1;
      el.dataset.roll = rolled ? "1" : "0";
      el.style.setProperty("--ar", (rolled ? vw / faceH : faceH / vw).toFixed(4));
      W = rigEl.offsetWidth;
      H = rigEl.offsetHeight;
      D = W * 0.68;
      k = (rolled ? faceH : vw) / W;
      dz = Math.round((k * D) / 2);
      over = Math.max(0, faceH - vh);
      const card = rigEl.querySelector<HTMLElement>(".card__frame");
      el.style.setProperty("--k", k.toFixed(4));
      el.style.setProperty("--dz", `${dz}px`);
      el.style.setProperty("--over", `${over}px`);
      el.style.setProperty("--cs", ((0.96 * W * CARD_DENSITY) / (card?.offsetWidth || W * CARD_DENSITY)).toFixed(3));
      // Where the box comes to rest, and how far to zoom so its floor fills the screen.
      restY = vh * (rolled ? 0.86 : 0.85) - H / 2 - faceH / 2;
      const fit = (side: number, view: number) => {
        const room = side * P - (view * H) / 2;
        return room > 0 ? (view * P) / room : 9;
      };
      // For a box on its side the camera turns a quarter on the way in, so its long side runs down the screen.
      diveScale = Math.min(11, 1.14 * (rolled ? Math.max(fit(D, vw), fit(W, vh)) : Math.max(fit(W, vw), fit(D, vh))));
    };

    const paint = () => {
      frame = 0;
      // Ease toward the scroll position, so a mouse wheel does not make the camera jump.
      current = current < 0 ? target : current + (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0004) current = target;

      const q = clamp(current / PULL_END);
      const b = clamp((current - OPEN_START) / (OPEN_END - OPEN_START));
      const d = clamp((current - DIVE_START) / (DIVE_END - DIVE_START));
      const flat = q === 0;

      el.dataset.flat = flat ? "1" : "0";
      el.style.setProperty("--q", q.toFixed(4));
      el.style.setProperty("--b", b.toFixed(4));
      el.style.setProperty("--d", d.toFixed(4));

      if (flat) {
        boxEl.style.transform = `translate3d(0,${-pan}px,0)`;
      } else {
        const e = ease(q);
        const turn = ease(clamp((q - 0.28) / 0.72));
        const dive = ease(d);
        const scale = Math.exp(-Math.log(k) * e + Math.log(diveScale) * dive);
        const rx = mix(turn * (-27 + (rolled ? 17 : 15) * b), -90, dive);
        const ry = mix(turn * ((rolled ? -30 : -34) + (rolled ? 26 : 30) * b), 0, dive);
        const rz = rolled ? -90 * turn : 0;
        // On the way in, the camera itself turns a quarter, so the long side of the box runs down a tall screen.
        const cam = rolled ? 90 * dive : 0;
        const y = mix(mix(-pan, restY, e), vh / 2 - faceH / 2, dive);
        const z = -dz * (1 - e);
        boxEl.style.transform =
          `translate3d(0,${y.toFixed(2)}px,${z.toFixed(2)}px) scale3d(${scale.toFixed(5)},${scale.toFixed(5)},${scale.toFixed(5)}) ` +
          `rotateZ(${cam.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
        stageEl.style.perspectiveOrigin = `50% ${(36 + 14 * dive).toFixed(2)}%`;
      }

      const out = Math.min(parcels.length, Math.max(0, Math.floor((b - FIRST) / STEP + 0.4)));
      if (count.current) count.current.textContent = String(out);
      el.dataset.stage = b < 0.08 ? "sealed" : out < parcels.length ? "opened" : "unpacked";

      if (current !== target) frame = requestAnimationFrame(paint);
    };

    const read = () => {
      const y = Math.max(0, -el.getBoundingClientRect().top);
      if (y > 0) arm();
      pan = Math.min(y, over);
      target = Math.min(DIVE_END, Math.max(0, y - over) / vh);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const resize = () => {
      measure();
      read();
    };

    measure();
    read();
    const watcher = new ResizeObserver(resize);
    watcher.observe(boxEl);
    watcher.observe(stageEl);
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      clearTimeout(idle);
      watcher.disconnect();
      window.removeEventListener("scroll", read);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="voy" ref={root} data-flat="1" data-roll="0" data-stage="sealed">
      <div className="voy__stage" ref={stage}>
        <div className="voy__hud" aria-hidden>
          <p className="kicker voy__kicker">01 — The manifest</p>
          <p className="mono voy__count">
            <span>Parcels out </span>
            <b>
              <b ref={count}>0</b>/{parcels.length}
            </b>
          </p>
          <ol className="voy__steps mono">
            <li data-step="sealed">Sealed</li>
            <li data-step="opened">Opened</li>
            <li data-step="unpacked">Unpacked</li>
          </ol>
          <p className="mono voy__hint">
            <span className="voy__hint-a">Scroll to cut the tape</span>
            <span className="voy__hint-b">Keep going: the paperwork is inside</span>
            <ArrowDown />
          </p>
        </div>

        <h2 className="display voy__title">
          What&rsquo;s in
          <br />
          the box?
        </h2>

        <div className="vbox" ref={box}>
          <div className="vbox__face">{children}</div>

          <div className="rig" ref={rig}>
            <span className="rig__shadow" aria-hidden />
            <Wall
              side="floor"
              inside={
                <span className="rig__note">
                  <b className="stencil">The paperwork</b>
                  <span className="mono">04 items · packed by hand</span>
                </span>
              }
            />
            <Wall side="back" />
            <Wall side="left">
              <ThisSideUp />
              <b className="stencil">04 pcs</b>
            </Wall>
            <Wall side="right">
              <ThisSideUp />
              <b className="stencil">04 pcs</b>
            </Wall>
            <div className="wall wall--front">
              <i className="in" />
            </div>

            {parcels.map((parcel, i) => (
              <a
                className={`card${parcel.device === "phone" ? " card--phone" : ""}`}
                href={`#parcel-${parcel.slug}`}
                key={parcel.slug}
              >
                <span className="card__frame">
                  <span className="card__bar" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <span className="mono">{parcel.urlLabel}</span>
                  </span>
                  <span className="card__shot">
                    {armed && (
                      <Image src={parcel.image} alt={parcel.imageAlt} fill sizes="(max-width: 760px) 60vw, 440px" />
                    )}
                  </span>
                </span>
                <span className="card__tag">
                  <b className="mono">{String(i + 1).padStart(2, "0")}</b>
                  {parcel.name}
                </span>
              </a>
            ))}

            <Flap side="left" />
            <Flap side="right" />
            <Flap side="back" />
            <Flap side="front" />
          </div>
        </div>

        <div className="voy__fade" aria-hidden />
      </div>
      <span className="voy__anchor" id="manifest" />
      <noscript>
        <style>{`.voy{height:auto!important}.voy__stage{position:relative!important;height:auto!important}.vbox{position:relative!important}.rig,.voy__hud,.voy__title,.voy__fade{display:none!important}.voy__anchor{position:static!important}.voy+main>.parcels{margin-top:0!important}`}</style>
      </noscript>
    </section>
  );
}
