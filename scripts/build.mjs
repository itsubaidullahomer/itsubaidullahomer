// Rebuilds the live parts of README.md.
//
// Runs daily from .github/workflows/update.yml; also fine to run locally with
// `node scripts/build.mjs` (without GITHUB_TOKEN it reads GitHub's public
// contributions page instead of the GraphQL API).
//
// It owns three sections of the README. Everything between a pair of markers is
// overwritten on every run; everything outside them is left alone:
//
//   <!-- activity:start --> … <!-- activity:end -->   contribution card (GitHub + GitLab)
//   <!-- work:start -->     … <!-- work:end -->       selected work table with live status
//   <!-- now:start -->      … <!-- now:end -->        /now page from itsubaidullahomer.com
//
// A section that fails to build is skipped (the previous content stays) and the
// process exits non-zero at the end, so the workflow goes red without leaving
// the README half-written.

import dns from "node:dns";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Some networks hand out IPv6 routes that silently time out; curl falls back to
// IPv4 on its own, Node does not.
dns.setDefaultResultOrder("ipv4first");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const README = path.join(ROOT, "README.md");
const ASSETS = path.join(ROOT, "assets");
const DATA = path.join(ROOT, "data");

const GITHUB_USER = "itsubaidullahomer";
const GITLAB_USER = "itsubaidullahomer";
const SITE = "https://itsubaidullahomer.com";
const UA = "Mozilla/5.0 (compatible; profile-readme-bot/1.0; +https://github.com/itsubaidullahomer/itsubaidullahomer)";

// ---------------------------------------------------------------- utilities

const DAY = 86_400_000;
const isoDay = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const utcDay = (iso) => new Date(`${iso}T00:00:00Z`);
const TODAY = utcDay(isoDay(new Date()));

const fmtInt = (n) => n.toLocaleString("en-US");
const fmtDate = (d, opts = { month: "short", day: "numeric", year: "numeric" }) =>
  d.toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const stripTags = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Retries network-level failures (connect timeouts, resets) with a short
// backoff; an HTTP error status is returned by the server and not retried.
async function get(url, init = {}) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500 * attempt));
    try {
      const res = await fetch(url, {
        redirect: "follow",
        ...init,
        headers: { "user-agent": UA, ...(init.headers ?? {}) },
        signal: init.signal ?? AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (err.name !== "TypeError" && err.name !== "TimeoutError") throw err;
      last = err;
      console.warn(`retrying ${url} after: ${err.cause?.code ?? err.name}`);
    }
  }
  throw last;
}
const getText = async (url, init) => (await get(url, init)).text();
const getJson = async (url, init) => (await get(url, init)).json();

// ------------------------------------------------------ contribution sources

// GitHub. With a token: GraphQL (exact, includes everything the profile graph
// counts). Without one, or if GraphQL refuses: the public contributions page,
// which is what the profile renders anyway.
async function fetchGitHub(from, to) {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
        user(login:$login){contributionsCollection(from:$from,to:$to){
          contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
      const json = await getJson("https://api.github.com/graphql", {
        method: "POST",
        headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { login: GITHUB_USER, from: from.toISOString(), to: addDays(to, 1).toISOString() },
        }),
      });
      if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
      const out = {};
      for (const week of json.data.user.contributionsCollection.contributionCalendar.weeks)
        for (const d of week.contributionDays) if (d.contributionCount) out[d.date] = d.contributionCount;
      return out;
    } catch (err) {
      console.warn(`github: GraphQL failed (${err.message}); falling back to the public page`);
    }
  }
  // No from/to params on purpose: with them GitHub returns the calendar year of
  // `to`, not the range asked for. Without them it's the rolling last year, and
  // buildCalendar ignores anything outside [from, to] anyway.
  const html = await getText(`https://github.com/users/${GITHUB_USER}/contributions`);
  const dateById = new Map();
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*\bid="(contribution-day-component-\d+-\d+)"/g))
    dateById.set(m[2], m[1]);
  const out = {};
  for (const m of html.matchAll(/for="(contribution-day-component-\d+-\d+)"[^>]*>(No|\d+) contributions?/g)) {
    const date = dateById.get(m[1]);
    if (date && m[2] !== "No") out[date] = Number(m[2]);
  }
  if (dateById.size === 0) throw new Error("github: could not parse the contributions page");
  return out;
}

