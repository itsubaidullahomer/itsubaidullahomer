"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { featured } from "@/content/home";
import { projects } from "@/content/projects";
import { Status } from "../layout-parts";
import { prefersReducedMotion } from "./track";

const picks = projects.filter((project) => project.slug in featured);
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * The featured projects as a pile of cards. Each one sticks near the top of the screen and the
 * next slides over it. A card being covered steps back and loses its colour, and a long screenshot
 * inside it scrolls on (--c, 0 → 1). On small screens and with reduced motion they are a plain list.
 */
export function WorkStack() {
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = list.current;
    if (!root || prefersReducedMotion()) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".hx-proj"));
    let frame = 0;
    const paint = () => {
      frame = 0;
      const boxes = cards.map((card) => card.getBoundingClientRect());
      cards.forEach((card, i) => {
        const box = boxes[i];
        const next = boxes[i + 1];
        const covered = next ? clamp((box.bottom - next.top) / box.height) : 0;
        card.style.setProperty("--c", covered.toFixed(4));
      });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    root.dataset.live = "1";
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hx-work" ref={list}>
      {picks.map((project, i) => {
        const look = featured[project.slug];
        const phone = project.device === "phone";
        return (
          <article
            className="hx-proj"
            key={project.slug}
            id={`project-${project.slug}`}
            style={{ ["--i" as string]: i, ["--tint" as string]: look.tint }}
          >
            <div className="hx-proj__card">
              <div className="hx-proj__copy">
                <div className="hx-proj__meta mono">
                  <span>
                    {String(i + 1).padStart(2, "0")} / {String(picks.length).padStart(2, "0")}
                  </span>
                  <Status status={project.status} />
                </div>
                <h3>
                  <Link href={`/work/${project.slug}`}>{project.name}</Link>
                </h3>
                <p>{project.description}</p>
                <dl>
                  <div>
                    <dt className="mono">Role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt className="mono">When</dt>
                    <dd>{project.dates}</dd>
                  </div>
                </dl>
                {project.stack.length > 0 && (
                  <ul className="hx-tags mono">
                    {project.stack.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                <div className="hx-proj__links">
                  <Link className="button button-primary" href={`/work/${project.slug}`}>
                    Read the case study <ArrowRight size={14} />
                  </Link>
                  {project.url && (
                    <a className="text-link" href={project.url} target="_blank" rel="noreferrer">
                      {host(project.url)} <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </div>

              <Link
                className={`hx-proj__visual${phone ? " is-phone" : ""}${look.pan ? " is-pan" : ""}`}
                href={`/work/${project.slug}`}
                aria-label={`Open the ${project.name} case study`}
                tabIndex={-1}
              >
                <span className="hx-frame">
                  {!phone && (
                    <span className="hx-frame__bar" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      {project.url && <span className="mono">{host(project.url)}</span>}
                    </span>
                  )}
                  <span className="hx-frame__shot">
                    <Image
                      src={look.image ?? project.image}
                      alt={`${project.name}, a screen from the product`}
                      fill
                      sizes={phone ? "260px" : "(max-width: 900px) 90vw, 620px"}
                    />
                  </span>
                </span>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
