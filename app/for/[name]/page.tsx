import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Site } from "@/components/site";
import { studio } from "@/content/studio";
import { businessFromSlug } from "@/lib/business";

type Props = { params: Promise<{ name: string }> };

/*
 * Each business's page is built the first time its link is opened and then served from the edge cache
 * like the home page, so the person you sent it to never waits on a server. Opening a link yourself
 * before sending it warms it up.
 */
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** A page made for one business: itsubaidullahomer.com/for/smith-septic. Not for search engines. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const business = businessFromSlug((await params).name);
  return {
    title: business ? `For ${business}` : studio.title,
    alternates: { canonical: "/" },
    robots: { index: false, follow: false },
  };
}

export default async function For({ params }: Props) {
  const business = businessFromSlug((await params).name);
  if (!business) notFound();
  return <Site business={business} />;
}
