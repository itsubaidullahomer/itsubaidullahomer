import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertDocumentId,
  DOCUMENT_KINDS,
  documentDownloadHeaders,
  documentPath,
  MAX_DOCUMENT_BYTES,
  MAX_MULTIPART_BYTES,
  parseDocumentUpload,
} from "../lib/jobs/documents";
import { PortalError } from "../lib/jobs/validation";

const ownerId = "7e23a496-7f8b-4fa8-b8ab-a2b4ba260f38";
const documentId = "883b7f09-0814-4c89-a328-436c53909a87";
const endpoint = "https://admin.example.com/api/jobs/documents";
const pdf = new TextEncoder().encode(
  "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
// One-pixel images generated with sharp; exercise real file signatures and trailers.
const fromBase64 = (value: string) =>
  new Uint8Array(Buffer.from(value, "base64"));
const png = fromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC",
);
const jpeg = fromBase64(
  "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
);
const webp = fromBase64(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vz0AAA=",
);
const webpLossless = fromBase64(
  "UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAEAfQ//73v4CBiOh/AAA=",
);
const webpExtended = fromBase64(
  "UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAgFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP789AAA",
);

interface UploadOptions {
  bytes?: Uint8Array<ArrayBuffer>;
  filename?: string;
  mime?: string;
  kind?: string;
  title?: string;
  jobId?: string;
  edit?: (form: FormData) => void;
}

function upload(options: UploadOptions = {}) {
  const form = new FormData();
  form.set(
    "file",
    new File([options.bytes ?? pdf], options.filename ?? "resume.pdf", {
      type: options.mime ?? "application/pdf",
    }),
  );
  form.set("kind", options.kind ?? "master_ats");
  form.set("title", options.title ?? "  Master resume  ");
  if (options.jobId !== undefined) form.set("jobId", options.jobId);
  options.edit?.(form);
  return new Request(endpoint, { method: "POST", body: form });
}

async function rejectsStatus(request: Request, status: number) {
  await assert.rejects(
    () => parseDocumentUpload(request),
    (error: unknown) => error instanceof PortalError && error.status === status,
  );
}

function sizedPdf(size: number) {
  const bytes = new Uint8Array(size).fill(32);
  bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
  bytes.set(new TextEncoder().encode("\n%%EOF\n"), size - 7);
  return bytes;
}

test("multipart PDFs retain exact bytes, normalize the title, and support both master kinds", async () => {
  assert.deepEqual([...DOCUMENT_KINDS].sort(), [
    "job_screenshot",
    "master_ats",
    "master_outreach",
    "supporting",
    "tailored_resume",
  ]);
  for (const kind of ["master_ats", "master_outreach"]) {
    const result = await parseDocumentUpload(upload({ kind }));
    assert.ok(result.file instanceof File);
    assert.deepEqual(result.bytes, pdf);
    assert.equal(result.file.size, pdf.length);
    assert.equal(result.kind, kind);
    assert.equal(result.title, "Master resume");
    assert.equal(result.jobId, null);
    assert.equal(result.filename, "resume.pdf");
    assert.equal(result.mime, "application/pdf");
  }
});

test("supported image encodings round-trip as job screenshots and supporting documents", async () => {
  for (const [bytes, filename, mime] of [
    [png, "listing.png", "image/png"],
    [jpeg, "listing.jpg", "image/jpeg"],
    [jpeg, "listing.jpeg", "image/jpeg"],
    [webp, "listing.webp", "image/webp"],
    [webpLossless, "lossless.webp", "image/webp"],
    [webpExtended, "alpha.webp", "image/webp"],
  ] as const) {
    const result = await parseDocumentUpload(
      upload({
        bytes,
        filename,
        mime,
        kind: "job_screenshot",
        jobId: "source:job-123.4",
      }),
    );
    assert.equal(result.mime, mime);
    assert.equal(result.filename, filename);
    assert.equal(result.jobId, "source:job-123.4");
    assert.deepEqual(result.bytes, bytes);
    const supporting = await parseDocumentUpload(
      upload({ bytes, filename, mime, kind: "supporting" }),
    );
    assert.equal(supporting.jobId, null);
  }
  const tailored = await parseDocumentUpload(
    upload({ kind: "tailored_resume", jobId: "job-123" }),
  );
  assert.equal(tailored.jobId, "job-123");
  assert.equal(
    (
      await parseDocumentUpload(
        upload({ kind: "supporting", jobId: "job-123" }),
      )
    ).jobId,
    "job-123",
  );
});

