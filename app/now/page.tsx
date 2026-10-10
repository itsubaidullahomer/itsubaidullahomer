import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageIntro,
  Section,
  SectionHeading,
  Status,
  FinalCTA,
} from "@/components/layout-parts";
import { Spotlight } from "@/components/motion";
import { now } from "@/content/now";
import { getContributions } from "@/lib/github";
import { pageMetadata } from "@/lib/metadata";
export const revalidate = 86400;
export const metadata = pageMetadata(
  "Now",
  "What Ubaidullah Omer is building, learning and exploring right now.",
  "/now",
);
export default async function Now() {
  const activity = await getContributions();
  const weeks = Array.from(
    { length: Math.ceil(activity.days.length / 7) },
    (_, i) => activity.days.slice(i * 7, i * 7 + 7),
  );
  return (
    <>
      <PageIntro
        label="Now"
        title="A little closer to the work."
        description="What’s on my desk, what I’m figuring out, and what I keep coming back to."
      >
        <p className="mono">
          Content last updated{" "}
          {new Date(now.updated + "T12:00:00Z").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </PageIntro>
      <Section>
        <SectionHeading title="On the workbench." />
        <div className="now-grid">
          {now.building.map((p) => (
            <Spotlight className="now-card" key={p.name}>
              <div>
                <Status status={p.status} />
                <h3>
                  <Link href={p.href}>{p.name}</Link>
                </h3>
              </div>
              <p>{p.text}</p>
              <Link href={p.href} aria-label={`Explore ${p.name}`}>
                <ArrowUpRight size={18} />
              </Link>
            </Spotlight>
          ))}
        </div>
      </Section>
      <Section>
        <SectionHeading
          title="The work leaves a trail."
          description="Most of my commits live in Tututor’s private GitLab repositories. Here is the public GitHub side."
        >
          <a
            href="https://github.com/itsubaidullahomer"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            On GitHub <ArrowUpRight size={14} />
          </a>
        </SectionHeading>
        {activity.complete && (
          <div
            className="heatmap"
            role="img"
            aria-label={`${activity.days.reduce((s, d) => s + d.count, 0)} GitHub contributions over the past year`}
          >
            {weeks.map((week, i) => (
              <div className="heat-week" key={i}>
                {week.map((d) => (
                  <span
                    className="heat-day"
                    key={d.date}
                    title={`${d.date}: ${d.count} contributions`}
                    style={{
                      background:
                        d.count === 0
                          ? "#f0f0f0"
                          : d.count < 3
                            ? "#d4d4d4"
                            : d.count < 7
                              ? "#a3a3a3"
                              : d.count < 12
                                ? "#737373"
                                : "#404040",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        {!activity.complete && activity.days.length > 0 && (
          <div className="stack-list">
            {activity.days.map((d) => (
              <span key={d.date}>
                {d.date} · {d.count} {d.count === 1 ? "event" : "events"}
              </span>
            ))}
          </div>
        )}
        <p className="heatmap-note">{activity.label}</p>
      </Section>
      <Section>
        <SectionHeading title="Still a student." />
        <div className="principles">
          {now.learning.map((text, i) => (
            <article key={text}>
              <h3>
                {i === 0 ? "Streaming & tool use" : "Evals that tell the truth"}
              </h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </Section>
      <FinalCTA />
    </>
  );
}
