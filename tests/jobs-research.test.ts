import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAction, draftApplication } from "../lib/jobs/domain";
import {
  demoWorkspace,
  emptyWorkspace,
  initialProfile,
} from "../lib/jobs/seed";
import {
  assertJob,
  assertProfile,
  parseAction,
  PortalError,
} from "../lib/jobs/validation";
import type { AgentRun, JobResearch } from "../lib/jobs/types";

const now = "2026-10-15T12:00:00.000Z";
const research = (): JobResearch => ({
  companyUrl: "https://company.example",
  contacts: [
    {
      id: "public-contact",
      name: "Public team member fixture",
      role: "Engineering",
      profileUrl: "https://company.example/team/person",
      sourceUrl: "https://company.example/team",
      referralRoute:
        "Public professional profile; relationship not established.",
      notes: "Test fixture only.",
      capturedAt: now,
    },
  ],
  sources: [
    {
      id: "listing-capture",
      label: "Employer listing fixture",
      url: "https://company.example/jobs/engineer",
      text: "Original description captured for this test.",
      capturedAt: now,
      screenshotUrl: "",
      screenshotPath: "/tmp/fixture-job.png",
    },
  ],
});

test("legacy jobs remain valid and edits never invent company research", () => {
  const workspace = demoWorkspace(now);
  assert.doesNotThrow(() => assertJob(workspace.jobs[0]));
  const next = applyAction(
    workspace,
    {
      type: "update_job",
      id: workspace.jobs[0].id,
      patch: { notes: "Reviewed the existing listing." },
    },
    now,
  );
  assert.equal(next.jobs[0].research, undefined);
  assert.equal(workspace.jobs[0].research, undefined);
});

test("research survives private JSON export, records exact changes, and invalidates approval without changing fit evidence", () => {
  const source = { ...demoWorkspace(now).jobs[0], research: research() };
  let workspace = applyAction(
    emptyWorkspace(now),
    { type: "add_job", job: source },
    now,
  );
  workspace = applyAction(
    workspace,
    { type: "update_job", id: source.id, patch: { status: "approved" } },
    now,
  );
  const approved = workspace.activities.find(
    (item) => item.type === "approval",
  );
  assert.ok(approved?.body.includes("listing-capture"));
  const original = structuredClone(workspace);
  const changed = {
    ...research(),
    companyUrl: "https://company.example/about",
    contacts: [],
  };
  const action = parseAction({
    type: "update_job",
    id: source.id,
    patch: { research: changed },
  });
  const next = applyAction(workspace, action, now);
  assert.deepEqual(workspace, original);
  assert.equal(next.jobs[0].status, "needs_approval");
  assert.equal(next.jobs[0].fit, workspace.jobs[0].fit);
  assert.deepEqual(next.jobs[0].requirements, workspace.jobs[0].requirements);
  const audit = next.activities.find(
    (item) => item.title === "Company research updated",
  );
  assert.deepEqual(JSON.parse(audit!.body), {
    previous: research(),
    current: changed,
  });
  const exported = JSON.parse(JSON.stringify(next));
  assert.doesNotThrow(() => assertJob(exported.jobs[0]));
  assert.deepEqual(exported.jobs[0].research, changed);
  assert.equal(next.jobs[0].appliedAt, null);
});

test("source import retains factual research but cannot turn it into approval or a fabricated application", () => {
  const job = {
    ...demoWorkspace(now).jobs[0],
    research: research(),
    status: "approved" as const,
  };
  const run: AgentRun = {
    id: "import-research",
    status: "completed",
    startedAt: now,
    completedAt: now,
    found: 1,
    added: 1,
    message: "Fixture import.",
  };
  const result = applyAction(
    emptyWorkspace(now),
    { type: "import_jobs", jobs: [job], run },
    now,
  );
  assert.deepEqual(result.jobs[0].research, job.research);
  assert.equal(result.jobs[0].status, "discovered");
  assert.equal(result.jobs[0].draft, "");
  assert.equal(result.jobs[0].appliedAt, null);
  assert.ok(
    result.activities.every(
      (activity) =>
        activity.type !== "approval" && activity.type !== "email_sent",
    ),
  );
  assert.throws(
    () =>
      applyAction(
        emptyWorkspace(now),
        {
          type: "import_jobs",
          jobs: [
            {
              ...job,
              research: { ...research(), companyUrl: "javascript:alert(1)" },
            },
          ],
          run,
        },
        now,
      ),
    /public HTTPS/,
  );
});

