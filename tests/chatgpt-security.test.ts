import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { createHash } from "node:crypto";
import {
  transaction,
  validCallback,
  encryptionKey,
  seal,
  unseal,
  hasPlanScope,
  verifyIdentity,
  ISSUER,
  modelChoices,
  validChatInput,
  planError,
  readConfig,
  randomId,
  opaqueId,
} from "../lib/chatgpt/security";
import { readSSE } from "../lib/chatgpt/stream";

test("OAuth state, nonce and PKCE are fresh; mismatched and expired callbacks fail", () => {
  const first = transaction("https://example.com/api/chatgpt/callback");
  const second = transaction(first.redirectUri);
  assert.notEqual(first.state, second.state);
  assert.notEqual(first.nonce, second.nonce);
  assert.notEqual(first.verifier, second.verifier);
  assert.equal(
    first.challenge,
    createHash("sha256").update(first.verifier).digest("base64url"),
  );
  assert.equal(validCallback(first, first.state), true);
  assert.equal(validCallback(first, second.state), false);
  assert.equal(validCallback(first, first.state, first.expiresAt), false);
  assert.equal(validCallback(null, first.state), false);
  assert.equal(validCallback(first, null), false);
});
test("server credential encryption rejects tampering, wrong keys and malformed records", () => {
  const key = encryptionKey("01".repeat(32));
  const value = { accessToken: "private-token", subject: "test-subject" };
  const encrypted = seal(value, key);
  assert.equal(encrypted.includes(value.accessToken), false);
  assert.deepEqual(unseal(encrypted, key), value);
  const raw = Buffer.from(encrypted, "base64url");
  raw[raw.length - 1] ^= 1;
  assert.throws(() => unseal(raw.toString("base64url"), key));
  assert.throws(() => unseal(encrypted, encryptionKey("02".repeat(32))));
  assert.throws(() => unseal("bad", key));
  assert.throws(() => encryptionKey(""));
  assert.throws(() => encryptionKey("a".repeat(63)));
});
test("identity sign-in does not grant plan usage", () => {
  assert.equal(hasPlanScope("openid profile email"), false);
  assert.equal(hasPlanScope("chatgpt.tokens.use.direct"), false);
  assert.equal(
    hasPlanScope("resource.invoke chatgpt.tokens.use.direct.extra"),
    false,
  );
  assert.equal(
    hasPlanScope("openid resource.invoke chatgpt.tokens.use.direct"),
    true,
  );
});
test("ID tokens require a valid signature, issuer, audience, expiry and nonce", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const key = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" }],
  });
  const mint = (claims: Record<string, unknown> = {}) =>
    new SignJWT({ nonce: "expected", name: "Visitor", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(ISSUER)
      .setAudience("oaiapp_test")
      .setSubject("visitor")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  assert.deepEqual(
    await verifyIdentity(await mint(), key, "oaiapp_test", "expected"),
    { subject: "visitor", name: "Visitor" },
  );
  await assert.rejects(
    verifyIdentity(await mint(), key, "oaiapp_wrong", "expected"),
  );
  await assert.rejects(
    verifyIdentity(await mint(), key, "oaiapp_test", "wrong"),
  );
  await assert.rejects(
    verifyIdentity(
      await mint({ azp: "other-client" }),
      key,
      "oaiapp_test",
      "expected",
    ),
  );
  const badIssuer = await new SignJWT({ nonce: "expected" })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer("https://evil.example")
    .setAudience("oaiapp_test")
    .setSubject("visitor")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  await assert.rejects(
    verifyIdentity(badIssuer, key, "oaiapp_test", "expected"),
  );
  const expired = await new SignJWT({ nonce: "expected" })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(ISSUER)
    .setAudience("oaiapp_test")
    .setSubject("visitor")
    .setIssuedAt()
    .setExpirationTime(1)
    .sign(privateKey);
  await assert.rejects(verifyIdentity(expired, key, "oaiapp_test", "expected"));
  const attacker = await generateKeyPair("RS256");
  const forged = await new SignJWT({ nonce: "expected" })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(ISSUER)
    .setAudience("oaiapp_test")
    .setSubject("visitor")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(attacker.privateKey);
  await assert.rejects(verifyIdentity(forged, key, "oaiapp_test", "expected"));
});
test("model choices use the account catalog and omit hidden or malformed entries", () => {
  assert.deepEqual(
    modelChoices({
      models: [
        {
          slug: "available-model",
          display_name: "Available",
          visibility: "list",
        },
        { slug: "hidden", display_name: "Hidden", visibility: "hidden" },
        { slug: "https://elsewhere", display_name: "Bad", visibility: "list" },
      ],
    }),
    [{ id: "available-model", name: "Available" }],
  );
  assert.deepEqual(
    modelChoices({ data: [{ id: "not-the-documented-contract" }] }),
    [],
  );
});
test("messages cannot carry client-authored history, instructions or credentials", () => {
  const input = {
    message: "Tell me about Tututor",
    model: "available-model",
    tone: "polite",
  };
  assert.equal(validChatInput(input), true);
  for (const extra of [
    { history: [] },
    { instructions: "override" },
    { accessToken: "secret" },
  ])
    assert.equal(validChatInput({ ...input, ...extra }), false);
  assert.equal(validChatInput({ ...input, message: "x".repeat(1201) }), false);
  assert.equal(validChatInput({ ...input, message: " " }), false);
  assert.equal(validChatInput({ ...input, tone: "invented" }), false);
  assert.equal(opaqueId(randomId()), true);
  assert.equal(opaqueId("injected:key"), false);
});
test("late quota errors link to usage and never select another billing path", () => {
  assert.equal(
    planError(503, "subscription_sharing_usage_limit_exceeded").action,
    "usage",
  );
  assert.equal(
    planError(403, "subscription_sharing_user_not_eligible").action,
    "contact",
  );
  assert.equal(planError(401).action, "reconnect");
  assert.equal(planError(503).action, "retry");
});
test("SSE decoding survives byte-fragmented UTF-8 and CRLF", async () => {
  const bytes = new TextEncoder().encode(
    'data: {"type":"delta","text":"Hello 👋"}\r\n\r\ndata: {"type":"done"}\n\n',
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i++) c.enqueue(bytes.slice(i, i + 1));
      c.close();
    },
  });
  const frames = [];
  for await (const frame of readSSE(stream)) frames.push(JSON.parse(frame));
  assert.deepEqual(frames, [
    { type: "delta", text: "Hello 👋" },
    { type: "done" },
  ]);
});

