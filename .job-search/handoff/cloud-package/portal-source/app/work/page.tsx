import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageIntro,
  Section,
  Status,
  FinalCTA,
} from "@/components/layout-parts";
import { SelectedWork } from "@/components/work";
import { projects } from "@/content/projects";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Selected work",
  "AI platforms, analytics, web and mobile apps. Nine real products built by Ubaidullah Omer.",
  "/work",
);
export default function Work() {
  return (
    <>
      <PageIntro
        label="Selected work"
        title="Built. Shipped. Still getting better."
        description="Real products, with real people on the other side of the screen. Here’s the work, and the thinking behind it."
      />
      <Section>
        <SelectedWork />
        <div className="archive">
          <h2>More from the archive.</h2>
          {projects.slice(4).map((p) => (
            <Link
              className="archive-link"
              key={p.slug}
              href={`/work/${p.slug}`}
            >
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <Status status={p.status} />
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </Section>
      <FinalCTA />
    </>
  );
}
