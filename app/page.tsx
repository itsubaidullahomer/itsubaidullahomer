import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, ArrowRight, Mic } from "lucide-react";
import { HeroWords, Parallax } from "@/components/motion";
import { Avatar } from "@/components/avatar";
import { BookButton, TalkButton } from "@/components/providers";
import { Section, SectionHeading, FinalCTA } from "@/components/layout-parts";
import {
  LogoStrip,
  Services,
  Pricing,
  FAQ,
  Testimonials,
} from "@/components/home-extras";
import { Process } from "@/components/process";
import { SelectedWork } from "@/components/work";
import { experience } from "@/content/site";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <Section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i className="status-dot" /> AI Product Engineer · Available for
            select work
          </span>
          <HeroWords />
          <p>
            I’m Ubaid. The engineer behind <strong>Tututor.ai</strong> — eight
            products on one backend, used by{" "}
            <strong>20k+ students, teachers and families.</strong>
            <br />I can help you build your next one.
          </p>
          <div className="button-row">
            <TalkButton>
              <Mic size={14} /> Talk to me
            </TalkButton>
            <Link href="#work" className="button button-secondary">
              See the work <ArrowDown size={14} />
            </Link>
          </div>
          <div className="hero-person">
            <Image src="/images/avatar.png" alt="" width={34} height={34} />
            <div>
              <BookButton variant="ghost">
                Prefer the real me? Book a call <ArrowUpRight size={12} />
              </BookButton>
              <span>No pitch deck required.</span>
            </div>
          </div>
        </div>
        <div className="hero-stage">
          <div className="back-screen">
            <Parallax>
              <Image
                src="/images/tututor/showcase/tututor-catalog.jpg"
                alt=""
                width={450}
                height={280}
                sizes="(max-width: 540px) 300px, 450px"
                loading="eager"
                fetchPriority="high"
              />
            </Parallax>
          </div>
          <div className="back-screen second">
            <Image
              src="/images/screens/viloi.jpg"
              alt=""
              width={450}
              height={280}
              sizes="(max-width: 540px) 280px, 420px"
              loading="eager"
            />
          </div>
          <Avatar />
          <span className="stage-note">
            <Mic size={10} /> Real-time conversation. A very unreal me.
          </span>
        </div>
      </Section>
      <LogoStrip />
      <Process />
      <Section id="work">
        <SectionHeading
          title="Real products. Real people using them."
          description="A few things I’ve built, rebuilt, and stayed around to make better."
        >
          <Link className="text-link" href="/work">
            All work <ArrowUpRight size={15} />
          </Link>
        </SectionHeading>
        <SelectedWork />
      </Section>
      <Services />
      <Section>
        <SectionHeading
          title="From the first feature to the whole system."
          description="Four years of building, learning, and taking on the next hard thing."
        />
        <div className="experience-list">
          {experience.map((e) => (
            <article className="experience-item" key={e.company}>
              <div className="experience-date">
                {e.dates}
                <span>{e.place}</span>
              </div>
              <div>
                <h3>{e.company}</h3>
                <span className="role">{e.role}</span>
                <p>{e.text}</p>
                <details>
                  <summary>A little more about the work</summary>
                  <ul>
                    {e.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </article>
          ))}
        </div>
        <Link href="/about" className="text-link mt-7">
          A little more about me <ArrowRight size={14} />
        </Link>
      </Section>
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