// GitLab publishes {date: count} for the public calendar. Private-project
// activity is included only because "Include private contributions on your
// profile" is switched on in GitLab settings; counts only, no details.
async function fetchGitLab() {
  const json = await getJson(`https://gitlab.com/users/${GITLAB_USER}/calendar.json`);
  if (typeof json !== "object" || json === null) throw new Error("gitlab: unexpected calendar payload");
  return json;
}

// ------------------------------------------------------------ activity card

function buildCalendar(gh, gl, start, end) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const k = isoDay(d);
    const g = gh[k] ?? 0;
    const l = gl[k] ?? 0;
    days.push({ date: k, gh: g, gl: l, total: g + l, col: Math.floor((d - start) / (7 * DAY)), row: d.getUTCDay() });
  }

  // Levels by quartile of active days, so the map reads well whatever the volume.
  const active = days.filter((d) => d.total > 0).map((d) => d.total).sort((a, b) => a - b);
  const q = (p) => (active.length ? active[Math.min(active.length - 1, Math.floor(p * active.length))] : 0);
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  for (const d of days) d.level = d.total === 0 ? 0 : d.total <= q1 ? 1 : d.total <= q2 ? 2 : d.total <= q3 ? 3 : 4;

  let longest = 0, run = 0;
  for (const d of days) {
    run = d.total > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) current++;
    else if (i === days.length - 1) continue; // today can still be empty
    else break;
  }
  const busiest = days.reduce((a, d) => (d.total > a.total ? d : a), { total: 0 });

  return {
    days,
    weeks: days[days.length - 1].col + 1,
    total: days.reduce((s, d) => s + d.total, 0),
    ghTotal: days.reduce((s, d) => s + d.gh, 0),
    glTotal: days.reduce((s, d) => s + d.gl, 0),
    activeDays: active.length,
    longest,
    current,
    busiest,
  };
}

// Palette lifted from itsubaidullahomer.com (aurora-dark / aurora-light themes).
const THEMES = {
  dark: {
    bg: "#0e0e13", border: "#ffffff14", fg: "#f5f5f7", muted: "#8a8a95", subtle: "#54545e",
    accent: "#d4f896", levels: ["#1a1a22", "#404934", "#718355", "#a3bd75", "#d4f896"],
  },
  light: {
    bg: "#fafaf7", border: "#0a0a0f14", fg: "#0a0a0f", muted: "#565660", subtle: "#8a8a95",
    accent: "#1f4314", levels: ["#e9e9e4", "#d5e8c4", "#9ccb7a", "#5f9a42", "#2e5a1f"],
  },
};

const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;

