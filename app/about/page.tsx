import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import {
  PageIntro,
  Section,
  SectionHeading,
  FinalCTA,
} from "@/components/layout-parts";
import { BookButton } from "@/components/providers";
import { principles, stack } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "About",
  "Self-taught engineer in Rahim Yar Khan, Pakistan. From junior developer to leading the architecture behind Tututor.ai.",
  "/about",
);
export default function About() {
  return (
    <>
      <PageIntro
        label="A little about me"
        title="An engineer who thinks about the whole thing."
        description="I’m Ubaidullah Omer. Ubaid is fine. I build AI products from a small city in Pakistan, for people a long way from here."
      />
      <Section className="about-grid">
        <div className="prose">
          <h2>I learned by building.</h2>
          <p>
            I’m self-taught. I started as a junior at Danzee Tech in 2022,
            building React interfaces for a team in Denmark. Over two years, I
            became the person teammates came to for help, and the one who picked
            up the next unfamiliar feature.
          </p>
          <p>
            Most of those startups didn’t have a designer, a product manager and
            an engineer for every feature. Usually it was just me. That taught
            me to think beyond the code.
          </p>
          <h2>One bug changed the scope.</h2>
          <p>
            Tututor came to me as someone else’s Next.js app with a problem to
            fix. I rebuilt it three times, learned backend engineering along the
            way, and wrote the API that now serves eight products.
          </p>
          <p>
            Today, more than 20,000 students, teachers and families in Murcia,
            Spain use the platform. There are three mobile apps in both stores,
            a teacher toolkit, and the systems a school needs to get through its
            day.
          </p>
          <p>
            I led a small team of junior developers and taught the founder to
            code. His first changes were a few words of Spanish. Now he ships
            complete features. The two of us run the product together.
          </p>
          <Link href="/writing/i-taught-my-client-to-code">
            I wrote about that here →
          </Link>
          <h2>The work around the model.</h2>
          <p>
            I sketch the data model before the screen. I think about what
            happens when the AI call fails before I write the prompt. It mostly
            means fewer rewrites later.
          </p>
          <p>
            Alongside Tututor, I’ve built contract and side projects, including
            the analytics platform now called Illume. That work helped the
            company raise $250k. I take on select freelance product and AI work,
            from complete builds to difficult features inside an existing app.
          </p>
          <div className="button-row">
            <a
              href="/Ubaidullah-CV.pdf"
              download
              className="button button-secondary"
            >
              Download my CV <ArrowDownToLine size={15} />
            </a>
            <BookButton>
              Let’s talk <ArrowUpRight size={15} />
            </BookButton>
          </div>
        </div>
        <aside className="about-photo">
          <Image
            src="/images/ubaid-portrait.jpg"
            alt="Ubaidullah Omer"
            width={500}
            height={600}
            sizes="(max-width: 800px) 85vw, 400px"
            priority
          />
          <p>
            Rahim Yar Khan, Pakistan
            <br />
            Working remotely since 2022.
          </p>
        </aside>
      </Section>
      <Section>
        <SectionHeading title="A few things I keep coming back to." />
        <div className="principles">
          {principles.map((p) => (
            <article key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section>
        <SectionHeading
          title="The tools follow the problem."
          description="A familiar stack helps me move quickly. The product decides what belongs."
        />
        <div className="stack-list">
          {stack.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </Section>
      <FinalCTA />
    </>
  );
}
