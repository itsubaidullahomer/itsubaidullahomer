import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { projects } from "../../content/projects";
import { experience, faqs, principles, site, stack } from "../../content/site";
import { pricing } from "../../content/pricing";
import { posts } from "../../content/posts";
import { now } from "../../content/now";
import type { SiteTarget } from "../../lib/avatar-guide-server/site-index-types";

// Read the component's literal content without executing client components.
function readLiteralArray(file: string, name: string): unknown[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function literal(node: ts.Node): unknown {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node))
      return Object.fromEntries(
        node.properties.flatMap((p) =>
          ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)
            ? [[p.name.text, literal(p.initializer)]]
            : [],
        ),
      );
    return undefined;
  }
  let found: unknown;
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    )
      found = literal(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!Array.isArray(found)) throw new Error(`Missing ${name} in ${file}`);
  return found;
}

export function buildSiteIndex(): SiteTarget[] {
  const index: SiteTarget[] = [];
  function add(
    sectionId: string,
    selector: string,
    path: string,
    title: string,
    summary: string,
    keyFacts: string[] = [],
    kind: SiteTarget["kind"] = "section",
  ) {
    index.push({ sectionId, selector, path, title, summary, keyFacts, kind });
  }
  add("home", ".hero", "/", site.name, site.description, [
    site.role,
    site.location,
  ]);
  add(
    "work",
    "#work",
    "/",
    "Selected work",
    "Real products, with the decisions and engineering behind them.",
    projects.slice(0, 4).map((p) => p.name),
  );
  add(
    "process",
    "#process",
    "/",
    "Working together",
    "Working previews, clear communication, and care beyond launch.",
  );
  const promises = readLiteralArray("components/process.tsx", "promises") as {
    id: string;
    title: string;
    text: string;
    example: string;
  }[];
  for (const p of promises)
    add(`process-${p.id}`, `#process-${p.id}`, "/", p.title, p.text, [
      p.example,
    ]);
  add(
    "services",
    "#services",
    "/",
    "One engineer. The whole product.",
    "Bring me an idea, a difficult feature, or a product that needs a fresh start.",
  );
  const services = readLiteralArray(
    "components/home-extras.tsx",
    "services",
  ) as string[][];
  services.forEach(([title, description, slug], i) =>
    add(
      `service-${slug}`,
      `#services .service-tile:nth-child(${i + 1})`,
      "/",
      title,
      description,
      [],
      "service",
    ),
  );
  add(
    "experience",
    ".experience-list",
    "/",
    "Experience",
    "Four years of building, learning, and taking on the next hard thing.",
  );
  experience.forEach((e, i) =>
    add(
      `experience-${i + 1}`,
      `.experience-item:nth-child(${i + 1})`,
      "/",
      e.company,
      e.text,
      [e.role, e.dates, e.place, ...e.details],
      "experience",
    ),
  );
  add(
    "pricing",
    ".pricing-grid",
    "/",
    "Scope and pricing",
    "Scope first, quote second. Fixed scope and clear milestones; prices depend on the agreed work.",
  );
  pricing.forEach((p, i) =>
    add(
      `pricing-${i + 1}`,
      `.price-card:nth-child(${i + 1})`,
      "/",
      p.name,
      p.description,
      [
        ...p.includes,
        p.startingAt === null
          ? "No fixed starting price published."
          : `${p.currency} ${p.startingAt}`,
      ],
    ),
  );
  add(
    "faq",
    ".faq-section",
    "/",
    "Frequently asked questions",
    "Tools, remote work, communication, timescales, support and payments.",
  );
  faqs.forEach(([question, answer], i) =>
    add(
      `faq-${i + 1}`,
      `.faq-item:nth-child(${i + 1})`,
      "/",
      question,
      answer,
      [],
      "faq",
    ),
  );
  add(
    "contact",
    ".contact-grid",
    "/contact",
    "Contact Ubaid",
    "Tell me what you’re building. We can talk through the problem and the scope.",
    [
      site.email,
      site.location,
      "UTC+5",
      "Remote work with teams in Europe and beyond.",
    ],
  );
  add(
    "about",
    ".about-grid",
    "/about",
    "About Ubaid",
    "I’m a self-taught AI Product Engineer based in Rahim Yar Khan, Pakistan.",
    ["Started at Danzee Tech in 2022.", "Lead engineer behind Tututor.ai."],
  );
  add(
    "principles",
    ".principles",
    "/about",
    "Engineering principles",
    "I care about reliability, design, speed, and the work around an AI model.",
  );
  principles.forEach((p, i) =>
    add(
      `principle-${i + 1}`,
      `.principles > article:nth-child(${i + 1})`,
      "/about",
      p.title,
      p.text,
      [],
      "principle",
    ),
  );
  add(
    "skills",
    ".stack-list",
    "/about",
    "Tools and skills",
    "The product decides what belongs in the stack.",
    stack,
  );
  stack.forEach((name, i) =>
    add(
      `skill-${i + 1}`,
      `.stack-list > span:nth-child(${i + 1})`,
      "/about",
      name,
      `${name} is part of my published toolset.`,
      [],
      "skill",
    ),
  );
  projects.forEach((p, i) =>
    add(
      `project-${p.slug}`,
      i < 4 ? `#project-${p.slug}` : `.archive-link[href="/work/${p.slug}"]`,
      i < 4 ? "/" : "/work",
      p.name,
      p.description,
      [p.role, p.dates, `Status: ${p.status}`, ...p.stack],
      "project",
    ),
  );
  add(
    "experiments",
    ".experiment-index",
    "/playground",
    "Experiments",
    "Interactive browser experiments in streaming, interruptions, and system architecture.",
    ["These experiments run locally in the browser."],
  );
  add(
    "streaming-lab",
    "#streaming-lab",
    "/playground",
    "Break a stream",
    "Explore latency and recovery from interrupted streaming.",
  );
  add(
    "voice-lab",
    "#voice-lab",
    "/playground",
    "Interrupt a call",
    "Explore voice interruptions and turn-taking in a browser simulation.",
  );
  add(
    "architecture-lab",
    "#architecture-lab",
    "/playground",
    "Follow a request",
    "Explore how a request moves through a system.",
  );
  add(
    "writing",
    ".writing-list",
    "/writing",
    "Writing",
    "Notes from building AI products, teaching clients and maintaining software.",
  );
  posts.forEach((p) =>
    add(
      `writing-${p.slug}`,
      `.post-link[href="/writing/${p.slug}"]`,
      "/writing",
      p.title,
      p.description,
      [`Published: ${p.date}`],
      "writing",
    ),
  );
  add(
    "now",
    ".now-grid",
    "/now",
    "What I’m working on",
    "The published workbench and learning notes.",
    [
      `Content last updated: ${now.updated}`,
      ...now.building.map((p) => `${p.name}: ${p.text}`),
      ...now.learning,
    ],
  );
  if (new Set(index.map((x) => x.sectionId)).size !== index.length)
    throw new Error("Duplicate target ID");
  return index;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = `${JSON.stringify(buildSiteIndex(), null, 2)}\n`;
  const destination = "lib/avatar-guide-server/site-index.json";
  if (process.argv.includes("--check")) {
    if (readFileSync(destination, "utf8") !== output)
      throw new Error(
        "site-index.json is stale. Run npx tsx scripts/avatar/build-site-index.ts",
      );
    console.log("Avatar site index matches source content.");
  } else {
    writeFileSync(destination, output);
    console.log(
      `Generated ${buildSiteIndex().length} verified-source avatar targets.`,
    );
  }
}
