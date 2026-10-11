import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar } from "./avatar";

const projects = [
  {
    id: "tututor",
    name: "Tututor.ai",
    description: "AI for schools",
    href: "/work/tututor",
    logo: "/logos/tututor.png",
    image: "/images/tututor/showcase/tututor-catalog.jpg",
  },
  {
    id: "viloi",
    name: "Viloi",
    description: "A more human way to write",
    href: "/work/ai-humanizer",
    logo: "/logos/viloi.png",
    image: "/images/screens/viloi.jpg",
  },
];

function ProjectSurface({
  project,
  preview = false,
}: {
  project: (typeof projects)[number];
  preview?: boolean;
}) {
  return (
    <div
      className={`hero-project-surface${preview ? " hero-project-preview" : ""}`}
      aria-hidden={preview || undefined}
    >
      <div className="hero-project-bar">
        <Image src={project.logo} width={24} height={24} alt="" />
        <span className="hero-project-name">
          <strong>{project.name}</strong>
          <span>{project.description}</span>
        </span>
        <ArrowUpRight size={15} aria-hidden="true" />
      </div>
      <div className="hero-project-image">
        <Image
          src={project.image}
          fill
          alt=""
          sizes="(max-width: 540px) 1px, (max-width: 1100px) 340px, 390px"
        />
        <span className="hero-project-action" aria-hidden="true">
          View case study <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
}

export function HeroStage({ available }: { available: boolean }) {
  return (
    <div className="hero-stage">
      <Avatar available={available} />
      {projects.map((project) => (
        <Link
          key={project.id}
          href={project.href}
          className={`hero-project hero-project-${project.id}`}
          aria-label={`Read the ${project.name} case study`}
        >
          <ProjectSurface project={project} />
          {/* A decorative foreground copy can fade across the portrait without a z-index jump. */}
          <ProjectSurface project={project} preview />
        </Link>
      ))}
      <p className="hero-project-hint">Explore the work behind the portrait.</p>
    </div>
  );
}
