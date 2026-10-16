import { createHash } from "node:crypto";
import { ownerClient, portalFailure } from "@/lib/jobs/server";
import {
  assertDocumentId,
  DOCUMENT_BUCKET,
  documentDownloadHeaders,
} from "@/lib/jobs/documents";
import { PortalError } from "@/lib/jobs/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { client, userId } = await ownerClient();
    const { id } = await context.params;
    assertDocumentId(id);
    const { data: document, error } = await client
      .from("jobs_documents")
      .select("path,filename,mime,size,sha256")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new PortalError("The document could not be loaded.", 503);
    if (!document) throw new PortalError("This document was not found.", 404);
    const downloaded = await client.storage
      .from(DOCUMENT_BUCKET)
      .download(document.path);
    if (downloaded.error || !downloaded.data)
      throw new PortalError("The private file could not be downloaded.", 503);
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (
      bytes.byteLength !== document.size ||
      createHash("sha256").update(bytes).digest("hex") !== document.sha256
    )
      throw new PortalError(
        "The stored document failed its integrity check.",
        503,
      );
    return new Response(bytes, { headers: documentDownloadHeaders(document) });
  } catch (error) {
    return portalFailure(error);
  }
}