function renderActivitySvg(cal, theme, { start, end }) {
  const t = THEMES[theme];
  const W = 830, PAD = 24, CELL = 11, PITCH = 14, LABEL_W = 30;
  const gridX = PAD + LABEL_W;
  const gridY = 146;
  const gridBottom = gridY + 7 * PITCH - (PITCH - CELL);
  const H = 292;

  const stats = [
    { label: "Contributions", value: fmtInt(cal.total), accent: true },
    { label: "Active days", value: `${cal.activeDays} / ${cal.days.length}` },
    { label: "Longest streak", value: `${cal.longest} day${cal.longest === 1 ? "" : "s"}` },
    { label: "Busiest day", value: cal.busiest.total ? `${cal.busiest.total} · ${fmtDate(utcDay(cal.busiest.date), { month: "short", day: "numeric" })}` : "—" },
  ];

  // Month labels where the month changes, skipping a first label that would collide.
  const months = [];
  let lastMonth = -1;
  for (let c = 0; c < cal.weeks; c++) {
    const first = addDays(start, c * 7);
    const m = first.getUTCMonth();
    if (m !== lastMonth) {
      months.push({ col: c, text: fmtDate(first, { month: "short" }) });
      lastMonth = m;
    }
  }
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();

  const weekGroups = [];
  for (let c = 0; c < cal.weeks; c++) {
    const rects = cal.days
      .filter((d) => d.col === c)
      .map(
        (d) =>
          `<rect x="${gridX + c * PITCH}" y="${gridY + d.row * PITCH}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[d.level]}"/>`,
      )
      .join("");
    weekGroups.push(`<g class="w" style="animation-delay:${90 + c * 14}ms">${rects}</g>`);
  }

  const legendX = W - PAD - 5 * PITCH - 8;
  const legend = t.levels
    .map((c, i) => `<rect x="${legendX + i * PITCH}" y="${H - PAD - 12}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`)
    .join("");

  const label = `${fmtInt(cal.total)} contributions between ${fmtDate(start)} and ${fmtDate(end)}: ${fmtInt(cal.glTotal)} on GitLab, ${fmtInt(cal.ghTotal)} on GitHub.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(label)}">
<title>${escapeXml(label)}</title>
<style>
  .s{font-family:${SANS}}
  .m{font-family:${MONO}}
  .cap{font-size:11px;letter-spacing:.08em;text-transform:uppercase;fill:${t.muted}}
  .meta{font-size:11px;fill:${t.subtle}}
  .num{font-size:24px;font-weight:600;fill:${t.fg};letter-spacing:-.02em}
  .lab{font-size:10px;fill:${t.subtle}}
  .w,.n{animation:in .5s ease-out both}
  @keyframes in{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){.w,.n{animation:none}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
<text class="s cap" x="${PAD}" y="${PAD + 14}">Contributions · last 12 months</text>
<text class="s meta" x="${W - PAD}" y="${PAD + 14}" text-anchor="end">GitLab + GitHub · updated ${fmtDate(TODAY)}</text>
${stats
  .map(
    (s, i) => `<g class="n" style="animation-delay:${i * 60}ms">
  <text class="m num" x="${PAD + i * 190}" y="88"${s.accent ? ` fill="${t.accent}"` : ""}>${escapeXml(s.value)}</text>
  <text class="s cap" x="${PAD + i * 190}" y="106">${escapeXml(s.label)}</text>
</g>`,
  )
  .join("\n")}
${months.map((m) => `<text class="s lab" x="${gridX + m.col * PITCH}" y="${gridY - 8}">${m.text}</text>`).join("")}
<text class="s lab" x="${PAD}" y="${gridY + 1 * PITCH + 9}">Mon</text>
<text class="s lab" x="${PAD}" y="${gridY + 3 * PITCH + 9}">Wed</text>
<text class="s lab" x="${PAD}" y="${gridY + 5 * PITCH + 9}">Fri</text>
${weekGroups.join("\n")}
<text class="s meta" x="${PAD}" y="${H - PAD - 3}">${fmtInt(cal.glTotal)} GitLab · ${fmtInt(cal.ghTotal)} GitHub · ${fmtDate(start, { month: "short", year: "numeric" })} – ${fmtDate(end, { month: "short", year: "numeric" })}</text>
<text class="s lab" x="${legendX - 8}" y="${H - PAD - 3}" text-anchor="end">Less</text>
${legend}
<text class="s lab" x="${legendX + 5 * PITCH + 5}" y="${H - PAD - 3}">More</text>
</svg>
`;
}