test("research changes reject unsafe links, missing provenance, invalid file references, duplicate IDs and excessive captures", () => {
  const job = demoWorkspace(now).jobs[0];
  const valid = research();
  const cases = [
    { ...valid, companyUrl: "javascript:alert(1)" },
    { ...valid, companyUrl: "https://127.0.0.1/private" },
    { ...valid, contacts: [{ ...valid.contacts[0], sourceUrl: "" }] },
    {
      ...valid,
      contacts: [
        {
          ...valid.contacts[0],
          profileUrl: "https://user:secret@company.example",
        },
      ],
    },
    { ...valid, contacts: [{ ...valid.contacts[0], capturedAt: "unknown" }] },
    { ...valid, contacts: [valid.contacts[0], valid.contacts[0]] },
    {
      ...valid,
      sources: [{ ...valid.sources[0], screenshotPath: "/tmp/../private.png" }],
    },
    {
      ...valid,
      sources: [{ ...valid.sources[0], screenshotPath: "/tmp/script.svg" }],
    },
    {
      ...valid,
      sources: [
        {
          ...valid.sources[0],
          screenshotPath: "",
          screenshotUrl: "data:image/png;base64,AAAA",
        },
      ],
    },
    {
      ...valid,
      sources: [
        {
          ...valid.sources[0],
          screenshotUrl: "https://company.example/capture.png",
        },
      ],
    },
    { ...valid, sources: [valid.sources[0], valid.sources[0]] },
    {
      ...valid,
      sources: Array.from({ length: 11 }, (_, index) => ({
        ...valid.sources[0],
        id: `source-${index}`,
      })),
    },
    {
      ...valid,
      sources: Array.from({ length: 3 }, (_, index) => ({
        ...valid.sources[0],
        id: `source-${index}`,
        text: "x".repeat(20000),
      })),
    },
    {
      ...valid,
      contacts: [
        {
          ...valid.contacts[0],
          privateEmail: "not-a-supported-field@example.com",
        },
      ],
    },
  ];
  for (const invalid of cases) {
    assert.throws(
      () =>
        parseAction({
          type: "update_job",
          id: job.id,
          patch: { research: invalid },
        }),
      PortalError,
    );
    assert.throws(() => assertJob({ ...job, research: invalid }), PortalError);
  }
});

test("saved search and submission policy accepts user authorization without weakening location and fit constraints", () => {
  const profile = initialProfile(now);
  const authorized = {
    ...profile,
    preferences: {
      ...profile.preferences,
      remoteOnly: false,
      remotePriority: true,
      overseasOnsite: "sponsorship_required" as const,
      approvalRequired: false,
    },
  };
  assert.doesNotThrow(() => assertProfile(authorized));
  const next = applyAction(
    emptyWorkspace(now),
    parseAction({ type: "update_profile", profile: authorized }),
    now,
  );
  assert.deepEqual(next.profile.preferences, authorized.preferences);
  assert.equal(next.activities[0].type, "profile");
  assert.equal(
    next.activities.some((item) => item.type === "email_sent"),
    false,
  );
  assert.ok(
    !draftApplication(demoWorkspace(now).jobs[0], authorized).includes(
      "looking for remote work",
    ),
  );
  for (const patch of [
    { overseasOnsite: "anywhere" },
    { remoteOnly: "false" },
    { remotePriority: "yes" },
    { approvalRequired: null },
    { country: "Anywhere" },
    { strongFitFirst: false },
    { salaryFloor: 50000 },
  ]) {
    assert.throws(
      () =>
        assertProfile({
          ...authorized,
          preferences: { ...authorized.preferences, ...patch },
        }),
      PortalError,
    );
  }
  assert.equal(
    profile.preferences.approvalRequired,
    true,
    "Existing seed stays review-first until explicitly updated.",
  );
});
