import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Big_Shoulders,
  Big_Shoulders_Stencil,
  IBM_Plex_Mono,
  Permanent_Marker,
} from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

// Display: tall industrial caps, the kind printed on crates and freight cars.
const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  adjustFontFallback: false,
});
const stencil = Big_Shoulders_Stencil({
  variable: "--font-stencil",
  subsets: ["latin"],
  weight: ["800"],
  adjustFontFallback: false,
});
const body = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const marker = Permanent_Marker({
  variable: "--font-marker",
  subsets: ["latin"],
  weight: "400",
});

// Search engines are let in only on the production deployment of the real domain.
// Previews, and a project that has no custom domain yet, stay out of the index.
const launched =
  process.env.VERCEL_ENV === "production" &&
  process.env.VERCEL_PROJECT_PRODUCTION_URL === new URL(site.url).host;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  alternates: { canonical: "/" },
  robots: launched ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    title: site.title,
    description: site.description,
    siteName: site.name,
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
};

export const viewport: Viewport = { themeColor: "#c7a377" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${stencil.variable} ${body.variable} ${mono.variable} ${marker.variable}`}
    >
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
