import type { CSSProperties } from "react";
import { band, faq, footer, process, services, studio } from "@/content/studio";
import { SCALE } from "@/lib/sound";
import { Track } from "./fx";
import { ArrowOut } from "./icons";
import { ServiceArt } from "./service-art";
import { Label } from "./label";
import { Rich } from "./rich";

export function Services() {
  return (
    <section className="section services" id="services">
      <div className="wrap">
        <div className="section__head">
          <Label n="02">{services.kicker}</Label>
          <Track as="h2" mode="read" className="h2 h2--fill">
            <Rich text={services.title} />
          </Track>
        </div>
        <div className="svc-grid">
          {services.list.map((service, i) => (
            <Track
              as="article"
              mode="view"
              className="svc"
              key={service.key}
              // A note as the card is halfway in, one step up the scale for each card.
              sound="note"
              soundAt={0.1}
              soundRate={SCALE[i % SCALE.length]}
              soundGain={0.8}
            >
              <div className="svc__art" aria-hidden="true">
                <ServiceArt kind={service.key} />
              </div>
              <p className="svc__name">{service.name}</p>
              <h3>{service.title}</h3>
              <p className="svc__text">{service.text}</p>
              <ul className="svc__points">
                {service.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </Track>
          ))}
        </div>
      </div>
      <div className="more">
        <p className="more__title wrap">{services.moreTitle}</p>
        {services.more.map((row, r) => (
          <div className={r % 2 ? "more__row more__row--b" : "more__row"} key={r}>
            {/* Repeated enough times to fill the widest screen; only the first set is read out. */}
            <ul>
              {Array.from({ length: 8 }, () => row)
                .flat()
                .map((item, i) => (
                  <li key={i} aria-hidden={i >= row.length}>
                    {item}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Three bands of very large type. Each repeats its line until it is far wider than the screen, and the
 * bands slide in opposite directions as the page scrolls, so on any screen it reads as moving type.
 */
export function Band() {
  return (
    <Track as="section" mode="view" className="band">
      <h2 className="sr">{band.map((line) => line.join(" ")).join(" ")}</h2>
      {band.map(([plain, accent], i) => (
        <p className="band__row" key={plain} aria-hidden="true" style={{ "--dir": i % 2 ? 1 : -1 } as CSSProperties}>
          <span>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <span key={n}>
                {plain} <em>{accent}</em>
              </span>
            ))}
          </span>
        </p>
      ))}
    </Track>
  );
}

export function Process() {
  return (
    <Track as="section" mode="view" className="section section--soft process" id="process">
      <span className="ghost" aria-hidden="true">
        {process.ghost}
      </span>
      <div className="wrap">
        <div className="section__head">
          <Label n="05">{process.kicker}</Label>
          <Track as="h2" mode="read" className="h2 h2--fill">
            <Rich text={process.title} />
          </Track>
        </div>
        {/* Each step plays the next note of a C major chord as it starts to light up. */}
        <Track
          as="div"
          mode="read"
          className="steps"
          sound="note"
          soundAt={process.steps.map((_, i) => i * 0.22 + 0.06)}
          soundRate={process.steps.map((_, i) => [1, 5 / 4, 3 / 2, 2, 5 / 2][i] ?? 2)}
          soundGain={0.75}
        >
          <span className="steps__line" aria-hidden="true">
            <i />
          </span>
          <ol>
            {process.steps.map((step, i) => (
              <li key={step.title} style={{ "--i": i } as CSSProperties}>
                <span className="steps__n">0{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </Track>
      </div>
    </Track>
  );
}

export function Faq() {
  return (
    <section className="section section--soft faq" id="faq">
      <div className="wrap faq__grid">
        <div className="section__head">
          <Label n="06">{faq.kicker}</Label>
          <Track as="h2" mode="read" className="h2 h2--fill">
            <Rich text={faq.title} />
          </Track>
        </div>
        <div className="faq__list">
          {faq.list.map(([question, answer], i) => (
            <details key={question} data-reveal={i % 2 ? "right" : "left"} name="faq">
              <summary>
                {question}
                <span aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div>
          <p className="footer__name">{studio.name}</p>
          <p className="footer__line">{footer.line}</p>
        </div>
        <ul className="footer__links">
          <li>
            <a href={`mailto:${studio.email}`}>{studio.email}</a>
          </li>
          {Object.entries(studio.social).map(([label, href]) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label} <ArrowOut size={15} />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="wrap footer__base">
        <span>
          © {new Date().getFullYear()} {studio.name}
        </span>
        <a href={studio.engineerUrl}>
          {footer.hiring} <ArrowOut size={15} />
        </a>
      </div>
      {/* The name, very large, each letter rising into place. */}
      <p className="footer__big" aria-hidden="true" data-reveal>
        {`${studio.name}.`.split("").map((letter, i) => (
          <span key={i} style={{ "--d": i } as CSSProperties}>
            {letter}
          </span>
        ))}
      </p>
    </footer>
  );
}
