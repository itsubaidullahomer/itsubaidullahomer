import type {
  Activity,
  CandidateProfile,
  Fit,
  Job,
  Requirement,
  Workspace,
  WorkspaceAction,
} from "./types";
import { STATUS_LABELS } from "./types";
import { assertJobResearch, assertProfile } from "./validation";

const fits: Fit[] = ["strong", "gaps", "unknown", "stretch"];
const statuses = Object.keys(STATUS_LABELS);
const priorities = ["high", "medium", "low"];
const eligibilityOrder = ["confirmed", "unknown", "ineligible"];
const uuid = () => globalThis.crypto.randomUUID();
const timestamp = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

/** Fit describes requirements, not a probability of receiving an offer. */
export function deriveFit(requirements: Requirement[]): Fit {
  const essential = requirements.filter((item) => item.essential);
  if (!essential.length) return "unknown";
  const gaps = essential.filter((item) => item.assessment === "gap").length;
  if (gaps) return gaps / essential.length >= 0.5 ? "stretch" : "gaps";
  if (
    essential.some(
      (item) =>
        item.assessment !== "met" ||
        !item.evidenceIds.length ||
        !item.explanation.trim(),
    )
  )
    return "unknown";
  return requirements.some(
    (item) => !item.essential && item.assessment === "gap",
  )
    ? "gaps"
    : "strong";
}

/** Compensation is deliberately absent from ranking. Eligibility remains a distinct field. */
export function sortJobs(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) =>
      fits.indexOf(a.fit) - fits.indexOf(b.fit) ||
      eligibilityOrder.indexOf(a.eligibility) -
        eligibilityOrder.indexOf(b.eligibility) ||
      priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
      b.discoveredAt.localeCompare(a.discoveredAt) ||
      a.id.localeCompare(b.id),
  );
}

/** Remove tracking only; retain ATS query parameters that identify the actual job. */
export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (
        /^utm_/i.test(key) ||
        /^(ref|referrer|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)
      )
        url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
}

export function validateJob(value: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { valid: false, errors: ["Job must be an object."] };
  const job = value as Job;
  for (const field of ["id", "company", "title", "url", "source"] as const) {
    if (typeof job[field] !== "string" || !job[field].trim())
      errors.push(`${field} is required.`);
  }
  for (const field of [
    "location",
    "salary",
    "description",
    "sourceId",
    "eligibilityEvidence",
    "notes",
    "nextAction",
    "draft",
    "contactEmail",
  ] as const) {
    if (typeof job[field] !== "string") errors.push(`${field} must be text.`);
  }
  if (
    typeof job.url === "string" &&
    (!normalizeUrl(job.url) || job.url.length > 2048)
  )
    errors.push("Use a valid HTTP or HTTPS job URL.");
  if (typeof job.description === "string" && job.description.length > 50000)
    errors.push("Description exceeds 50,000 characters.");
  if (typeof job.draft === "string" && job.draft.length > 20000)
    errors.push("Draft exceeds 20,000 characters.");
  if (typeof job.notes === "string" && job.notes.length > 20000)
    errors.push("Notes exceed 20,000 characters.");
  if (job.research !== undefined) {
    try {
      assertJobResearch(job.research);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Invalid company research.",
      );
    }
  }
  if (!statuses.includes(job.status)) errors.push("Invalid status.");
  if (!priorities.includes(job.priority)) errors.push("Invalid priority.");
  if (!fits.includes(job.fit)) errors.push("Invalid fit.");
  if (!eligibilityOrder.includes(job.eligibility))
    errors.push("Invalid eligibility.");
  if (!timestamp(job.discoveredAt) || !timestamp(job.updatedAt))
    errors.push("Valid discovery and update dates are required.");
  if (job.appliedAt !== null && !timestamp(job.appliedAt))
    errors.push("Invalid application date.");
  if (job.nextActionDate !== null && !timestamp(job.nextActionDate))
    errors.push("Invalid next action date.");
  if (
    typeof job.contactEmail === "string" &&
    job.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.contactEmail)
  )
    errors.push("Invalid contact email.");
  if (
    !Array.isArray(job.tags) ||
    job.tags.length > 30 ||
    job.tags.some((tag) => typeof tag !== "string" || tag.length > 100)
  )
    errors.push("Invalid tags.");
  if (!Array.isArray(job.requirements) || job.requirements.length > 100)
    errors.push("Invalid requirements.");
  else {
    const ids = new Set<string>();
    for (const item of job.requirements) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !item.id ||
        ids.has(item.id) ||
        typeof item.text !== "string" ||
        !item.text.trim() ||
        typeof item.essential !== "boolean" ||
        !["met", "gap", "unknown"].includes(item.assessment) ||
        !Array.isArray(item.evidenceIds) ||
        item.evidenceIds.some((id) => typeof id !== "string") ||
        typeof item.explanation !== "string"
      )
        errors.push(
          "Each requirement needs a unique id, text and valid assessment.",
        );
      else ids.add(item.id);
    }
  }
  return { valid: errors.length === 0, errors };
}

