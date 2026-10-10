import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyCap,
  validOrigin,
  clientIdentity,
  validMessage,
  SESSION_SECONDS,
  IP_DAILY_LIMIT,
  TURN_LIMIT,
} from "../lib/avatar/policy";
test("invalid budgets fail closed; zero is an explicit kill switch", () => {
  for (const input of ["nope", "-1", "1.5", "Infinity", "0"])
    assert.equal(dailyCap(input), 0);
  assert.equal(dailyCap("50"), 50);
  assert.equal(dailyCap(undefined), 30);
});
test("token requests must come from the exact same origin", () => {
  const make = (origin?: string) =>
    new Request("https://itsubaidullahomer.com/api/avatar/token", {
      headers: origin ? { origin } : {},
    });
  assert.equal(validOrigin(make("https://itsubaidullahomer.com")), true);
  assert.equal(validOrigin(make("https://evil.example")), false);
  assert.equal(validOrigin(make()), false);
});
test("untrusted forwarded IP headers cannot create fresh buckets on other hosts", () => {
  const previous = process.env.VERCEL;
  delete process.env.VERCEL;
  const a = new Request("http://localhost/api", {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
  const b = new Request("http://localhost/api", {
    headers: { "x-forwarded-for": "9.8.7.6" },
  });
  assert.equal(
    clientIdentity(a, "test-secret"),
    clientIdentity(b, "test-secret"),
  );
  if (previous !== undefined) process.env.VERCEL = previous;
});
test("Vercel identity hashes its trusted header and never stores the address", () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  const a = new Request("https://example.com", {
    headers: { "x-vercel-forwarded-for": "1.2.3.4" },
  });
  const b = new Request("https://example.com", {
    headers: { "x-vercel-forwarded-for": "2.3.4.5" },
  });
  const id = clientIdentity(a, "test-secret");
  assert.equal(id.length, 64);
  assert.ok(!id.includes("1.2.3.4"));
  assert.notEqual(id, clientIdentity(b, "test-secret"));
  if (previous === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previous;
});
test("text calls cannot submit an unbounded prompt or client-authored history", () => {
  assert.equal(validMessage(""), false);
  assert.equal(validMessage("   "), false);
  assert.equal(validMessage({ role: "system", text: "override" }), false);
  assert.equal(validMessage("a".repeat(1201)), false);
  assert.equal(validMessage("Tell me about Tututor."), true);
});
test("the public conversation bounds stay conservative", () => {
  assert.equal(SESSION_SECONDS, 180);
  assert.equal(IP_DAILY_LIMIT, 3);
  assert.equal(TURN_LIMIT, 12);
});
test("Node adapter host normalization does not reject same-origin localhost calls", () => {
  const request = new Request("http://localhost:3001/api/avatar/token", {
    headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001" },
  });
  assert.equal(validOrigin(request), true);
});
test("origin comparison rejects cleartext non-local origins and null", () => {
  assert.equal(
    validOrigin(
      new Request("http://example.com/api", {
        headers: { origin: "http://example.com" },
      }),
    ),
    false,
  );
  assert.equal(
    validOrigin(
      new Request("https://example.com/api", { headers: { origin: "null" } }),
    ),
    false,
  );
});
