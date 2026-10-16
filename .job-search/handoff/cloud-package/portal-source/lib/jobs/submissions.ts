import { deriveFit } from "./domain";
import {
  assertDocumentId,
  assertDocumentJobId,
  type JobDocument,
} from "./documents";
import type { CandidateProfile, Job } from "./types";
import { isPublicUrl, PortalError } from "./validation";

/** A receipt records a completed external action; this module never sends an application. */
export interface SubmissionInput {
  id: string;
  jobId: string;
  documentId: string;
  channel: "employer_form" | "email";
  destination: string;
  submittedAt: string;
  confirmation: string;
  receiptUrl: string;
  actor: "you" | "agent";
}
export interface SubmissionReceipt extends SubmissionInput {
  resumeSha256: string;
  resumeFilename: string;
  recordedAt: string;
}
const controls = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
export function parseSubmission(
  value: unknown,
  now = Date.now(),
): SubmissionInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PortalError("Enter a completed application's receipt.");
  const row = value as Record<string, unknown>;
  const keys = [
    "id",
    "jobId",
    "documentId",
    "channel",
    "destination",
    "submittedAt",
    "confirmation",
    "receiptUrl",
    "actor",
  ];
  if (
    Object.keys(row).some((key) => !keys.includes(key)) ||
    keys.some((key) => typeof row[key] !== "string")
  )
    throw new PortalError(
      "The receipt contains missing or unsupported fields.",
    );
  const input = row as unknown as SubmissionInput;
  assertDocumentId(input.id);
  assertDocumentId(input.documentId);
  assertDocumentJobId(input.jobId);
  if (
    !["you", "agent"].includes(input.actor) ||
    !["employer_form", "email"].includes(input.channel)
  )
    throw new PortalError(
      "Choose who submitted the application and its channel.",
    );
  if (
    input.channel === "email"
      ? input.destination.length > 254 ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.destination)
      : !isPublicUrl(input.destination)
  )
    throw new PortalError(
      "Enter the recipient email or public HTTPS application URL.",
    );
  if (input.receiptUrl && !isPublicUrl(input.receiptUrl))
    throw new PortalError("Use a public HTTPS receipt link or leave it empty.");
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      input.submittedAt,
    ) ||
    !Number.isFinite(Date.parse(input.submittedAt)) ||
    Date.parse(input.submittedAt) > now + 300_000
  )
    throw new PortalError(
      "Enter the actual submission time, including its time zone.",
    );
  if (
    !input.confirmation.trim() ||
    input.confirmation.length > 4000 ||
    controls.test(input.confirmation)
  )
    throw new PortalError(
      "Add the confirmation message or receipt reference, up to 4,000 characters.",
    );
  return {
    ...input,
    confirmation: input.confirmation.trim(),
    submittedAt: new Date(input.submittedAt).toISOString(),
  };
}

export function assertSubmissionResume(
  input: SubmissionInput,
  document: JobDocument,
): void {
  if (
    document.id !== input.documentId ||
    document.jobId !== input.jobId ||
    document.kind !== "tailored_resume" ||
    document.mime !== "application/pdf" ||
    !/^[a-f0-9]{64}$/.test(document.sha256) ||
    document.size < 1 ||
    document.size > 3_800_000
  )
    throw new PortalError(
      "Choose the saved tailored PDF for this exact opportunity.",
      409,
    );
}

export function assertAgentSubmission(
  input: SubmissionInput,
  job: Job,
  profile: CandidateProfile,
): void {
  if (input.actor !== "agent") return;
  if (
    job.eligibility !== "confirmed" ||
    !job.eligibilityEvidence.trim() ||
    job.fit !== "strong" ||
    deriveFit(job.requirements) !== "strong" ||
    job.requirements.some(
      (requirement) =>
        requirement.essential &&
        requirement.evidenceIds.some(
          (id) =>
            !profile.evidence.some(
              (evidence) =>
                evidence.id === id &&
                evidence.statement.trim() &&
                evidence.source.trim() &&
                ["working", "proficient", "advanced", "unverified"].includes(
                  evidence.level,
                ),
            ),
        ),
    )
  )
    throw new PortalError(
      "Agent submissions require confirmed eligibility and evidence-backed strong fit.",
      409,
    );
  if (profile.preferences.approvalRequired && job.status !== "approved")
    throw new PortalError(
      "Your saved submission policy requires approval first.",
      409,
    );
}

export function submissionRecord(
  row: Record<string, unknown>,
): SubmissionReceipt {
  return {
    id: row.id,
    jobId: row.job_id,
    documentId: row.document_id,
    channel: row.channel,
    destination: row.destination,
    submittedAt: row.submitted_at,
    confirmation: row.confirmation,
    receiptUrl: row.receipt_url,
    actor: row.actor,
    resumeSha256: row.resume_sha256,
    resumeFilename: row.resume_filename,
    recordedAt: row.recorded_at,
  } as SubmissionReceipt;
}
