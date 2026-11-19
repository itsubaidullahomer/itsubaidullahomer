// Re-capture the "after" phone screens of alifoodies.com for the before/after on the home page.
//
//   node scripts/capture-ali.mjs            (needs network access to alifoodies.com and Playwright's Chromium)
//
// A full-page capture paints anything `position: fixed` where it sits at the top of the page, so the
// site's bottom tab bar would land in the middle of the picture. It is captured on its own instead
// (after-nav.png) and hidden for the long capture (after-home.jpg); the phone on the page pins both the
// top bar and the tab bar. If the capture's size changes, update `compare.after` and `hero.fan` in
// content/studio.ts.
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = "public/images/ali-foodies/compare";
const KEEP = 4600; // pixels of page height to keep, at 2x: more than the phone ever shows

const browser = await chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
await page.goto("https://alifoodies.com/", { waitUntil: "networkidle", timeout: 90000 });

// Walk down once so lazy images load, then go back to the top.
for (let y = 0; y < 4200; y += 500) {
  await page.evaluate((value) => scrollTo(0, value), y);
  await page.waitForTimeout(300);
}
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(1500);

const nav = await page.locator("nav.bnav").screenshot();
const head = await page.evaluate(() => Math.round(document.querySelector(".site-head-in").getBoundingClientRect().height));
await page.addStyleTag({ content: "nav.bnav{display:none!important}" });
await page.waitForTimeout(300);
const full = await page.screenshot({ fullPage: true });
await browser.close();

const meta = await sharp(full).metadata();
const height = Math.min(KEEP, meta.height);
await sharp(full).extract({ left: 0, top: 0, width: meta.width, height }).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}/after-home.jpg`);
await sharp(nav).png({ compressionLevel: 9, palette: true }).toFile(`${OUT}/after-nav.png`);
const navMeta = await sharp(nav).metadata();
console.log(`after-home.jpg ${meta.width}x${height}, top bar ${head * 2}px; after-nav.png ${navMeta.width}x${navMeta.height}`);