async function buildActivity() {
  const end = TODAY;
  let start = addDays(end, -364);
  start = addDays(start, -start.getUTCDay()); // back to Sunday so columns are whole weeks
  const [gh, gl] = await Promise.all([fetchGitHub(start, end), fetchGitLab()]);
  const cal = buildCalendar(gh, gl, start, end);

  await mkdir(ASSETS, { recursive: true });
  for (const theme of Object.keys(THEMES))
    await writeFile(path.join(ASSETS, `activity-${theme}.svg`), renderActivitySvg(cal, theme, { start, end }));

  console.log(
    `activity: ${fmtInt(cal.total)} contributions (gitlab ${fmtInt(cal.glTotal)}, github ${fmtInt(cal.ghTotal)}), ${cal.activeDays} active days, longest streak ${cal.longest}, current ${cal.current}`,
  );

  const alt = `Contribution heatmap, GitHub and GitLab merged: ${fmtInt(cal.total)} contributions in the last 12 months`;
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/activity-dark.svg">
  <img alt="${escapeXml(alt)}" src="assets/activity-light.svg">
</picture>

<sub><b>${fmtInt(cal.total)} contributions</b> in the last 12 months — ${fmtInt(cal.glTotal)} on GitLab, ${fmtInt(cal.ghTotal)} on GitHub. Nearly all of my commits go to Tututor.ai's private repos on GitLab, which is why the GitHub graph further down looks empty. This card merges both and rebuilds itself every morning — <a href="scripts/build.mjs">source</a>.</sub>`;
}

// ------------------------------------------------------------- selected work

// "Up" means the server answered at all (anything under 500). A WAF handing a
// runner a 403 is still a running product; a timeout or a 5xx is not.
async function check(url, attempts = 2) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": UA, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(25_000),
      });
      last = { up: res.status < 500, code: res.status, ms: Date.now() - t0 };
      if (last.up) return last;
    } catch (err) {
      last = { up: false, code: 0, ms: Date.now() - t0, error: err.name };
    }
  }
  return last;
}

async function buildWork() {
  const products = JSON.parse(await readFile(path.join(DATA, "products.json"), "utf8"));
  const historyFile = path.join(DATA, "status-history.json");
  let history = {};
  try {
    history = JSON.parse(await readFile(historyFile, "utf8"));
  } catch {}

  let results = await Promise.all(products.map((p) => check(p.url)));
  // Anything that failed gets one more, unhurried try. If the control probe
  // fails as well, the network on this side is the problem: skip the section
  // rather than record downtime that never happened.
  if (results.some((r) => !r.up)) {
    results = await Promise.all(results.map((r, i) => (r.up ? r : check(products[i].url, 1))));
    if (results.some((r) => !r.up) && !(await check("https://github.com", 1)).up)
      throw new Error("control probe failed too; the network here is broken, not the products");
  }
  const todayKey = isoDay(TODAY);
  history[todayKey] = Object.fromEntries(products.map((p, i) => [p.id, results[i]]));

  // Keep 90 days of history; that's plenty for an uptime figure.
  const cutoff = isoDay(addDays(TODAY, -90));
  history = Object.fromEntries(Object.entries(history).filter(([k]) => k >= cutoff).sort());
  await mkdir(DATA, { recursive: true });
  await writeFile(historyFile, JSON.stringify(history, null, 2) + "\n");

  const dates = Object.keys(history);
  let checks = 0, ups = 0;
  for (const day of Object.values(history))
    for (const p of products) if (day[p.id]) { checks++; if (day[p.id].up) ups++; }
  const uptime = checks ? (ups / checks) * 100 : 100;
  const uptimeText = uptime === 100 ? "100%" : uptime.toFixed(uptime >= 99 ? 2 : 1) + "%";
  const since = utcDay(dates[0]);

  const rows = products.map((p, i) => {
    const r = results[i];
    const dot = r.up ? "dot-up" : "dot-down";
    const title = r.up ? `up · HTTP ${r.code} · ${r.ms} ms` : `down · ${r.code ? `HTTP ${r.code}` : r.error ?? "no response"}`;
    return `| <img src="assets/${dot}.svg" width="12" height="12" alt="${r.up ? "up" : "down"}" title="${escapeXml(title)}"> | **[${p.name}](${p.url})** | ${p.what} | ${p.stack.join(" · ")} |`;
  });

  const down = results.filter((r) => !r.up).length;
  console.log(`work: ${products.length - down}/${products.length} up, uptime ${uptimeText} over ${dates.length} day(s)`);

  const now = new Date();
  const checked = `${fmtDate(now, { month: "short", day: "numeric", year: "numeric" })}, ${now.toISOString().slice(11, 16)} UTC`;
  return `| | Project | What it is | Built with |
| :-: | :--- | :--- | :--- |
${rows.join("\n")}

<sub>Status is checked once a day by <a href=".github/workflows/update.yml">a workflow in this repo</a>, not hand-typed. Last check ${checked} · uptime since ${fmtDate(since)}: ${uptimeText}.</sub>`;
}

