import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
let avatarRequests = 0;
page.on("request", (r) => {
  if (r.url().includes("/api/avatar/")) avatarRequests++;
});
await page.goto(base, { waitUntil: "networkidle" });
await expect(page.getByRole("heading", { level: 1 })).toContainText(
  "I build AI",
);
if (avatarRequests !== 0) throw Error("Avatar started before interaction");
pass("No avatar requests or paid sessions on page load");
await page
  .getByRole("button", { name: "Book a call", exact: true })
  .first()
  .click();
await expect(page.getByRole("dialog")).toBeVisible();
await expect(page.getByRole("link", { name: "Email Ubaid" })).toHaveAttribute(
  "href",
  "mailto:itsubaidullahomer@gmail.com",
);
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
pass("Booking fallback and keyboard dismissal");
await page.getByRole("tab", { name: "AI editor", exact: true }).click();
await expect(
  page.getByRole("tab", { name: "AI editor", exact: true }),
).toHaveAttribute("aria-selected", "true");
await expect(
  page.getByAltText("Tututor’s document editor with contextual AI actions"),
).toBeVisible();
pass("Accessible product tabs");
const slider = page.getByRole("slider", {
  name: "Compare Ali Foodies before and after",
});
await slider.focus();
await page.keyboard.press("ArrowRight");
await expect(slider).toHaveValue("51");
pass("Before/after comparison keyboard control");
await page
  .getByRole("button", { name: "What do you build with?", exact: true })
  .click();
await expect(
  page.getByText("Usually React, Next.js and TypeScript", { exact: false }),
).toBeVisible();
pass("FAQ disclosure");
await page.getByRole("button", { name: "Copy email address" }).first().click();
await expect(page.getByText("Email copied").first()).toBeVisible();
expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
  "itsubaidullahomer@gmail.com",
);
pass("Email clipboard and success state");
await page.getByRole("button", { name: "Talk to me", exact: true }).click();
await expect(
  page.getByText("The AI me is off duty.", { exact: false }),
).toBeVisible();
pass("No-key avatar fails gracefully to booking");
await page.goto(base + "/work/tututor");
await page
  .getByRole("button", {
    name: "Tututor.ai product screenshot Explore screenshot",
  })
  .click();
await expect(page.getByRole("dialog")).toBeVisible();
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
pass("Screenshot zoom and Escape");
await page.goto(base + "/playground");
await page.getByRole("button", { name: "Run stream", exact: true }).click();
await expect(page.getByRole("button", { name: "Retry from here" })).toBeVisible(
  { timeout: 15000 },
);
const preserved = await page.locator(".output-text").innerText();
expect(preserved.length).toBeGreaterThan(20);
await page.getByRole("button", { name: "Retry from here" }).click();
await expect(page.getByText("Complete", { exact: true })).toBeVisible({
  timeout: 15000,
});
await expect(page.locator(".output-text")).toContainText(preserved);
pass("Streaming failure preserves output and resumes");
await page.getByRole("button", { name: "Start demo call" }).click();
await expect(
  page.getByRole("button", { name: "Interrupt", exact: true }),
).toBeEnabled();
await page.getByRole("button", { name: "Interrupt", exact: true }).click();
await expect(
  page.getByText("Of course. Go ahead — I’m listening."),
).toBeVisible();
await expect(
  page.getByText("1 interruption handled", { exact: false }),
).toBeVisible();
pass("Call simulator interruption and listening handoff");
await page.getByRole("button", { name: "Step", exact: true }).click();
await expect(
  page.getByText("A teacher asks for a didactic unit."),
).toBeVisible();
await page.getByLabel("Choose a workflow").selectOption("2");
await page.getByRole("button", { name: "Trace request", exact: true }).click();
await expect(
  page.getByText("The office starts the monthly billing batch."),
).toBeVisible();
pass("Architecture selection and trace");
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(base);
await page.getByRole("button", { name: "Open menu" }).click();
await page.locator("#mobile-nav").getByRole("link", { name: "About" }).click();
await expect(page).toHaveURL(base + "/about");
await expect(page.locator("#mobile-nav")).toHaveCount(0);
pass("Mobile navigation closes after choosing a page");
const a11y = [];
for (const route of [
  "/",
  "/work",
  "/about",
  "/contact",
  "/playground",
  "/now",
  "/writing",
  "/work/tututor",
  "/work/insight-x",
  "/work/ai-humanizer",
  "/work/ali-foodies",
  "/work/jurri",
  "/work/yaksport",
  "/work/crown-kabab",
  "/work/animated-landing",
  "/work/toolkitjar",
  "/writing/i-taught-my-client-to-code",
  "/writing/shipping-ai-features-to-real-users",
]) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  a11y.push({
    route,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(base);
const animation = await page
  .locator(".marquee-track")
  .evaluate((e) => getComputedStyle(e).animationName);
expect(animation).toBe("none");
pass("Reduced motion disables continuous animation");
// Deterministic transport tests. These do not count as paid provider verification.
await page.route("**/api/avatar/token", (r) =>
  r.fulfill({ json: { mode: "text", expiresAt: Date.now() + 180000 } }),
);
let sent;
await page.route("**/api/avatar/chat", (r) => {
  sent = r.request().postDataJSON();
  return r.fulfill({
    json: {
      reply:
        "I built the backend behind eight Tututor products. What are you building?",
    },
  });
});
await page.getByRole("button", { name: "Type instead of speaking" }).click();
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toBeVisible();
await page.getByRole("button", { name: "Unfiltered", exact: true }).click();
await page
  .getByRole("textbox", { name: "Message AI Ubaid" })
  .fill("Tell me about Tututor");
await page.getByRole("button", { name: "Send message" }).click();
await expect(
  page.getByRole("log", { name: "Conversation transcript" }),
).toContainText("I built the backend");
expect(sent.mode).toBe("unfiltered");
await page.getByRole("button", { name: "End conversation" }).click();
await expect(
  page.getByRole("textbox", { name: "Message AI Ubaid" }),
).toHaveCount(0);
pass("Mocked typed conversation, tone, transcript and End cleanup");
await page.getByRole("button", { name: "Back", exact: true }).click();
await page.unroute("**/api/avatar/token");
await page.route("**/api/avatar/token", (r) =>
  r.fulfill({ json: { mode: "text", expiresAt: Date.now() + 900 } }),
);
await page.getByRole("button", { name: "Type instead of speaking" }).click();
await expect(
  page.getByText("Three minutes, already.", { exact: false }),
).toBeVisible({ timeout: 4000 });
pass("Server-provided expiry ends the client session");
await fs.writeFile(
  "qa-output/interactions.json",
  JSON.stringify({ checks, errors, a11y }, null, 2),
);
await browser.close();
console.log(
  JSON.stringify(
    {
      checks: checks.length,
      errors,
      a11yIssues: a11y.filter((a) => a.violations.length),
    },
    null,
    2,
  ),
);

if (errors.length || a11y.some((a) => a.violations.length))
  process.exitCode = 1;
