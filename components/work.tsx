"use client";
import Image from "next/image";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, ArrowRight, Expand, X } from "lucide-react";
import { projects, type Project } from "@/content/projects";
import { Spotlight, Parallax } from "./motion";
import { Status } from "./layout-parts";
import { CompareSlider } from "./compare-slider";
const views = [
  {
    name: "AI toolkit",
    image: "/images/tututor/showcase/tututor-catalog.jpg",
    alt: "Tututor’s AI tools catalog, organized around lesson preparation",
  },
  {
    name: "AI editor",
    image: "/images/tututor/showcase/tututor-editor-ai.jpg",
    alt: "Tututor’s document editor with contextual AI actions",
  },
  {
    name: "Mobile apps",
    image: "/images/tututor/journey/native-concepts.jpg",
    alt: "Tututor mobile app concepts for families",
  },
];
export function TututorShowcase() {
  return (
    <Tabs.Root defaultValue="ai-toolkit" className="showcase">
      <Tabs.List className="showcase-tabs" aria-label="Tututor product views">
        {views.map((v) => (
          <Tabs.Trigger
            key={v.name}
            value={v.name.toLowerCase().replaceAll(" ", "-")}
            className="showcase-tab"
          >
            {v.name}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {views.map((v) => (
        <Tabs.Content
          key={v.name}
          value={v.name.toLowerCase().replaceAll(" ", "-")}
        >
          <Parallax className="showcase-shot">
            <Image
              src={v.image}
              alt={v.alt}
              fill
              sizes="(max-width: 768px) 85vw, 1000px"
            />
          </Parallax>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Spotlight id={`project-${p.slug}`}>
      <Link href={`/work/${p.slug}`} aria-label={`View ${p.name} case study`}>
        <div className="project-visual">
          <div className="image-frame">
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
          <div className="work-tags">
            {p.stack.slice(0, 3).map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
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
    <>
      <Spotlight className="work-feature" id="project-tututor">
        <div className="work-card-copy">
          <div>
            <Status status="Live" />
            <h3>
              <Link href="/work/tututor">
                A small tool. Then a whole school platform.
              </Link>
            </h3>
            <p>
              As Tututor grew, I built a shared backend for eight products and
              brought AI into the document editor, where teachers could use it
              in their work. Those decisions helped a small teaching tool grow
              into a platform for 20k+ students, teachers and families.
            </p>
            <div className="work-tags">
              <span>Lead engineer</span>
              <span>AI + web + mobile</span>
              <span>2023 — present</span>
            </div>
          </div>
          <Link href="/work/tututor" className="text-link">
            The full story <ArrowUpRight size={16} />
          </Link>
        </div>
        <TututorShowcase />
      </Spotlight>
      <div className="work-grid">
        {projects.slice(1, 3).map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
      <Spotlight className="compare-card" id="project-ali-foodies">
        <div className="work-card-copy">
          <Status status="Building" />
          <h3>
            Ali Foodies.
            <br />
            Made for the phone.
          </h3>
          <p>
            Ali Foodies is a small, straightforward website rebuild. I included
            it here because the care is in the decisions: understanding what
            customers need, designing a clearer experience, and building every
            detail to support it.
          </p>
          <ul className="compare-improvements">
            <li>Ordering, front and center.</li>
            <li>A menu made for thumbs.</li>
            <li>Hours and location in easy reach.</li>
          </ul>
          <Link href="/work/ali-foodies" className="text-link">
            Explore the redesign <ArrowRight size={15} />
          </Link>
        </div>
        <CompareSlider />
      </Spotlight>
    </>
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
