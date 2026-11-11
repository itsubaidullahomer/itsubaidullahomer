import Image from "next/image";
import { archive, parcels, site, type Parcel } from "@/content/site";
import { Barcode } from "./Codes";
import { ArrowUpRight } from "./Icons";

const caseStudy = (slug: string) => `${site.mainSite}/work/${slug}`;

function Shot({ parcel }: { parcel: Parcel }) {
  if (parcel.device === "phone") {
    return (
      <figure className="shot shot--phones">
        {parcel.extra && (
          <span className="phone phone--before">
            <Image src={parcel.extra.image} alt={parcel.extra.alt} width={664} height={1380} sizes="220px" />
            <b className="phone__tag mono">Before</b>
          </span>
        )}
        <span className="phone phone--after">
          <Image src={parcel.image} alt={parcel.imageAlt} width={664} height={1380} sizes="280px" />
          <b className="phone__tag mono">After</b>
        </span>
      </figure>
    );
  }
  return (
    <figure className="shot">
      <span className="shot__tape shot__tape--a" aria-hidden />
      <span className="shot__tape shot__tape--b" aria-hidden />
      <span className="shot__frame">
        <span className="shot__bar mono" aria-hidden>
          <i />
          <i />
          <i />
          <span>{parcel.urlLabel}</span>
        </span>
        <Image
          src={parcel.image}
          alt={parcel.imageAlt}
          width={1600}
          height={1000}
          sizes="(max-width: 900px) 92vw, 720px"
        />
      </span>
      {parcel.extra && (
        <span className="phone shot__phone">
          <Image src={parcel.extra.image} alt={parcel.extra.alt} width={720} height={1557} sizes="180px" />
        </span>
      )}
    </figure>
  );
}

function ParcelCard({ parcel, index }: { parcel: Parcel; index: number }) {
  const delivered = parcel.status === "delivered";
  const no = String(index + 1).padStart(2, "0");
  return (
    <article className="parcel" id={`parcel-${parcel.slug}`} aria-labelledby={`parcel-${parcel.slug}-name`}>
      <Shot parcel={parcel} />

      <div className="slip rise">
        <div className="slip__head">
          <span className="field">
            Parcel {no} of {String(parcels.length).padStart(2, "0")}
          </span>
          <span className="sr-only">{delivered ? "Delivered" : "In transit"}</span>
        </div>
        <span className={`stamp slip__stamp${delivered ? "" : " stamp--blue"}`} aria-hidden>
          {delivered ? "Delivered" : "In transit"}
          <small>{delivered ? "signed for by real users" : "rebuild on the road"}</small>
        </span>

        <div className="slip__name">
          <h3 className="display" id={`parcel-${parcel.slug}-name`}>
            {parcel.name}
          </h3>
          <p>{parcel.tagline}</p>
        </div>

        <dl className="slip__rows">
          <div className="slip__row slip__row--wide">
            <dt className="field">Contents</dt>
            <dd>{parcel.contents}</dd>
          </div>
          <div className="slip__row">
            <dt className="field">{delivered ? "Delivered to" : "Addressed to"}</dt>
            <dd>{parcel.deliveredTo}</dd>
          </div>
          <div className="slip__row">
            <dt className="field">Handled by</dt>
            <dd>{parcel.handledBy}</dd>
          </div>
          <div className="slip__row">
            <dt className="field">Dates</dt>
            <dd className="mono">{parcel.dates}</dd>
          </div>
          <div className="slip__row">
            <dt className="field">Route</dt>
            <dd>
              <ul className="route">
                {parcel.route.map((stop) => (
                  <li key={stop}>{stop}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="slip__foot">
          <div className="slip__links">
            <a className="btn" href={parcel.url} target="_blank" rel="noopener noreferrer">
              {delivered ? "Visit" : "Open"} {parcel.urlLabel.toLowerCase()} <ArrowUpRight />
            </a>
            <a className="btn btn--ghost" href={caseStudy(parcel.slug)}>
              Case study <ArrowUpRight />
            </a>
          </div>
          <Barcode value={`UO-${no}-${parcel.slug.toUpperCase()}`} className="slip__code" />
        </div>
      </div>
    </article>
  );
}

export function Parcels() {
  return (
    <section className="sec sec--kraft parcels" aria-labelledby="parcels-title">
      <div className="wrap">
        <header className="parcels__head">
          <p className="kicker">02 — The paperwork</p>
          <h2 className="display h2" id="parcels-title">
            Three delivered.
            <br />
            One on the road.
          </h2>
          <p className="lead">
            Every parcel here is a real product with real people on the other end. Open the live site, or
            read how it was built.
          </p>
        </header>

        <div className="parcels__list">
          {parcels.map((parcel, i) => (
            <ParcelCard parcel={parcel} index={i} key={parcel.slug} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Older shipments, as the lines of a manifest. Each line opens its case study. */
export function Archive() {
  return (
    <section className="sec sec--paper archive" aria-labelledby="archive-title">
      <div className="wrap">
        <header className="archive__head">
          <div>
            <p className="kicker">Earlier shipments</p>
            <h2 className="display h2" id="archive-title">
              Also delivered.
            </h2>
          </div>
          <p className="mono archive__count">
            Lines 05 — {String(parcels.length + archive.length).padStart(2, "0")}
          </p>
        </header>

        <ol className="manifest">
          <li className="manifest__cols field" aria-hidden>
            <span>No.</span>
            <span>Parcel</span>
            <span>Contents</span>
            <span>Handled as</span>
            <span>Dates</span>
            <span>Status</span>
          </li>
          {archive.map((item, i) => (
            <li key={item.slug}>
              <a className="manifest__row" href={caseStudy(item.slug)}>
                <span className="mono manifest__no">{String(parcels.length + i + 1).padStart(2, "0")}</span>
                <strong className="display">{item.name}</strong>
                <span className="manifest__contents">{item.contents}</span>
                <span className="manifest__role">{item.role}</span>
                <span className="mono manifest__dates">{item.dates}</span>
                <span className="mono manifest__status">
                  <i aria-hidden />
                  {item.status}
                </span>
                <span className="manifest__peek" aria-hidden>
                  <Image src={item.image} alt="" width={1200} height={750} sizes="320px" />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
