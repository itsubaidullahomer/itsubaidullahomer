import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { studio } from "@/content/studio";
import { OPENING } from "@/lib/opening";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/sections.css";
import "./styles/art.css";
import "./styles/work.css";
import "./styles/loader.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// The serif is only ever used in italics, and never in the first screen: it is not preloaded, so it does
// not compete with the type and the portrait on a slow connection.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

const title = `${studio.name} — ${studio.title}`;



export const metadata: Metadata = {
  metadataBase: new URL(studio.url),
  title: { default: title, template: `%s — ${studio.name}` },
  description: studio.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: studio.name,
    title,
    description: studio.description,
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        {/* Before anything paints: the opening curtain, the sound downloads, and #anchor links (lib/opening.ts). */}
        <script dangerouslySetInnerHTML={{ __html: OPENING }} />
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": `${studio.url}/#person`,
                  name: studio.fullName,
                  alternateName: studio.name,
                  url: studio.url,
                  image: `${studio.url}/images/me/ubaid.jpg`,
                  sameAs: [...Object.values(studio.social), studio.engineerUrl],
                },
                {
                  "@type": "ProfessionalService",
                  "@id": `${studio.url}/#service`,
                  name: studio.name,
                  url: studio.url,
                  description: studio.description,
                  email: studio.email,
                  image: `${studio.url}/images/me/ubaid.jpg`,
                  founder: { "@id": `${studio.url}/#person` },
                  serviceType: ["Web design", "Local SEO", "Social media management", "Online advertising", "Branding"],
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
