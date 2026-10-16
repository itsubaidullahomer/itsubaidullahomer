import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, Section, FinalCTA } from "@/components/layout-parts";
import { posts } from "@/content/posts";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Writing",
  "Notes from building AI products, teaching clients, and keeping real software running.",
  "/writing",
);
export default function Writing() {
  return (
    <>
      <PageIntro
        label="Writing"
        title="Notes from the work."
        description="Things I learned by shipping, getting stuck, and trying again."
      />
      <Section>
        <div className="writing-list">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/writing/${p.slug}`}
              className="post-link"
            >
              <time dateTime={p.date}>
                {new Date(p.date + "T12:00:00Z").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })}{" "}
                · {p.minutes} min
              </time>
              <div>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
      </Section>
      <FinalCTA />
    </>
  );
}
