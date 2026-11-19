import type { CSSProperties, ReactNode } from "react";
import { band, faq, footer, process, services, studio, type Service } from "@/content/studio";
import { Track } from "./fx";
import { ArrowOut, Heart, Megaphone, Star } from "./icons";
import { Label } from "./label";
import { Rich } from "./rich";

/** A small moving drawing for each service, in ink and gold. Decoration only. */
const art: Record<Service["key"], ReactNode> = {
  web: (
    <div className="art art--web">
      <span className="win">
        <i />
        <i />
        <i />
      </span>
      <span className="ln" />
      <span className="ln ln--short" />
      <span className="cta" />
      <svg className="cur" viewBox="0 0 24 24" focusable="false">
        <path d="M5 3l14 8-6 1.500L10 19z" />
      </svg>
    </div>
  ),
  seo: (
    <div className="art art--seo">
      <span className="row" />
      <span className="row" />
      <span className="row row--you">
        <Star />
        <Star />
        <Star />
        <Star />
        <Star />
      </span>
    </div>
  ),
  social: (
    <div className="art art--social">
      <span className="post">
        <Heart />
      </span>
      <span className="h h--1">
        <Heart />
      </span>
      <span className="h h--2">
        <Heart />
      </span>
      <span className="h h--3">
        <Heart />
      </span>
    </div>
  ),
  ads: (
    <div className="art art--ads">
      <Megaphone />
      <i />
      <i />
      <i />
    </div>
  ),
  brand: (
    <div className="art art--brand">
      <span className="mark">A</span>
      <span className="sw" />
      <span className="sw" />
      <span className="sw" />
    </div>
  ),
  care: (
    <div className="art art--care">
      <svg viewBox="0 0 60 60" focusable="false">
        <circle cx="30" cy="30" r="24" />
        <path d="m20 31 7 7 14-15" />
      </svg>
    </div>
  ),
};

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
          {services.list.map((service) => (
            <Track as="article" mode="view" className="svc" key={service.key}>
              <div className="svc__art" aria-hidden="true">
                {art[service.key]}
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
            <ul>
              {[...row, ...row].map((item, i) => (
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

/** Three lines of very large type that slide in opposite directions as the page scrolls. */
export function Band() {
  return (
    <Track as="section" mode="view" className="band">
      {band.map(([plain, accent], i) => (
        <p className="band__row" key={plain} style={{ "--dir": i % 2 ? 1 : -1 } as CSSProperties}>
          <span>
            {plain} <em>{accent}</em>
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
        <Track as="div" mode="read" className="steps">
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
