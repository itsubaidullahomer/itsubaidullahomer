import { BizProvider } from "./biz";
import { Compare } from "./compare";
import { Contact, Sticky } from "./contact";
import { AnchorFix, Reveals } from "./fx";
import { Bar, Hero, Tapes } from "./hero";
import { Intro } from "./intro";
import { Loader } from "./loader";
import { Band, Faq, Footer, Process, Services } from "./sections";
import { SoundEvents } from "./sound";
import { WorkReel } from "./work";

/** The whole page. `business` is set on a /for/… link and makes the page speak to that business. */
export function Site({ business }: { business?: string | null }) {
  return (
    <BizProvider initialName={business}>
      <Loader business={business} />
      <Reveals />
      <AnchorFix />
      <SoundEvents />
      <Bar />
      <Hero />
      <main id="main">
        <Tapes />
        <Intro />
        <Services />
        <Compare />
        <WorkReel />
        <Band />
        <Process />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <Sticky />
    </BizProvider>
  );
}
