import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertJob,
  assertProfile,
  assertSameOrigin,
  isOwner,
  parseAction,
  PortalError,
  readLimitedJson,
} from "../lib/jobs/validation";
import { demoWorkspace, initialProfile } from "../lib/jobs/seed";

test("owner authorization requires configured immutable ID and exact email, never metadata", () => {
  const user = { id: "owner-id", email: "owner@example.com" };
  assert.equal(isOwner(user, "owner-id", "OWNER@example.com"), true);
  assert.equal(isOwner(user, "", "owner@example.com"), false);
  assert.equal(isOwner(user, "owner-id", ""), false);
  assert.equal(
    isOwner({ ...user, id: "attacker-id" }, "owner-id", "owner@example.com"),
    false,
  );
  assert.equal(
    isOwner({ ...user, is_anonymous: true }, "owner-id", "owner@example.com"),
    false,
  );
  assert.equal(isOwner(null, "owner-id", "owner@example.com"), false);
});
test("mutations require same-origin browser requests including logout", () => {
  const request = (origin?: string) =>
    new Request("https://admin.example.com/api/jobs/workspace", {
      method: "POST",
      headers: origin ? { origin } : {},
    });
  assert.doesNotThrow(() =>
    assertSameOrigin(request("https://admin.example.com")),
  );
  assert.throws(
    () => assertSameOrigin(request("https://evil.example")),
    PortalError,
  );
  assert.throws(() => assertSameOrigin(request()), PortalError);
});
test("JSON reader rejects an oversized chunked request without trusting Content-Length", async () => {
  const body = JSON.stringify({ payload: "x".repeat(1000) });
  const request = new Request("https://admin.example.com/api/jobs/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  await assert.rejects(
    () => readLimitedJson(request, 500),
    (error: unknown) => error instanceof PortalError && error.status === 413,
  );
  const wrongType = new Request("https://admin.example.com", {
    method: "POST",
    body: "{}",
  });
  await assert.rejects(
    () => readLimitedJson(wrongType),
    (error: unknown) => error instanceof PortalError && error.status === 415,
  );
});
test("public mutations cannot impersonate an agent or import claimed runs", () => {
  assert.throws(
    () => parseAction({ type: "import_jobs", jobs: [], run: {} }),
    PortalError,
  );
  assert.throws(
    () =>
      parseAction({
        type: "add_activity",
        activity: {
          jobId: null,
          type: "approval",
          title: "Approved",
          body: "Forged",
          actor: "agent",
        },
      }),
    PortalError,
  );
  const result = parseAction({
    type: "add_activity",
    activity: {
      id: "forged",
      jobId: null,
      type: "email_received",
      title: "Reply",
      body: "Manually copied reply",
      actor: "system",
      createdAt: "1999-01-01",
    },
  });
  assert.equal(result.type, "add_activity");
  if (result.type === "add_activity") {
    assert.equal(result.activity.actor, "you");
    assert.notEqual(result.activity.id, "forged");
    assert.notEqual(result.activity.createdAt, "1999-01-01");
  }
});
test("profile rejects nested invalid data and malformed submission or eligibility policy", () => {
  assert.doesNotThrow(() => assertProfile(initialProfile()));
  const profile = initialProfile();
  assert.throws(
    () =>
      assertProfile({
        ...profile,
        evidence: [{ ...profile.evidence[0], statement: {} }],
      }),
    PortalError,
  );
  assert.doesNotThrow(() =>
    assertProfile({
      ...profile,
      preferences: { ...profile.preferences, approvalRequired: false },
    }),
  );
  assert.throws(
    () =>
      assertProfile({
        ...profile,
        preferences: { ...profile.preferences, approvalRequired: "automatic" },
      }),
    PortalError,
  );
  assert.throws(
    () => assertProfile({ ...profile, portfolio: "javascript:alert(1)" }),
    PortalError,
  );
});
test("job payloads reject executable URLs, malformed requirements, and immutable patch keys", () => {
  const job = demoWorkspace().jobs[0];
  assert.doesNotThrow(() => assertJob(job));
  assert.throws(
    () => assertJob({ ...job, url: "javascript:alert(1)" }),
    PortalError,
  );
  assert.throws(
    () =>
      assertJob({
        ...job,
        requirements: [{ ...job.requirements[0], evidenceIds: [{}] }],
      }),
    PortalError,
  );
  assert.throws(
    () =>
      parseAction({
        type: "update_job",
        id: job.id,
        patch: { id: "changed", createdAt: "forged" },
      }),
    PortalError,
  );
});
