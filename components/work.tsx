"use client";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Expand, X } from "lucide-react";
import { projects, type Project } from "@/content/projects";
import { Spotlight } from "./motion";
import { Status } from "./layout-parts";
export { TututorShowcase } from "./tututor-showcase";

export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Spotlight id={`project-${p.slug}`}>
      <Link href={`/work/${p.slug}`} aria-label={`View ${p.name} case study`}>
        <div className="project-visual">
          <div
            className={`image-frame${p.device === "phone" ? " is-phone" : ""}`}
          >
            <Image
              src={p.image}
              alt={`${p.name} product screenshot`}
              fill
              sizes="(max-width: 540px) 90vw, 500px"
            />
          </div>
        </div>
      </Link>
      <div className="work-card-copy">
        <div>
          <Status status={p.status} />
          <h3>
            <Link href={`/work/${p.slug}`}>{p.name}</Link>
          </h3>
          <p>{p.description}</p>
          {p.stack.length > 0 && (
            <div className="work-tags">
              {p.stack.slice(0, 3).map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/work/${p.slug}`}
          className="work-arrow"
          aria-label={`Read the ${p.name} case study`}
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </Spotlight>
  );
}
export function SelectedWork() {
  return (
    <div className="work-grid">
      {projects.slice(0, 4).map((p) => (
        <ProjectCard key={p.slug} project={p} />
      ))}
    </div>
  );
}
export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="case-image">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 1080px"
          priority
        />
        <span className="image-zoom-hint">
          <Expand size={13} /> Explore screenshot
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content image-dialog">
          <Dialog.Title>{alt}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Expanded product screenshot. Scroll to explore. Press Escape to
            close.
          </Dialog.Description>
          <Dialog.Close className="dialog-close" aria-label="Close screenshot">
            <X size={17} />
          </Dialog.Close>
          <Image
            src={src}
            alt={alt}
            width={1800}
            height={1200}
            sizes="95vw"
            className="zoom-image"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
