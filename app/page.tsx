import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/layout-parts";
import { LogoStrip, Testimonials } from "@/components/home-extras";
import { BuildScene } from "@/components/home/build-scene";
import { Hero } from "@/components/home/hero";
import { Band, Experience, Hire, Principles, Statement, Writing } from "@/components/home/sections";
import { Reveals } from "@/components/home/track";
import { WorkStack } from "@/components/home/work-stack";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <Reveals />
      <Hero />
      <LogoStrip />
      <BuildScene />
      <Section id="work" className="hx-worksec">
        <SectionHeading
          title="Real products. Real people using them."
          description="A few things I’ve built, rebuilt, and stayed around to make better."
        >
          <Link className="text-link" href="/work">
            All work <ArrowUpRight size={15} />
          </Link>
        </SectionHeading>
        <WorkStack />
      </Section>
      <Band />
      <Statement />
      <Experience />
      <Principles />
      <Testimonials />
      <Writing />
      <Hire />
    </>
  );
}
