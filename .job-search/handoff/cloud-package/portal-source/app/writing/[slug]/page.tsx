import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { posts } from "@/content/posts";
import { Section, FinalCTA } from "@/components/layout-parts";
import { getContent, Article } from "@/lib/mdx";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/content/site";
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = posts.find((p) => p.slug === slug);
  return p ? pageMetadata(p.title, p.description, `/writing/${slug}`) : {};
}
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = posts.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <>
      <Section className="case-hero">
        <Link href="/writing" className="text-link">
          <ArrowLeft size={14} /> All writing
        </Link>
        <h1>{p.title}</h1>
        <p>{p.description}</p>
        <div className="case-meta">
          <time dateTime={p.date}>
            {new Date(p.date + "T12:00:00Z").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
          <span>{p.minutes} min read</span>
        </div>
      </Section>
      <Section>
        <article className="article-body">
          <Article source={await getContent("writing", slug)} />
        </article>
      </Section>
      <FinalCTA />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            author: {
              "@type": "Person",
              name: site.name,
              url: `${site.url}/about`,
            },
            url: `${site.url}/writing/${slug}`,
          }),
        }}
      />
    </>
  );
}
