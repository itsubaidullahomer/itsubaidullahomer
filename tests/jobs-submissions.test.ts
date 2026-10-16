import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSubmission,
  assertSubmissionResume,
  assertAgentSubmission,
  submissionRecord,
  type SubmissionInput,
} from "../lib/jobs/submissions";
import { demoWorkspace } from "../lib/jobs/seed";
import type { JobDocument } from "../lib/jobs/documents";

const now = Date.parse("2026-10-15T10:00:00Z");
const input = (): SubmissionInput => ({
  id: "11111111-1111-4111-8111-111111111111",
  jobId: "job:example",
  documentId: "22222222-2222-4222-8222-222222222222",
  channel: "employer_form",
  destination: "https://careers.example.com/apply/42",
  submittedAt: "2026-10-15T14:00:00+05:00",
  confirmation: "Your application has been received. Reference 42.",
  receiptUrl: "",
  actor: "you",
});
const document = (): JobDocument => ({
  id: input().documentId,
  jobId: input().jobId,
  kind: "tailored_resume",
  title: "Role-specific resume",
  filename: "tailored.pdf",
  mime: "application/pdf",
  size: 2048,
  sha256: "a".repeat(64),
  createdAt: new Date(now).toISOString(),
});

test("submission receipt validates required identity and confirmation and normalizes actual time", () => {
  const parsed = parseSubmission(input(), now);
  assert.equal(parsed.id, input().id);
  assert.equal(parsed.submittedAt, "2026-10-15T09:00:00.000Z");
  for (const field of Object.keys(input())) {
    const value: Record<string, unknown> = { ...input() };
    delete value[field];
    assert.throws(() => parseSubmission(value, now));
  }
  assert.throws(() => parseSubmission({ ...input(), status: "applied" }, now));
  assert.throws(() => parseSubmission({ ...input(), id: "same-id" }, now));
  assert.throws(() => parseSubmission({ ...input(), actor: "system" }, now));
  assert.throws(() => parseSubmission({ ...input(), confirmation: " " }, now));
  assert.throws(() =>
    parseSubmission({ ...input(), confirmation: "x".repeat(4001) }, now),
  );
  assert.throws(() =>
    parseSubmission({ ...input(), confirmation: "ref\u0000bad" }, now),
  );
  assert.throws(() =>
    parseSubmission({ ...input(), submittedAt: "2026-10-15T10:06:00Z" }, now),
  );
  assert.throws(() =>
    parseSubmission({ ...input(), submittedAt: "October 15, 2026" }, now),
  );
});

test("submission channels reject unsafe destinations and receipt links", () => {
  for (const destination of [
    "http://careers.example.com",
    "javascript:alert(1)",
    "https://me:secret@example.com",
    "https://127.0.0.1/apply",
  ]) {
    assert.throws(() => parseSubmission({ ...input(), destination }, now));
    assert.throws(() =>
      parseSubmission({ ...input(), receiptUrl: destination }, now),
    );
  }
  assert.equal(
    parseSubmission(
      { ...input(), channel: "email", destination: "hiring@example.com" },
      now,
    ).channel,
    "email",
  );
  for (const destination of [
    "bad",
    "hiring@example.com\r\nBcc:someone@example.com",
    "Name <hiring@example.com>",
  ])
    assert.throws(() =>
      parseSubmission({ ...input(), channel: "email", destination }, now),
    );
});

test("exact resume binding rejects masters, images, wrong opportunities and corrupt metadata", () => {
  assert.doesNotThrow(() => assertSubmissionResume(input(), document()));
  for (const patch of [
    { jobId: "other" },
    { id: input().id },
    { kind: "master_ats" as const },
    { mime: "image/png" as const },
    { sha256: "bad" },
    { size: 0 },
    { size: 3_800_001 },
  ])
    assert.throws(() =>
      assertSubmissionResume(input(), { ...document(), ...patch }),
    );
});

test("agent receipts allow sourced candidate claims without independent verification and still require fit, eligibility and authorization", () => {
  const workspace = demoWorkspace(new Date(now).toISOString());
  const job = workspace.jobs[0],
    profile = workspace.profile;
  job.fit = "strong";
  job.eligibility = "confirmed";
  job.eligibilityEvidence = "Employer explicitly hires in Pakistan.";
  job.requirements = [
    {
      id: "requirement",
      text: "React",
      essential: true,
      assessment: "met",
      evidenceIds: [profile.evidence[0].id],
      explanation: "Published shipped product.",
    },
  ];
  profile.evidence[0].verified = false;
  profile.preferences.approvalRequired = false;
  const agent = { ...input(), actor: "agent" as const };
  assert.doesNotThrow(() => assertAgentSubmission(agent, job, profile));
  assert.equal(profile.evidence[0].verified, false);
  for (const patch of [
    { statement: " " },
    { source: " " },
    { id: "unrelated-evidence" },
    { level: "invented" as (typeof profile.evidence)[0]["level"] },
  ]) {
    assert.throws(() =>
      assertAgentSubmission(agent, job, {
        ...profile,
        evidence: [{ ...profile.evidence[0], ...patch }],
      }),
    );
  }
  assert.throws(() =>
    assertAgentSubmission(agent, { ...job, eligibility: "unknown" }, profile),
  );
  assert.throws(() =>
    assertAgentSubmission(agent, { ...job, requirements: [] }, profile),
  );
  assert.throws(() =>
    assertAgentSubmission(agent, job, { ...profile, evidence: [] }),
  );
  assert.throws(() =>
    assertAgentSubmission(agent, job, {
      ...profile,
      preferences: { ...profile.preferences, approvalRequired: true },
    }),
  );
  assert.doesNotThrow(() =>
    assertAgentSubmission(
      agent,
      { ...job, status: "approved" },
      {
        ...profile,
        preferences: { ...profile.preferences, approvalRequired: true },
      },
    ),
  );
  assert.doesNotThrow(() =>
    assertAgentSubmission(
      input(),
      { ...job, fit: "unknown", eligibility: "unknown", requirements: [] },
      profile,
    ),
  );
});

test("receipt projection exposes immutable file identity without storage paths or owner IDs", () => {
  const value = submissionRecord({
    id: input().id,
    job_id: input().jobId,
    document_id: input().documentId,
    channel: input().channel,
    destination: input().destination,
    submitted_at: input().submittedAt,
    confirmation: input().confirmation,
    receipt_url: "",
    actor: "agent",
    resume_sha256: document().sha256,
    resume_filename: document().filename,
    recorded_at: new Date(now).toISOString(),
    user_id: "private-owner",
    path: "private-object",
  });
  assert.equal(value.resumeSha256, document().sha256);
  assert.equal(value.actor, "agent");
  assert.equal("path" in value, false);
  assert.equal("user_id" in value, false);
});
