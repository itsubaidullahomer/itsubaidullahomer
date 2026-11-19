"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { work, type WorkItem } from "@/content/studio";
import { prefersReducedMotion, track } from "./fx";
import { Arrow, ArrowOut } from "./icons";
import { Label } from "./label";
import { Rich } from "./rich";

/** How long the two big words take to part, as a share of the screen's height. */
const INTRO = 0.7;

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
              src={shot.src}
              alt={n === 0 ? `${item.name}: ${item.kind.toLowerCase()}` : ""}
              width={shot.width}
              height={shot.height}
              sizes="(min-width: 900px) 210px, 30vw"
              quality={90}
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
          src={shot.src}
          alt={`${item.name}: ${item.kind.toLowerCase()}`}
          width={shot.width}
          height={shot.height}
          sizes={shape === "tall" ? "(min-width: 900px) 360px, 62vw" : "(min-width: 900px) 720px, 88vw"}
          quality={90}
        />
      </div>
    </div>
  );
}

/**
 * The work, as screenshots that float past. Each one keeps its own shape: wide pages are shown whole,
 * long pages scroll inside a taller window, the apps stand as phones. They sit at different heights,
 * bob gently, and travel sideways while the page scrolls down, after two big words slide apart.
 * The script measures the distance and reports progress; the stylesheet does the moving. With no
 * script, or reduced motion, it is a plain strip that swipes sideways.
 */
export function WorkReel() {
  const wrap = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const row = rail.current;
    if (!el || !row || prefersReducedMotion()) return;
    const size = () => {
      const travel = Math.max(0, row.scrollWidth - window.innerWidth);
      const intro = window.innerHeight * INTRO;
      el.style.setProperty("--travel", `${travel}px`);
      el.style.setProperty("--intro", `${intro}px`);
      el.style.setProperty("--t0", (intro / (intro + travel || 1)).toFixed(4));
    };
    el.dataset.live = "1";
    size();
    const watch = new ResizeObserver(size);
    watch.observe(row);
    window.addEventListener("resize", size);
    const stop = track(el, "pin", (p) => el.style.setProperty("--p", p.toFixed(4)));
    return () => {
      stop();
      watch.disconnect();
      window.removeEventListener("resize", size);
      delete el.dataset.live;
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
