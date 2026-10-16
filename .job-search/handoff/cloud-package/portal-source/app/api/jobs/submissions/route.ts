import { createHash } from "node:crypto";
import {
  DOCUMENT_BUCKET,
  assertDocumentJobId,
  type JobDocument,
} from "@/lib/jobs/documents";
import { ownerClient, portalFailure, portalResponse } from "@/lib/jobs/server";
import {
  assertAgentSubmission,
  assertSubmissionResume,
  parseSubmission,
  submissionRecord,
} from "@/lib/jobs/submissions";
import {
  assertSameOrigin,
  PortalError,
  readLimitedJson,
} from "@/lib/jobs/validation";
import type { CandidateProfile, Job } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const columns =
  "id,job_id,document_id,channel,destination,submitted_at,confirmation,receipt_url,actor,resume_sha256,resume_filename,recorded_at";

export async function GET(request: Request) {
  try {
    const { client, userId } = await ownerClient();
    const params = new URL(request.url).searchParams;
    const jobId = params.get("jobId"),
      offset = Number(params.get("offset") ?? 0);
    if (jobId) assertDocumentJobId(jobId);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000)
      throw new PortalError("Invalid receipt page.");
    let query = client
      .from("jobs_submissions")
      .select(columns)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 49);
    if (jobId) query = query.eq("job_id", jobId);
    const { data, error } = await query;
    if (error)
      throw new PortalError(
        "Application receipts are not available. Check the database setup.",
        503,
      );
    return portalResponse({
      submissions: data.map(submissionRecord),
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
    const input = parseSubmission(await readLimitedJson(request, 16_000));
    // A committed retry must remain recoverable even if the job has since moved to an interview.
    const existing = await client
      .from("jobs_submissions")
      .select(columns)
      .eq("user_id", userId)
      .eq("id", input.id)
      .maybeSingle();
    if (existing.error)
      throw new PortalError(
        "Application receipts are not available. Check the database setup.",
        503,
      );
    if (!existing.data) {
      const [documentResult, workspaceResult] = await Promise.all([
        client
          .from("jobs_documents")
          .select(
            "id,job_id,kind,title,filename,path,mime,size,sha256,created_at",
          )
          .eq("user_id", userId)
          .eq("id", input.documentId)
          .maybeSingle(),
        client.rpc("jobs_load_workspace"),
      ]);
      if (documentResult.error || workspaceResult.error)
        throw new PortalError(
          "The saved resume and opportunity could not be checked.",
          503,
        );
      const row = documentResult.data;
      const job = (workspaceResult.data.jobs as Job[]).find(
        (item) => item.id === input.jobId,
      );
      if (!row || !job)
        throw new PortalError(
          "Choose an existing opportunity and its saved resume.",
          404,
        );
      const document = {
        ...row,
        jobId: row.job_id,
        createdAt: row.created_at,
      } as JobDocument;
      assertSubmissionResume(input, document);
      assertAgentSubmission(
        input,
        job,
        workspaceResult.data.profile as CandidateProfile,
      );
      const download = await client.storage
        .from(DOCUMENT_BUCKET)
        .download(row.path);
      if (download.error || !download.data)
        throw new PortalError(
          "The exact saved resume could not be verified.",
          503,
        );
      const bytes = new Uint8Array(await download.data.arrayBuffer());
      if (
        bytes.byteLength !== document.size ||
        createHash("sha256").update(bytes).digest("hex") !== document.sha256
      )
        throw new PortalError(
          "The saved resume failed its integrity check. Upload a new version.",
          409,
        );
    }
    const result = await client.rpc("jobs_record_submission", {
      p_receipt: input,
    });
    if (result.error) {
      if (["23505", "23514", "22023"].includes(result.error.code))
        throw new PortalError(
          "The receipt conflicts with an existing record or the job is not ready for this submission. Refresh and review it.",
          409,
        );
      throw new PortalError("The application receipt could not be saved.", 503);
    }
    return portalResponse(
      {
        submission: submissionRecord(result.data.receipt),
        workspace: result.data.workspace,
      },
      existing.data ? 200 : 201,
    );
  } catch (error) {
    return portalFailure(error);
  }
}
