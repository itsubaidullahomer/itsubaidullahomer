import { PageIntro, Section, FinalCTA } from "@/components/layout-parts";
import {
  StreamingLab,
  VoiceLab,
  ArchitectureLab,
} from "@/components/playground";
import { Waves, AudioLines, Network, ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Experiments",
  "Interactive streaming, voice interruption and system architecture experiments. Try the engineering behind Ubaid’s work.",
  "/playground",
);
export default function Playground() {
  return (
    <>
      <div className="experiments-page">
        <PageIntro
          label="Experiments"
          title="A few things worth playing with."
          description="Small experiments in the details that make a product feel good. Break a stream. Interrupt a call. Follow a request. Everything here runs locally in your browser."
        >
          <nav className="experiment-index" aria-label="Choose an experiment">
            {[
              {
                href: "#streaming-lab",
                number: "01",
                title: "Break a stream",
                subtitle: "Latency & recovery",
                icon: Waves,
              },
              {
                href: "#voice-lab",
                number: "02",
                title: "Interrupt a call",
                subtitle: "Voice & turn-taking",
                icon: AudioLines,
              },
              {
                href: "#architecture-lab",
                number: "03",
                title: "Follow a request",
                subtitle: "Systems & data",
                icon: Network,
              },
            ].map(({ href, number, title, subtitle, icon: Icon }) => (
              <a key={href} href={href}>
                <span className="experiment-index-icon">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span>
                  <small>
                    {number} / {subtitle}
                  </small>
                  <strong>{title}</strong>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </PageIntro>
        <Section className="experiments-section">
          <div className="lab-grid">
            <StreamingLab />
            <VoiceLab />
            <ArchitectureLab />
          </div>
        </Section>
      </div>
      <FinalCTA />
    </>
  );
}
