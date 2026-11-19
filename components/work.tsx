"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { work } from "@/content/studio";
import { prefersReducedMotion, track } from "./fx";
import { Arrow, ArrowOut } from "./icons";
import { Rich } from "./rich";

/**
 * The work, as a row of large cards that travels sideways while the page scrolls down.
 * The script measures how far the row has to travel and reports progress; the stylesheet moves it.
 * With no script, or reduced motion, the row is an ordinary swipeable strip.
 */
export function WorkReel() {
  const wrap = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const row = rail.current;
    if (!el || !row || prefersReducedMotion()) return;
    const size = () => {
      el.style.setProperty("--travel", `${Math.max(0, row.scrollWidth - window.innerWidth)}px`);
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

  return (
    <section className="work" id="work" data-nosticky>
      <div className="reel" ref={wrap} style={{ "--n": count } as CSSProperties}>
        <div className="reel__pin">
          <div className="reel__head">
            <p className="eyebrow">
              <i />
              {work.kicker}
            </p>
            <h2 className="h2">
              <Rich text={work.title} />
            </h2>
          </div>
          <div className="reel__rail" ref={rail}>
            {work.items.map((item, i) => (
              <article className={`card card--${item.frame}`} key={item.key} style={{ "--i": i } as CSSProperties}>
                <div className="card__media">
                  {item.frame === "browser" ? (
                    <div className="browser">
                      <span className="browser__bar">
                        <i />
                        <i />
                        <i />
                      </span>
                      <div className="browser__view" data-pan={item.pan || undefined}>
                        <Image
                          src={item.shots[0].src}
                          alt={`${item.name}: ${item.kind.toLowerCase()}`}
                          width={item.shots[0].width}
                          height={item.shots[0].height}
                          sizes="(min-width: 900px) 620px, 82vw"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="phones">
                      {item.shots.map((shot, n) => (
                        <div className="phones__one" key={shot.src}>
                          <Image
                            src={shot.src}
                            alt={n === 0 ? `${item.name}: ${item.kind.toLowerCase()}` : ""}
                            width={shot.width}
                            height={shot.height}
                            sizes="(min-width: 900px) 200px, 28vw"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card__text">
                  <p className="card__kind">{item.kind}</p>
                  <h3>{item.name}</h3>
                  <p className="card__line">{item.line}</p>
                  {item.url ? (
                    <a className="link" href={item.url} target="_blank" rel="noopener noreferrer">
                      Visit the site <ArrowOut size={16} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            <article className="card card--last" style={{ "--i": count - 1 } as CSSProperties}>
              <h3>
                <Rich text={`*${work.last.title}*`} />
              </h3>
              <p>{work.last.text}</p>
              <a className="btn btn--gold" href="#contact">
                {work.last.cta} <Arrow size={18} />
              </a>
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
