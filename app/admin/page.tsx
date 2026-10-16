import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, ArrowRight, ShieldCheck } from "lucide-react";
import JobPortal from "@/components/jobs/portal";
import { getPortalSession, loadWorkspace } from "@/lib/jobs/server";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const session = await getPortalSession();
  if (!session.configured)
    return (
      <main id="main" className="jp-shell jp-setup">
        <section className="jp-setup-card">
          <div className="jp-brand">
            <span className="jp-brand-icon">
              <Compass size={22} />
            </span>
            <span>
              opportunity<span>Ubaid’s career workspace</span>
            </span>
          </div>
          <div className="jp-eyebrow">YOUR PRIVATE WORKSPACE</div>
          <h1>A better search starts here.</h1>
          <p>
            The portal is built around strong-fit opportunities, evidence from
            your work, and a complete application history. Private cloud access
            needs to be configured before real records can be stored.
          </p>
          <ul>
            <li>
              Connect the dedicated Supabase project and apply its database
              schema.
            </li>
            <li>Provision your sign-in and restrict access to your account.</li>
            <li>
              Connect the dedicated Gmail inbox when its OAuth setup is ready.
            </li>
          </ul>
          <div className="jp-callout">
            <ShieldCheck size={19} />
            <p>
              The workspace stays closed until private access is configured.
              Nothing has been applied for or sent.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="jp-action-row">
              <Link className="jp-button jp-primary" href="/admin/preview">
                Explore the interactive preview <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </main>
    );
  if (!session.authenticated) redirect("/admin/login");
  return <JobPortal initial={await loadWorkspace()} />;
}
