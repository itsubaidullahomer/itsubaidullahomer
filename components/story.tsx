"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { story, trades } from "@/content/studio";
import { useBiz } from "./biz";
import { prefersReducedMotion, track } from "./fx";
import { Arrow, Heart, PhoneIcon, Pin, SearchIcon, Star } from "./icons";
import { Rich } from "./rich";

/** Where each of the five beats starts, as a share of the pinned scroll. The stylesheet uses the same numbers. */
const STEP_AT = [0, 0.17, 0.41, 0.61, 0.83];
/** The search is fully typed by this point. */
const TYPED_BY = 0.12;

function paintQuery(el: HTMLElement | null, query: string, p: number, live: boolean) {
  if (!el) return;
  const text = live ? query.slice(0, Math.round(query.length * Math.min(1, p / TYPED_BY))) : query;
  if (el.textContent !== text) el.textContent = text;
}

const Stars = () => (
  <span className="stars">
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} />
    ))}
  </span>
);

/**
 * The centrepiece: a phone, pinned while the page scrolls, that plays out how a customer finds a
 * local business and ends up calling it. The script only reports scroll progress (--p) and which
 * beat is on; the stylesheet does the moving. With no script, or reduced motion, the five steps are
 * an ordinary list beside a phone showing the finished website.
 */
export function Story() {
  const { name, trade, setName, setTrade } = useBiz();
  const scroll = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const now = useRef({ p: 1, live: false, query: trade.query });

  useEffect(() => {
    now.current.query = trade.query;
    paintQuery(typed.current, trade.query, now.current.p, now.current.live);
  }, [trade.query]);

  useEffect(() => {
    const el = scroll.current;
    const state = now.current;
    if (!el || prefersReducedMotion()) return;
    el.dataset.live = "1";
    state.live = true;
    const caps = Array.from(el.querySelectorAll<HTMLElement>("[data-cap]"));
    let step = -1;
    const stop = track(el, "pin", (p) => {
      state.p = p;
      el.style.setProperty("--p", p.toFixed(4));
      let s = 0;
      for (let i = 0; i < STEP_AT.length; i++) if (p >= STEP_AT[i]) s = i;
      if (s !== step) {
        step = s;
        el.dataset.step = String(s);
        caps.forEach((cap, i) => {
          cap.dataset.at = i === s ? "on" : i < s ? "past" : "next";
        });
      }
      paintQuery(typed.current, state.query, p, true);
    });
    return () => {
      stop();
      state.live = false;
      delete el.dataset.live;
    };
  }, []);

  const shown = name.trim() || story.placeholderName;
  const initial = shown.charAt(0).toUpperCase();

  return (
    <section className="story" id="story">
      <div className="wrap story__intro">
        <p className="eyebrow" data-reveal>
          <i />
          {story.kicker}
        </p>
        <h2 className="h2" data-reveal>
          <Rich text={story.title} />
        </h2>
        <div className="setup" data-reveal>
          <p className="setup__q" id="trade-q">
            {story.prompt}
          </p>
          <div className="chips" role="radiogroup" aria-labelledby="trade-q">
            {trades.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={t.key === trade.key}
                className="chip"
                onClick={() => setTrade(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="setup__name">
            <span>{story.namePrompt}</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Smith Septic"
              maxLength={40}
              autoComplete="organization"
              enterKeyHint="done"
            />
          </label>
        </div>
      </div>

      <div className="story__scroll" ref={scroll} data-nosticky>
        <div className="story__pin">
          <ol className="caps">
            {story.steps.map((step, i) => (
              <li key={step.title} data-cap data-at={i === 0 ? "on" : "next"}>
                <span className="caps__tag">
                  <b>0{i + 1}</b>
                  {step.tag}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>

          {/* A drawing of the idea. The steps above say the same thing in words. */}
          <div className="stage" aria-hidden="true">
            <div className="phone">
              <div className="scr scr--search">
                <div className="sbar">
                  <SearchIcon />
                  <span className="sbar__text">
                    <span ref={typed} />
                    <i className="caret" />
                  </span>
                </div>
                <p className="smeta">Near you · Open now</p>
                <div className="results">
                  {[0, 1, 2].map((i) => (
                    <div className="res res--other" key={i}>
                      <span className="res__dot" />
                      <span className="res__lines">
                        <i />
                        <i />
                      </span>
                    </div>
                  ))}
                  <div className="res res--you">
                    <span className="logo">{initial}</span>
                    <span className="res__body">
                      <b>{shown}</b>
                      <Stars />
                      <small>Open now</small>
                    </span>
                    <span className="res__call">
                      <PhoneIcon /> Call
                    </span>
                    <span className="tap" />
                  </div>
                </div>
              </div>

              <div className="scr scr--site">
                <div className="site__bar">
                  <span className="logo">{initial}</span>
                  <b>{shown}</b>
                  <span className="site__menu">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="site__hero">
                  <h4>{trade.headline}</h4>
                  <p>Local. Friendly. On time.</p>
                  <span className="site__call">
                    <PhoneIcon /> Call now
                    <span className="finger" />
                  </span>
                  <span className="site__quote">Get a quote</span>
                </div>
                <div className="site__jobs">
                  {trade.jobs.map((job) => (
                    <span key={job}>{job}</span>
                  ))}
                </div>
                <div className="site__review">
                  <Stars />
                  <p>“{trade.review}”</p>
                </div>
              </div>

              <div className="scr scr--call">
                <small>Incoming call</small>
                <div className="call__who">
                  <i />
                  <i />
                  <span>
                    <PhoneIcon />
                  </span>
                </div>
                <b>New customer</b>
                <p>calling {shown}</p>
                <div className="call__btns">
                  <span className="call__no">
                    <PhoneIcon />
                  </span>
                  <span className="call__yes">
                    <PhoneIcon />
                  </span>
                </div>
              </div>
            </div>

            <div className="float float--review">
              <span className="float__eg">{story.example}</span>
              <Stars />
              <p>“{trade.review}”</p>
            </div>
            <div className="float float--pin">
              <Pin /> On the map
            </div>
            <div className="float float--post">
              <div className="post__img">
                <Heart />
              </div>
              <p>
                <b>{shown}</b> {trade.post}
              </p>
            </div>
            <div className="float float--ad">
              <span className="ad__tag">Ad</span>
              <p>
                <b>{trade.ad}</b> Call {shown}.
              </p>
            </div>
            <span className="toast toast--l">
              <i />
              New 5-star review
            </span>
            <span className="toast toast--r">
              <i />
              New quote request
            </span>
          </div>

          <div className="story__bars" aria-hidden="true">
            {story.steps.map((step, i) => (
              <i key={step.title} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
          <a className="btn btn--dark story__cta" href="#contact">
            {story.cta} <Arrow size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}