test("file bytes, declared MIME, and filename extension must agree", async () => {
  for (const options of [
    { bytes: new TextEncoder().encode("<svg onload='alert(1)'></svg>") },
    { bytes: new TextEncoder().encode("<!doctype html><title>resume</title>") },
    { filename: "resume.pdf.html" },
    { filename: "resume.svg" },
    { mime: "text/html" },
    { mime: "image/png" },
    { bytes: png, filename: "resume.pdf", mime: "application/pdf" },
    { bytes: pdf, filename: "listing.png", mime: "image/png" },
    { bytes: jpeg, filename: "listing.png", mime: "image/png" },
    { bytes: png, filename: "listing.jpg", mime: "image/jpeg" },
  ]) {
    await rejectsStatus(upload({ kind: "supporting", ...options }), 415);
  }
  await rejectsStatus(upload({ bytes: new Uint8Array(0) }), 400);
});

test("truncated signatures and invalid WebP containers cannot masquerade as allowed files", async () => {
  const wrongWebpLength = new Uint8Array(webp);
  new DataView(wrongWebpLength.buffer).setUint32(4, webp.length + 100, true);
  const wrongWebpChunk = new Uint8Array(webp);
  wrongWebpChunk.set(new TextEncoder().encode("JUNK"), 12);
  const wrongPngHeader = new Uint8Array(png);
  wrongPngHeader.set(new TextEncoder().encode("JUNK"), 12);
  for (const [bytes, filename, mime] of [
    [pdf.subarray(0, pdf.length - 7), "resume.pdf", "application/pdf"],
    [png.subarray(0, png.length - 12), "listing.png", "image/png"],
    [wrongPngHeader, "listing.png", "image/png"],
    [jpeg.subarray(0, jpeg.length - 2), "listing.jpg", "image/jpeg"],
    [wrongWebpLength, "listing.webp", "image/webp"],
    [wrongWebpChunk, "listing.webp", "image/webp"],
    [webp.subarray(0, 12), "listing.webp", "image/webp"],
  ] as const) {
    await rejectsStatus(
      upload({ bytes, filename, mime, kind: "supporting" }),
      415,
    );
  }
});

test("document kind enforces PDF masters and a job association for tailored resumes and screenshots", async () => {
  for (const kind of ["master_ats", "master_outreach"]) {
    await rejectsStatus(upload({ kind, jobId: "job-123" }), 400);
    await rejectsStatus(
      upload({ kind, bytes: png, filename: "resume.png", mime: "image/png" }),
      415,
    );
  }
  for (const kind of ["tailored_resume", "job_screenshot"]) {
    await rejectsStatus(upload({ kind }), 400);
  }
  await rejectsStatus(
    upload({ kind: "job_screenshot", jobId: "job-123" }),
    415,
  );
  await rejectsStatus(
    upload({
      kind: "tailored_resume",
      jobId: "job-123",
      bytes: png,
      filename: "resume.png",
      mime: "image/png",
    }),
    415,
  );
});

test("multipart schema rejects missing, duplicate, unknown, and wrong-value fields", async () => {
  for (const field of ["file", "kind", "title"]) {
    await rejectsStatus(upload({ edit: (form) => form.delete(field) }), 400);
  }
  for (const field of ["file", "kind", "title", "jobId"]) {
    await rejectsStatus(
      upload({
        kind: "supporting",
        jobId: "job-123",
        edit: (form) => form.append(field, form.get(field)!),
      }),
      400,
    );
  }
  for (const edit of [
    (form: FormData) => form.set("ownerId", ownerId),
    (form: FormData) => form.set("storagePath", `${ownerId}/forged.pdf`),
    (form: FormData) => form.set("file", "not a file"),
    (form: FormData) => form.set("kind", new File(["master_ats"], "kind.txt")),
    (form: FormData) => form.set("title", new File(["Title"], "title.txt")),
    (form: FormData) => form.set("jobId", new File(["job-123"], "job.txt")),
  ]) {
    await rejectsStatus(upload({ edit }), 400);
  }
  await rejectsStatus(upload({ kind: "public_resume" }), 400);
});

test("metadata rejects invalid job IDs, blank or excessive titles, and unsafe filenames", async () => {
  for (const jobId of [
    "../job",
    "job/123",
    "job\\123",
    "two words",
    "x".repeat(151),
    "job\u0000id",
  ]) {
    await rejectsStatus(upload({ kind: "supporting", jobId }), 400);
  }
  for (const title of [
    "",
    "   ",
    "x".repeat(161),
    "bad\nname",
    "bad\u0000name",
    "bad\u007fname",
  ]) {
    await rejectsStatus(upload({ title }), 400);
  }
  for (const filename of [
    "../resume.pdf",
    "folder/resume.pdf",
    "folder\\resume.pdf",
    "bad\u0000.pdf",
    `${"x".repeat(177)}.pdf`,
  ]) {
    await rejectsStatus(upload({ filename }), 415);
  }
  const unicode = await parseDocumentUpload(
    upload({ filename: "re\u0301sume\u0301.pdf", title: "Résumé" }),
  );
  assert.equal(unicode.filename, "résumé.pdf");
  assert.equal(unicode.title, "Résumé");
});

