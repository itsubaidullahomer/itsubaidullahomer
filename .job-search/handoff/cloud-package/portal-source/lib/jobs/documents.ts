import { PortalError } from "./validation";

export const DOCUMENT_BUCKET = "job-documents";
export const MAX_DOCUMENT_BYTES = 3_800_000;
export const MAX_MULTIPART_BYTES = 4_000_000;
export const DOCUMENT_KINDS = [
  "master_ats",
  "master_outreach",
  "tailored_resume",
  "job_screenshot",
  "supporting",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type DocumentMime =
  "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  master_ats: "ATS master",
  master_outreach: "Outreach master",
  tailored_resume: "Tailored resume",
  job_screenshot: "Job screenshot",
  supporting: "Supporting document",
};
export interface JobDocument {
  id: string;
  jobId: string | null;
  kind: DocumentKind;
  title: string;
  filename: string;
  mime: DocumentMime;
  size: number;
  sha256: string;
  createdAt: string;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const controls = /[\x00-\x1f\x7f]/;
export function assertDocumentId(value: string): void {
  if (!uuid.test(value))
    throw new PortalError("Choose an existing document.", 400);
}
export function assertDocumentJobId(value: string): void {
  if (!value || value.length > 150 || !/^[\w:.-]+$/.test(value))
    throw new PortalError("Choose an existing opportunity.");
}
function filename(value: string): string {
  const name = value.normalize("NFKC");
  if (
    !name ||
    name.length > 180 ||
    controls.test(name) ||
    /[/\\]/.test(name) ||
    name.startsWith(".") ||
    !/\.(pdf|png|jpe?g|webp)$/i.test(name)
  )
    throw new PortalError(
      "Use a PDF, PNG, JPEG or WebP filename without path characters.",
      415,
    );
  return name;
}
export function documentPath(userId: string, id: string, name: string): string {
  assertDocumentId(userId);
  assertDocumentId(id);
  return `${userId}/${id}/${filename(name)}`;
}
function starts(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}
function sniff(bytes: Uint8Array): DocumentMime | null {
  const ascii = (start: number, end: number) =>
    new TextDecoder("ascii").decode(bytes.slice(start, end));
  if (
    bytes.length >= 16 &&
    /^%PDF-[12]\.\d/.test(ascii(0, 8)) &&
    ascii(Math.max(0, bytes.length - 1024), bytes.length).includes("%%EOF")
  )
    return "application/pdf";
  if (
    bytes.length >= 45 &&
    starts(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) &&
    ascii(12, 16) === "IHDR" &&
    ascii(bytes.length - 8, bytes.length - 4) === "IEND"
  )
    return "image/png";
  if (
    bytes.length >= 8 &&
    starts(bytes, [255, 216, 255]) &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  )
    return "image/jpeg";
  if (
    bytes.length >= 20 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(ascii(12, 16)) &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      4,
      true,
    ) +
      8 ===
      bytes.length
  )
    return "image/webp";
  return null;
}
/** Bound the raw body before calling formData; Content-Length is only an early rejection. */
async function limitedMultipart(request: Request): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (
    !/^multipart\/form-data\s*;\s*boundary=(?:"[^"]{1,100}"|[^;\s]{1,100})(?:\s*;.*)?$/i.test(
      type,
    )
  )
    throw new PortalError("Upload one file using multipart form data.", 415);
  const declared = request.headers.get("content-length");
  if (declared && !/^\d+$/.test(declared))
    throw new PortalError("Invalid upload length.");
  if (declared && Number(declared) > MAX_MULTIPART_BYTES)
    throw new PortalError("Keep the complete upload under 4 MB.", 413);
  if (!request.body) throw new PortalError("Choose a file to upload.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        throw new PortalError("Keep the complete upload under 4 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(body, {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new PortalError("The uploaded form could not be read.");
  }
}
export async function parseDocumentUpload(
  request: Request,
): Promise<{
  file: File;
  bytes: Uint8Array;
  kind: DocumentKind;
  title: string;
  jobId: string | null;
  filename: string;
  mime: DocumentMime;
}> {
  const form = await limitedMultipart(request);
  for (const key of form.keys())
    if (
      !["file", "kind", "title", "jobId"].includes(key) ||
      form.getAll(key).length !== 1
    )
      throw new PortalError(
        "Upload one file with a title, document kind and optional opportunity.",
      );
  const file = form.get("file"),
    kind = form.get("kind"),
    rawTitle = form.get("title"),
    rawJob = form.get("jobId");
  if (!(file instanceof File))
    throw new PortalError("Choose one file to upload.");
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES)
    throw new PortalError(
      "Choose a non-empty file up to 3.8 MB.",
      file.size ? 413 : 400,
    );
  if (
    typeof kind !== "string" ||
    !DOCUMENT_KINDS.includes(kind as DocumentKind)
  )
    throw new PortalError("Choose a document kind.");
  if (
    typeof rawTitle !== "string" ||
    !rawTitle.trim() ||
    rawTitle.trim().length > 160 ||
    controls.test(rawTitle)
  )
    throw new PortalError("Enter a title of up to 160 characters.");
  if (rawJob !== null && typeof rawJob !== "string")
    throw new PortalError("Choose an existing opportunity.");
  const jobId = rawJob ? rawJob : null;
  if (jobId) assertDocumentJobId(jobId);
  if (["master_ats", "master_outreach"].includes(kind) && jobId)
    throw new PortalError(
      "Save master resumes to the library without an opportunity.",
    );
  if (["tailored_resume", "job_screenshot"].includes(kind) && !jobId)
    throw new PortalError("Choose an opportunity for this document.");
  const name = filename(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  const extensions: Record<DocumentMime, RegExp> = {
    "application/pdf": /\.pdf$/i,
    "image/png": /\.png$/i,
    "image/jpeg": /\.jpe?g$/i,
    "image/webp": /\.webp$/i,
  };
  if (!mime || file.type !== mime || !extensions[mime].test(name))
    throw new PortalError(
      "The file contents, type and extension must match a PDF, PNG, JPEG or WebP file.",
      415,
    );
  if (
    kind !== "supporting" &&
    (kind === "job_screenshot"
      ? mime === "application/pdf"
      : mime !== "application/pdf")
  )
    throw new PortalError(
      "Use a PDF for a resume and an image for a job screenshot.",
      415,
    );
  return {
    file,
    bytes,
    kind: kind as DocumentKind,
    title: rawTitle.trim(),
    jobId,
    filename: name,
    mime,
  };
}
export function documentDownloadHeaders(document: {
  filename: string;
  mime: DocumentMime;
  size: number;
}): Headers {
  const name = filename(document.filename);
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return new Headers({
    "Content-Type": document.mime,
    "Content-Length": String(document.size),
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "Referrer-Policy": "no-referrer",
  });
}
