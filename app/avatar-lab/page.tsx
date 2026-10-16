import AvatarLab from "@/components/avatar-lab";
import type { Metadata } from "next";
import "./avatar-lab.css";

export const metadata: Metadata = {
  title: "AI Ubaid — Avatar rig preview",
  description:
    "A development preview of Ubaid’s 3D avatar, expressions and audio-timed lip sync.",
  robots: { index: false, follow: false },
};

export default function AvatarLabPage() {
  return <AvatarLab />;
}
