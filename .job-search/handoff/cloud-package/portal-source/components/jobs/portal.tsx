"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Compass,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  LayoutDashboard,
  List,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
  Columns3,
  Activity as ActivityIcon,
  LogOut,
  Link2,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  GripVertical,
} from "lucide-react";
import type {
  Activity,
  CandidateProfile,
  Fit,
  Job,
  JobStatus,
  Priority,
  Requirement,
  Eligibility,
  JobResearch,
  CompanyContact,
  JobSourceEvidence,
  Workspace,
  WorkspaceAction,
} from "@/lib/jobs/types";
import { FIT_LABELS, STATUS_LABELS } from "@/lib/jobs/types";
import { applyAction, draftApplication, sortJobs } from "@/lib/jobs/domain";
import { parseAction, assertJob, isPublicUrl } from "@/lib/jobs/validation";
import DocumentLibrary from "./documents";
import SubmissionReceipts from "./submissions";

type View =
  | "overview"
  | "jobs"
  | "approvals"
  | "activity"
  | "documents"
  | "profile"
  | "settings";
const navigation = [
  ["jobs", "Pipeline", Columns3],
  ["overview", "Overview", LayoutDashboard],
  ["approvals", "Approval queue", FileCheck2],
  ["documents", "Documents", FileText],
  ["activity", "Activity", ActivityIcon],
  ["profile", "My profile", UserRound],
  ["settings", "Connections", Settings2],
] as const;
const activeStatuses: JobStatus[] = [
  "discovered",
  "shortlisted",
  "drafting",
  "needs_approval",
  "approved",
  "applied",
  "interview",
  "offer",
];
const pipelineStages = Object.keys(STATUS_LABELS) as JobStatus[];
const stageDescriptions: Record<JobStatus, string> = {
  discovered: "Find the possibilities",
  shortlisted: "Worth a closer look",
  drafting: "Shape your application",
  needs_approval: "Ready for your review",
  approved: "Reviewed, ready to submit",
  applied: "Submission recorded",
  interview: "Keep the conversation going",
  offer: "Consider your next chapter",
  rejected: "Closed opportunities",
  archived: "Saved for another time",
};
const isProtectedStage = (stage: JobStatus) =>
  stage === "approved" || stage === "applied";
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
function Badge({ fit }: { fit: Fit }) {
  return (
    <span className={`jp-badge jp-fit-${fit}`}>
      <span />
      {FIT_LABELS[fit]}
    </span>
  );
}
function Status({ status }: { status: JobStatus }) {
  return (
    <span className={`jp-status jp-status-${status}`}>
      <CircleDot size={12} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function JobPortal({
  initial,
  preview = false,
}: {
  initial: Workspace;
  preview?: boolean;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const [view, setView] = useState<View>("jobs");
  const [search, setSearch] = useState("");
  const [fit, setFit] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [eligibility, setEligibility] = useState("all");
  const [board, setBoard] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const jobs = useMemo(
    () =>
      sortJobs(workspace.jobs).filter(
        (j) =>
          `${j.title} ${j.company} ${j.tags.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (fit === "all" || j.fit === fit) &&
          (status === "all" || j.status === status) &&
          (priority === "all" || j.priority === priority) &&
          (eligibility === "all" || j.eligibility === eligibility),
      ),
    [workspace.jobs, search, fit, status, priority, eligibility],
  );
  const current = workspace.jobs.find((j) => j.id === selected);
  const approvals = workspace.jobs.filter((j) => j.status === "needs_approval");
  const strong = workspace.jobs.filter(
    (j) => j.fit === "strong" && activeStatuses.includes(j.status),
  );
  const applied = workspace.jobs.filter((j) => Boolean(j.appliedAt));
  const interviews = workspace.jobs.filter((j) => j.status === "interview");
  const relevantActivities = selected
    ? workspace.activities.filter((a) => a.jobId === selected)
    : workspace.activities;
  async function act(action: WorkspaceAction) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (preview) {
        const validated = parseAction(action);
        if (validated.type === "update_job")
          assertJob({
            ...workspace.jobs.find((j) => j.id === validated.id),
            ...validated.patch,
          });
        const next = applyAction(workspace, validated);
        setWorkspace(next);
        setNotice("Updated in this preview only.");
      } else {
        const res = await fetch("/api/jobs/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not save.");
        setWorkspace(data.workspace);
        setNotice("Saved to your workspace.");
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function discover() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (preview) {
        setNotice(
          "This preview uses sample opportunities. Live discovery is available after private database setup.",
        );
        return;
      }
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed.");
      setWorkspace(data.workspace);
      if (data.run?.status === "failed") setError(data.run.message);
      else
        setNotice(
          data.run?.message ||
            "Discovery finished. Review location eligibility before applying.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed.");
    } finally {
      setBusy(false);
    }
  }
  function exportRecords() {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opportunity-desk-${new Date().toISOString().slice(0, 10)}${preview ? "-sample" : ""}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function navigate(next: View) {
    setView(next);
    setSearch("");
    setFit("all");
    setStatus("all");
    setPriority("all");
    setEligibility("all");
  }
  function openJob(id: string, tab = "overview") {
    setDetailTab(tab);
    setSelected(id);
  }
  async function moveJob(id: string, stage: JobStatus) {
    const job = workspace.jobs.find((item) => item.id === id);
    if (busy || !job || job.status === stage) return false;
    // Approval and submission are explicit actions in the application drawer.
    // A board move must never create either record.
    if (isProtectedStage(stage)) return false;
    const saved = await act({
      type: "update_job",
      id,
      patch: { status: stage },
    });
    if (saved)
      setNotice(
        `${job.company} moved to ${STATUS_LABELS[stage]}.${preview ? " Updated in this preview only." : ""}`,
      );
    return saved;
  }
  return (
    <div className="jp-shell">
      <aside className="jp-sidebar">
        <a className="jp-brand" href="/admin">
          <span className="jp-brand-icon" aria-hidden="true">
            ✳
          </span>
          <span>
            ubaid<span>Career workspace</span>
          </span>
        </a>
        <div className="jp-workspace-label">
          WORKSPACE <span>PRIVATE</span>
        </div>
        <nav aria-label="Workspace">
          {navigation.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-label={label}
              title={label}
              onClick={() => navigate(key)}
              aria-current={view === key ? "page" : undefined}
              className={view === key ? "active" : ""}
            >
              <Icon size={18} />
              <span className="jp-nav-label">{label}</span>
              <span className="jp-nav-label-compact" aria-hidden="true">
                {key === "approvals"
                  ? "Review"
                  : key === "profile"
                    ? "Profile"
                    : key === "settings"
                      ? "Settings"
                      : label}
              </span>
              {key === "approvals" && approvals.length > 0 && (
                <span className="jp-nav-count">{approvals.length}</span>
              )}
            </button>
          ))}
        </nav>
        <a
          className="jp-portfolio"
          href="https://itsubaidullahomer.com"
          target="_blank"
          rel="noreferrer"
        >
          View my portfolio <ArrowUpRight size={15} />
        </a>
        <div className="jp-user">
          <span className="jp-avatar">UO</span>
          <div>
            <strong>Ubaidullah Omer</strong>
            <span>Personal workspace</span>
          </div>
          <ShieldCheck size={16} />
        </div>
      </aside>
      <div className="jp-content">
        <header className="jp-topbar">
          <span>
            Workspace <ChevronRight size={13} />{" "}
            <strong>{navigation.find((n) => n[0] === view)?.[1]}</strong>
          </span>
          <div>
            <span className="jp-private">
              <ShieldCheck size={13} />
              Only you
            </span>
            {preview ? (
              <span className="jp-preview-pill">Preview · sample data</span>
            ) : (
              <form action="/admin/auth/logout" method="post">
                <button aria-label="Sign out" title="Sign out">
                  <LogOut size={16} />
                </button>
              </form>
            )}
          </div>
        </header>
        {preview && (
          <div className="jp-preview-banner">
            <span>
              <AlertCircle size={14} />
              Interactive design preview. All opportunities are fictional;
              changes last for this visit only.
            </span>
            <a href="/admin">
              Setup status <ArrowRight size={13} />
            </a>
          </div>
        )}
        <main
          className={`jp-main ${view === "jobs" ? "jp-pipeline-main" : ""}`}
          id="main"
        >
          <div className="jp-heading">
            <div>
              {view !== "jobs" && (
                <div className="jp-eyebrow">YOUR NEXT CHAPTER</div>
              )}
              <h1>
                {view === "overview"
                  ? "Good work starts with a good fit."
                  : view === "jobs"
                    ? "Opportunity pipeline"
                    : view === "approvals"
                      ? "You have the final say."
                      : view === "activity"
                        ? "Every step, in one place."
                        : view === "documents"
                          ? "Every version, kept private."
                          : view === "profile"
                            ? "The evidence behind your work."
                            : "Connected, on your terms."}
              </h1>
              {view !== "jobs" && (
                <p>
                  {view === "overview"
                    ? "A clear view of your search, from first discovery to the next conversation."
                    : view === "approvals"
                      ? "Review the exact application before approving it. Approval alone never sends it."
                      : view === "activity"
                        ? "Discoveries, decisions, applications and replies, with a record of what happened."
                        : view === "documents"
                          ? "Your resume masters and the exact files prepared for each opportunity."
                          : view === "profile"
                            ? "Your portfolio is a starting point. Keep your experience accurate and up to date."
                            : "Your sources, submission policy, and service connections in one place."}
                </p>
              )}
            </div>
            {["overview", "jobs"].includes(view) && (
              <button
                className="jp-button jp-primary"
                aria-label="Find opportunities"
                onClick={discover}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={16} className="jp-spin" />
                ) : (
                  <Search size={16} />
                )}
                {view === "jobs" ? "Find roles" : "Find opportunities"}
              </button>
            )}
          </div>
          {(notice || error) && (
            <div
              role={error ? "alert" : "status"}
              className={`jp-message ${error ? "is-error" : ""}`}
            >
              {error ? <AlertCircle size={16} /> : <Check size={16} />}
              <span>{error || notice}</span>
              <button
                onClick={() => {
                  setNotice("");
                  setError("");
                }}
                aria-label="Dismiss message"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="jp-metrics">
                {[
                  [
                    strong.length,
                    "Strong-fit opportunities",
                    Target,
                    "Your skills match the essentials",
                  ],
                  [
                    approvals.length,
                    "Ready for your review",
                    FileCheck2,
                    "Applications needing your review",
                  ],
                  [
                    applied.length,
                    "Applications recorded",
                    ArrowUpRight,
                    "A history you can return to",
                  ],
                  [
                    interviews.length,
                    "In conversation",
                    MessageIcon,
                    "The next step is taking shape",
                  ],
                ].map(([n, label, Icon, desc]) => {
                  const MetricIcon = Icon as typeof Target;
                  return (
                    <div className="jp-metric" key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <MetricIcon size={17} />
                      </div>
                      <strong>{String(n).padStart(2, "0")}</strong>
                      <p>{String(desc)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="jp-dashboard-grid">
                <section className="jp-focus">
                  <div className="jp-small-label">
                    <Sparkles size={15} /> THE FOCUS
                  </div>
                  <h2>
                    Fewer compromises. <br />
                    Better conversations.
                  </h2>
                  <p>
                    Build your shortlist around work you can do well. Every
                    “strong fit” needs evidence for the essential requirements.
                  </p>
                  <div className="jp-focus-tags">
                    <span>
                      <Check size={13} />
                      AI product & full-stack
                    </span>
                    <span>
                      <Globe2 size={13} />
                      Pakistan-eligible remote
                    </span>
                    <span>No salary cutoff</span>
                  </div>
                  <button
                    onClick={() => {
                      navigate("jobs");
                      setFit("strong");
                    }}
                    className="jp-focus-link"
                  >
                    Explore strong-fit roles <ArrowRight size={17} />
                  </button>
                  <div className="jp-orbit" aria-hidden="true">
                    <div />
                    <div />
                    <Target size={55} />
                  </div>
                </section>
                <section className="jp-panel jp-next">
                  <div className="jp-section-heading">
                    <h2>Make your next move</h2>
                    <span className="jp-micro">A LITTLE MOMENTUM</span>
                  </div>
                  <button onClick={() => navigate("approvals")}>
                    <span className="jp-next-icon blue">
                      <FileCheck2 size={19} />
                    </span>
                    <span>
                      <strong>
                        {approvals.length
                          ? `Review ${approvals.length} prepared application${approvals.length > 1 ? "s" : ""}`
                          : "Build your first application"}
                      </strong>
                      <small>
                        {approvals.length
                          ? "Check the evidence, wording and recipient."
                          : "Shortlist a role, then prepare a draft."}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                  <button
                    onClick={() => {
                      navigate("jobs");
                      setEligibility("unknown");
                    }}
                  >
                    <span className="jp-next-icon amber">
                      <Globe2 size={19} />
                    </span>
                    <span>
                      <strong>Check location eligibility</strong>
                      <small>
                        {
                          workspace.jobs.filter(
                            (j) => j.eligibility === "unknown",
                          ).length
                        }{" "}
                        roles need confirmation for Pakistan.
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => navigate("profile")}>
                    <span className="jp-next-icon mint">
                      <UserRound size={19} />
                    </span>
                    <span>
                      <strong>Strengthen your evidence</strong>
                      <small>
                        Keep your skills and project examples current.
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
              <div className="jp-section-heading jp-table-heading">
                <div>
                  <h2>Worth a closer look</h2>
                  <p>Your strongest matches, with the next step in view.</p>
                </div>
                <button
                  className="jp-text-button"
                  onClick={() => navigate("jobs")}
                >
                  All opportunities <ArrowRight size={15} />
                </button>
              </div>
              <JobTable
                jobs={sortJobs(workspace.jobs)
                  .filter((j) => activeStatuses.includes(j.status))
                  .slice(0, 5)}
                onSelect={openJob}
              />
              <div className="jp-bottom-line">
                <span>
                  <ShieldCheck size={13} /> Applications stay under your
                  control.
                </span>
                <span>
                  {preview
                    ? "Sample workspace"
                    : `${workspace.jobs.length} recorded opportunities`}{" "}
                  · No probability scores
                </span>
              </div>
            </>
          )}
          {view === "jobs" && (
            <>
              <div
                className="jp-pipeline-summary"
                aria-label="Pipeline summary"
              >
                <span>
                  <strong>
                    {
                      workspace.jobs.filter((j) =>
                        activeStatuses.includes(j.status),
                      ).length
                    }
                  </strong>{" "}
                  active
                </span>
                <span>
                  <strong>{strong.length}</strong> strong matches
                </span>
                <button onClick={() => navigate("approvals")}>
                  <span className="jp-summary-dot" />
                  <strong>{approvals.length}</strong> to review{" "}
                  <ArrowUpRight size={13} />
                </button>
                {board && (
                  <BoardNavigation
                    boardRef={boardRef}
                    jobs={jobs}
                    stageFilter={status}
                  />
                )}
              </div>
              <div className="jp-toolbar">
                <label className="jp-search">
                  <Search size={17} />
                  <input
                    aria-label="Search opportunities"
                    placeholder="Search roles, companies, skills…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <button className="jp-button" onClick={() => setAdding(true)}>
                  <Plus size={16} />
                  Add opportunity
                </button>
                <button
                  className="jp-icon-button"
                  title="Export your records"
                  aria-label="Export your records"
                  onClick={exportRecords}
                >
                  <ArrowDownToLine size={17} />
                </button>
                <div className="jp-view-toggle">
                  <button
                    aria-label="Board view"
                    aria-pressed={board}
                    onClick={() => setBoard(true)}
                  >
                    <Columns3 size={16} /> Board
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={!board}
                    onClick={() => setBoard(false)}
                  >
                    <List size={16} /> List
                  </button>
                </div>
              </div>
              <div className="jp-filters">
                <Filter size={14} />
                <select
                  aria-label="Filter by fit"
                  value={fit}
                  onChange={(e) => setFit(e.target.value)}
                >
                  <option value="all">All fit levels</option>
                  {Object.entries(FIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All stages</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="all">Any priority</option>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <select
                  aria-label="Filter by eligibility"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                >
                  <option value="all">Any eligibility</option>
                  <option value="confirmed">Pakistan eligible</option>
                  <option value="unknown">Needs confirmation</option>
                  <option value="ineligible">Not eligible</option>
                </select>
                <span>
                  {jobs.length} of {workspace.jobs.length} roles
                </span>
              </div>
              {board ? (
                <JobBoard
                  boardRef={boardRef}
                  jobs={jobs}
                  stageFilter={status}
                  busy={busy}
                  onOpen={openJob}
                  onMove={moveJob}
                />
              ) : (
                <JobTable jobs={jobs} onSelect={openJob} />
              )}
            </>
          )}
          {view === "approvals" && (
            <div className="jp-approval-grid">
              {approvals.length ? (
                approvals.map((j) => (
                  <button
                    key={j.id}
                    className="jp-approval-card"
                    onClick={() => openJob(j.id, "application")}
                  >
                    <div>
                      <span className="jp-company-logo">
                        {initials(j.company)}
                      </span>
                      <Badge fit={j.fit} />
                    </div>
                    <h2>{j.title}</h2>
                    <p>
                      {j.company} · {j.location}
                    </p>
                    <blockquote>
                      {j.draft
                        ? `${j.draft.slice(0, 210)}…`
                        : "Draft needs to be completed before approval."}
                    </blockquote>
                    <span className="jp-text-button">
                      Review application <ArrowRight size={15} />
                    </span>
                  </button>
                ))
              ) : (
                <Empty
                  title="A clear approval queue."
                  text={
                    workspace.profile.preferences.approvalRequired
                      ? "Prepare a draft from an opportunity to review it here. Your saved policy requires approval before submission."
                      : "Applications needing your input will appear here. Verified matches may proceed under your saved submission policy."
                  }
                  icon={FileCheck2}
                />
              )}
            </div>
          )}
          {view === "activity" && (
            <section className="jp-panel jp-activity-panel">
              <div className="jp-section-heading">
                <h2>Your search, on the record</h2>
                <button className="jp-button" onClick={exportRecords}>
                  <ArrowDownToLine size={15} />
                  Export records
                </button>
              </div>
              <Timeline activities={workspace.activities} />
            </section>
          )}
          {view === "documents" && (
            <DocumentLibrary jobs={workspace.jobs} preview={preview} />
          )}
          {view === "profile" && (
            <ProfileEditor
              profile={workspace.profile}
              busy={busy}
              onSave={(profile) => act({ type: "update_profile", profile })}
            />
          )}
          {view === "settings" && (
            <div className="jp-connections">
              <Connection
                icon={ShieldCheck}
                title="Private database"
                state={preview ? "Not connected in preview" : "Connected"}
                text="Supabase stores your records behind sign-in and row-level access controls. Your profile and application history belong to your private workspace."
              />
              <Connection
                icon={Compass}
                title="Job discovery"
                state="On demand"
                text="Search Remotive, Jobicy, and Himalayas for relevant roles. Each result keeps its source link and a dated description snapshot. Refreshes respect source limits; skill fit and country eligibility still need evidence."
              />
              <Connection
                icon={Sparkles}
                title="Research & resume agents"
                state={preview ? "Preview" : "Codex-assisted"}
                text="Your Codex workflow researches roles and prepares job-specific resumes from your evidence. Saved versions appear in Documents. Scheduled follow-up runs through Codex and needs the desktop app running; this website does not run an unattended AI writer."
              />
              <Connection
                icon={Mail}
                title="Application email"
                state="Automatic sync not connected"
                text="Sent messages and replies can be recorded on each opportunity. Agents use your authorized application mailbox after sign-in. Automatic Gmail synchronization still needs a separate connection."
              />
              <section className="jp-panel jp-policy">
                <h2>Your standing instructions</h2>
                <ul>
                  <li>AI Product Engineer and Full-Stack Engineer roles.</li>
                  <li>
                    {workspace.profile.preferences.remoteOnly
                      ? "Remote opportunities that explicitly accept applicants in Pakistan."
                      : "Remote roles open to Pakistan, on-site roles in Pakistan, and overseas on-site roles with stated sponsorship or relocation support."}
                  </li>
                  <li>
                    {workspace.profile.preferences.remotePriority !== false
                      ? "Prefer remote roles when comparing suitable opportunities."
                      : "Compare suitable work arrangements without a remote preference."}
                  </li>
                  <li>Strong fit comes first. No minimum compensation.</li>
                  <li>
                    {workspace.profile.preferences.approvalRequired
                      ? "Review each application before submission."
                      : "Automatic submission is authorized for verified matches when every answer is known. Pause for missing facts or special commitments."}
                  </li>
                  <li>No paid service activation without your approval.</li>
                </ul>
                <div className="jp-callout">
                  <ShieldCheck size={18} />
                  <p>
                    Approval records a decision. A submission must be recorded
                    separately with an actual confirmation. A saved policy alone
                    does not connect a submission service.
                  </p>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
      <Dialog.Root
        open={Boolean(current)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="jp-overlay" />
          <Dialog.Content className="jp-drawer jp-surface">
            {(error || notice) && (
              <div
                className={`jp-dialog-message ${error ? "is-error" : ""}`}
                role={error ? "alert" : "status"}
              >
                {error || notice}
              </div>
            )}
            {current && (
              <JobDetail
                key={current.id}
                initialTab={detailTab}
                job={current}
                profile={workspace.profile}
                activities={relevantActivities}
                preview={preview}
                busy={busy}
                onAction={act}
                onRecorded={setWorkspace}
              />
            )}
            <Dialog.Close
              className="jp-dialog-close"
              aria-label="Close opportunity"
            >
              <X size={21} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={adding} onOpenChange={setAdding}>
        <Dialog.Portal>
          <Dialog.Overlay className="jp-overlay" />
          <Dialog.Content className="jp-modal jp-surface">
            {error && (
              <div className="jp-dialog-message is-error" role="alert">
                {error}
              </div>
            )}
            <AddJob
              onAdd={async (job) => {
                const saved = await act({ type: "add_job", job });
                if (saved) setAdding(false);
                return saved;
              }}
            />
            <Dialog.Close
              className="jp-dialog-close"
              aria-label="Close add opportunity"
            >
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
const MessageIcon = Mail;
function BoardNavigation({
  boardRef,
  jobs,
  stageFilter,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
  jobs: Job[];
  stageFilter: string;
}) {
  const stages = pipelineStages.filter(
    (stage) => stageFilter === "all" || stageFilter === stage,
  );
  function jumpToStage(stage: string) {
    const column = boardRef.current?.querySelector<HTMLElement>(
      `[data-stage="${stage}"]`,
    );
    if (column && boardRef.current) {
      boardRef.current.scrollTo({
        left: column.offsetLeft - boardRef.current.offsetLeft,
      });
      column.focus({ preventScroll: true });
    }
  }
  return (
    <div className="jp-board-tools">
      <p id="jp-board-help" className="jp-sr-only">
        <GripVertical size={14} /> Drag a card or use its Move to menu.
      </p>
      <div>
        <select
          aria-label="Jump to stage"
          value=""
          onChange={(event) => jumpToStage(event.target.value)}
        >
          <option value="" disabled>
            Jump to stage
          </option>
          {stages.map((stage) => (
            <option value={stage} key={stage}>
              {STATUS_LABELS[stage]} ·{" "}
              {jobs.filter((job) => job.status === stage).length}
            </option>
          ))}
        </select>
        <button
          className="jp-icon-button"
          aria-label="Scroll to earlier stages"
          onClick={() => boardRef.current?.scrollBy({ left: -320 })}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="jp-icon-button"
          aria-label="Scroll to later stages"
          onClick={() => boardRef.current?.scrollBy({ left: 320 })}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
function JobBoard({
  boardRef,
  jobs,
  stageFilter,
  busy,
  onOpen,
  onMove,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
  jobs: Job[];
  stageFilter: string;
  busy: boolean;
  onOpen: (id: string, tab?: string) => void;
  onMove: (id: string, stage: JobStatus) => Promise<boolean>;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<JobStatus | null>(null);
  const stages = pipelineStages.filter(
    (stage) => stageFilter === "all" || stageFilter === stage,
  );
  const draggedJob = jobs.find((job) => job.id === draggedId);
  async function move(id: string, stage: JobStatus) {
    setDraggedId(null);
    setDropTarget(null);
    const saved = await onMove(id, stage);
    if (saved) {
      requestAnimationFrame(() => {
        const card = document.getElementById(`jp-open-${id}`);
        if (card) {
          card.focus({ preventScroll: true });
          card.scrollIntoView({ block: "nearest", inline: "nearest" });
        } else boardRef.current?.focus({ preventScroll: true });
      });
    }
  }
  return (
    <>
      <div
        className="jp-board"
        ref={boardRef}
        role="region"
        aria-label="Opportunity pipeline"
        aria-describedby="jp-board-help"
        aria-busy={busy}
        tabIndex={0}
      >
        {stages.map((stage) => {
          const stageJobs = jobs.filter((job) => job.status === stage);
          const canDrop = Boolean(
            draggedJob &&
            draggedJob.status !== stage &&
            !isProtectedStage(stage) &&
            !busy,
          );
          return (
            <section
              key={stage}
              data-stage={stage}
              className={`jp-board-column ${dropTarget === stage ? "is-drop-target" : ""} ${draggedJob && isProtectedStage(stage) ? "is-protected-stage" : ""}`}
              aria-labelledby={`jp-stage-${stage}`}
              tabIndex={-1}
              onDragOver={(event) => {
                if (!canDrop) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(stage);
                const bounds = boardRef.current?.getBoundingClientRect();
                if (bounds) {
                  if (event.clientX > bounds.right - 60)
                    boardRef.current?.scrollBy({ left: 24 });
                  else if (event.clientX < bounds.left + 60)
                    boardRef.current?.scrollBy({ left: -24 });
                }
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setDropTarget(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (
                  canDrop &&
                  draggedId &&
                  event.dataTransfer.getData("application/x-opportunity-id") ===
                    draggedId
                )
                  void move(draggedId, stage);
                else {
                  setDraggedId(null);
                  setDropTarget(null);
                }
              }}
            >
              <header className="jp-column-heading">
                <h2 id={`jp-stage-${stage}`}>
                  <span className={`jp-stage-dot jp-stage-dot-${stage}`} />
                  {STATUS_LABELS[stage]}{" "}
                  <span className="jp-column-count">{stageJobs.length}</span>
                </h2>
                <p>{stageDescriptions[stage]}</p>
              </header>
              {isProtectedStage(stage) && (
                <div className="jp-stage-rule">
                  <ShieldCheck size={13} />
                  {stage === "approved"
                    ? "Approve in the application review"
                    : "Record after you submit externally"}
                </div>
              )}
              <div className="jp-column-cards">
                {stageJobs.map((job) => (
                  <article
                    className={`jp-board-card ${draggedId === job.id ? "is-dragging" : ""}`}
                    key={job.id}
                    data-job-id={job.id}
                    draggable={!busy}
                    onDragStart={(event) => {
                      if ((event.target as HTMLElement).closest("select")) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.setData(
                        "application/x-opportunity-id",
                        job.id,
                      );
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(job.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                  >
                    <button
                      className="jp-card-open"
                      id={`jp-open-${job.id}`}
                      aria-label={`Open ${job.company} ${job.title}`}
                      onClick={() => onOpen(job.id)}
                    >
                      <span className="jp-card-company">
                        <span className="jp-company-logo">
                          {initials(job.company)}
                        </span>
                        <span>{job.company}</span>
                        <GripVertical
                          className="jp-card-grip"
                          size={15}
                          aria-hidden="true"
                        />
                      </span>
                      <strong className="jp-card-title">{job.title}</strong>
                      <span className="jp-card-location">
                        <Globe2 size={13} />
                        {job.eligibility === "confirmed"
                          ? "Pakistan eligible"
                          : job.eligibility === "unknown"
                            ? "Location unconfirmed"
                            : "Not eligible"}
                      </span>
                      <span className="jp-card-labels">
                        <Badge fit={job.fit} />
                        <span
                          className={`jp-priority jp-priority-${job.priority}`}
                        >
                          {job.priority[0].toUpperCase() +
                            job.priority.slice(1)}{" "}
                          priority
                        </span>
                      </span>
                      <span className="jp-card-next">
                        <span>Next step</span>
                        <span>
                          {job.nextAction || "Review this opportunity"}
                        </span>
                      </span>
                      <span className="jp-card-date">
                        <CalendarDays size={13} />
                        {job.nextActionDate ? (
                          <time dateTime={job.nextActionDate}>
                            Due {formatDate(job.nextActionDate)}
                          </time>
                        ) : (
                          "No due date"
                        )}
                      </span>
                    </button>
                    <div className="jp-card-actions">
                      <select
                        aria-label={`Move ${job.company} ${job.title} to stage`}
                        value=""
                        disabled={busy}
                        onChange={(event) => {
                          if (event.target.value === "application")
                            onOpen(job.id, "application");
                          else
                            void move(job.id, event.target.value as JobStatus);
                        }}
                      >
                        <option value="" disabled>
                          Move to…
                        </option>
                        {pipelineStages
                          .filter(
                            (target) =>
                              target !== job.status &&
                              !isProtectedStage(target),
                          )
                          .map((target) => (
                            <option key={target} value={target}>
                              {STATUS_LABELS[target]}
                            </option>
                          ))}
                        <option value="application">
                          {job.status === "approved"
                            ? "Record submitted application…"
                            : "Review application…"}
                        </option>
                      </select>
                      {(job.status === "needs_approval" ||
                        job.status === "approved") && (
                        <button
                          onClick={() => onOpen(job.id, "application")}
                          className="jp-card-review"
                        >
                          {job.status === "approved"
                            ? "Record applied"
                            : "Review draft"}
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!stageJobs.length && (
                  <div className="jp-column-empty">
                    <CircleDot size={18} />
                    <p>
                      {dropTarget === stage
                        ? "Drop here to move"
                        : "No opportunities here"}
                    </p>
                    <span>
                      {isProtectedStage(stage)
                        ? stage === "approved"
                          ? "Approved drafts appear here."
                          : "Applications you record appear here."
                        : draggedJob
                          ? "Drop a card here to change its stage."
                          : "Move a card here when it’s ready."}
                    </span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
function JobTable({
  jobs,
  onSelect,
}: {
  jobs: Job[];
  onSelect: (id: string) => void;
}) {
  return jobs.length ? (
    <div className="jp-table-wrap">
      <table className="jp-table">
        <thead>
          <tr>
            <th>OPPORTUNITY</th>
            <th>FIT & ELIGIBILITY</th>
            <th>STAGE</th>
            <th>NEXT STEP</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>
                <button className="jp-role" onClick={() => onSelect(j.id)}>
                  <span className="jp-company-logo">{initials(j.company)}</span>
                  <span>
                    <strong>{j.title}</strong>
                    <small>
                      {j.company} <span>·</span> {j.location}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <Badge fit={j.fit} />
                <span className="jp-eligibility">
                  <Globe2 size={11} />
                  {j.eligibility === "confirmed"
                    ? "Pakistan eligible"
                    : j.eligibility === "unknown"
                      ? "Location unconfirmed"
                      : "Not eligible"}
                </span>
              </td>
              <td>
                <Status status={j.status} />
              </td>
              <td>
                <span className="jp-next-step">
                  {j.nextAction || "Review opportunity"}
                </span>
                <small className="jp-table-date">
                  {j.nextActionDate
                    ? formatDate(j.nextActionDate)
                    : `${j.priority[0].toUpperCase() + j.priority.slice(1)} priority`}
                </small>
              </td>
              <td>
                <button
                  className="jp-icon-button"
                  aria-label={`Open ${j.company} ${j.title}`}
                  onClick={() => onSelect(j.id)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="Room for the right opportunity."
      text="Find opportunities or add a role you already have in mind. Your search will build from here."
      icon={BriefcaseBusiness}
    />
  );
}
function Empty({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: typeof Target;
}) {
  return (
    <div className="jp-empty">
      <span>
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function Timeline({ activities }: { activities: Activity[] }) {
  return activities.length ? (
    <div className="jp-timeline">
      {[...activities]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((a) => (
          <article key={a.id}>
            <span className={`jp-timeline-dot jp-event-${a.type}`}>
              {a.type.includes("email") ? (
                <Mail size={13} />
              ) : a.type === "approval" ? (
                <CheckCheck size={13} />
              ) : (
                <CircleDot size={13} />
              )}
            </span>
            <div>
              <header>
                <strong>{a.title}</strong>
                <time>{formatDate(a.createdAt)}</time>
              </header>
              <p>{a.body}</p>
              <small>
                {a.actor === "you"
                  ? "Recorded by you"
                  : a.actor === "agent"
                    ? "Discovery automation"
                    : "Workspace"}
                {a.type.includes("email") && a.actor === "you"
                  ? " · Manual email record"
                  : ""}
              </small>
            </div>
          </article>
        ))}
    </div>
  ) : (
    <p className="jp-quiet">No activity recorded yet.</p>
  );
}
function Connection({
  icon: Icon,
  title,
  state,
  text,
}: {
  icon: typeof Target;
  title: string;
  state: string;
  text: string;
}) {
  return (
    <section className="jp-panel jp-connection">
      <div className="jp-connection-icon">
        <Icon size={22} />
      </div>
      <div>
        <div>
          <h2>{title}</h2>
          <span className="jp-status">{state}</span>
        </div>
        <p>{text}</p>
      </div>
    </section>
  );
}
function JobDetail({
  initialTab = "overview",
  job,
  profile,
  activities,
  preview,
  busy,
  onAction,
  onRecorded,
}: {
  initialTab?: string;
  job: Job;
  profile: CandidateProfile;
  activities: Activity[];
  preview: boolean;
  busy: boolean;
  onAction: (action: WorkspaceAction) => Promise<boolean>;
  onRecorded: (workspace: Workspace) => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState(job.draft);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<
    "note" | "email_sent" | "email_received"
  >("note");
  const [recipient, setRecipient] = useState(job.contactEmail);
  const patch = (value: Partial<Job>) =>
    onAction({ type: "update_job", id: job.id, patch: value });
  return (
    <>
      <div className="jp-detail-top">
        <span className="jp-company-logo large">{initials(job.company)}</span>
        <p>{job.company}</p>
        <Dialog.Title>{job.title}</Dialog.Title>
        <Dialog.Description>
          {job.location} · {job.salary || "Compensation not disclosed"}
        </Dialog.Description>
        <div className="jp-detail-badges">
          <Badge fit={job.fit} />
          <Status status={job.status} />
        </div>
        <a
          className="jp-text-button"
          href={job.url}
          target="_blank"
          rel="noreferrer"
        >
          View original listing <ArrowUpRight size={14} />
        </a>
        {job.research?.companyUrl && isPublicUrl(job.research.companyUrl) && (
          <a
            className="jp-text-button"
            href={job.research.companyUrl}
            target="_blank"
            rel="noreferrer"
          >
            Company website <ArrowUpRight size={14} />
          </a>
        )}
      </div>
      <div className="jp-detail-tabs">
        {["overview", "application", "documents", "activity"].map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
            {t === "overview"
              ? "Fit & details"
              : t === "application"
                ? "Application"
                : t === "documents"
                  ? "Documents"
                  : "Activity"}
            {t === "activity" && <span>{activities.length}</span>}
          </button>
        ))}
      </div>
      <div className="jp-detail-body">
        {tab === "overview" && (
          <>
            <div className="jp-field-row">
              <label>
                Stage
                <select
                  value={job.status}
                  disabled={busy}
                  onChange={(e) =>
                    patch({ status: e.target.value as JobStatus })
                  }
                >
                  {Object.entries(STATUS_LABELS)
                    .filter(
                      ([k]) =>
                        !["approved", "applied"].includes(k) ||
                        k === job.status,
                    )
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={job.priority}
                  disabled={busy}
                  onChange={(e) =>
                    patch({ priority: e.target.value as Priority })
                  }
                >
                  {["high", "medium", "low"].map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className={`jp-callout ${job.eligibility === "confirmed" ? "is-green" : ""}`}
            >
              <Globe2 size={18} />
              <div>
                <strong>
                  {job.eligibility === "confirmed"
                    ? "Pakistan eligibility confirmed"
                    : job.eligibility === "unknown"
                      ? "Location eligibility needs confirmation"
                      : "Location requirements not met"}
                </strong>
                <p>
                  {job.eligibilityEvidence ||
                    "A remote label alone does not confirm that the employer hires in Pakistan."}
                </p>
              </div>
            </div>
            <h3>Requirements & evidence</h3>
            <p className="jp-quiet">
              Fit describes the listed requirements, not a prediction of an
              offer.
            </p>
            <div className="jp-requirements">
              {job.requirements.length ? (
                job.requirements.map((r) => (
                  <div key={r.id}>
                    <span className={`jp-requirement-icon ${r.assessment}`}>
                      {r.assessment === "met" ? (
                        <Check size={15} />
                      ) : r.assessment === "gap" ? (
                        <X size={15} />
                      ) : (
                        <span>?</span>
                      )}
                    </span>
                    <div>
                      <strong>{r.text}</strong>
                      <small>
                        {r.essential ? "Essential" : "Preferred"} ·{" "}
                        {r.assessment === "met"
                          ? "Evidence linked"
                          : r.assessment === "gap"
                            ? "Skill gap"
                            : "Not established"}
                      </small>
                      <p>{r.explanation}</p>
                      {r.evidenceIds.map((id) => {
                        const ev = profile.evidence.find((x) => x.id === id);
                        return ev ? (
                          <a
                            href={ev.source}
                            target="_blank"
                            rel="noreferrer"
                            key={id}
                          >
                            <Link2 size={12} />
                            {ev.skill} · portfolio evidence
                          </a>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p>
                  No requirements assessed yet. Add the full job description to
                  support a careful review.
                </p>
              )}
            </div>
            <FitEditor job={job} profile={profile} busy={busy} save={patch} />
            <ListingEditor job={job} busy={busy} save={patch} />
            <ResearchEditor job={job} busy={busy} save={patch} />
            <h3>About the role</h3>
            <p className="jp-description">{job.description}</p>
            <NextStepEditor job={job} busy={busy} save={patch} />
            <p className="jp-source">
              Source:{" "}
              <a href={job.url} target="_blank" rel="noreferrer">
                {job.source}
              </a>{" "}
              · Discovered {formatDate(job.discoveredAt)}
            </p>
            <button
              className="jp-button jp-primary jp-full"
              disabled={busy}
              onClick={async () => {
                const text = draftApplication(job, profile);
                setDraft(text);
                const saved = await patch({ draft: text, status: "drafting" });
                if (saved) setTab("application");
              }}
            >
              <FileText size={16} />
              Prepare application draft
            </button>
          </>
        )}
        {tab === "application" && (
          <>
            <div className="jp-callout">
              <ShieldCheck size={18} />
              <p>
                A factual starting draft, built from your profile. This editor
                saves drafts and decisions.{" "}
                {profile.preferences.approvalRequired
                  ? "Your saved policy requires approval before submission."
                  : "Your saved policy permits automatic submission for verified matches with complete answers; missing facts and special commitments still need your input."}
              </p>
            </div>
            <label className="jp-field">
              Recipient email, if known
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recruiting@company.com"
              />
            </label>
            <label className="jp-field">
              Application draft
              <textarea
                rows={15}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Prepare a draft from the Fit & details tab, or write your application here."
              />
            </label>
            <div className="jp-action-row">
              <button
                className="jp-button"
                disabled={busy || !draft.trim()}
                onClick={() =>
                  patch({
                    draft,
                    contactEmail: recipient,
                    status: "needs_approval",
                  })
                }
              >
                Save for review
              </button>
              <button
                className="jp-button jp-primary"
                disabled={
                  busy || !draft.trim() || job.eligibility !== "confirmed"
                }
                onClick={() =>
                  patch({ draft, contactEmail: recipient, status: "approved" })
                }
              >
                <CheckCheck size={16} />
                Approve draft
              </button>
            </div>
            {job.eligibility !== "confirmed" && (
              <p className="jp-quiet">
                Confirm that this role accepts applicants from Pakistan before
                approving.
              </p>
            )}
            {job.status === "approved" && (
              <div className="jp-callout is-green">
                <Check size={18} />
                <p>
                  Draft approved. Submission is tracked separately. Use the
                  receipt action only after you submit externally.
                </p>
              </div>
            )}
            <SubmissionReceipts
              job={job}
              preview={preview}
              onRecorded={onRecorded}
            />
          </>
        )}
        {tab === "documents" && (
          <>
            <DocumentLibrary jobs={[job]} jobId={job.id} preview={preview} />
            <SubmissionReceipts
              job={job}
              preview={preview}
              onRecorded={onRecorded}
              allowRecord={false}
            />
          </>
        )}
        {tab === "activity" && (
          <>
            <label className="jp-field">
              Record an update
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as typeof noteType)}
              >
                <option value="note">Note or conversation</option>
                <option value="email_sent">Email I already sent</option>
                <option value="email_received">Email reply I received</option>
              </select>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened? Add the message, details or next step…"
              />
            </label>
            <button
              className="jp-button jp-primary"
              disabled={busy || !note.trim()}
              onClick={async () => {
                const saved = await onAction({
                  type: "add_activity",
                  activity: {
                    id: crypto.randomUUID(),
                    jobId: job.id,
                    type: noteType,
                    title:
                      noteType === "note"
                        ? "Note added"
                        : noteType === "email_sent"
                          ? "Sent email recorded"
                          : "Reply received",
                    body: note.trim(),
                    actor: "you",
                    createdAt: new Date().toISOString(),
                  },
                });
                if (saved) setNote("");
              }}
            >
              <Plus size={15} />
              Save update
            </button>
            <div className="jp-divider" />
            <Timeline activities={activities} />
          </>
        )}
      </div>
    </>
  );
}
function ProfileEditor({
  profile,
  busy,
  onSave,
}: {
  profile: CandidateProfile;
  busy: boolean;
  onSave: (p: CandidateProfile) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(profile);
  return (
    <form
      className="jp-profile"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...draft, updatedAt: new Date().toISOString() });
      }}
    >
      <section className="jp-panel">
        <div className="jp-section-heading">
          <div>
            <h2>Candidate profile</h2>
            <p>Based on your published portfolio. Editable by you.</p>
          </div>
          <span className="jp-avatar">UO</span>
        </div>
        <div className="jp-field-row">
          <label>
            Name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              required
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </label>
        </div>
        <label className="jp-field">
          Professional headline
          <input
            required
            value={draft.headline}
            onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          />
        </label>
        <div className="jp-field-row">
          <label>
            Application email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>
          <label>
            Portfolio URL
            <input
              type="url"
              required
              value={draft.portfolio}
              onChange={(e) =>
                setDraft({ ...draft, portfolio: e.target.value })
              }
            />
          </label>
        </div>
        <label className="jp-field">
          Summary
          <textarea
            rows={4}
            required
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          />
        </label>
      </section>
      <section className="jp-panel">
        <div className="jp-section-heading">
          <div>
            <h2>Search & submission preferences</h2>
            <p>
              Keep your work-location scope and permission to submit explicit.
            </p>
          </div>
        </div>
        <label className="jp-field">
          Work-location scope
          <select
            value={draft.preferences.remoteOnly ? "remote" : "eligible"}
            onChange={(event) =>
              setDraft({
                ...draft,
                preferences: {
                  ...draft.preferences,
                  remoteOnly: event.target.value === "remote",
                  overseasOnsite: "sponsorship_required",
                },
              })
            }
          >
            <option value="remote">Remote roles open to Pakistan only</option>
            <option value="eligible">
              Remote, Pakistan on-site, and sponsored overseas on-site
            </option>
          </select>
        </label>
        <label className="jp-checkbox">
          <input
            type="checkbox"
            checked={draft.preferences.remotePriority !== false}
            onChange={(event) =>
              setDraft({
                ...draft,
                preferences: {
                  ...draft.preferences,
                  remotePriority: event.target.checked,
                },
              })
            }
          />
          <span>Prefer remote roles among suitable opportunities.</span>
        </label>
        <label className="jp-field">
          Application submission policy
          <select
            value={draft.preferences.approvalRequired ? "review" : "verified"}
            onChange={(event) =>
              setDraft({
                ...draft,
                preferences: {
                  ...draft.preferences,
                  approvalRequired: event.target.value === "review",
                },
              })
            }
          >
            <option value="review">
              Require my approval for every application
            </option>
            <option value="verified">
              Authorize automatic submission for verified matches with complete
              answers
            </option>
          </select>
        </label>
        <p className="jp-quiet">
          Pause for missing facts or special commitments. Overseas on-site roles
          need stated sponsorship or relocation support. Strong fit comes first,
          with no salary cutoff. Saving permission does not itself submit an
          application.
        </p>
      </section>
      <section className="jp-panel">
        <div className="jp-section-heading">
          <div>
            <h2>Skills, supported by work</h2>
            <p>
              Levels are editable self-assessments. Portfolio claims are not
              independent verification.
            </p>
          </div>
        </div>
        {draft.evidence.map((ev, i) => (
          <div className="jp-evidence-editor" key={ev.id}>
            <div className="jp-field-row">
              <label>
                Skill
                <input
                  value={ev.skill}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      evidence: draft.evidence.map((x, n) =>
                        n === i ? { ...x, skill: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Experience level
                <select
                  value={ev.level}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      evidence: draft.evidence.map((x, n) =>
                        n === i
                          ? { ...x, level: e.target.value as typeof ev.level }
                          : x,
                      ),
                    })
                  }
                >
                  <option value="unverified">Not established</option>
                  <option value="working">Working knowledge</option>
                  <option value="proficient">Proficient</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
            <label className="jp-field">
              Evidence
              <textarea
                rows={2}
                value={ev.statement}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    evidence: draft.evidence.map((x, n) =>
                      n === i ? { ...x, statement: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <label className="jp-field">
              Source URL
              <input
                type="url"
                value={ev.source}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    evidence: draft.evidence.map((x, n) =>
                      n === i ? { ...x, source: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="jp-button"
          onClick={() =>
            setDraft({
              ...draft,
              evidence: [
                ...draft.evidence,
                {
                  id: crypto.randomUUID(),
                  skill: "",
                  level: "unverified",
                  statement: "",
                  source: draft.portfolio,
                  verified: false,
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Add skill evidence
        </button>
      </section>
      <div className="jp-save-bar">
        <span>
          <ShieldCheck size={15} />
          Your claims stay under your control.
        </span>
        <button className="jp-button jp-primary" disabled={busy} type="submit">
          <Check size={16} />
          Save profile
        </button>
      </div>
    </form>
  );
}
function AddJob({ onAdd }: { onAdd: (j: Job) => Promise<boolean> }) {
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const data = new FormData(e.currentTarget);
        const get = (k: string) => String(data.get(k) || "");
        const now = new Date().toISOString();
        await onAdd({
          id: crypto.randomUUID(),
          company: get("company"),
          title: get("title"),
          url: get("url"),
          location: get("location"),
          salary: get("salary"),
          description: get("description"),
          source: "Manual entry",
          sourceId: "",
          discoveredAt: now,
          updatedAt: now,
          status: "discovered",
          priority: "high",
          fit: "unknown",
          eligibility: "unknown",
          eligibilityEvidence:
            "Employer location requirements have not been reviewed.",
          requirements: [],
          tags: [],
          notes: "",
          nextAction: "Review requirements and location",
          nextActionDate: null,
          draft: "",
          contactEmail: "",
          appliedAt: null,
        });
        setSaving(false);
      }}
    >
      <Dialog.Title>Add an opportunity</Dialog.Title>
      <Dialog.Description>
        Keep the original listing so every detail can be checked later.
      </Dialog.Description>
      <div className="jp-field-row">
        <label>
          Company
          <input name="company" required maxLength={150} />
        </label>
        <label>
          Role title
          <input name="title" required maxLength={200} />
        </label>
      </div>
      <label className="jp-field">
        Original job URL
        <input name="url" type="url" required placeholder="https://…" />
      </label>
      <div className="jp-field-row">
        <label>
          Location
          <input name="location" required placeholder="Remote · Worldwide" />
        </label>
        <label>
          Compensation, if listed
          <input name="salary" placeholder="Not disclosed" />
        </label>
      </div>
      <label className="jp-field">
        Job description
        <textarea
          name="description"
          rows={5}
          required
          placeholder="Include requirements and location restrictions."
          maxLength={20000}
        />
      </label>
      <button className="jp-button jp-primary jp-full" disabled={saving}>
        <Plus size={16} />
        Save opportunity
      </button>
    </form>
  );
}

function FitEditor({
  job,
  profile,
  busy,
  save,
}: {
  job: Job;
  profile: CandidateProfile;
  busy: boolean;
  save: (patch: Partial<Job>) => Promise<boolean>;
}) {
  const [requirements, setRequirements] = useState(job.requirements);
  const [eligibility, setEligibility] = useState<Eligibility>(job.eligibility);
  const [statement, setStatement] = useState(job.eligibilityEvidence);
  const [fullReview, setFullReview] = useState(false);
  const update = (index: number, patch: Partial<Requirement>) =>
    setRequirements((old) =>
      old.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  return (
    <details className="jp-fit-editor">
      <summary>
        <FileCheck2 size={15} /> Review requirements & eligibility{" "}
        <ChevronRight size={14} />
      </summary>
      <p className="jp-quiet">
        Read the original listing in full. Record every essential requirement,
        including experience, education and working hours.{" "}
        {profile.preferences.remoteOnly
          ? "Confirm that the remote role accepts applicants based in Pakistan."
          : "Confirm the employer accepts your location and work authorization. Overseas on-site roles need stated sponsorship or relocation support."}
      </p>
      <label className="jp-field">
        Pakistan eligibility
        <select
          value={eligibility}
          onChange={(e) => setEligibility(e.target.value as Eligibility)}
        >
          <option value="unknown">Not yet established</option>
          <option value="confirmed">
            Confirmed in the listing / by employer
          </option>
          <option value="ineligible">Not eligible</option>
        </select>
      </label>
      <label className="jp-field">
        Exact location evidence
        <textarea
          rows={2}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Quote the employer’s location requirements or their confirmation."
        />
      </label>
      {requirements.map((r, i) => (
        <div key={r.id} className="jp-review-requirement">
          <label className="jp-field">
            Requirement {i + 1}
            <textarea
              rows={2}
              value={r.text}
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </label>
          <div className="jp-field-row">
            <label>
              Importance
              <select
                value={r.essential ? "essential" : "preferred"}
                onChange={(e) =>
                  update(i, { essential: e.target.value === "essential" })
                }
              >
                <option value="essential">Essential</option>
                <option value="preferred">Preferred</option>
              </select>
            </label>
            <label>
              Assessment
              <select
                value={r.assessment}
                onChange={(e) =>
                  update(i, {
                    assessment: e.target.value as Requirement["assessment"],
                  })
                }
              >
                <option value="unknown">Not established</option>
                <option value="met">Matched to evidence</option>
                <option value="gap">Skill gap</option>
              </select>
            </label>
          </div>
          <label className="jp-field">
            Supporting evidence
            <select
              multiple
              aria-label={`Supporting evidence for requirement ${i + 1}`}
              value={r.evidenceIds}
              onChange={(e) =>
                update(i, {
                  evidenceIds: Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {profile.evidence.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.skill}
                </option>
              ))}
            </select>
          </label>
          <label className="jp-field">
            Why this evidence supports the requirement
            <textarea
              rows={2}
              value={r.explanation}
              onChange={(e) => update(i, { explanation: e.target.value })}
            />
          </label>
          <button
            className="jp-text-button"
            onClick={() =>
              setRequirements(requirements.filter((_, n) => n !== i))
            }
          >
            Remove requirement
          </button>
        </div>
      ))}
      <button
        className="jp-button"
        onClick={() =>
          setRequirements([
            ...requirements,
            {
              id: crypto.randomUUID(),
              text: "",
              essential: true,
              assessment: "unknown",
              evidenceIds: [],
              explanation: "",
            },
          ])
        }
      >
        <Plus size={14} />
        Add requirement
      </button>
      <label className="jp-checkbox">
        <input
          type="checkbox"
          checked={fullReview}
          onChange={(e) => setFullReview(e.target.checked)}
        />
        <span>
          I reviewed the complete listing and included all essential
          requirements. The evidence and location assessment above are accurate
          to what I reviewed.
        </span>
      </label>
      <button
        className="jp-button jp-primary jp-full"
        disabled={
          busy ||
          !fullReview ||
          (eligibility === "confirmed" && !statement.trim())
        }
        onClick={() =>
          save({ requirements, eligibility, eligibilityEvidence: statement })
        }
      >
        <Check size={15} />
        Save fit review
      </button>
    </details>
  );
}
function ResearchEditor({
  job,
  busy,
  save,
}: {
  job: Job;
  busy: boolean;
  save: (patch: Partial<Job>) => Promise<boolean>;
}) {
  const [research, setResearch] = useState<JobResearch>(() =>
    structuredClone(
      job.research ?? { companyUrl: "", contacts: [], sources: [] },
    ),
  );
  const contact = (id: string, patch: Partial<CompanyContact>) =>
    setResearch((previous) => ({
      ...previous,
      contacts: previous.contacts.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  const source = (id: string, patch: Partial<JobSourceEvidence>) =>
    setResearch((previous) => ({
      ...previous,
      sources: previous.sources.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  const dateValue = (value: string) =>
    Number.isFinite(Date.parse(value))
      ? new Date(value).toISOString().slice(0, 16)
      : "";
  return (
    <details className="jp-fit-editor">
      <summary>
        <Globe2 size={15} />
        Company research & source evidence <ChevronRight size={14} />
      </summary>
      <p className="jp-quiet">
        {research.contacts.length} public contact routes ·{" "}
        {research.sources.length} source records. Keep the original URLs and the
        exact text you observed. A public profile identifies a possible route;
        it does not establish a referral relationship.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save({ research });
        }}
      >
        <fieldset disabled={busy}>
          <label className="jp-field">
            Company website
            <input
              type="url"
              value={research.companyUrl}
              onChange={(event) =>
                setResearch({ ...research, companyUrl: event.target.value })
              }
              placeholder="https://company.com"
              maxLength={2048}
            />
          </label>
          <h3>Public people & referral routes</h3>
          {research.contacts.map((item, index) => (
            <details className="jp-review-requirement" key={item.id}>
              <summary>
                {item.name || `New contact ${index + 1}`}
                {item.role ? ` · ${item.role}` : ""}
              </summary>
              {isPublicUrl(item.sourceUrl) && (
                <a
                  className="jp-text-button"
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View saved source <ArrowUpRight size={13} />
                </a>
              )}
              <div className="jp-field-row">
                <label>
                  Public name
                  <input
                    value={item.name}
                    onChange={(event) =>
                      contact(item.id, { name: event.target.value })
                    }
                    maxLength={200}
                  />
                </label>
                <label>
                  Published role
                  <input
                    value={item.role}
                    onChange={(event) =>
                      contact(item.id, { role: event.target.value })
                    }
                    maxLength={250}
                  />
                </label>
              </div>
              <label className="jp-field">
                Public profile URL, if available
                <input
                  type="url"
                  value={item.profileUrl}
                  onChange={(event) =>
                    contact(item.id, { profileUrl: event.target.value })
                  }
                  placeholder="https://…"
                  maxLength={2048}
                />
              </label>
              <label className="jp-field">
                Source URL supporting this contact
                <input
                  type="url"
                  value={item.sourceUrl}
                  onChange={(event) =>
                    contact(item.id, { sourceUrl: event.target.value })
                  }
                  placeholder="Public team page, professional profile, or job listing"
                  maxLength={2048}
                />
              </label>
              <label className="jp-field">
                Observed at (UTC)
                <input
                  type="datetime-local"
                  value={dateValue(item.capturedAt)}
                  onChange={(event) =>
                    contact(item.id, {
                      capturedAt: event.target.value
                        ? `${event.target.value}:00Z`
                        : "",
                    })
                  }
                />
              </label>
              <label className="jp-field">
                Possible referral or contact route
                <textarea
                  rows={2}
                  value={item.referralRoute}
                  onChange={(event) =>
                    contact(item.id, { referralRoute: event.target.value })
                  }
                  placeholder="Describe the publicly available route and what still needs to be established."
                  maxLength={1500}
                />
              </label>
              <label className="jp-field">
                Research notes
                <textarea
                  rows={2}
                  value={item.notes}
                  onChange={(event) =>
                    contact(item.id, { notes: event.target.value })
                  }
                  maxLength={2000}
                />
              </label>
              <button
                type="button"
                className="jp-text-button"
                onClick={() =>
                  setResearch({
                    ...research,
                    contacts: research.contacts.filter(
                      (entry) => entry.id !== item.id,
                    ),
                  })
                }
              >
                Remove contact
              </button>
            </details>
          ))}
          <button
            type="button"
            className="jp-button"
            disabled={research.contacts.length >= 20}
            onClick={() =>
              setResearch({
                ...research,
                contacts: [
                  ...research.contacts,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    role: "",
                    profileUrl: "",
                    sourceUrl: "",
                    referralRoute: "",
                    notes: "",
                    capturedAt: new Date().toISOString(),
                  },
                ],
              })
            }
          >
            <Plus size={14} />
            Add public contact
          </button>
          <div className="jp-divider" />
          <h3>Job description & source records</h3>
          <p className="jp-quiet">
            Save a real description, company page, or public profile with its
            URL. Screenshot links and paths refer to images already captured;
            adding a reference does not capture or upload an image.
          </p>
          {research.sources.map((item, index) => (
            <details className="jp-review-requirement" key={item.id}>
              <summary>{item.label || `New source ${index + 1}`}</summary>
              {isPublicUrl(item.url) && (
                <a
                  className="jp-text-button"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open saved source <ArrowUpRight size={13} />
                </a>
              )}
              <label className="jp-field">
                Source label
                <input
                  value={item.label}
                  onChange={(event) =>
                    source(item.id, { label: event.target.value })
                  }
                  placeholder="Original job listing, company careers page…"
                  maxLength={200}
                />
              </label>
              <label className="jp-field">
                Provenance URL
                <input
                  type="url"
                  value={item.url}
                  onChange={(event) =>
                    source(item.id, { url: event.target.value })
                  }
                  placeholder="https://…"
                  maxLength={2048}
                />
              </label>
              <label className="jp-field">
                Captured at (UTC)
                <input
                  type="datetime-local"
                  value={dateValue(item.capturedAt)}
                  onChange={(event) =>
                    source(item.id, {
                      capturedAt: event.target.value
                        ? `${event.target.value}:00Z`
                        : "",
                    })
                  }
                />
              </label>
              <label className="jp-field">
                Captured text
                <textarea
                  rows={5}
                  value={item.text}
                  onChange={(event) =>
                    source(item.id, { text: event.target.value })
                  }
                  placeholder="Paste the exact job description or source excerpt you captured."
                  maxLength={20000}
                />
              </label>
              <label className="jp-field">
                Screenshot HTTPS URL, if already captured
                <input
                  type="url"
                  value={item.screenshotUrl}
                  onChange={(event) =>
                    source(item.id, {
                      screenshotUrl: event.target.value,
                      ...(event.target.value ? { screenshotPath: "" } : {}),
                    })
                  }
                  placeholder="https://…"
                  maxLength={2048}
                />
              </label>
              {isPublicUrl(item.screenshotUrl) && (
                <a
                  className="jp-text-button"
                  href={item.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open saved screenshot <ArrowUpRight size={13} />
                </a>
              )}
              <label className="jp-field">
                Or screenshot file path (reference only)
                <input
                  value={item.screenshotPath}
                  onChange={(event) =>
                    source(item.id, {
                      screenshotPath: event.target.value,
                      ...(event.target.value ? { screenshotUrl: "" } : {}),
                    })
                  }
                  placeholder="/absolute/path/to/captured-image.png"
                  maxLength={2048}
                />
              </label>
              <button
                type="button"
                className="jp-text-button"
                onClick={() =>
                  setResearch({
                    ...research,
                    sources: research.sources.filter(
                      (entry) => entry.id !== item.id,
                    ),
                  })
                }
              >
                Remove source record
              </button>
            </details>
          ))}
          <button
            type="button"
            className="jp-button"
            disabled={research.sources.length >= 10}
            onClick={() =>
              setResearch({
                ...research,
                sources: [
                  ...research.sources,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    url: "",
                    text: "",
                    capturedAt: new Date().toISOString(),
                    screenshotUrl: "",
                    screenshotPath: "",
                  },
                ],
              })
            }
          >
            <Plus size={14} />
            Add source record
          </button>
          <div className="jp-divider" />
          {job.status === "approved" && (
            <p className="jp-quiet">
              Changes to the research attached to this draft require approval
              again.
            </p>
          )}
          <button className="jp-button jp-primary" type="submit">
            <Check size={15} />
            Save company research
          </button>
        </fieldset>
      </form>
    </details>
  );
}
function NextStepEditor({
  job,
  busy,
  save,
}: {
  job: Job;
  busy: boolean;
  save: (patch: Partial<Job>) => Promise<boolean>;
}) {
  const [next, setNext] = useState(job.nextAction);
  const [date, setDate] = useState(job.nextActionDate?.slice(0, 10) || "");
  const [notes, setNotes] = useState(job.notes);
  return (
    <details className="jp-fit-editor">
      <summary>
        <Clock3Icon size={15} /> Notes & next step <ChevronRight size={14} />
      </summary>
      <label className="jp-field">
        Next action
        <input value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="jp-field">
        Due date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="jp-field">
        Job notes
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button
        disabled={busy}
        className="jp-button"
        onClick={() =>
          save({
            nextAction: next,
            nextActionDate: date ? `${date}T12:00:00+05:00` : null,
            notes,
          })
        }
      >
        Save next step
      </button>
    </details>
  );
}
const Clock3Icon = CircleDot;
function ListingEditor({
  job,
  busy,
  save,
}: {
  job: Job;
  busy: boolean;
  save: (patch: Partial<Job>) => Promise<boolean>;
}) {
  const [fields, setFields] = useState({
    company: job.company,
    title: job.title,
    url: job.url,
    location: job.location,
    salary: job.salary,
    description: job.description,
  });
  return (
    <details className="jp-fit-editor">
      <summary>
        <FileText size={15} />
        Edit listing details <ChevronRight size={14} />
      </summary>
      {(["company", "title", "url", "location", "salary"] as const).map(
        (key) => (
          <label className="jp-field" key={key}>
            {key === "url"
              ? "Original listing URL"
              : key[0].toUpperCase() + key.slice(1)}
            <input
              type={key === "url" ? "url" : "text"}
              value={fields[key]}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
            />
          </label>
        ),
      )}
      <label className="jp-field">
        Full job description
        <textarea
          rows={7}
          value={fields.description}
          onChange={(e) =>
            setFields({ ...fields, description: e.target.value })
          }
        />
      </label>
      <button
        className="jp-button"
        disabled={busy}
        onClick={() => save(fields)}
      >
        Save listing details
      </button>
    </details>
  );
}
