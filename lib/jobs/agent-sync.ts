import type { Activity, Job, Workspace } from "./types";
import { applyAction, normalizeUrl } from "./domain";
import { assertJob } from "./validation";

/**
 * One application Claude sent or recorded outside the portal, kept in the repository as a confirmed record.
 * To record more, append to data/agent-sync/applications.json and give the batch a new id: entries already
 * applied are skipped, so only the new ones are added. When an employer declines, add an `outcome` to that entry
 * in the next batch to close the job. Then deploy the portal to production.
 */
export type AgentApplication = {
  key: string;
  matchIds: string[];
  company: string;
  title: string;
  url: string;
  location: string;
  channel: "email" | "employer_form";
  contactEmail: string;
  appliedAt: string;
  gmailMessageId: string;
  note: string;
  nextAction: string;
  nextActionDate: string;
  /** The employer's decision, once one arrives. It only moves a job that is still Applied. */
  outcome?: AgentOutcome;
};
export type AgentOutcome = {
  status: "rejected";
  receivedAt: string;
  from: string;
  gmailMessageId: string;
  note: string;
};
export type AgentBatch = {
  id: string;
  recordedAt: string;
  applications: AgentApplication[];
};
export type AgentSyncPlan = {
  workspace: Workspace;
  changed: boolean;
  added: string[];
  updated: string[];
  closed: string[];
  skipped: string[];
  failed: { key: string; error: string }[];
};

// Later stages already carry the application; the sync never moves a job backwards.
const PAST_APPLICATION = new Set(["applied", "interview", "offer", "rejected"]);

export const agentBatchMarker = (id: string) => `Claude sync: ${id}`;

function findExisting(jobs: Job[], app: AgentApplication): Job | undefined {
  const url = normalizeUrl(app.url);
  return (
    jobs.find((job) => app.matchIds.includes(job.id)) ??
    jobs.find((job) => normalizeUrl(job.url) === url)
  );
}

function newJob(app: AgentApplication, now: string): Job {
  return {
    id: `agent-${app.key}`,
    company: app.company,
    title: app.title,
    url: app.url,
    location: app.location,
    salary: "",
    description: `${app.title} at ${app.company}. Added from Claude's confirmed application records.`,
    source: "Claude application record",
    sourceId: app.gmailMessageId,
    discoveredAt: app.appliedAt,
    updatedAt: now,
    status: "applied",
    priority: "medium",
    fit: "unknown",
    eligibility: "unknown",
    eligibilityEvidence: "",
    requirements: [],
    tags: [
      "applied-by-claude",
      app.channel === "email" ? "email-application" : "employer-form",
    ],
    notes: app.note,
    nextAction: app.nextAction,
    nextActionDate: app.nextActionDate,
    draft: "",
    contactEmail: app.contactEmail,
    appliedAt: app.appliedAt,
  };
}

function recordOutcome(
  workspace: Workspace,
  jobId: string,
  outcome: AgentOutcome,
  records: Activity[],
  now: string,
): Workspace {
  const job = workspace.jobs.find((item) => item.id === jobId)!;
  const patch: Partial<Job> = {
    status: outcome.status,
    notes: job.notes.trim() ? `${job.notes}\n\n${outcome.note}` : outcome.note,
    nextAction: "",
    nextActionDate: null,
  };
  assertJob({ ...job, ...patch });
  // The decision is newer than the application, so it goes above it in the history.
  records.unshift({
    id: globalThis.crypto.randomUUID(),
    jobId,
    type: "email_received",
    title: `Decision received from ${outcome.from}`,
    body: outcome.note,
    actor: "agent",
    createdAt: now,
  });
  return applyAction(workspace, { type: "update_job", id: jobId, patch }, now);
}

/**
 * Adds or marks each recorded application as Applied, once per batch, and closes the ones with a decision.
 * Pure: the caller saves the returned workspace. Existing history, drafts and approvals are kept.
 */
export function planAgentSync(
  workspace: Workspace,
  batch: AgentBatch,
  now = new Date().toISOString(),
): AgentSyncPlan {
  const marker = agentBatchMarker(batch.id);
  const plan: AgentSyncPlan = {
    workspace,
    changed: false,
    added: [],
    updated: [],
    closed: [],
    skipped: [],
    failed: [],
  };
  if (workspace.activities.some((item) => item.type === "agent" && item.title === marker))
    return plan;
  let next = workspace;
  const records: Activity[] = [];
  for (const app of batch.applications) {
    try {
      const existing = findExisting(next.jobs, app);
      let jobId: string;
      if (existing) {
        if (PAST_APPLICATION.has(existing.status)) {
          if (app.outcome && existing.status === "applied") {
            next = recordOutcome(next, existing.id, app.outcome, records, now);
            plan.closed.push(app.key);
          } else plan.skipped.push(app.key);
          continue;
        }
        const patch: Partial<Job> = {
          status: "applied",
          appliedAt: existing.appliedAt ?? app.appliedAt,
          notes: existing.notes.trim() ? `${existing.notes}\n\n${app.note}` : app.note,
          nextAction: app.nextAction,
          nextActionDate: app.nextActionDate,
        };
        // Changing the recipient of an approved draft would send it back for approval.
        if (!existing.contactEmail && existing.status !== "approved")
          patch.contactEmail = app.contactEmail;
        assertJob({ ...existing, ...patch });
        next = applyAction(next, { type: "update_job", id: existing.id, patch }, now);
        jobId = existing.id;
        plan.updated.push(app.key);
      } else {
        const job = newJob(app, now);
        assertJob(job);
        next = applyAction(next, { type: "add_job", job }, now);
        jobId = job.id;
        plan.added.push(app.key);
      }
      records.push({
        id: globalThis.crypto.randomUUID(),
        jobId,
        type: app.channel === "email" ? "email_sent" : "agent",
        title:
          app.channel === "email"
            ? `Application emailed to ${app.contactEmail}`
            : "Employer receipt recorded",
        body: app.note,
        actor: "agent",
        createdAt: now,
      });
      if (app.outcome) {
        next = recordOutcome(next, jobId, app.outcome, records, now);
        plan.closed.push(app.key);
      }
    } catch (error) {
      plan.failed.push({
        key: app.key,
        error: error instanceof Error ? error.message : "Could not apply this record.",
      });
    }
  }
  if (next === workspace) next = structuredClone(workspace);
  const summary = [
    `Added ${plan.added.length}, marked applied ${plan.updated.length}, closed ${plan.closed.length}, already recorded ${plan.skipped.length}.`,
    ...plan.failed.map((item) => `Not applied: ${item.key} (${item.error})`),
  ].join("\n");
  next.activities.unshift(...records, {
    id: globalThis.crypto.randomUUID(),
    jobId: null,
    type: "agent",
    title: marker,
    body: summary,
    actor: "agent",
    createdAt: now,
  });
  plan.workspace = next;
  plan.changed = true;
  return plan;
}
