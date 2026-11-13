import { FinalCTA, PageIntro } from "@/components/layout-parts";
import { FAQ, Pricing, Services } from "@/components/home-extras";
import { Process } from "@/components/process";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Freelance",
  "Freelance AI and product engineering with Ubaidullah Omer: what I build, how we work together, and how a project is scoped.",
  "/freelance",
);

/** Everything for someone who wants to hire me for a project rather than a role. */
export default function Freelance() {
  return (
    <>
      <PageIntro
        label="Freelance work"
        title="Work with me on a project."
        description="A focused build, or someone in your corner for the long run."
      />
      <Services />
      <Process />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
