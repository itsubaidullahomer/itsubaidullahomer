"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  DOCUMENT_KINDS,
  DOCUMENT_LABELS,
  MAX_DOCUMENT_BYTES,
  type DocumentKind,
  type JobDocument,
} from "@/lib/jobs/documents";
import type { Job } from "@/lib/jobs/types";

type Props = {
  jobs: Pick<Job, "id" | "company" | "title">[];
  jobId?: string;
  preview?: boolean;
};
const date = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
const size = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.ceil(bytes / 1000)} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;

export default function DocumentLibrary({
  jobs,
  jobId,
  preview = false,
}: Props) {
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [filter, setFilter] = useState(jobId ?? "");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(!preview);
  const [moreLoading, setMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<DocumentKind>(
    jobId ? "tailored_resume" : "master_ats",
  );
  const [uploadJob, setUploadJob] = useState(jobId ?? "");
  const requestGeneration = useRef(0);
  const currentFilter = jobId ?? filter;
  const params = new URLSearchParams();
  if (currentFilter === "__library__") params.set("scope", "library");
  else if (currentFilter) params.set("jobId", currentFilter);
  const endpoint = `/api/jobs/documents?${params}`;

  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    const generation = ++requestGeneration.current;
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Documents could not be loaded.");
        return data;
      })
      .then((data) => {
        if (generation === requestGeneration.current) {
          setDocuments(data.documents);
          setHasMore(data.hasMore);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Documents could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      requestGeneration.current = generation + 1;
    };
  }, [endpoint, preview, revision]);

  function refresh() {
    setError("");
    setLoading(true);
    setRevision((value) => value + 1);
  }
  async function loadMore() {
    const generation = requestGeneration.current;
    setMoreLoading(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}&offset=${documents.length}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "More documents could not be loaded.");
      if (generation === requestGeneration.current) {
        setDocuments((previous) => [
          ...previous,
          ...data.documents.filter(
            (item: JobDocument) =>
              !previous.some((existing) => existing.id === item.id),
          ),
        ]);
        setHasMore(data.hasMore);
      }
    } catch (reason) {
      if (generation === requestGeneration.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Documents could not be loaded.",
        );
    } finally {
      setMoreLoading(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || uploading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > MAX_DOCUMENT_BYTES
    ) {
      setError("Choose a non-empty file up to 3.8 MB.");
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/jobs/documents", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The document could not be saved.");
      setNotice(`Saved “${result.document.title}” as a new version.`);
      setAdding(false);
      refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The document could not be saved.",
      );
    } finally {
      setUploading(false);
    }
  }
  const master = kind === "master_ats" || kind === "master_outreach";
  const availableKinds = jobId
    ? DOCUMENT_KINDS.filter((value) => !value.startsWith("master_"))
    : DOCUMENT_KINDS;
  return (
    <div className="jp-documents">
      <section className="jp-panel">
        <div className="jp-section-heading">
          <div>
            <h2>
              {jobId
                ? "Documents for this opportunity"
                : "Your private library"}
            </h2>
            <p>
              {jobId
                ? "Keep each tailored resume and captured job screenshot with its opportunity."
                : "Master resumes, tailored versions and source screenshots, all in one place."}
            </p>
          </div>
          <button
            className="jp-button jp-primary"
            disabled={preview || uploading}
            onClick={() => {
              setAdding(!adding);
              setError("");
            }}
            aria-expanded={adding}
          >
            {adding ? <X size={15} /> : <Plus size={15} />}
            {adding ? "Close" : "Upload"}
          </button>
        </div>
        <p className="jp-quiet jp-document-policy">
          <ShieldCheck size={14} /> Every upload is a new saved version. Earlier
          files stay available.
        </p>
        {preview && (
          <p className="jp-callout">
            Document uploads are disabled in the sample preview. Your private
            library appears after sign-in.
          </p>
        )}
        {error && (
          <div className="jp-message is-error" role="alert">
            {error}
            {!uploading && !preview && (
              <button className="jp-text-button" onClick={refresh}>
                Retry loading
              </button>
            )}
          </div>
        )}
        {notice && (
          <p className="jp-message" role="status">
            {notice}
          </p>
        )}
        {!jobId && (
          <label className="jp-field">
            Show documents
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setDocuments([]);
                setHasMore(false);
                setError("");
                setLoading(!preview);
              }}
            >
              <option value="">All documents</option>
              <option value="__library__">Masters and general documents</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.company} · {job.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {adding && (
          <form onSubmit={upload} className="jp-document-upload">
            <div className="jp-field-row">
              <label>
                Document kind
                <select
                  name="kind"
                  value={kind}
                  disabled={uploading}
                  onChange={(event) => {
                    const next = event.target.value as DocumentKind;
                    setKind(next);
                    if (next.startsWith("master_")) setUploadJob("");
                  }}
                >
                  {availableKinds.map((value) => (
                    <option key={value} value={value}>
                      {DOCUMENT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  name="title"
                  required
                  maxLength={160}
                  placeholder={
                    kind === "tailored_resume"
                      ? "Resume tailored to this role"
                      : kind === "job_screenshot"
                        ? "Listing captured today"
                        : "Resume master"
                  }
                  disabled={uploading}
                />
              </label>
            </div>
            {jobId || master ? (
              <input type="hidden" name="jobId" value={master ? "" : jobId} />
            ) : (
              <label className="jp-field">
                Opportunity
                <select
                  name="jobId"
                  value={uploadJob}
                  required={kind !== "supporting"}
                  disabled={uploading}
                  onChange={(event) => setUploadJob(event.target.value)}
                >
                  <option value="">
                    {kind === "supporting"
                      ? "General library"
                      : "Choose an opportunity"}
                  </option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company} · {job.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="jp-field">
              File
              <input
                name="file"
                type="file"
                required
                disabled={uploading}
                accept={
                  kind === "job_screenshot"
                    ? "image/png,image/jpeg,image/webp"
                    : kind === "supporting"
                      ? "application/pdf,image/png,image/jpeg,image/webp"
                      : "application/pdf"
                }
              />
              <span>
                PDF, PNG, JPEG or WebP. Up to 3.8 MB. Use a PDF for resumes.
              </span>
            </label>
            <button
              className="jp-button jp-primary"
              disabled={uploading}
              type="submit"
            >
              {uploading ? (
                <LoaderCircle size={15} className="jp-spin" />
              ) : (
                <Plus size={15} />
              )}
              {uploading ? "Saving version…" : "Save new version"}
            </button>
          </form>
        )}
        {loading ? (
          <p className="jp-document-empty" role="status">
            <LoaderCircle size={17} className="jp-spin" /> Loading your
            documents…
          </p>
        ) : (
          !documents.length && (
            <div className="jp-document-empty">
              <FileText size={26} />
              <h3>
                {jobId ? "No documents attached yet" : "Your library is ready"}
              </h3>
              <p>
                {jobId
                  ? "Upload the exact resume prepared for this role, plus a screenshot of its listing."
                  : "Start with your ATS and outreach masters. Tailored versions can be attached to each opportunity."}
              </p>
            </div>
          )
        )}
        <div className="jp-document-list">
          {documents.map((document) => {
            const job = jobs.find((item) => item.id === document.jobId);
            return (
              <article className="jp-document-card" key={document.id}>
                <div className="jp-document-icon">
                  {document.mime === "application/pdf" ? (
                    <FileText size={21} />
                  ) : (
                    <ImageIcon size={21} />
                  )}
                </div>
                <div className="jp-document-description">
                  <span className="jp-document-kind">
                    {DOCUMENT_LABELS[document.kind]}
                  </span>
                  <h3>{document.title}</h3>
                  <p>
                    {document.filename} · {size(document.size)}
                  </p>
                  <p>
                    Saved {date(document.createdAt)} PKT
                    {!jobId && job ? ` · ${job.company}` : ""}
                  </p>
                  <details>
                    <summary>Version details</summary>
                    <p>Version ID: {document.id}</p>
                    <p className="jp-document-hash">
                      SHA-256: {document.sha256}
                    </p>
                  </details>
                </div>
                <a
                  className="jp-button"
                  href={`/api/jobs/documents/${document.id}`}
                  download={document.filename}
                  aria-label={`Download ${document.title}`}
                >
                  <ArrowDownToLine size={16} />
                  <span>Download</span>
                </a>
              </article>
            );
          })}
        </div>
        {hasMore && (
          <button
            className="jp-button"
            disabled={moreLoading}
            onClick={loadMore}
          >
            {moreLoading ? "Loading…" : "Load earlier versions"}
          </button>
        )}
      </section>
    </div>
  );
}
