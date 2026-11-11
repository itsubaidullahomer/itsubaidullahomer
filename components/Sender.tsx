import Image from "next/image";
import { declaration, site, stats } from "@/content/site";
import { Barcode } from "./Codes";
import { ArrowUpRight } from "./Icons";

export function Sender() {
  return (
    <section className="sec sec--paper sender" id="sender" aria-labelledby="sender-title">
      <div className="wrap sender__grid">
        <div className="sender__badge">
          <div className="badge">
            <span className="badge__strap" aria-hidden />
            <span className="badge__clip" aria-hidden />
            <div className="badge__card">
              <div className="badge__head">
                <span className="stencil">Courier ID</span>
                <span className="mono">No. 2022-PK</span>
              </div>
              <div className="badge__photo">
                <Image
                  src="/me/ubaid.jpg"
                  alt={`Portrait of ${site.name}`}
                  width={900}
                  height={976}
                  sizes="(max-width: 900px) 80vw, 380px"
                />
              </div>
              <div className="badge__body">
                <strong className="display">{site.name}</strong>
                <span className="mono">{site.role} · since 2022</span>
                <dl>
                  <div>
                    <dt className="field">Depot</dt>
                    <dd>{site.location}</dd>
                  </div>
                  <div>
                    <dt className="field">Cleared for</dt>
                    <dd>Web · Mobile · AI</dd>
                  </div>
                </dl>
                <Barcode value="UBAID-2022" />
              </div>
            </div>
            <span className="sticker badge__sticker" aria-hidden>
              Real
              <br />
              human
            </span>
          </div>
        </div>

        <div className="sender__copy">
          <p className="kicker">02 — The sender</p>
          <h2 className="display h2" id="sender-title">
            One developer.
            <br />
            The whole delivery.
          </h2>
          <p className="lead">
            I&rsquo;m Ubaidullah Omer. Ubaid is fine. I build websites and products from a small city in
            Pakistan, for people a long way from here.
          </p>
          <div className="sender__prose">
            <p>
              I&rsquo;m self-taught. I started as a junior in 2022, building React interfaces for a team in
              Denmark. Then one bug fix at Tututor turned into three rebuilds and the API that now serves
              eight products.
            </p>
            <p>
              Most teams I&rsquo;ve worked with had no designer and no product manager for every feature.
              Usually it was just me. So I think through the flow, build it, ship it, and stay to keep it
              running.
            </p>
          </div>

          <dl className="sender__stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="display">{s.value}</dd>
                <dt className="field">{s.label}</dt>
              </div>
            ))}
          </dl>

          <div className="customs rise">
            <div className="customs__head">
              <span className="stencil">Customs declaration</span>
              <span className="field">CN 22 · contents of this developer</span>
            </div>
            <dl>
              {declaration.map((row, i) => (
                <div key={row.item}>
                  <dt>
                    <span className="mono">{String(i + 1).padStart(2, "0")}</span> {row.item}
                  </dt>
                  <dd>{row.detail}</dd>
                </div>
              ))}
            </dl>
            <div className="customs__foot">
              <p className="field">I certify that the particulars given here are correct.</p>
              <span className="marker customs__sign">Ubaid</span>
            </div>
          </div>

          <div className="sender__links">
            <a className="btn" href={site.cv}>
              Download my CV <ArrowUpRight />
            </a>
            <a className="btn btn--ghost" href={site.social.LinkedIn} target="_blank" rel="noopener noreferrer">
              LinkedIn <ArrowUpRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
