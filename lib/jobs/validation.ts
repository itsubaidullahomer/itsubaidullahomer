import type {
  Activity,
  CandidateProfile,
  Job,
  JobResearch,
  WorkspaceAction,
} from "./types";

export class PortalError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PortalError";
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 500, nonempty = false): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (!nonempty || value.trim().length > 0);
const oneOf = (value: unknown, choices: readonly string[]) =>
  typeof value === "string" && choices.includes(value);
const list = (value: unknown, max = 100): value is unknown[] =>
  Array.isArray(value) && value.length <= max;
const stringList = (value: unknown, max = 100) =>
  list(value, max) && value.every((item) => text(item, 500));
const timestamp = (value: unknown) =>
  text(value, 40) && Number.isFinite(Date.parse(value));
const optionalDate = (value: unknown) => value === null || timestamp(value);
const id = (value: unknown): value is string =>
  text(value, 150, true) && /^[\w:.-]+$/.test(value);
const email = (value: unknown) =>
  value === "" ||
  (text(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
export function isPublicUrl(value: unknown): value is string {
  if (!text(value, 2048, true)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.includes(".") &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}
const optionalPublicUrl = (value: unknown) =>
  value === "" || isPublicUrl(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
/** Paths are inert references to existing image files, never server file-read instructions. */
function imageReferencePath(value: unknown): boolean {
  return (
    value === "" ||
    (text(value, 2048, true) &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !/[\x00-\x1f\\?#]/.test(value) &&
      !value.split("/").some((part) => part === ".." || part === ".") &&
      /\.(png|jpe?g|webp)$/i.test(value))
  );
}
export function assertJobResearch(
  value: unknown,
): asserts value is JobResearch {
  if (
    !object(value) ||
    !exactKeys(value, ["companyUrl", "contacts", "sources"]) ||
    !optionalPublicUrl(value.companyUrl)
  )
    throw new PortalError(
      "Use a public HTTPS company website URL, or leave it empty.",
    );
  if (
    !list(value.contacts, 20) ||
    !value.contacts.every(
      (contact) =>
        object(contact) &&
        exactKeys(contact, [
          "id",
          "name",
          "role",
          "profileUrl",
          "sourceUrl",
          "referralRoute",
          "notes",
          "capturedAt",
        ]) &&
        id(contact.id) &&
        text(contact.name, 200, true) &&
        text(contact.role, 250) &&
        optionalPublicUrl(contact.profileUrl) &&
        isPublicUrl(contact.sourceUrl) &&
        text(contact.referralRoute, 1500) &&
        text(contact.notes, 2000) &&
        timestamp(contact.capturedAt),
    )
  )
    throw new PortalError(
      "Each public contact needs a name, public source URL, capture date, and valid contact details (maximum 20 contacts).",
    );
  if (
    new Set(
      value.contacts.map((contact) => (contact as Record<string, unknown>).id),
    ).size !== value.contacts.length
  )
    throw new PortalError("Contact IDs must be unique.");
  if (
    !list(value.sources, 10) ||
    !value.sources.every(
      (source) =>
        object(source) &&
        exactKeys(source, [
          "id",
          "label",
          "url",
          "text",
          "capturedAt",
          "screenshotUrl",
          "screenshotPath",
        ]) &&
        id(source.id) &&
        text(source.label, 200, true) &&
        isPublicUrl(source.url) &&
        text(source.text, 20_000) &&
        timestamp(source.capturedAt) &&
        optionalPublicUrl(source.screenshotUrl) &&
        imageReferencePath(source.screenshotPath) &&
        !(source.screenshotUrl && source.screenshotPath),
    )
  )
    throw new PortalError(
      "Each source needs a label, public HTTPS URL, valid capture date, and at most one valid screenshot URL or absolute image path (maximum 10 sources).",
    );
  if (
    new Set(
      value.sources.map((source) => (source as Record<string, unknown>).id),
    ).size !== value.sources.length
  )
    throw new PortalError("Source IDs must be unique.");
  if (
    value.sources.reduce<number>(
      (total, source) =>
        total + String((source as Record<string, unknown>).text).length,
      0,
    ) > 40_000
  )
    throw new PortalError(
      "Keep captured source text within 40,000 characters per opportunity.",
    );
}
export function isOwner(
  user: { id: string; email?: string; is_anonymous?: boolean } | null,
  expectedId?: string,
  expectedEmail?: string,
): boolean {
  return (
    !!user &&
    !user.is_anonymous &&
    !!expectedId &&
    !!expectedEmail &&
    user.id === expectedId &&
    user.email?.toLowerCase() === expectedEmail.toLowerCase()
  );
}
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  // /admin is served with Referrer-Policy: no-referrer, under which browsers send
  // "Origin: null" on form posts. Sec-Fetch-Site is set by the browser and cannot be
  // forged by a page, so "same-origin" vouches for those requests.
  const sameOrigin =
    origin === new URL(request.url).origin ||
    (origin === "null" && site === "same-origin");
  if (!origin || !sameOrigin || site === "cross-site")
    throw new PortalError("This action must come from the portal.", 403);
}
export async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new PortalError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PortalError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new PortalError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function readLimitedJson(
  request: Request,
  maxBytes = 150_000,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new PortalError("Expected JSON.", 415);
  const body = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(body);
  } catch {
    throw new PortalError("Invalid JSON.");
  }
}
export function assertProfile(
  value: unknown,
): asserts value is CandidateProfile {
  if (
    !object(value) ||
    !text(value.name, 150, true) ||
    !text(value.headline, 250) ||
    !text(value.location, 200) ||
    !email(value.email) ||
    !isPublicUrl(value.portfolio) ||
    !text(value.summary, 10_000) ||
    !timestamp(value.updatedAt)
  )
    throw new PortalError("The candidate profile has invalid fields.");
  if (
    !list(value.evidence, 100) ||
    !value.evidence.every(
      (e) =>
        object(e) &&
        id(e.id) &&
        text(e.skill, 150, true) &&
        oneOf(e.level, ["working", "proficient", "advanced", "unverified"]) &&
        text(e.statement, 3000, true) &&
        isPublicUrl(e.source) &&
        typeof e.verified === "boolean",
    )
  )
    throw new PortalError("Check the candidate evidence fields.");
  if (
    new Set(value.evidence.map((e) => (e as Record<string, unknown>).id))
      .size !== value.evidence.length
  )
    throw new PortalError("Evidence IDs must be unique.");
  const p = value.preferences;
  if (
    !object(p) ||
    !stringList(p.roles, 12) ||
    typeof p.remoteOnly !== "boolean" ||
    (p.remotePriority !== undefined && typeof p.remotePriority !== "boolean") ||
    (p.overseasOnsite !== undefined &&
      p.overseasOnsite !== "sponsorship_required") ||
    p.country !== "Pakistan" ||
    p.strongFitFirst !== true ||
    p.salaryFloor !== null ||
    typeof p.approvalRequired !== "boolean"
  )
    throw new PortalError(
      "Use valid search and submission preferences. Keep Pakistan as your base, strong-fit-first ranking, no salary cutoff, and sponsorship required for overseas on-site roles.",
    );
}
export function assertJob(value: unknown): asserts value is Job {
  if (
    !object(value) ||
    !id(value.id) ||
    !text(value.company, 250, true) ||
    !text(value.title, 250, true) ||
    !isPublicUrl(value.url) ||
    !text(value.location, 500) ||
    !text(value.salary, 500) ||
    !text(value.description, 50_000) ||
    !text(value.source, 200) ||
    !text(value.sourceId, 250) ||
    !timestamp(value.discoveredAt) ||
    !timestamp(value.updatedAt)
  )
    throw new PortalError(
      "Check the job title, company, source URL, and description.",
    );
  if (
    !oneOf(value.status, [
      "discovered",
      "shortlisted",
      "drafting",
      "needs_approval",
      "approved",
      "applied",
      "interview",
      "offer",
      "rejected",
      "archived",
    ]) ||
    !oneOf(value.priority, ["high", "medium", "low"]) ||
    !oneOf(value.fit, ["strong", "gaps", "stretch", "unknown"]) ||
    !oneOf(value.eligibility, ["confirmed", "unknown", "ineligible"]) ||
    !text(value.eligibilityEvidence, 5000)
  )
    throw new PortalError("Invalid job status or assessment.");
  if (
    !list(value.requirements, 100) ||
    !value.requirements.every(
      (r) =>
        object(r) &&
        id(r.id) &&
        text(r.text, 3000, true) &&
        typeof r.essential === "boolean" &&
        oneOf(r.assessment, ["met", "gap", "unknown"]) &&
        stringList(r.evidenceIds) &&
        text(r.explanation, 5000),
    )
  )
    throw new PortalError("Check the job requirements and evidence.");
  if (
    !stringList(value.tags, 30) ||
    !text(value.notes, 20_000) ||
    !text(value.nextAction, 1000) ||
    !optionalDate(value.nextActionDate) ||
    !text(value.draft, 30_000) ||
    !email(value.contactEmail) ||
    !optionalDate(value.appliedAt)
  )
    throw new PortalError(
      "Check job notes, contact details, dates, and draft length.",
    );
  if (value.research !== undefined) assertJobResearch(value.research);
}
const PATCH_KEYS = new Set([
  "company",
  "title",
  "url",
  "location",
  "salary",
  "description",
  "status",
  "priority",
  "fit",
  "eligibility",
  "eligibilityEvidence",
  "requirements",
  "tags",
  "notes",
  "nextAction",
  "nextActionDate",
  "draft",
  "contactEmail",
  "appliedAt",
  "research",
]);
export function parseAction(value: unknown): WorkspaceAction {
  if (!object(value)) throw new PortalError("An action is required.");
  if (value.type === "add_job") {
    assertJob(value.job);
    return { type: "add_job", job: value.job };
  }
  if (value.type === "update_profile") {
    assertProfile(value.profile);
    return { type: "update_profile", profile: value.profile };
  }
  if (
    value.type === "update_job" &&
    id(value.id) &&
    object(value.patch) &&
    Object.keys(value.patch).every((k) => PATCH_KEYS.has(k)) &&
    Object.keys(value.patch).length > 0
  ) {
    if ("research" in value.patch) assertJobResearch(value.patch.research);
    return {
      type: "update_job",
      id: value.id,
      patch: value.patch as Partial<Job>,
    };
  }
  if (value.type === "add_activity" && object(value.activity)) {
    const a = value.activity;
    if (
      !(a.jobId === null || id(a.jobId)) ||
      !oneOf(a.type, ["note", "email_sent", "email_received"]) ||
      !text(a.title, 250, true) ||
      !text(a.body, 30_000)
    )
      throw new PortalError(
        "Only notes and manually recorded emails can be added here.",
      );
    return {
      type: "add_activity",
      activity: {
        id: crypto.randomUUID(),
        jobId: a.jobId,
        type: a.type,
        title: a.title,
        body: a.body,
        actor: "you",
        createdAt: new Date().toISOString(),
      } as Activity,
    };
  }
  throw new PortalError("Unsupported action.");
}
