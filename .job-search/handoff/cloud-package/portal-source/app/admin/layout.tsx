import type { Metadata } from "next";
import "./jobs.css";
export const metadata: Metadata = {
  title: "Opportunity desk",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