function prepareJob(value: Job, profile: CandidateProfile, now: string): Job {
  const validation = validateJob(value);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const evidenceIds = new Set(
    profile.evidence
      .filter((item) => item.statement.trim() && item.source.trim())
      .map((item) => item.id),
  );
  const requirements = value.requirements.map((item) => {
    const validIds = item.evidenceIds.filter((id) => evidenceIds.has(id));
    return {
      ...item,
      evidenceIds: validIds,
      assessment:
        item.assessment === "met" && !validIds.length
          ? ("unknown" as const)
          : item.assessment,
    };
  });
  return {
    ...value,
    requirements,
    fit: deriveFit(requirements),
    url: normalizeUrl(value.url),
    updatedAt: now,
  };
}

function duplicate(jobs: Job[], job: Job, except?: string): boolean {
  return jobs.some(
    (existing) =>
      existing.id !== except &&
      (existing.id === job.id ||
        normalizeUrl(existing.url) === normalizeUrl(job.url) ||
        (job.sourceId &&
          existing.source === job.source &&
          existing.sourceId === job.sourceId)),
  );
}

function approvalSnapshot(job: Job, profile: CandidateProfile): string {
  return `Draft approved. Submission has not happened.\n\nApproved snapshot:\n${JSON.stringify({ draft: job.draft, recipient: job.contactEmail, job: { id: job.id, company: job.company, title: job.title, url: job.url, description: job.description, location: job.location, eligibility: job.eligibility, eligibilityEvidence: job.eligibilityEvidence, requirements: job.requirements, fit: job.fit, research: job.research }, candidate: { name: profile.name, email: profile.email, portfolio: profile.portfolio, evidence: profile.evidence } }, null, 2)}`;
}

