import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowDownToLine } from "lucide-react";
import { hero, stats } from "@/content/home";
import { site } from "@/content/site";
import { DotField } from "./dot-field";
import { CountUp, Track } from "./track";

export function Hero() {
  let word = 0;
  return (
    <section className="section hx-hero">
      <DotField />

      <div className="hx-hero__copy">
        <p className="hx-status mono">
          <i className="status-dot" />
          {hero.status.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </p>
        <h1 className="hx-title" aria-label={hero.title.map((line) => line.join(" ")).join(" ")}>
          {hero.title.map((line, i) => (
            <span className="hx-title__line" key={i} aria-hidden="true">
              {line.map((text) => (
                <span
                  key={text}
                  className={i === hero.softLine ? "soft-word" : undefined}
                  style={{ ["--n" as string]: word++ }}
                >
                  {text}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="hx-lede">
          I’m Ubaid, the lead engineer behind <strong>Tututor.ai</strong>: eight products on one backend, used by{" "}
          <strong>20k+ students, teachers and families</strong>.
        </p>
        <div className="button-row">
          <a className="button button-primary" href={hero.resume} download>
            Download CV <ArrowDownToLine size={14} />
          </a>
          <Link href="#work" className="button button-secondary">
            See the work <ArrowDown size={14} />
          </Link>
        </div>
      </div>

      <Track mode="view" className="hx-hero__stage">
        <figure className="hx-portrait">
          <span className="hx-portrait__photo">
            <Image
              src="/images/ubaid-portrait.jpg"
              alt={site.name}
              fill
              sizes="(max-width: 800px) 70vw, 330px"
              priority
            />
          </span>
          <figcaption>
            <strong>{site.name}</strong>
            <span className="mono">
              {site.role} · {site.location}
            </span>
          </figcaption>
          <i className="hx-crop hx-crop--tl" aria-hidden="true" />
          <i className="hx-crop hx-crop--tr" aria-hidden="true" />
          <i className="hx-crop hx-crop--bl" aria-hidden="true" />
          <i className="hx-crop hx-crop--br" aria-hidden="true" />
        </figure>
        <span className="hx-chip hx-chip--a">
          <Image src="/logos/tututor.png" alt="" width={18} height={18} />
          Lead Engineer, Tututor.ai
        </span>
        <span className="hx-chip hx-chip--b mono">4 yrs · remote</span>
      </Track>

      <dl className="hx-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dd>
              <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            </dd>
            <dt>{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
