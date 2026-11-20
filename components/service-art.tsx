"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { sample, type Service } from "@/content/studio";
import { domainForBusiness } from "@/lib/business";
import { useBiz } from "./biz";
import { Check, Heart, PhoneIcon, SearchIcon, Star } from "./icons";

const Stars = () => (
  <span className="a-stars">
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} />
    ))}
  </span>
);
const Cursor = () => (
  <svg className="a-cursor" viewBox="0 0 24 24" focusable="false">
    <path d="M5 3l14 8-6 1.500L10 19z" />
  </svg>
);
const Dots = () => (
  <span className="a-dots">
    <i />
    <i />
    <i />
  </span>
);

/**
 * The small moving screen at the top of each service card: a search page where the business climbs to
 * the top, its website, a post, an ad, a business card and a status panel. They are drawings, close
 * enough to the real thing to be recognised and no closer, and they loop on their own. On a /for/…
 * link they carry the visitor's business name. Decoration only: the card's text says the same thing.
 */
export function ServiceArt({ kind }: { kind: Service["key"] }) {
  const { name } = useBiz();
  const host = useRef<HTMLDivElement>(null);
  // The loops only run while the card is on screen, and start from the top each time it arrives.
  useEffect(() => {
    const el = host.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.dataset.run = "1";
      else delete el.dataset.run;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const business = name.trim() || sample.business;
  const domain = (name.trim() && domainForBusiness(name)) || sample.domain;
  const initial = business.charAt(0).toUpperCase();
  const lower = business.toLowerCase();
  const query = (name.trim() && sample.queries.find(([words]) => new RegExp(`\\b(${words})`).test(lower))?.[1]) || sample.query;

  const scenes: Record<Service["key"], ReactNode> = {
    web: (
      <div className="scene scene--web">
        <div className="a-win">
          <div className="a-win__bar">
            <Dots />
            <b>{domain}</b>
          </div>
          <div className="w-nav">
            <span className="a-logo">{initial}</span>
            <strong>{business}</strong>
            <i>Services</i>
            <i>Reviews</i>
            <em>
              <PhoneIcon /> Call
            </em>
          </div>
          <div className="w-body">
            <div className="w-copy">
              <p className="w-h">{sample.site.headline}</p>
              <p className="w-p">{sample.site.line}</p>
              <p className="w-cta">
                <span className="w-call">
                  <PhoneIcon /> {sample.site.call}
                </span>
                <span className="w-quote">{sample.site.quote}</span>
              </p>
            </div>
            <div className="w-photo">
              <span className="w-sun" />
              <span className="w-hill" />
              <span className="w-house" />
            </div>
          </div>
        </div>
        <Cursor />
        <span className="a-toast w-toast">
          <i />
          {sample.site.toast}
        </span>
      </div>
    ),
    seo: (
      <div className="scene scene--seo">
        <div className="a-win">
          <div className="s-bar">
            <SearchIcon />
            <span className="s-typed" style={{ "--chars": query.length } as CSSProperties}>
              {query}
            </span>
          </div>
          <p className="s-meta">Results near you</p>
          <div className="s-list">
            {sample.others.map((other, i) => (
              <div className={`s-res s-res--o${i + 1}`} key={other}>
                <span className="s-fav" />
                <span className="s-text">
                  <small>{other.toLowerCase().replace(/[^a-z]+/g, "")}.com</small>
                  <b>{other}</b>
                  <i />
                </span>
              </div>
            ))}
            <div className="s-res s-res--you">
              <span className="a-logo">{initial}</span>
              <span className="s-text">
                <small>{domain}</small>
                <b>{business}</b>
                <span className="s-rate">
                  <Stars /> Open now
                </span>
              </span>
              <span className="s-call">
                <PhoneIcon /> Call
              </span>
              <span className="s-first">#1</span>
            </div>
          </div>
        </div>
      </div>
    ),
    social: (
      <div className="scene scene--social">
        <div className="p-post">
          <div className="p-head">
            <span className="a-logo">{initial}</span>
            <span>
              <b>{business}</b>
              <small>Just now</small>
            </span>
            <Dots />
          </div>
          <div className="p-photo">
            <span className="w-sun" />
            <span className="w-hill" />
            <span className="w-house" />
            <span className="p-tag">
              <Check /> {sample.post.tag}
            </span>
            <span className="p-burst">
              <Heart />
            </span>
          </div>
          <div className="p-acts">
            <span className="p-like">
              <Heart />
            </span>
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M21 12a8 8 0 0 1-11.800 7L4 20l1.200-4.500A8 8 0 1 1 21 12z" />
            </svg>
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M21 3 10.500 13.500M21 3l-6.500 18-4-7.500L3 9.500z" />
            </svg>
            <b className="p-count" style={{ "--to": sample.post.likes } as CSSProperties}>
              likes
            </b>
          </div>
          <p className="p-text">
            <b>{business}</b> {sample.post.text}
          </p>
        </div>
        <span className="a-toast p-comment">
          <i />
          {sample.post.comment}
        </span>
        <span className="p-float p-float--1">
          <Heart />
        </span>
        <span className="p-float p-float--2">
          <Heart />
        </span>
        <span className="p-float p-float--3">
          <Heart />
        </span>
      </div>
    ),
    ads: (
      <div className="scene scene--ads">
        <div className="d-ad">
          <small className="d-tag">{sample.ad.tag}</small>
          <p className="d-site">
            <span className="a-logo">{initial}</span>
            {domain}
          </p>
          <p className="d-title">{business}</p>
          <p className="d-line">{sample.ad.line}</p>
          <p className="d-btns">
            <span className="w-call">
              <PhoneIcon /> {sample.ad.call}
            </span>
            <span className="w-quote">Directions</span>
          </p>
        </div>
        <div className="d-chart">
          <small>{sample.ad.chart}</small>
          <div className="d-bars">
            {[34, 48, 42, 64, 58, 82, 100].map((height, i) => (
              <i key={i} style={{ "--h": `${height}%`, "--n": i } as CSSProperties} />
            ))}
          </div>
        </div>
        <span className="a-toast d-toast">
          <i />
          {sample.ad.chip}
        </span>
        <Cursor />
      </div>
    ),
    brand: (
      <div className="scene scene--brand">
        <div className="b-card b-card--back">
          <span className="b-mark">{initial}</span>
        </div>
        <div className="b-card b-card--front">
          <span className="b-mark">{initial}</span>
          <b>{business}</b>
          <small>{sample.card.line}</small>
          <span className="b-lines">
            <i />
            <i />
          </span>
        </div>
        <div className="b-swatches">
          {sample.card.swatches.map((colour, i) => (
            <i key={colour} style={{ background: colour, "--n": i } as CSSProperties} />
          ))}
        </div>
        <div className="b-sign">
          <span className="b-mark">{initial}</span>
          {business}
        </div>
      </div>
    ),
    care: (
      <div className="scene scene--care">
        <div className="c-panel">
          <div className="c-head">
            <span className="c-dot" />
            <b>{domain}</b>
            <em>{sample.care.state}</em>
          </div>
          <div className="c-bars">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} style={{ "--n": i } as CSSProperties} />
            ))}
          </div>
          <ul>
            {sample.care.checks.map((check, i) => (
              <li key={check} style={{ "--n": i } as CSSProperties}>
                <span>
                  <Check />
                </span>
                {check}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  };
  return (
    <div className="art-host" ref={host}>
      {scenes[kind]}
    </div>
  );
}
