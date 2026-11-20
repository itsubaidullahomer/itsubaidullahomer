"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { work, type WorkItem } from "@/content/studio";
import { play, SCALE } from "@/lib/sound";
import { clamp01, prefersReducedMotion, track } from "./fx";
import { Arrow, ArrowOut } from "./icons";
import { Label } from "./label";
import { Rich } from "./rich";

/** How long the two big words take to part, as a share of the screen's height. */
const INTRO = 0.7;

/** The sideways reel is for a big screen with a mouse. Thumbs and touch screens get the deck. */
const REEL = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

/**
 * How wide each kind of picture is drawn, for the browser to pick the right file: in the reel on a desktop
 * (growing with the type on very large monitors, see base.css), beside the words on a tablet, and across
 * the card on a phone.
 */
const SIZES = {
  wide: "(min-width: 1600px) calc(24.75vw + 315px), (min-width: 1024px) 720px, (min-width: 700px) 440px, calc(100vw - 64px)",
  tall: "(min-width: 1600px) calc(11.7vw + 149px), (min-width: 1024px) 340px, (min-width: 700px) 336px, calc(100vw - 64px)",
  phones: "(min-width: 1600px) calc(6.4vw + 81px), (min-width: 700px) 190px, calc(36vw - 22px)",
};

/** A wide screenshot is shown whole; a full-page capture scrolls slowly inside a taller window. */
function shapeOf(item: WorkItem) {
  if (item.frame === "phones") return "phones";
  return item.pan ? "tall" : "wide";
}

function Shot({ item }: { item: WorkItem }) {
  const shape = shapeOf(item);
  if (shape === "phones") {
    return (
      <div className="piece__phones">
        {item.shots.map((shot, n) => (
          <span className="pphone" key={shot.src}>
            <Image
              src={shot}
              alt={n === 0 ? `${item.name}: ${item.kind.toLowerCase()}` : ""}
              sizes={SIZES.phones}
              quality={90}
              placeholder="blur"
            />
          </span>
        ))}
      </div>
    );
  }
  const [shot] = item.shots;
  const host = item.url ? new URL(item.url).host.replace(/^www\./, "") : item.name.toLowerCase();
  // A full-page capture takes longer to scroll the longer it is.
  const seconds = Math.round((shot.height / shot.width) * 9);
  return (
    <div
      className="piece__window"
      style={{ "--ar": `${shot.width} / ${shot.height}`, "--pan": `${seconds}s` } as CSSProperties}
    >
      <span className="piece__bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <b>{host}</b>
      </span>
      <div className="piece__view">
        <Image
          src={shot}
          alt={`${item.name}: ${item.kind.toLowerCase()}`}
          sizes={SIZES[shape]}
          quality={90}
          placeholder="blur"
        />
      </div>
    </div>
  );
}

/**
 * The reel: the section pins, two big words part, and the row travels sideways as the page scrolls down.
 * The script measures the distance and reports progress; the stylesheet does the moving.
 */
function reel(el: HTMLElement, row: HTMLElement) {
  const pieces = Array.from(row.children) as HTMLElement[];
  /** Where in the row's travel (0 → 1) each card passes the middle of the screen. */
  let marks: number[] = [];
  const size = () => {
    const travel = Math.max(0, row.scrollWidth - window.innerWidth);
    const intro = window.innerHeight * INTRO;
    el.style.setProperty("--travel", `${travel}px`);
    el.style.setProperty("--intro", `${intro}px`);
    el.style.setProperty("--t0", (intro / (intro + travel || 1)).toFixed(4));
    const left = row.getBoundingClientRect().left;
    marks = pieces.map((piece) => {
      const r = piece.getBoundingClientRect();
      const mark = travel ? (r.left - left + r.width / 2 - window.innerWidth / 2) / travel : 0;
      // The first card is already in the middle when the row starts moving, and the last one never quite
      // reaches it: they sound as the row sets off and as it comes to its end.
      return Math.min(0.995, Math.max(0.005, mark));
    });
  };
  el.dataset.live = "1";
  size();
  const watch = new ResizeObserver(size);
  watch.observe(row);
  window.addEventListener("resize", size);
  // A swish the moment the two words start to part (once each time the section is entered from above),
  // then a soft note as each card passes the middle of the screen, climbing the scale card by card.
  let parted = false;
  let last = -1;
  const stop = track(el, "pin", (p) => {
    el.style.setProperty("--p", p.toFixed(4));
    const t0 = parseFloat(el.style.getPropertyValue("--t0")) || 0.2;
    const o = p / t0;
    if (!parted && o >= 0.06 && o < 0.6) parted = play("swish", { ambient: true });
    else if (o < 0.02) parted = false;
    const q = clamp01((p - t0) / Math.max(1e-4, 1 - t0));
    if (last >= 0 && q !== last) {
      marks.forEach((mark, i) => {
        if ((last < mark) !== (q < mark)) {
          play("note", { rate: SCALE[i % SCALE.length], gain: 0.8, ambient: true });
        }
      });
    }
    last = q;
  });
  return () => {
    stop();
    watch.disconnect();
    window.removeEventListener("resize", size);
    delete el.dataset.live;
    for (const name of ["--travel", "--intro", "--t0", "--p"]) el.style.removeProperty(name);
  };
}

