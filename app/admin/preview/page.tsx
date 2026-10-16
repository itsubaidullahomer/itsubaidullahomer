import { notFound } from "next/navigation";
import JobPortal from "@/components/jobs/portal";
import { demoWorkspace } from "@/lib/jobs/seed";
export const dynamic = "force-dynamic";
export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <JobPortal initial={demoWorkspace()} preview />;
}
