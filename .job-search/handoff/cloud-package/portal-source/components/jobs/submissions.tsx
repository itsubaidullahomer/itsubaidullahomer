"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDownToLine, Plus, X } from "lucide-react";
import type { JobDocument } from "@/lib/jobs/documents";
import type {
  SubmissionInput,
  SubmissionReceipt,
} from "@/lib/jobs/submissions";
import type { Job, Workspace } from "@/lib/jobs/types";
import { isPublicUrl } from "@/lib/jobs/validation";

const date = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
function localDateTime() {
  const value = new Date();
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export default function SubmissionReceipts({
  job,
  preview,
  onRecorded,
  allowRecord = true,
}: {
  job: Job;
  preview: boolean;
  onRecorded: (workspace: Workspace) => void;
  allowRecord?: boolean;
}) {
  const [receipts, setReceipts] = useState<SubmissionReceipt[]>([]);
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [channel, setChannel] =
    useState<SubmissionInput["channel"]>("employer_form");
  const [submittedAt] = useState(localDateTime);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const endpoint = `/api/jobs/submissions?jobId=${encodeURIComponent(job.id)}`;
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Receipts could not be loaded.");
        setReceipts(data.submissions);
        setHasMore(data.hasMore);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [endpoint, preview]);

  async function openForm() {
    if (adding) {
      setAdding(false);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/jobs/documents?jobId=${encodeURIComponent(job.id)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Saved resumes could not be loaded.");
      setDocuments(
        data.documents.filter(
          (document: JobDocument) => document.kind === "tailored_resume",
        ),
      );
      setAdding(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Saved resumes could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}&offset=${receipts.length}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Receipts could not be loaded.");
      setReceipts((previous) => [
        ...previous,
        ...data.submissions.filter(
          (item: SubmissionReceipt) =>
            !previous.some((saved) => saved.id === item.id),
        ),
      ]);
      setHasMore(data.hasMore);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Receipts could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || busy) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      jobId: job.id,
      documentId: String(form.get("documentId")),
      channel,
      destination: String(form.get("destination")).trim(),
      submittedAt: new Date(String(form.get("submittedAt"))).toISOString(),
      confirmation: String(form.get("confirmation")).trim(),
      receiptUrl: String(form.get("receiptUrl")).trim(),
      actor: "you" as const,
    };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/jobs/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attempt.current.id, ...payload }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The application receipt could not be saved.",
        );
      setReceipts((previous) => [
        data.submission,
        ...previous.filter((item) => item.id !== data.submission.id),
      ]);
      onRecorded(data.workspace);
      setAdding(false);
      attempt.current = null;
      setNotice("Receipt saved with the exact resume you submitted.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The receipt could not be saved. Retry to recover the same record.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="jp-panel">
      <div className="jp-section-heading">
        <div>
          <h3>Application receipts</h3>
          <p>
            Each completed application keeps its confirmation and the exact
            resume sent.
          </p>
        </div>
        {allowRecord && (
          <button
            className="jp-button"
            disabled={preview || busy}
            onClick={openForm}
            aria-expanded={adding}
          >
            {adding ? <X size={14} /> : <Plus size={14} />}
            {adding ? "Close" : "Record submission"}
          </button>
        )}
      </div>
      {preview && (
        <p className="jp-quiet">
          Receipts are available in your signed-in workspace.
        </p>
      )}
      {error && (
        <div className="jp-message is-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="jp-callout is-green" role="status">
          {notice}
        </p>
      )}
      {adding && (
        <form onSubmit={record} className="jp-form">
          <p className="jp-quiet">
            Use this after you have submitted externally and received
            confirmation. Saving a receipt does not send an application.
          </p>
          <label className="jp-field">
            Exact tailored resume
            <select name="documentId" required defaultValue="">
              <option value="" disabled>
                Choose the submitted PDF
              </option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title} · {date(document.createdAt)}
                </option>
              ))}
            </select>
          </label>
          {!documents.length && (
            <p className="jp-callout">
              Upload the submitted PDF as a tailored resume in this
              opportunity’s Documents tab first.
            </p>
          )}
          <label className="jp-field">
            Submitted through
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as SubmissionInput["channel"])
              }
            >
              <option value="employer_form">Employer application form</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label className="jp-field">
            {channel === "email" ? "Recipient email" : "Application URL"}
            <input
              key={channel}
              name="destination"
              type={channel === "email" ? "email" : "url"}
              required
              maxLength={2048}
              defaultValue={channel === "email" ? job.contactEmail : job.url}
            />
          </label>
          <label className="jp-field">
            Submission time (your local time)
            <input
              name="submittedAt"
              type="datetime-local"
              required
              defaultValue={submittedAt}
            />
          </label>
          <label className="jp-field">
            Confirmation message or reference
            <textarea
              name="confirmation"
              required
              maxLength={4000}
              rows={3}
              placeholder="Copy the employer’s confirmation or application reference."
            />
          </label>
          <label className="jp-field">
            Receipt link (optional)
            <input
              name="receiptUrl"
              type="url"
              maxLength={2048}
              placeholder="https://…"
            />
          </label>
          <button
            className="jp-button jp-primary"
            type="submit"
            disabled={busy || !documents.length}
          >
            {busy ? "Saving…" : "Save completed application"}
          </button>
        </form>
      )}
      {!preview && !receipts.length && !error && (
        <p className="jp-quiet">No confirmed submissions recorded yet.</p>
      )}
      {receipts.map((receipt) => (
        <article className="jp-document-card" key={receipt.id}>
          <div>
            <strong>
              {receipt.actor === "agent"
                ? "Submitted by your agent"
                : "Submitted by you"}
            </strong>
            <p>
              {date(receipt.submittedAt)} ·{" "}
              {receipt.channel === "email" ? "Email" : "Employer form"}
            </p>
            <p>{receipt.destination}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{receipt.confirmation}</p>
            <a
              className="jp-text-button"
              href={`/api/jobs/documents/${encodeURIComponent(receipt.documentId)}`}
            >
              <ArrowDownToLine size={14} />
              {receipt.resumeFilename}
            </a>
            {receipt.receiptUrl && isPublicUrl(receipt.receiptUrl) && (
              <p>
                <a
                  className="jp-text-button"
                  href={receipt.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View confirmation
                </a>
              </p>
            )}
            <details>
              <summary className="jp-quiet">Saved file identity</summary>
              <code style={{ overflowWrap: "anywhere" }}>
                {receipt.resumeSha256}
              </code>
              <p className="jp-quiet">Recorded {date(receipt.recordedAt)}</p>
            </details>
          </div>
        </article>
      ))}
      {hasMore && (
        <button className="jp-button" disabled={busy} onClick={loadMore}>
          Load earlier receipts
        </button>
      )}
    </section>
  );
}
