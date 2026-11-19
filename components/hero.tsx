import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { hero, studio, tape } from "@/content/studio";
import { Track } from "./fx";
import { Arrow, ArrowDown, SearchIcon } from "./icons";
import { MadeFor } from "./hero-bits";

/** The floating bar: the name and the way to get in touch. */
export function Bar() {
  return (
    <div className="bar">
      <a className="bar__mark" href="#top">
        {studio.name}
      </a>
      <a className="bar__cta" href="#contact">
        Get in touch
      </a>
    </div>
  );
}

/** Each word rises out of its own slot, one after the other. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={`${word}-${i}`}>
      <span className="w">
        <span style={{ "--n": from + i } as CSSProperties}>{word}</span>
      </span>{" "}
    </Fragment>
  ));
}

export function Hero() {
  const { before, search, after } = hero.title;
  const count = before.split(" ").length;
  return (
    <Track as="header" mode="exit" className="hero" id="top">
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__copy">
        <MadeFor />
        <p className="eyebrow">
          <i />
          {hero.eyebrow.join(" · ")}
        </p>
        <h1 className="hero__title">
          <Words text={before} />
          <span className="hero__search">
            <SearchIcon />
            <em>{search}</em>
            <i className="caret" aria-hidden="true" />
          </span>{" "}
          <Words text={after} from={count + 2} />
        </h1>
        <p className="hero__lede">{hero.lede}</p>
        <div className="hero__cta">
          <a className="btn btn--dark" href="#story">
            {hero.primary} <ArrowDown size={18} />
          </a>
          <a className="link" href="#contact">
            {hero.secondary} <Arrow size={18} />
          </a>
        </div>
      </div>

      <div className="fan">
        {hero.fan.map((shot, i) => (
          <div className={`fan__card fan__card--${i === 0 ? "l" : "r"}`} key={shot.src} aria-hidden="true">
            <Image src={shot.src} alt="" width={shot.width} height={shot.height} sizes="(min-width: 900px) 300px, 50vw" loading="eager" />
          </div>
        ))}
        <figure className="fan__me">
          <Image
            src="/images/me/ubaid.jpg"
            alt={studio.name}
            width={800}
            height={800}
            sizes="(min-width: 900px) 400px, 70vw"
            quality={90}
            priority
          />
          <figcaption>
            <b>{studio.name}</b>
            <span>{hero.role}</span>
          </figcaption>
        </figure>
        {hero.chips.map((chip, i) => (
          <span className={`fchip fchip--${i + 1}`} key={chip} aria-hidden="true">
            <i />
            {chip}
          </span>
        ))}
      </div>
    </Track>
  );
}

function Row({ reverse = false }: { reverse?: boolean }) {
  // The list is doubled so the loop has no seam; the copy is hidden from screen readers.
  const words = [...tape, ...tape];
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