// ---------------------------------------------------------------------- now

async function fetchNow() {
  // A JSON feed wins if the site ever grows one; otherwise read the page itself.
  try {
    const res = await get(`${SITE}/now.json`);
    if ((res.headers.get("content-type") ?? "").includes("json")) {
      const j = await res.json();
      if (Array.isArray(j.sections)) return { updated: j.updated, sections: j.sections };
    }
  } catch {}

  const html = await getText(`${SITE}/now`);
  const updated = html.match(/Last updated\s*(?:<!--\s*-->)?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/)?.[1];
  // The page's own lists start after the "Last updated" line; anything before it
  // (the footer's sitemap, for one) is navigation, not content.
  const at = html.indexOf("Last updated");
  const body = at === -1 ? html : html.slice(at);
  const sections = [];
  for (const m of body.matchAll(/<div[^>]*>([A-Z][A-Za-z ]{1,30})<\/div>\s*<ul[^>]*>([\s\S]*?)<\/ul>/g)) {
    const items = [...m[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((li) => stripTags(li[1])).filter(Boolean);
    if (items.length) sections.push({ heading: m[1].trim(), items });
  }
  if (!sections.length) throw new Error("now: no sections found on the page");
  return { updated, sections };
}

async function buildNow() {
  const { updated, sections } = await fetchNow();
  console.log(`now: ${sections.length} sections${updated ? `, page updated ${updated}` : ""}`);
  const body = sections.map((s) => `**${s.heading}**\n${s.items.map((i) => `- ${i}`).join("\n")}`).join("\n\n");
  return `<sub>Mirrored from <a href="${SITE}/now">itsubaidullahomer.com/now</a>${updated ? ` · last updated ${updated}` : ""}</sub>

${body}`;
}

// --------------------------------------------------------------------- main

function replaceSection(md, name, body) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(md)) throw new Error(`README.md has no <!-- ${name}:start/end --> markers`);
  return md.replace(re, (_, open, close) => `${open}\n${body}\n${close}`);
}

const original = await readFile(README, "utf8");
let md = original;
let failed = 0;

const sections = [
  ["activity", buildActivity],
  ["work", buildWork],
  ["now", buildNow],
];
const settled = await Promise.allSettled(sections.map(([, fn]) => fn()));
settled.forEach((r, i) => {
  const name = sections[i][0];
  if (r.status === "fulfilled") md = replaceSection(md, name, r.value);
  else {
    failed++;
    const cause = r.reason?.cause ? ` (cause: ${r.reason.cause.code ?? r.reason.cause.message ?? r.reason.cause})` : "";
    console.error(`${name}: FAILED — ${r.reason?.message ?? r.reason}${cause}`);
  }
});

if (md !== original) {
  await writeFile(README, md);
  console.log("README.md updated");
} else console.log("README.md unchanged");

process.exit(failed ? 1 : 0);
