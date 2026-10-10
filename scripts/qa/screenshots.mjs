import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const phase = process.argv[2] || "final";
const routes = process.argv.slice(3).length
  ? process.argv.slice(3)
  : [
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
      "/not-a-page",
    ];
const browser = await chromium.launch({ channel: "chrome", headless: true });
await fs.mkdir(`qa-output/${phase}`, { recursive: true });
const report = [];
for (const width of [375, 768, 1280, 1440]) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 },
    deviceScaleFactor: 1,
  });
  for (const route of routes) {
    const errors = [];
    const listener = (e) => errors.push(e.message);
    page.on("pageerror", listener);
    await page.goto(
      `${process.env.QA_BASE_URL || "http://127.0.0.1:3000"}${route}`,
      { waitUntil: "networkidle" },
    );
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.forEach((image) => (image.loading = "eager")),
      );
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 750) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 70));
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(500);
    await page
      .waitForFunction(
        () => [...document.images].every((i) => i.complete),
        null,
        { timeout: 5000 },
      )
      .catch(() => {});
    await page.screenshot({
      path: `qa-output/${phase}/${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    report.push({ route, width, overflow, errors });
    page.off("pageerror", listener);
  }
  await page.close();
}
await browser.close();
await fs.writeFile(
  `qa-output/${phase}/report.json`,
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      screenshots: report.length,
      issues: report.filter((r) => r.overflow || r.errors.length),
    },
    null,
    2,
  ),
);

if (report.some((r) => r.overflow || r.errors.length)) process.exitCode = 1;
