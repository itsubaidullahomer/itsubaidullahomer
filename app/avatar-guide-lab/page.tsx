import type { Metadata } from "next";
import AvatarGuideLab from "@/components/avatar-guide-lab";
import "./avatar-guide-lab.css";
export const metadata: Metadata = {
  title: "AI Ubaid — Full-body guide lab",
  description: "Development preview of the full-body portfolio guide.",
  robots: { index: false, follow: false },
};
export default function AvatarGuideLabPage() {
  return <AvatarGuideLab />;
}
