import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import { createServer } from "node:http";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const checks = [],
  errors = [],
  a11y = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
page.on("pageerror", (e) => errors.push(e.message));
let providerCalls = 0,
  connectionCalls = 0;
page.on("request", (r) => {
  if (r.url().includes("/api/avatar/")) providerCalls++;
  if (r.url().includes("/api/chatgpt/")) connectionCalls++;
});
await fs.mkdir("qa-output/chatgpt", { recursive: true });
await page.goto(base, { waitUntil: "networkidle" });
expect(providerCalls).toBe(0);
expect(connectionCalls).toBe(0);
pass("No provider or account requests before interaction");
await page.locator("#avatar-start").click();
await expect(page.getByRole("dialog")).toBeVisible();
await expect(
  page.getByRole("button", { name: "Continue with ChatGPT" }),
).toBeDisabled();
await expect(
  page.getByText("Connection opens soon.", { exact: false }),
).toBeVisible();
pass("Missing hosted-client credentials produce an honest disabled connection");
for (const width of [375, 768, 1280, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.screenshot({ path: `qa-output/chatgpt/connect-${width}.png` });
  const overflow = await page
    .getByRole("dialog")
    .evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(overflow).toBe(false);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  a11y.push({
    state: "connect",
    width,
    violations: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
}
pass("Connection panel fits all four widths");
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(page.locator("#avatar-start")).toBeFocused();
pass("Escape closes the panel and restores keyboard focus");
await page.getByRole("button", { name: "Talk to me", exact: true }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Book a call", exact: true })
  .click();
await expect(
  page.getByRole("heading", { name: "Let’s talk about your project." }),
).toBeVisible();
await expect(page.getByRole("dialog")).toHaveCount(1);
await page.keyboard.press("Escape");
pass("Human booking stays available without account linking");

// Browser-only fixtures. No real authentication, provider access or paid requests.
let current = { available: true, connected: false };
let acknowledged = false,
  disconnected = false,
  startCalls = 0;
await page.route("**/api/chatgpt/session", (route) => {
  const method = route.request().method();
  if (method === "PATCH") {
    acknowledged = true;
    current.welcome = false;
    return route.fulfill({ json: { ok: true } });
  }
  if (method === "DELETE") {
    disconnected = true;
    current = { available: true, connected: false };
    return route.fulfill({ json: { ok: true } });
  }
  return route.fulfill({ json: current });
});
await page.route("**/api/chatgpt/start", (route) => {
  startCalls++;
  return route.fulfill({
    json: { url: "https://auth.openai.com/api/accounts/authorize?fixture=1" },
  });
});
await page.route("https://auth.openai.com/**", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: "<h1>Mock OpenAI authorization</h1>",
  }),
);
await page.locator("#avatar-start").click();
await page.getByRole("button", { name: "Continue with ChatGPT" }).click();
await expect(
  page.getByRole("heading", { name: "Mock OpenAI authorization" }),
).toBeVisible();
expect(startCalls).toBe(1);
pass(
  "Explicit connection click follows the server-provided OpenAI authorization URL (mock)",
);
current = {
  available: true,
  connected: true,
  name: "Demo visitor",
  welcome: true,
  expiresAt: Date.now() + 900000,
  models: [
    { id: "test-model-a", name: "Demo model A" },
    { id: "test-model-b", name: "Demo model B" },
  ],
  messages: [],
};
await page.goto(base + "/?talk=1&chatgpt=connected", {
  waitUntil: "networkidle",
});
await expect(
  page.getByRole("heading", { name: "You’re using your ChatGPT plan." }),
).toBeVisible();
await expect(page).toHaveURL(base + "/");
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toHaveCount(0);
await page.getByRole("button", { name: "Got it — let’s talk" }).click();
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toBeVisible();
expect(acknowledged).toBe(true);
pass(
  "Callback reopens the panel, clears the URL marker and confirms plan use before chatting (mock)",
);
let sent,
  responseMode = "success";
await page.route("**/api/chatgpt/chat", (route) => {
  sent = route.request().postDataJSON();
  const events =
    responseMode === "success"
      ? [
          {
            type: "delta",
            text: "I built the backend behind eight Tututor products. ",
          },
          {
            type: "delta",
            text: "The hard part was making them work together.",
          },
          { type: "done" },
        ]
      : responseMode === "quota"
        ? [
            { type: "delta", text: "This reply stopped partway through." },
            {
              type: "error",
              message:
                "Your ChatGPT plan or this app has reached a usage limit.",
              action: "usage",
            },
          ]
        : [
            {
              type: "delta",
              text: "A partial reply with no completion event.",
            },
          ];
  return route.fulfill({
    contentType: "text/event-stream",
    body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
  });
});
await page.getByLabel("ChatGPT model").selectOption("test-model-b");
await page.getByRole("button", { name: "Unfiltered", exact: true }).click();
await page
  .getByRole("button", { name: "What did you build at Tututor?", exact: true })
  .click();
await page.getByRole("button", { name: "Send message" }).click();
await expect(page.getByRole("log")).toContainText(
  "The hard part was making them work together.",
);
await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
expect(sent).toEqual({
  message: "What did you build at Tututor?",
  model: "test-model-b",
  tone: "unfiltered",
});
await expect(
  page.getByText("Using ChatGPT plan", { exact: true }),
).toBeVisible();
pass(
  "Selected account model and tone drive streamed text; request contains no credentials or fabricated history (mock)",
);
for (const width of [375, 768, 1280, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.screenshot({ path: `qa-output/chatgpt/connected-${width}.png` });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  a11y.push({
    state: "connected",
    width,
    violations: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
  ).toBe(false);
}
pass("Connected conversation fits all four widths");
responseMode = "quota";
await page
  .getByRole("textbox", { name: "Message AI Ubaid" })
  .fill("How would you approach my product?");
await page.getByRole("button", { name: "Send message" }).click();
await expect(page.getByRole("alert")).toContainText("usage limit");
await expect(
  page.getByRole("alert").getByRole("link", { name: "Manage usage" }),
).toHaveAttribute("href", "https://chatgpt.com/settings/usage");
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toHaveValue("How would you approach my product?");
await expect(page.getByText("Unfinished reply")).toBeVisible();
expect(providerCalls).toBe(0);
pass(
  "Late quota failure preserves the draft and partial reply without using the owner’s provider (mock)",
);
responseMode = "incomplete";
await page.getByRole("button", { name: "Send message" }).click();
await expect(page.getByRole("alert")).toContainText("ended early");
await expect(page.getByText("Unfinished reply")).toHaveCount(1);
pass("A closed stream is not treated as completed inference (mock)");
await page.getByRole("button", { name: "Disconnect", exact: true }).click();
await expect(
  page.getByRole("button", { name: "Continue with ChatGPT" }),
).toBeVisible();
expect(disconnected).toBe(true);
await expect(
  page.getByText("I built the backend", { exact: false }),
).toHaveCount(0);
pass("Disconnect clears local conversation and requests server cleanup (mock)");
await page.keyboard.press("Escape");
await page.unroute("**/api/chatgpt/chat");
// An actual open HTTP stream exercises native browser cancellation. A paused
// Playwright route cannot model a response already arriving over the network.
let activeStreams = 0,
  closedStreams = 0;
const streamServer = createServer((request, response) => {
  request.resume();
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": base,
    "Access-Control-Allow-Credentials": "true",
  });
  response.write('data: {"type":"delta","text":"A reply in progress."}\n\n');
  activeStreams++;
  response.on("close", () => {
    closedStreams++;
  });
});
await new Promise((resolve) => streamServer.listen(0, "127.0.0.1", resolve));
const streamPort = streamServer.address().port;
await page.route("**/api/chatgpt/chat", (route) =>
  route.continue({ url: `http://127.0.0.1:${streamPort}/chat` }),
);
current = {
  available: true,
  connected: true,
  name: "Demo visitor",
  welcome: false,
  expiresAt: Date.now() + 60000,
  models: [{ id: "test-model-a", name: "Demo model A" }],
  messages: [],
};
await page.locator("#avatar-start").click();
await page
  .getByRole("textbox", { name: "Message AI Ubaid" })
  .fill("Keep my draft when I stop.");
await page.getByRole("button", { name: "Send message" }).click();
await expect.poll(() => activeStreams).toBe(1);
await expect(page.getByRole("log")).toContainText("A reply in progress.");
await page.getByRole("button", { name: "Stop reply" }).click();
await expect(page.getByRole("alert")).toContainText("Reply stopped");
await expect.poll(() => closedStreams).toBe(1);
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toHaveValue("Keep my draft when I stop.");
pass("Stop aborts a pending reply and preserves the draft (mock)");
await page.keyboard.press("Escape");
current.expiresAt = Date.now() + 2500;
await page.locator("#avatar-start").click();
await page
  .getByRole("textbox", { name: "Message AI Ubaid" })
  .fill("A reply that will expire.");
await page.getByRole("button", { name: "Send message" }).click();
await expect.poll(() => activeStreams).toBe(2);
await expect(page.getByRole("button", { name: "Stop reply" })).toBeVisible();
await expect(
  page.getByText("This short demo session has ended.", { exact: false }),
).toBeVisible({ timeout: 6000 });
await expect.poll(() => closedStreams).toBe(2);
await expect(page.getByRole("alert")).toContainText(
  "This short demo session has ended.",
);
await expect(
  page.getByRole("button", { name: "Continue with ChatGPT" }),
).toBeEnabled();
pass(
  "Expiry aborts an active reply and keeps reconnect guidance intact (mock)",
);
streamServer.closeAllConnections();
await new Promise((resolve) => streamServer.close(resolve));
await page.keyboard.press("Escape");
await page.unroute("**/api/chatgpt/session");
await page.goto(base + "/?talk=1&chatgpt=cancelled");
await expect(page.getByRole("alert")).toContainText("Connection cancelled");
await page.keyboard.press("Escape");
pass("Declined authorization returns a clear recoverable state");
const denied = await page.request.post(base + "/api/chatgpt/chat", {
  headers: { Origin: "https://elsewhere.example" },
  data: { message: "test", model: "test", tone: "polite" },
});
expect(denied.status()).toBe(403);
const unavailable = await page.request.post(base + "/api/chatgpt/start", {
  headers: { Origin: base },
  data: {},
});
expect(unavailable.status()).toBe(503);
pass(
  "Real unconfigured endpoints reject cross-origin requests and fail closed",
);
await fs.writeFile(
  "qa-output/chatgpt/report.json",
  JSON.stringify({ checks, errors, a11y }, null, 2),
);
await browser.close();
console.log(
  JSON.stringify(
    {
      checks: checks.length,
      errors,
      a11yIssues: a11y.filter((r) => r.violations.length),
    },
    null,
    2,
  ),
);
if (errors.length || a11y.some((r) => r.violations.length))
  process.exitCode = 1;