/** All mutations are local record changes. This function never sends an application or email. */
export function applyAction(
  workspace: Workspace,
  action: WorkspaceAction,
  now = new Date().toISOString(),
): Workspace {
  const next = structuredClone(workspace);
  const activity = (
    type: Activity["type"],
    jobId: string | null,
    title: string,
    body = "",
    actor: Activity["actor"] = "you",
  ) => {
    next.activities.unshift({
      id: uuid(),
      type,
      jobId,
      title,
      body,
      actor,
      createdAt: now,
    });
  };
  switch (action.type) {
    case "add_job": {
      const job = prepareJob(structuredClone(action.job), next.profile, now);
      if (duplicate(next.jobs, job))
        throw new Error("This job is already in your workspace.");
      if (
        job.status === "approved" &&
        (!job.draft.trim() || job.eligibility !== "confirmed")
      )
        throw new Error(
          "A draft and confirmed Pakistan eligibility are required before approval.",
        );
      if (job.status === "applied") job.appliedAt ||= now;
      next.jobs.push(job);
      activity(
        "discovery",
        job.id,
        "Job added",
        `${job.title} at ${job.company}`,
      );
      if (job.research)
        activity(
          "note",
          job.id,
          "Company research added",
          JSON.stringify({ previous: null, current: job.research }, null, 2),
        );
      if (job.status === "approved")
        activity(
          "approval",
          job.id,
          "Draft approved",
          approvalSnapshot(job, next.profile),
        );
      if (job.status === "applied")
        activity(
          "status",
          job.id,
          "Application recorded manually",
          "You recorded an application submitted outside this portal.",
        );
      break;
    }
    case "update_job": {
      const index = next.jobs.findIndex((job) => job.id === action.id);
      if (index < 0) throw new Error("Job not found.");
      const previous = next.jobs[index];
      const job = prepareJob(
        {
          ...previous,
          ...structuredClone(action.patch),
          id: previous.id,
          discoveredAt: previous.discoveredAt,
        },
        next.profile,
        now,
      );
      if (previous.appliedAt) job.appliedAt = previous.appliedAt;
      if (duplicate(next.jobs, job, job.id))
        throw new Error("This job URL is already in your workspace.");
      const contextChanged = (
        ["company", "title", "url", "description"] as const
      ).some((field) => job[field] !== previous[field]);
      if (contextChanged) {
        job.requirements = job.requirements.map((item) => ({
          ...item,
          assessment: "unknown",
          explanation:
            "The job details changed. Confirm this requirement still applies and reassess its supporting evidence against the updated listing.",
        }));
        job.fit = deriveFit(job.requirements);
      }
      if (contextChanged || job.location !== previous.location) {
        job.eligibility = "unknown";
        job.eligibilityEvidence =
          "The job details or location changed. Review the updated employer listing for Pakistan eligibility, residency, and work-authorization conditions.";
      }
      const researchChanged =
        JSON.stringify(job.research) !== JSON.stringify(previous.research);
      if (job.status === "approved" && !job.draft.trim())
        throw new Error("Prepare a draft before approving it.");
      if (
        job.status === "approved" &&
        previous.status !== "approved" &&
        job.eligibility !== "confirmed"
      )
        throw new Error(
          "Confirm Pakistan eligibility before approving this draft.",
        );
      // Editing approved content requires approval again; it cannot inherit the previous approval.
      if (
        previous.status === "approved" &&
        (researchChanged ||
          job.draft !== previous.draft ||
          job.eligibility !== previous.eligibility ||
          job.url !== previous.url ||
          job.company !== previous.company ||
          job.title !== previous.title ||
          job.description !== previous.description ||
          job.location !== previous.location ||
          job.contactEmail !== previous.contactEmail ||
          JSON.stringify(job.requirements) !==
            JSON.stringify(previous.requirements))
      )
        job.status = "needs_approval";
      if (job.status === "applied" && previous.status !== "applied")
        job.appliedAt ||= now;
      if (job.status !== previous.status) {
        activity(
          job.status === "approved" ? "approval" : "status",
          job.id,
          job.status === "applied"
            ? "Application recorded manually"
            : `Status changed to ${STATUS_LABELS[job.status]}`,
          job.status === "applied"
            ? "You recorded an application submitted outside this portal. No application was sent by this action."
            : job.status === "approved"
              ? approvalSnapshot(job, next.profile)
              : `${STATUS_LABELS[previous.status]} → ${STATUS_LABELS[job.status]}`,
        );
      }
      if (job.draft !== previous.draft)
        activity(
          "draft",
          job.id,
          "Application draft updated",
          JSON.stringify(
            { previous: previous.draft, current: job.draft },
            null,
            2,
          ),
        );
      if (job.notes !== previous.notes)
        activity(
          "note",
          job.id,
          "Job notes updated",
          JSON.stringify(
            { previous: previous.notes, current: job.notes },
            null,
            2,
          ),
        );
      if (researchChanged)
        activity(
          "note",
          job.id,
          "Company research updated",
          JSON.stringify(
            {
              previous: previous.research ?? null,
              current: job.research ?? null,
            },
            null,
            2,
          ),
        );
      if (
        JSON.stringify(job.requirements) !==
        JSON.stringify(previous.requirements)
      )
        activity(
          "note",
          job.id,
          "Requirement evidence updated",
          JSON.stringify(
            {
              previous: previous.requirements,
              current: job.requirements,
              fit: job.fit,
            },
            null,
            2,
          ),
        );
      if (job.priority !== previous.priority)
        activity(
          "note",
          job.id,
          "Priority updated",
          `${previous.priority} → ${job.priority}`,
        );
      if (
        job.eligibility !== previous.eligibility ||
        job.eligibilityEvidence !== previous.eligibilityEvidence
      )
        activity(
          "note",
          job.id,
          "Location eligibility updated",
          JSON.stringify(
            {
              previous: {
                eligibility: previous.eligibility,
                evidence: previous.eligibilityEvidence,
              },
              current: {
                eligibility: job.eligibility,
                evidence: job.eligibilityEvidence,
              },
            },
            null,
            2,
          ),
        );
      if (
        job.nextAction !== previous.nextAction ||
        job.nextActionDate !== previous.nextActionDate
      )
        activity(
          "note",
          job.id,
          "Next action updated",
          JSON.stringify(
            {
              previous: {
                action: previous.nextAction,
                date: previous.nextActionDate,
              },
              current: { action: job.nextAction, date: job.nextActionDate },
            },
            null,
            2,
          ),
        );
      const detailChanges: Record<
        string,
        { previous: unknown; current: unknown }
      > = {};
      for (const field of [
        "company",
        "title",
        "url",
        "description",
        "location",
        "contactEmail",
        "salary",
        "source",
        "sourceId",
        "tags",
      ] as const) {
        if (JSON.stringify(job[field]) !== JSON.stringify(previous[field]))
          detailChanges[field] = {
            previous: previous[field],
            current: job[field],
          };
      }
      if (Object.keys(detailChanges).length)
        activity(
          "note",
          job.id,
          "Job details updated",
          JSON.stringify(detailChanges, null, 2),
        );
      next.jobs[index] = job;
      break;
    }
    case "add_activity": {
      const record = structuredClone(action.activity);
      if (!record.title?.trim() || !record.body?.trim())
        throw new Error("Activity needs a title and a note.");
      if (record.jobId && !next.jobs.some((job) => job.id === record.jobId))
        throw new Error("Activity job not found.");
      if (!["note", "email_sent", "email_received"].includes(record.type))
        throw new Error(
          "Use the relevant action to record a status, draft, or approval.",
        );
      if (record.body.length > 20000)
        throw new Error("Activity exceeds 20,000 characters.");
      // Mail entries here are explicit manual records, never a fabricated integration event.
      next.activities.unshift({
        ...record,
        id: uuid(),
        actor: "you",
        createdAt: now,
        title: record.type.startsWith("email_")
          ? `${record.title} (manual record)`
          : record.title,
      });
      break;
    }
    case "update_profile": {
      const profile = structuredClone(action.profile);
      assertProfile(profile);
      if (!profile.name?.trim() || !Array.isArray(profile.evidence))
        throw new Error("A name and an evidence list are required.");
      const ids = new Set<string>();
      for (const item of profile.evidence) {
        if (
          !item.id ||
          ids.has(item.id) ||
          typeof item.statement !== "string" ||
          typeof item.source !== "string" ||
          typeof item.skill !== "string" ||
          !["working", "proficient", "advanced", "unverified"].includes(
            item.level,
          ) ||
          typeof item.verified !== "boolean"
        )
          throw new Error("Profile evidence is invalid or has duplicate ids.");
        ids.add(item.id);
      }
      profile.preferences = {
        ...profile.preferences,
        salaryFloor: null,
        country: "Pakistan",
        remotePriority: profile.preferences.remotePriority ?? true,
        overseasOnsite: "sponsorship_required",
        strongFitFirst: true,
      };
      profile.updatedAt = now;
      const previousProfile = next.profile;
      const changedIds = new Set(
        previousProfile.evidence
          .filter(
            (old) =>
              JSON.stringify(old) !==
              JSON.stringify(
                profile.evidence.find((item) => item.id === old.id),
              ),
          )
          .map((item) => item.id),
      );
      next.profile = profile;
      next.jobs = next.jobs.map((job) =>
        prepareJob(
          {
            ...job,
            status: job.status === "approved" ? "needs_approval" : job.status,
            requirements: job.requirements.map((item) =>
              item.evidenceIds.some((id) => changedIds.has(id))
                ? {
                    ...item,
                    assessment: "unknown",
                    explanation:
                      "The linked profile evidence changed. Review this requirement again.",
                  }
                : item,
            ),
          },
          profile,
          now,
        ),
      );
      activity(
        "profile",
        null,
        "Candidate profile updated",
        `Affected requirement matches need review again.\n\n${JSON.stringify({ previous: previousProfile, current: profile }, null, 2)}`,
      );
      break;
    }
    case "import_jobs": {
      let added = 0;
      for (const value of action.jobs.slice(0, 100)) {
        const job = prepareJob(
          {
            ...structuredClone(value),
            status: "discovered",
            appliedAt: null,
            draft: "",
          },
          next.profile,
          now,
        );
        if (duplicate(next.jobs, job)) continue;
        next.jobs.push(job);
        added += 1;
        activity(
          "discovery",
          job.id,
          "Opportunity discovered",
          `${job.source} · ${job.title} at ${job.company}. Requirement review is still needed.`,
          "agent",
        );
      }
      const run = { ...structuredClone(action.run), added };
      next.runs.unshift(run);
      activity(
        "agent",
        null,
        "Discovery run completed",
        `${added} new opportunities added. ${action.jobs.length - added} already recorded or beyond the import limit.`,
        "system",
      );
      break;
    }
    default:
      throw new Error("Unsupported workspace action.");
  }
  return next;
}

/** A transparent template using only existing, editable profile statements. No model/API call. */
export function draftApplication(job: Job, profile: CandidateProfile): string {
  const referenced = new Set(
    job.requirements
      .filter((item) => item.assessment === "met")
      .flatMap((item) => item.evidenceIds),
  );
  const claims = profile.evidence
    .filter(
      (item) =>
        referenced.has(item.id) && item.statement.trim() && item.source.trim(),
    )
    .slice(0, 4);
  const greeting = `Hello ${job.company} team,`;
  const opening = `I’m ${profile.name}, applying for the ${job.title} position.`;
  const experience = claims.length
    ? `Relevant experience from my portfolio:\n${claims.map((item) => `• ${item.statement}`).join("\n")}`
    : "I would welcome the chance to discuss how my experience could contribute to your team.";
  return [
    greeting,
    opening,
    experience,
    `I’m based in ${profile.location}${profile.preferences.remoteOnly ? " and looking for remote work" : ""}. You can review my work at ${profile.portfolio}.`,
    "Thank you for considering my application.",
    `${profile.name}${profile.email ? `\n${profile.email}` : ""}`,
  ].join("\n\n");
}
