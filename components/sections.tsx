import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { about, band, faq, footer, process, services, studio, type Service } from "@/content/studio";
import { CountUp, Track } from "./fx";
import { ArrowOut, Heart, Megaphone, Star } from "./icons";
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
          <p className="eyebrow" data-reveal>
            <i />
            {services.kicker}
          </p>
          <h2 className="h2" data-reveal>
            <Rich text={services.title} />
          </h2>
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
    <section className="section section--soft process" id="process">
      <div className="wrap">
        <div className="section__head">
          <p className="eyebrow" data-reveal>
            <i />
            {process.kicker}
          </p>
          <h2 className="h2" data-reveal>
            <Rich text={process.title} />
          </h2>
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
    </section>
  );
}

export function About() {
  return (
    <section className="section about" id="about">
      <div className="wrap about__grid">
        <Track as="div" mode="view" className="about__photo">
          <Image src="/images/me/ubaid.jpg" alt={studio.name} width={800} height={800} sizes="(min-width: 900px) 420px, 90vw" />
        </Track>
        <div className="about__copy">
          <p className="eyebrow" data-reveal>
            <i />
            {about.kicker}
          </p>
          <h2 className="h2" data-reveal>
            <Rich text={about.title} />
          </h2>
          {about.text.map((paragraph) => (
            <p className="about__p" key={paragraph} data-reveal>
              {paragraph}
            </p>
          ))}
          <dl className="stats" data-reveal>
            {about.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="section section--soft faq" id="faq">
      <div className="wrap faq__grid">
        <div className="section__head">
          <p className="eyebrow" data-reveal>
            <i />
            {faq.kicker}
          </p>
          <h2 className="h2" data-reveal>
            <Rich text={faq.title} />
          </h2>
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
    </footer>
  );
}
