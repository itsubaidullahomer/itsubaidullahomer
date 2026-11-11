import { InkFilter } from "@/components/InkFilter";
import { Label } from "@/components/Label";
import { Archive, Parcels } from "@/components/Parcels";
import { Faq, Footer, Handling, Pickup, Services, Statement, Tracking } from "@/components/Sections";
import { Sender } from "@/components/Sender";
import { Tape } from "@/components/Tape";
import { Voyage } from "@/components/Voyage";

export default function Home() {
  return (
    <>
      <InkFilter />
      <div className="progress" aria-hidden />
      <Voyage>
        <Label />
      </Voyage>
      <main id="main">
        <Parcels />
        <Archive />
        <Statement />
        <Tape words={["Fragile", "Handle with care", "This side up", "Shipped, not just built"]} />
        <Sender />
        <Tracking />
        <Tape words={["Tested", "Deployed", "Monitored", "Still running"]} className="tape--ink" />
        <Handling />
        <Services />
        <Faq />
        <Pickup />
      </main>
      <Footer />
    </>
  );
}
