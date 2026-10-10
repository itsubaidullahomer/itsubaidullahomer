import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { projects } from "@/content/projects";
import { Section, Status, FinalCTA } from "@/components/layout-parts";
import { ImageZoom, TututorShowcase } from "@/components/work";
import { CompareSlider } from "@/components/compare-slider";
import { getContent, Article, headings } from "@/lib/mdx";
import { pageMetadata } from "@/lib/metadata";
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  return p ? pageMetadata(p.name, p.description, `/work/${slug}`) : {};
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();
  const p = projects[index];
  const source = await getContent("work", slug);
  return (
    <>
      <Section className="case-hero">
        <Link href="/work" className="text-link">
          <ArrowLeft size={14} /> All work
        </Link>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        <div className="case-meta">
          <Status status={p.status} />
          <span>{p.role}</span>
          <span>{p.dates}</span>
        </div>
        {p.url && (
          <a
            className="text-link"
            href={p.url}
            target="_blank"
            rel="noreferrer"
          >
            Visit {p.name} <ArrowUpRight size={15} />
          </a>
        )}
        {slug === "ali-foodies" ? (
          <div className="mt-8">
            <CompareSlider />
          </div>
        ) : (
          <ImageZoom src={p.image} alt={`${p.name} product screenshot`} />
        )}
      </Section>
      <Section className="case-body">
        <aside className="toc">
          <p>In this story</p>
          {headings(source).map((h) => (
            <a key={h.id} href={`#${h.id}`}>
              {h.title}
            </a>
          ))}
        </aside>
        <Article source={source} />
      </Section>
      {slug === "tututor" && (
        <Section>
          <h2 className="mb-8">A closer look at the product.</h2>
          <TututorShowcase />
        </Section>
      )}
      {p.stack.length > 0 && (
        <Section>
          <h2>Built with.</h2>
          <div className="stack-list">
            {p.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Section>
      )}
      <Section className="case-pagination">
        {index > 0 ? (
          <Link href={`/work/${projects[index - 1].slug}`}>
            <span>← Previous project</span>
            <strong>{projects[index - 1].name}</strong>
          </Link>
        ) : (
          <div />
        )}
        {index < projects.length - 1 ? (
          <Link href={`/work/${projects[index + 1].slug}`}>
            <span>Next project →</span>
            <strong>{projects[index + 1].name}</strong>
          </Link>
        ) : (
          <Link href="/work">
            <span>Back to the collection →</span>
            <strong>All work</strong>
          </Link>
        )}
      </Section>
      <FinalCTA />
    </>
  );
}
