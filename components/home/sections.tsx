import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight } from "lucide-react";
import { band, hero, shortVersion, statement, timeline, toolbox } from "@/content/home";
import { posts } from "@/content/posts";
import { principles, site } from "@/content/site";
import { BookButton, CopyEmail } from "../providers";
import { Track } from "./track";

/** Two rows of very large, very pale words that slide in opposite directions as the page scrolls. */
export function Band() {
  const row = [...band, ...band, ...band];
  return (
    <Track mode="view" className="hx-band">
      {[0, 1].map((line) => (
        <p key={line} aria-hidden="true">
          {row.map((text, i) => (
            <span key={i} className={(i + line) % band.length === 4 ? "is-soft" : undefined}>
              {text}
            </span>
          ))}
        </p>
      ))}
      <span className="sr-only">I work across {band.join(", ")}.</span>
    </Track>
  );
}

/** A short bio in large type. Each word comes into focus as it is scrolled through. */
export function Statement() {
  const words = statement.split(" ");
  return (
    <section className="section hx-statement" id="about">
      <span className="eyebrow">In short</span>
      <Track mode="read" className="hx-statement__text">
        <p>
          {words.map((text, i) => (
            <span key={i} style={{ ["--w" as string]: (i / words.length).toFixed(3) }}>
              {text}{" "}
            </span>
          ))}
        </p>
      </Track>
      <Link href="/about" className="text-link">
        A little more about me <ArrowRight size={14} />
      </Link>
    </section>
  );
}

/** Jobs, newest first, on a line that fills as you read down it. */
export function Experience() {
  return (
    <section className="section hx-xp" id="experience">
      <div className="section-heading">
        <div>
          <h2>From the first feature to the whole system.</h2>
          <p>Four years of building, learning, and taking on the next hard thing.</p>
        </div>
        <a className="text-link" href={hero.resume} download>
          Download CV <ArrowDownToLine size={14} />
        </a>
      </div>
      <Track mode="view" className="hx-xp__list">
        <span className="hx-xp__rail" aria-hidden="true" />
        {timeline.map((job) => (
          <article className={`hx-job${job.current ? " is-current" : ""}`} key={job.company} data-reveal>
            <div className="hx-job__when">
              <span className="mono">{job.dates}</span>
              <span>{job.place}</span>
            </div>
            <span className="hx-job__dot" aria-hidden="true" />
            <div className="hx-job__body">
              <h3>
                <Image src={job.logo} alt="" width={26} height={26} />
                {job.company}
              </h3>
              <span className="hx-job__role mono">{job.role}</span>
              <p>{job.text}</p>
              {job.details.length > 0 && (
                <details>
                  <summary>A little more about the work</summary>
                  <ul>
                    {job.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </details>
              )}
              <Link className="text-link" href={job.href}>
                See the work <ArrowRight size={13} />
              </Link>
            </div>
          </article>
        ))}
      </Track>
    </section>
  );
}

/** How I think, and what I build with. */
export function Principles() {
  return (
    <section className="section hx-think">
      <div className="section-heading">
        <div>
          <h2>What I care about when I build.</h2>
          <p>Four things I keep coming back to, and the tools I use to do them.</p>
        </div>
      </div>
      <div className="hx-think__grid">
        {principles.map((principle, i) => (
          <article key={principle.title} data-reveal style={{ ["--n" as string]: i }}>
            <span className="mono">{String(i + 1).padStart(2, "0")}</span>
            <h3>{principle.title}</h3>
            <p>{principle.text}</p>
          </article>
        ))}
      </div>
      <dl className="hx-toolbox" data-reveal>
        {toolbox.map((row) => (
          <div key={row.group}>
            <dt className="mono">{row.group}</dt>
            <dd>
              {row.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const day = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

export function Writing() {
  return (
    <section className="section hx-writing">
      <div className="section-heading">
        <div>
          <h2>Notes from the work.</h2>
        </div>
        <Link className="text-link" href="/writing">
          All writing <ArrowUpRight size={15} />
        </Link>
      </div>
      <ul className="hx-posts">
        {posts.map((post) => (
          <li key={post.slug} data-reveal>
            <Link href={`/writing/${post.slug}`}>
              <span className="mono">
                {day.format(new Date(post.date))} · {post.minutes} min
              </span>
              <strong>{post.title}</strong>
              <span className="hx-posts__text">{post.description}</span>
              <ArrowUpRight size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The close: what someone hiring needs to know, and every way to reach me. */
export function Hire() {
  return (
    <section className="section hx-hire grid-texture" id="contact">
      <div className="hx-hire__lead">
        <span className="eyebrow">Hiring?</span>
        <h2 data-reveal>
          Let’s build
          <br />
          <span className="soft-word">the next one.</span>
        </h2>
        <p>
          If you need an engineer who can own a product from the first sketch to the people using it, I’d like to
          hear about it.
        </p>
        <div className="button-row">
          <a className="button button-primary" href={hero.resume} download>
            Download CV <ArrowDownToLine size={14} />
          </a>
          <CopyEmail />
          <BookButton variant="secondary">
            Book a call <ArrowUpRight size={14} />
          </BookButton>
        </div>
      </div>

      <div className="hx-short" data-reveal>
        <div className="hx-short__head">
          <Image src="/images/ubaid-portrait.jpg" alt="" width={80} height={87} />
          <div>
            <strong>{site.name}</strong>
            <span className="mono">The short version</span>
          </div>
        </div>
        <dl>
          {shortVersion.map(([label, value]) => (
            <div key={label}>
              <dt className="mono">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="hx-short__links">
          <a href={`mailto:${site.email}`}>
            {site.email} <ArrowUpRight size={13} />
          </a>
          {Object.entries(site.social)
            .filter(([name]) => name !== "Instagram")
            .map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer">
                {name} <ArrowUpRight size={13} />
              </a>
            ))}
        </div>
      </div>

      <p className="hx-hire__note mono">
        Also open to a few freelance projects. <Link href="/freelance">How that works</Link>
      </p>
    </section>
  );
}
