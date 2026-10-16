import type { Metadata } from "next";
import AvatarIdentityLab from "@/components/avatar-identity-lab";
import "./avatar-identity-lab.css";

export const metadata: Metadata = {
  title: "Head fitting study — Ubaidullah Omer",
  description:
    "Local inspection of the photo-fitted head geometry and facial shapes.",
  robots: { index: false, follow: false },
};

export default function AvatarIdentityLabPage() {
  return <AvatarIdentityLab />;
}
