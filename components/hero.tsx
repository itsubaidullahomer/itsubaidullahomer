import Image from "next/image";
import type { CSSProperties } from "react";
import { hero, strip, studio, tape } from "@/content/studio";
import { CountUp, Track } from "./fx";
import { Arrow, ArrowDown } from "./icons";
import { MadeFor } from "./hero-bits";

/** The floating bar: the name and the way to get in touch. */
export function Bar() {
  return (
    <div className="bar">
      <a className="bar__mark" href="#top" aria-label={`${studio.name}, back to the top`}>
        {studio.name}
        <i>.</i>
      </a>
      <a className="bar__cta" href="#contact">
        Get in touch
      </a>
    </div>
  );
}

/**
 * The opening panel. The headline comes up line by line, the portrait rises from the bottom edge,
 * and a gold strip of services runs down beside it. As the page scrolls on, the lines drift apart
 * sideways and the panel tucks back (--p is how far it has scrolled away).
 */
export function Hero() {
  // The strip's words are doubled so its loop has no seam.
  const words = [...strip, ...strip, ...strip, ...strip];
  return (
    <Track as="header" mode="exit" className="hero" id="top">
      <div className="hero__panel">
        <div className="hero__rules" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <i key={n} style={{ "--n": n } as CSSProperties} />
          ))}
        </div>

        <div className="hero__head">
          <MadeFor />
          <p className="eyebrow">
            <i />
            {hero.eyebrow.join(" · ")}
          </p>
          <h1 className="hero__title">
            {hero.title.map(([text, tone], n) => (
              <span className={`hl hl--${tone}`} key={text} style={{ "--n": n } as CSSProperties}>
                <span>{text}</span>{" "}
              </span>
            ))}
          </h1>
        </div>

        <div className="hero__intro">
          <p className="hero__lede">{hero.lede}</p>
          <div className="hero__cta">
            <a className="btn btn--dark btn--chip" href="#contact">
              <span className="btn__chip">
                <Arrow size={18} />
              </span>
              {hero.primary}
            </a>
            <a className="link" href="#work">
              {hero.secondary} <ArrowDown size={18} />
            </a>
          </div>
        </div>

        <div className="hero__figure">
          <div className="hero__photo">
            <Image
              src="/images/me/ubaid.jpg"
              alt={studio.name}
              width={1280}
              height={1280}
              sizes="(min-width: 1000px) 640px, 100vw"
              quality={90}
              priority
            />
          </div>
          <div className="vstrip" aria-hidden="true">
            <ul>
              {words.map((word, i) => (
                <li key={i}>{word}</li>
              ))}
            </ul>
          </div>
          <div className="spin" aria-hidden="true">
            <svg viewBox="0 0 120 120" focusable="false">
              <defs>
                <path id="spin-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" />
              </defs>
              <text>
                <textPath href="#spin-ring" textLength="276">
                  {hero.badge}
                </textPath>
              </text>
            </svg>
            <span>
              <ArrowDown size={26} />
            </span>
          </div>
        </div>

        <div className="hero__proof">
          <a className="peek" href={hero.peek.href}>
            <span className="peek__view">
              <Image
                src={hero.peek.src}
                alt=""
                width={hero.peek.width}
                height={hero.peek.height}
                sizes="220px"
                loading="eager"
              />
            </span>
            <span className="peek__label">{hero.peek.label}</span>
          </a>
          <p className="hero__stat">
            <b>
              <CountUp value={hero.stat.value} suffix={hero.stat.suffix} />
            </b>
            <span>{hero.stat.label}</span>
          </p>
        </div>
      </div>
    </Track>
  );
}

function Row({ reverse = false }: { reverse?: boolean }) {
  // The list is repeated so the loop has no seam on any screen; the copies are hidden from screen readers.
  const words = [...tape, ...tape, ...tape, ...tape];
  return (
    <div className={reverse ? "ticker ticker--b" : "ticker"}>
      <ul>
        {words.map((word, i) => (
          <li key={i} aria-hidden={i >= tape.length}>
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two lines of services under the hero, running in opposite directions. */
export function Tapes() {
  return (
    <div className="tickers">
      <Row />
      <Row reverse />
    </div>
  );
}
