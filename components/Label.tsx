import { nav, site } from "@/content/site";
import { Barcode, Qr } from "./Codes";
import { ArrowDown, ArrowRight, Box, Fragile, KeepDry, Scribble, ThisSideUp } from "./Icons";
import { LiveMetrics, SenderClock, ShipTo } from "./Live";

// The tracking number is this build's commit: every deploy prints a new label.
const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local00").slice(0, 7).toUpperCase();
const tracking = `UO-${sha}-PK`;

export function Label() {
  return (
    <header className="hero">
      <nav className="top wrap" aria-label="Main">
        <a className="top__name" href="#">
          <Box />
          <span>
            <b>{site.name}</b> / {site.role}
          </span>
        </a>
        <ul>
          {nav.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="wrap hero__stage">
        <article className="lbl" aria-label="Shipping label">
          <div className="lbl-top">
            <div className="lbl-cell lbl-from">
              <span className="field">From</span>
              <strong>{site.name}</strong>
              <span>{site.role}</span>
              <span>{site.location}</span>
              <span className="mono lbl-clock">
                <SenderClock /> PKT · UTC+5
              </span>
            </div>
            <div className="lbl-cell lbl-to">
              <span className="field">Ship to</span>
              <strong>You</strong>
              <ShipTo />
            </div>
            <div className="lbl-cell lbl-service" aria-hidden>
              <span className="lbl-service__letter display">W</span>
              <span className="lbl-service__name">
                <b className="display">Web</b>
                <span className="field">Priority</span>
                <span className="field">1 of 1</span>
              </span>
            </div>
          </div>

          <div className="lbl-main">
            <div className="lbl-cell lbl-contents">
              <span className="field">Contents</span>
              <h1 className="display">
                I ship
                <br />
                websites.
              </h1>
              <p className="lbl-sub">
                Websites, web apps and AI products, built end to end and delivered to real people. I lead
                engineering at <b>Tututor.ai</b>: eight products, one backend, <b>20k+ users</b>.
              </p>
              <div className="lbl-cta">
                <a className="btn" href="#pickup">
                  Schedule a pickup <ArrowRight />
                </a>
                <a className="btn btn--ghost" href="#manifest">
                  Open the box <ArrowDown />
                </a>
              </div>
              <span className="stamp lbl-stamp" aria-hidden>
                Shipped
                <small>9 products · since 2022</small>
              </span>
            </div>
            <div className="lbl-cell lbl-live">
              <LiveMetrics />
              <p className="marker lbl-proof">
                real numbers. your browser just measured them.
                <Scribble />
              </p>
            </div>
          </div>

          <div className="lbl-bottom">
            <div className="lbl-cell lbl-barcode">
              <Barcode value={tracking} />
              <span className="mono">
                <span className="field">Tracking no.</span> {tracking}
              </span>
            </div>
            <div className="lbl-cell lbl-marks" aria-hidden>
              <Fragile />
              <ThisSideUp />
              <KeepDry />
            </div>
            <a
              className="lbl-cell lbl-qr"
              href={`mailto:${site.email}?subject=Pickup%20request`}
              aria-label={`Email ${site.email}`}
            >
              <Qr value={`mailto:${site.email}?subject=Pickup%20request`} label="QR code that starts an email to me" />
              <span className="field">
                Scan to
                <br />
                write to me
              </span>
            </a>
          </div>

          <span className="sticker lbl-sticker" aria-hidden>
            Handle with care
          </span>
        </article>
      </div>
    </header>
  );
}