/**
 * The deck: each card reports how far it has come up the screen toward the place where it settles (--e),
 * and the card before it learns how far it has been covered (--k). The stylesheet does the rest.
 */
function deck(row: HTMLElement) {
  const cards = Array.from(row.children) as HTMLElement[];
  let docks = cards.map(() => 0);
  const settled = cards.map(() => false);
  const size = () => {
    docks = cards.map((card) => parseFloat(getComputedStyle(card).top) || 0);
  };
  size();
  window.addEventListener("resize", size);
  const stops = cards.map((card, i) =>
    track(
      card,
      (c) => {
        const vh = window.innerHeight;
        return clamp01((vh - c.getBoundingClientRect().top) / Math.max(1, vh - docks[i]));
      },
      (e) => {
        card.style.setProperty("--e", e.toFixed(4));
        cards[i - 1]?.style.setProperty("--k", e.toFixed(4));
        // A soft note as each one comes to rest, one step up the scale per card, once per arrival.
        if (!settled[i] && e >= 0.88) settled[i] = play("note", { rate: SCALE[i % SCALE.length], ambient: true });
        else if (e < 0.6) settled[i] = false;
      },
      0.3,
    ),
  );
  return () => {
    for (const stop of stops) stop();
    window.removeEventListener("resize", size);
    for (const card of cards) {
      card.style.removeProperty("--e");
      card.style.removeProperty("--k");
    }
  };
}

/**
 * The work, as cards that keep each screenshot's own shape: wide pages whole, long pages scrolling inside a
 * taller window, the apps as phones. On a desktop with a mouse they float past sideways; on a phone or a
 * tablet they come up one after another and stack. With no script, or reduced motion, it is a plain column.
 */
export function WorkReel() {
  const wrap = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const row = rail.current;
    if (!el || !row || prefersReducedMotion()) return;
    const desktop = window.matchMedia(REEL);
    let stop = () => {};
    const start = () => {
      stop();
      stop = desktop.matches ? reel(el, row) : deck(row);
    };
    start();
    desktop.addEventListener("change", start);
    return () => {
      desktop.removeEventListener("change", start);
      stop();
    };
  }, []);

  const count = work.items.length + 1;
  const [left, right] = work.split;

  return (
    <section className="work" id="work" data-nosticky>
      <div className="reel" ref={wrap} style={{ "--n": count } as CSSProperties}>
        <div className="reel__pin">
          <div className="reel__head">
            <Label n="04">{work.kicker}</Label>
            <h2 className="h2">
              <Rich text={work.title} />
            </h2>
          </div>
          <div className="reel__split" aria-hidden="true">
            <span>{left}</span>
            <span>{right}</span>
          </div>
          <div className="reel__rail" ref={rail}>
            {work.items.map((item, i) => (
              <article className={`piece piece--${shapeOf(item)}`} key={item.key} style={{ "--i": i } as CSSProperties}>
                <div className="piece__float">
                  <Shot item={item} />
                  <div className="piece__cap">
                    <p className="piece__kind">{item.kind}</p>
                    <h3>{item.name}</h3>
                    <p className="piece__line">{item.line}</p>
                    {item.url ? (
                      <a className="link" href={item.url} target="_blank" rel="noopener noreferrer">
                        Visit the site <ArrowOut size={16} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            <article className="piece piece--last" style={{ "--i": count - 1 } as CSSProperties}>
              <div className="piece__float">
                <h3>
                  <Rich text={`*${work.last.title}*`} />
                </h3>
                <p>{work.last.text}</p>
                <a className="btn btn--gold" href="#contact">
                  {work.last.cta} <Arrow size={18} />
                </a>
              </div>
            </article>
          </div>
          <div className="reel__bar" aria-hidden="true">
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
