import { createHash, randomUUID } from "node:crypto";
import { ownerClient, portalFailure, portalResponse } from "@/lib/jobs/server";
import { assertSameOrigin, PortalError } from "@/lib/jobs/validation";
import {
  assertDocumentJobId,
  DOCUMENT_BUCKET,
  documentPath,
  parseDocumentUpload,
  type JobDocument,
} from "@/lib/jobs/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const columns = "id,job_id,kind,title,filename,mime,size,sha256,created_at";
function record(row: Record<string, unknown>): JobDocument {
  return {
    id: row.id,
    jobId: row.job_id,
    kind: row.kind,
    title: row.title,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    sha256: row.sha256,
    createdAt: row.created_at,
  } as JobDocument;
}
export async function GET(request: Request) {
  try {
    const { client, userId } = await ownerClient();
    const params = new URL(request.url).searchParams;
    const jobId = params.get("jobId"),
      library = params.get("scope") === "library",
      offset = Number(params.get("offset") ?? 0);
    if (jobId) assertDocumentJobId(jobId);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000)
      throw new PortalError("Invalid document page.");
    let query = client
      .from("jobs_documents")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 49);
    if (jobId) query = query.eq("job_id", jobId);
    else if (library) query = query.is("job_id", null);
    const { data, error } = await query;
    if (error)
      throw new PortalError(
        "The document library is not ready. Complete its database and storage setup.",
        503,
      );
    return portalResponse({
      documents: data.map(record),
      hasMore: data.length === 50,
    });
  } catch (error) {
    return portalFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { client, userId } = await ownerClient();
    const upload = await parseDocumentUpload(request);
    if (upload.jobId) {
      const { data, error } = await client
        .from("jobs")
        .select("id")
        .eq("user_id", userId)
        .eq("id", upload.jobId)
        .maybeSingle();
      if (error)
        throw new PortalError("The opportunity could not be checked.", 503);
      if (!data)
        throw new PortalError(
          "Choose an existing opportunity in your workspace.",
          404,
        );
    }
    const id = randomUUID(),
      path = documentPath(userId, id, upload.filename);
    const sha256 = createHash("sha256").update(upload.bytes).digest("hex");
    const storage = client.storage.from(DOCUMENT_BUCKET);
    const saved = await storage.upload(path, upload.bytes, {
      contentType: upload.mime,
      cacheControl: "0",
      upsert: false,
    });
    if (saved.error)
      throw new PortalError(
        "The file could not be stored. Check the private document storage setup.",
        503,
      );
    try {
      const inserted = await client
        .from("jobs_documents")
        .insert({
          id,
          user_id: userId,
          job_id: upload.jobId,
          kind: upload.kind,
          title: upload.title,
          filename: upload.filename,
          path,
          mime: upload.mime,
          size: upload.bytes.byteLength,
          sha256,
        })
        .select(columns)
        .single();
      if (inserted.error) throw inserted.error;
      return portalResponse({ document: record(inserted.data) }, 201);
    } catch {
      // RLS only permits removal while this object has no immutable metadata record.
      try {
        await storage.remove([path]);
      } catch {
        /* Keep the original save failure; referenced versions cannot be deleted. */
      }
      throw new PortalError(
        "The document record could not be saved. Please try again.",
        503,
      );
    }
  } catch (error) {
    return portalFailure(error);
  }
}
