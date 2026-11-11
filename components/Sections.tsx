import { faqs, handling, services, site, tracking } from "@/content/site";
import { Barcode } from "./Codes";
import { ArrowRight, ArrowUpRight, Box, handlingIcon } from "./Icons";
import { PickupForm } from "./PickupForm";

/** One loud sentence between the work and the history. */
export function Statement() {
  return (
    <section className="statement" aria-label="How I work">
      <p className="display statement__text">
        <span>Ship it.</span>
        <span>
          Then <em>keep it</em>
        </span>
        <span>running.</span>
      </p>
      <p className="statement__note">
        I don&rsquo;t hand over a link and disappear. Tututor went through three rebuilds, and I&rsquo;m
        still on it today.
      </p>
    </section>
  );
}

/** Career history, laid out like a courier's tracking page: newest scan first. */
export function Tracking() {
  const stops = [...tracking].reverse();
  const current = tracking.find((event) => event.current) ?? tracking[0];
  return (
    <section className="sec sec--paper track" id="tracking" aria-labelledby="tracking-title">
      <div className="wrap">
        <p className="kicker">03 — Tracking</p>
        <h2 className="display h2" id="tracking-title">
          Tracking history.
        </h2>

        <div className="track__summary rise">
          <div>
            <span className="field">Tracking no.</span>
            <b className="mono">UO-2022-PK</b>
          </div>
          <div>
            <span className="field">Status</span>
            <b className="mono track__live">
              <i aria-hidden />
              {current.status}
            </b>
          </div>
          <div>
            <span className="field">Origin</span>
            <b className="mono">{site.location}</b>
          </div>
          <div>
            <span className="field">Last scan</span>
            <b className="mono">{current.place}</b>
          </div>
          <ol className="track__route" aria-hidden>
            {stops.map((event) => (
              <li key={event.place} className={event.current ? "is-current" : undefined}>
                <i />
                <span className="mono">{event.place.split(" / ")[0].split(",")[0]}</span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="track__log">
          {tracking.map((event) => (
            <li className={`scan${event.current ? " scan--current" : ""}`} key={event.place}>
              <div className="scan__when">
                <span className="mono">{event.date}</span>
                <span className="field">{event.where}</span>
              </div>
              <span className="scan__dot" aria-hidden />
              <div className="scan__body">
                <span className="scan__status mono">{event.status}</span>
                <h3 className="display">{event.place}</h3>
                <p className="scan__role">{event.role}</p>
                <p>{event.text}</p>
                {event.details.length > 0 && (
                  <ul>
                    {event.details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The four promises, as the pictogram stickers printed on a crate. */
export function Handling() {
  return (
    <section className="sec sec--blaze handle" id="handling" aria-labelledby="handling-title">
      <div className="wrap">
        <p className="kicker">04 — Handling instructions</p>
        <h2 className="display h2" id="handling-title">
          Handled
          <br />
          with care.
        </h2>

        <ul className="handle__grid">
          {handling.map((item) => {
            const Icon = handlingIcon[item.icon];
            return (
              <li className="mark rise" key={item.mark}>
                <div className="mark__icon">
                  <Icon />
                  <b className="stencil">{item.mark}</b>
                </div>
                <h3 className="display">{item.title}</h3>
                <p>{item.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section className="sec sec--kraft rates" aria-labelledby="rates-title">
      <div className="wrap">
        <header className="rates__head">
          <div>
            <p className="kicker">Service levels</p>
            <h2 className="display h2" id="rates-title">
              Three ways
              <br />
              to send it.
            </h2>
          </div>
          <p className="lead">
            No price list. Tell me what you&rsquo;re shipping, and I&rsquo;ll quote against an agreed scope
            before any work starts.
          </p>
        </header>

        <ul className="rates__grid">
          {services.map((service, i) => (
            <li className="waybill rise" key={service.code}>
              <div className="waybill__top">
                <b className="stencil">{service.code}</b>
                <span>
                  <span className="field">Service {String(i + 1).padStart(2, "0")}</span>
                  <span className="mono">{service.speed}</span>
                </span>
              </div>
              <div className="waybill__body">
                <h3 className="display">{service.name}</h3>
                <p>{service.description}</p>
                <ul>
                  {service.includes.map((line) => (
                    <li key={line}>
                      <Box />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <a className="waybill__cta mono" href="#pickup">
                Book this service <ArrowRight />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="sec sec--paper faq" aria-labelledby="faq-title">
      <div className="wrap faq__grid">
        <header>
          <p className="kicker">Before you sign</p>
          <h2 className="display h2" id="faq-title">
            The small
            <br />
            print.
          </h2>
          <p className="lead">What people ask before we start. If your question isn&rsquo;t here, ask me.</p>
          <a className="btn" href="#pickup">
            Ask me directly <ArrowRight />
          </a>
        </header>
        <div className="faq__list">
          {faqs.map(([question, answer], i) => (
            <details key={question} name="faq">
              <summary>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <span>{question}</span>
                <i aria-hidden />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pickup() {
  return (
    <section className="sec sec--ink pickup" id="pickup" aria-labelledby="pickup-title">
      <div className="wrap">
        <p className="kicker">05 — Pickup</p>
        <h2 className="display pickup__title" id="pickup-title">
          Schedule
          <br />a pickup.
        </h2>

        <div className="pickup__grid">
          <div className="pickup__copy">
            <p className="lead">
              Got a website, a product or one difficult feature that needs to ship? Tell me what it is.
              I&rsquo;ll reply with questions, then a scope.
            </p>
            <a className="pickup__mail display" href={`mailto:${site.email}`}>
              {site.email.split("@")[0]}
              <wbr />@{site.email.split("@")[1]}
            </a>
            <ul className="pickup__links mono">
              {Object.entries(site.social).map(([name, href]) => (
                <li key={name}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {name} <ArrowUpRight />
                  </a>
                </li>
              ))}
              <li>
                <a href={site.cv}>
                  CV (PDF) <ArrowUpRight />
                </a>
              </li>
            </ul>
            <p className="marker pickup__note">no agency. no account manager. you get me.</p>
          </div>

          <PickupForm email={site.email} services={services.map((service) => service.name)} />
        </div>
      </div>
    </section>
  );
}

const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local00").slice(0, 7).toUpperCase();

export function Footer() {
  return (
    <footer className="foot">
      <div className="flute" aria-hidden />
      <div className="wrap foot__grid">
        <div className="foot__end">
          <b className="stencil">End of label</b>
          <Barcode value={`UO-${sha}-PK`} />
          <span className="mono">
            UO-{sha}-PK · printed in {site.location}
          </span>
        </div>
        <div className="foot__links">
          <p>
            This is the loud version. The full case studies, the writing and the long answers live on my
            main portfolio.
          </p>
          <a className="btn" href={site.mainSite}>
            itsubaidullahomer.com <ArrowUpRight />
          </a>
        </div>
        <p className="mono foot__legal">
          © {site.name}. Designed and built by me. No box was harmed: it&rsquo;s all CSS.
        </p>
        <a className="mono foot__top" href="#">
          Return to sender ↑
        </a>
      </div>
    </footer>
  );
}
