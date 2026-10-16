import { ArrowUpRight } from "lucide-react";
import { PageIntro, Section } from "@/components/layout-parts";
import { BookButton, CopyEmail } from "@/components/providers";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Contact",
  "Book a call or email Ubaidullah Omer about freelance AI and product engineering.",
  "/contact",
);
export default function Contact() {
  return (
    <>
      <PageIntro
        label="Let’s talk"
        title="Tell me what you’re building."
        description="An idea on a napkin, a product with growing pains, or one stubborn feature. A little context is all we need to start."
      />
      <Section>
        <div className="contact-grid">
          <article className="contact-card">
            <h2>A conversation first.</h2>
            <p>
              We’ll talk through the problem, the shape of the work, and whether
              I’m the right person to help.
            </p>
            <BookButton>
              Book a call <ArrowUpRight size={16} />
            </BookButton>
          </article>
          <article className="contact-card">
            <h2>More of an email person?</h2>
            <p>
              Send a few lines about the product, what you need, and any
              timeline you’re working toward.
            </p>
            <div className="button-row">
              <CopyEmail />
              <a href={`mailto:${site.email}`} className="text-link">
                Write an email <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="mono">{site.email}</p>
          </article>
        </div>
        <p className="heatmap-note mt-8">
          Based in Rahim Yar Khan, Pakistan (UTC+5). Working remotely with teams
          in Europe and beyond.
        </p>
      </Section>
    </>
  );
}