test("multipart media type and malformed payload failures are controlled client errors", async () => {
  await rejectsStatus(
    new Request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
    415,
  );
  for (const [contentType, status] of [
    ["multipart/form-data", 415],
    ["multipart/form-data; boundary=fixture", 400],
  ] as const) {
    await rejectsStatus(
      new Request(endpoint, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: "broken multipart",
      }),
      status,
    );
  }
});

test("individual file size is bounded even when multipart envelope is below its limit", async () => {
  assert.equal(MAX_DOCUMENT_BYTES, 3_800_000);
  assert.equal(MAX_MULTIPART_BYTES, 4_000_000);
  const exact = await parseDocumentUpload(
    upload({ bytes: sizedPdf(MAX_DOCUMENT_BYTES) }),
  );
  assert.equal(exact.bytes.length, MAX_DOCUMENT_BYTES);
  await rejectsStatus(upload({ bytes: sizedPdf(MAX_DOCUMENT_BYTES + 1) }), 413);
});

test("oversized chunked multipart requests are stopped and cancelled without trusting Content-Length", async () => {
  const encoded = upload({ bytes: sizedPdf(MAX_MULTIPART_BYTES * 2) });
  const body = new Uint8Array(await encoded.arrayBuffer());
  const chunkSize = 64 * 1024;
  for (const claimedLength of [undefined, "1"]) {
    let emittedBytes = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (emittedBytes === body.length) return controller.close();
        const next = body.subarray(emittedBytes, emittedBytes + chunkSize);
        emittedBytes += next.length;
        controller.enqueue(next);
      },
      cancel() {
        cancelled = true;
      },
    });
    const headers = new Headers({
      "Content-Type": encoded.headers.get("Content-Type")!,
    });
    if (claimedLength) headers.set("Content-Length", claimedLength);
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    };
    await rejectsStatus(new Request(endpoint, init), 413);
    assert.equal(
      cancelled,
      true,
      "overflow must cancel the unread request stream",
    );
    assert.ok(
      emittedBytes < body.length,
      "must reject without buffering the entire request",
    );
    assert.ok(
      emittedBytes <= MAX_MULTIPART_BYTES + 2 * chunkSize,
      "read at most the limit and stream prefetch",
    );
  }
});

test("downloads force private non-sniffable attachments and preserve Unicode filenames safely", () => {
  const headers = documentDownloadHeaders({
    filename: 'résumé "final".pdf',
    mime: "application/pdf",
    size: pdf.length,
  });
  assert.equal(headers.get("Content-Type"), "application/pdf");
  assert.equal(headers.get("Content-Length"), String(pdf.length));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(headers.get("Cache-Control") ?? "", /(?:^|,\s*)private(?:,|$)/);
  assert.match(headers.get("Cache-Control") ?? "", /(?:^|,\s*)no-store(?:,|$)/);
  const disposition = headers.get("Content-Disposition") ?? "";
  assert.match(disposition, /^attachment;/);
  assert.match(disposition, /filename\*=UTF-8''/i);
  assert.ok(disposition.includes(encodeURIComponent('résumé "final".pdf')));
  assert.ok(!disposition.includes("\r") && !disposition.includes("\n"));
  assert.ok(!disposition.includes('filename="résumé "final".pdf"'));
});

test("document IDs and storage paths reject traversal and cannot escape the authenticated owner prefix", () => {
  assert.doesNotThrow(() => assertDocumentId(documentId));
  for (const id of [
    "",
    "document-123",
    "../secret",
    `${documentId}/secret`,
    `${documentId}\n`,
    "00000000-0000-0000-0000-00000000000z",
  ]) {
    assert.throws(() => assertDocumentId(id), PortalError);
  }
  const path = documentPath(ownerId, documentId, "résumé.pdf");
  assert.ok(path.startsWith(`${ownerId}/`));
  assert.ok(path.includes(documentId));
  assert.equal(path.split("/").length, 3);
  for (const invalidOwner of [
    "",
    "../other-owner",
    `${ownerId}/../other-owner`,
    "owner\\other",
  ]) {
    assert.throws(
      () => documentPath(invalidOwner, documentId, "resume.pdf"),
      PortalError,
    );
  }
  for (const invalidId of ["../secret", `${documentId}/other`]) {
    assert.throws(
      () => documentPath(ownerId, invalidId, "resume.pdf"),
      PortalError,
    );
  }
  for (const filename of [
    "../resume.pdf",
    "other/resume.pdf",
    "other\\resume.pdf",
    "bad\u0000.pdf",
  ]) {
    assert.throws(
      () => documentPath(ownerId, documentId, filename),
      PortalError,
    );
  }
});
