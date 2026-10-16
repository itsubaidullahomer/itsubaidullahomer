export type Fit = "strong" | "gaps" | "stretch" | "unknown";
export type Priority = "high" | "medium" | "low";
export type JobStatus =
  | "discovered"
  | "shortlisted"
  | "drafting"
  | "needs_approval"
  | "approved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";
export type Eligibility = "confirmed" | "unknown" | "ineligible";
export type Requirement = {
  id: string;
  text: string;
  essential: boolean;
  assessment: "met" | "gap" | "unknown";
  evidenceIds: string[];
  explanation: string;
};
export type CompanyContact = {
  id: string;
  name: string;
  role: string;
  profileUrl: string;
  sourceUrl: string;
  referralRoute: string;
  notes: string;
  capturedAt: string;
};
export type JobSourceEvidence = {
  id: string;
  label: string;
  url: string;
  text: string;
  capturedAt: string;
  screenshotUrl: string;
  screenshotPath: string;
};
export type JobResearch = {
  companyUrl: string;
  contacts: CompanyContact[];
  sources: JobSourceEvidence[];
};
export type Job = {
  id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  salary: string;
  description: string;
  source: string;
  sourceId: string;
  discoveredAt: string;
  updatedAt: string;
  status: JobStatus;
  priority: Priority;
  fit: Fit;
  eligibility: Eligibility;
  eligibilityEvidence: string;
  requirements: Requirement[];
  tags: string[];
  notes: string;
  nextAction: string;
  nextActionDate: string | null;
  draft: string;
  contactEmail: string;
  appliedAt: string | null;
  research?: JobResearch;
};
export type Evidence = {
  id: string;
  skill: string;
  level: "working" | "proficient" | "advanced" | "unverified";
  statement: string;
  source: string;
  verified: boolean;
};
export type CandidateProfile = {
  name: string;
  headline: string;
  location: string;
  email: string;
  portfolio: string;
  summary: string;
  evidence: Evidence[];
  preferences: {
    roles: string[];
    remoteOnly: boolean;
    remotePriority?: boolean;
    overseasOnsite?: "sponsorship_required";
    country: string;
    strongFitFirst: boolean;
    salaryFloor: null;
    approvalRequired: boolean;
  };
  updatedAt: string;
};
export type Activity = {
  id: string;
  jobId: string | null;
  type:
    | "discovery"
    | "status"
    | "note"
    | "draft"
    | "approval"
    | "email_sent"
    | "email_received"
    | "profile"
    | "agent";
  title: string;
  body: string;
  actor: "you" | "agent" | "system";
  createdAt: string;
};
export type AgentRun = {
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  found: number;
  added: number;
  message: string;
};
export type Workspace = {
  jobs: Job[];
  profile: CandidateProfile;
  activities: Activity[];
  runs: AgentRun[];
};
export type WorkspaceAction =
  | { type: "add_job"; job: Job }
  | { type: "update_job"; id: string; patch: Partial<Job> }
  | { type: "add_activity"; activity: Activity }
  | { type: "update_profile"; profile: CandidateProfile }
  | { type: "import_jobs"; jobs: Job[]; run: AgentRun };
export const FIT_LABELS: Record<Fit, string> = {
  strong: "Strong fit",
  gaps: "Some gaps",
  stretch: "Stretch",
  unknown: "Needs evidence",
};
export const STATUS_LABELS: Record<JobStatus, string> = {
  discovered: "Discovered",
  shortlisted: "Shortlisted",
  drafting: "Drafting",
  needs_approval: "Needs approval",
  approved: "Approved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Closed",
  archived: "Archived",
};
