import { InkFilter } from "@/components/InkFilter";
import { Label } from "@/components/Label";
import { Archive, Parcels } from "@/components/Parcels";
import { Faq, Footer, Handling, Pickup, Services, Statement, Tracking } from "@/components/Sections";
import { Sender } from "@/components/Sender";
import { Tape } from "@/components/Tape";
import { Unbox } from "@/components/Unbox";

export default function Home() {
  return (
    <>
      <InkFilter />
      <div className="progress" aria-hidden />
      <Label />
      <main id="main">
        <Tape words={["Fragile", "Handle with care", "This side up", "Shipped, not just built"]} />
        <Sender />
        <div className="flute" aria-hidden />
        <Unbox />
        <div className="flute" aria-hidden />
        <Parcels />
        <Archive />
        <Statement />
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
