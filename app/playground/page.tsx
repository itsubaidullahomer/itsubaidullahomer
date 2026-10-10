import { PageIntro, Section, FinalCTA } from "@/components/layout-parts";
import {
  StreamingLab,
  VoiceLab,
  ArchitectureLab,
} from "@/components/playground";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Experiments",
  "Interactive streaming, voice interruption and system architecture experiments. Try the engineering behind Ubaid’s work.",
  "/playground",
);
export default function Playground() {
  return (
    <>
      <PageIntro
        label="Experiments"
        title="A few things worth playing with."
        description="Small experiments in the details that make a product feel good. Break a stream. Interrupt a call. Follow a request. Everything here runs locally in your browser."
      />
      <Section>
        <div className="lab-grid">
          <StreamingLab />
          <VoiceLab />
          <ArchitectureLab />
        </div>
      </Section>
      <FinalCTA />
    </>
  );
}