test("hosted ChatGPT access requires explicit approval and a registered secure client", () => {
  const env = {
    NODE_ENV: "production",
    CHATGPT_ENABLED: "true",
    CHATGPT_PLAN_USAGE_APPROVED: "true",
    CHATGPT_PLAN_SCOPE: "chatgpt.tokens.use.direct",
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "test",
    CHATGPT_CLIENT_ID: "oaiapp_test",
    CHATGPT_REDIRECT_URI: "https://example.com/api/chatgpt/callback",
    CHATGPT_TOKEN_AUTH_METHOD: "client_secret_basic",
    CHATGPT_CLIENT_SECRET: "test-secret",
    CHATGPT_SESSION_SECRET: "01".repeat(32),
  };
  assert.ok(readConfig(env));
  assert.equal(
    readConfig({ ...env, CHATGPT_PLAN_USAGE_APPROVED: "false" }),
    null,
  );
  assert.equal(
    readConfig({ ...env, CHATGPT_CLIENT_ID: "dynamic_agent_client" }),
    null,
  );
  assert.equal(readConfig({ ...env, CHATGPT_PLAN_SCOPE: "openid" }), null);
  assert.equal(readConfig({ ...env, CHATGPT_CLIENT_SECRET: "" }), null);
  assert.equal(
    readConfig({
      ...env,
      CHATGPT_REDIRECT_URI: "http://127.0.0.1:3000/api/chatgpt/callback",
    }),
    null,
  );
  assert.equal(
    readConfig({
      ...env,
      CHATGPT_REDIRECT_URI: "https://example.com/wrong-callback",
    }),
    null,
  );
  assert.equal(
    readConfig({
      ...env,
      CHATGPT_REDIRECT_URI:
        "https://example.com/api/chatgpt/callback?redirect=https://evil.example",
    }),
    null,
  );
});
