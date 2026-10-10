import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/shell";
import { Footer } from "@/components/layout-parts";
import { site } from "@/content/site";
import "./globals.css";
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Ubaidullah Omer — AI Product Engineer",
    template: "%s — Ubaidullah Omer",
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Ubaidullah Omer — AI Product Engineer",
    description: site.description,
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <div className="page-frame">
            <Navbar />
            <main id="main">{children}</main>
            <Footer />
          </div>
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": `${site.url}/#person`,
                  name: site.name,
                  url: site.url,
                  jobTitle: site.role,
                  image: `${site.url}/images/ubaid-portrait.jpg`,
                  sameAs: Object.values(site.social),
                  worksFor: { "@type": "Organization", name: "Tututor.ai" },
                },
                {
                  "@type": "ProfessionalService",
                  name: site.name,
                  url: site.url,
                  description: site.description,
                  email: site.email,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: "Rahim Yar Khan",
                    addressCountry: "PK",
                  },
                  provider: { "@id": `${site.url}/#person` },
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
