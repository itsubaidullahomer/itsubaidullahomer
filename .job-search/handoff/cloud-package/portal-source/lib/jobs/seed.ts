import { site } from '../../content/site';
import { deriveFit, draftApplication } from './domain';
import type { CandidateProfile, Job, Requirement, Workspace } from './types';

export function initialProfile(now = new Date().toISOString()): CandidateProfile {
  return {
    name: site.name,
    headline: site.role,
    location: site.location,
    email: '',
    portfolio: site.url,
    summary: 'AI Product Engineer building web and AI products. This starting profile is based on my published portfolio; individual claims and skill levels still need review.',
    evidence: [
      { id: 'ev-react', skill: 'React / Next.js / TypeScript', level: 'unverified', statement: 'I use React, Next.js and TypeScript for frontend work and have built reusable components and hooks at Danzee Tech.', source: site.url, verified: false },
      { id: 'ev-backend', skill: 'Node.js / Express / MongoDB', level: 'unverified', statement: 'At Tututor.ai / EduNova, I designed an Express and MongoDB backend supporting multiple products.', source: site.url, verified: false },
      { id: 'ev-ai', skill: 'AI product integrations', level: 'unverified', statement: 'I build AI product features using providers including OpenAI, Claude and Gemini, with API calls and keys kept on the server.', source: site.url, verified: false },
      { id: 'ev-product', skill: 'Product ownership', level: 'unverified', statement: 'As Lead Engineer at Tututor.ai / EduNova, I have led app and web developers and maintained products after launch.', source: site.url, verified: false },
      { id: 'ev-integration', skill: 'Authentication / billing / messaging', level: 'unverified', statement: 'My portfolio describes work on authentication, Stripe and SEPA billing, and Socket.io with Redis messaging.', source: site.url, verified: false },
      { id: 'ev-mobile', skill: 'React Native', level: 'unverified', statement: 'My portfolio reports shipping three React Native apps to both app stores.', source: site.url, verified: false },
      { id: 'ev-remote', skill: 'Remote teamwork', level: 'unverified', statement: 'I have worked remotely from Pakistan with teams in Spain and Denmark.', source: site.url, verified: false },
    ],
    preferences: { roles: ['AI Product Engineer', 'Full-Stack Engineer'], remoteOnly: true, country: 'Pakistan', strongFitFirst: true, salaryFloor: null, approvalRequired: true },
    updatedAt: now,
  };
}

export function emptyWorkspace(now = new Date().toISOString()): Workspace {
  return { jobs: [], profile: initialProfile(now), activities: [], runs: [] };
}

/** Deliberately fictional companies and example-domain URLs. Never import this into the live workspace. */
export function demoWorkspace(now = new Date().toISOString()): Workspace {
  const workspace = emptyWorkspace(now);
  const daysAgo = (days: number) => new Date(Date.parse(now) - days * 86400000).toISOString();
  const requirement = (id: string, text: string, evidenceId?: string, assessment: Requirement['assessment'] = evidenceId ? 'met' : 'unknown'): Requirement => ({ id, text, essential: true, assessment, evidenceIds: evidenceId ? [evidenceId] : [], explanation: evidenceId ? 'Illustrative match to a self-published portfolio statement. Not independently verified.' : assessment === 'gap' ? 'Fictional example of a requirement gap.' : 'This requirement needs supporting evidence.' });
  const records: Array<Pick<Job, 'company' | 'title' | 'status' | 'priority' | 'eligibility' | 'requirements' | 'tags' | 'salary' | 'nextAction'>> = [
    { company: 'Northstar Studio', title: 'AI Product Engineer', status: 'needs_approval', priority: 'high', eligibility: 'confirmed', requirements: [requirement('r1', 'Build user-facing AI features', 'ev-ai'), requirement('r2', 'React and TypeScript product development', 'ev-react'), requirement('r3', 'Own features through launch', 'ev-product')], tags: ['AI products', 'React', 'TypeScript'], salary: 'Not disclosed', nextAction: 'Review the application draft' },
    { company: 'Morrow Labs', title: 'Full-Stack Engineer', status: 'shortlisted', priority: 'high', eligibility: 'confirmed', requirements: [requirement('r1', 'Node.js APIs and MongoDB', 'ev-backend'), requirement('r2', 'Frontend work in React', 'ev-react')], tags: ['Node.js', 'React', 'Remote'], salary: '$35,000–$50,000 / year · fictional', nextAction: 'Prepare a tailored introduction' },
    { company: 'Plainfield', title: 'Product Engineer, AI', status: 'applied', priority: 'high', eligibility: 'confirmed', requirements: [requirement('r1', 'AI provider integrations', 'ev-ai'), requirement('r2', 'Product ownership', 'ev-product')], tags: ['AI products', 'Product'], salary: 'Open to discussion · fictional', nextAction: 'Wait for a reply before following up' },
    { company: 'Common Thread', title: 'Full-Stack Product Engineer', status: 'interview', priority: 'high', eligibility: 'confirmed', requirements: [requirement('r1', 'React product UI', 'ev-react'), requirement('r2', 'APIs and billing integrations', 'ev-integration')], tags: ['SaaS', 'React', 'Node.js'], salary: 'Not disclosed', nextAction: 'Prepare a product walkthrough' },
    { company: 'Arcfield Systems', title: 'AI Platform Engineer', status: 'discovered', priority: 'medium', eligibility: 'unknown', requirements: [requirement('r1', 'Production AI integration', 'ev-ai'), requirement('r2', 'Kubernetes operations')], tags: ['AI infrastructure', 'Kubernetes'], salary: '$90,000–$120,000 / year · fictional', nextAction: 'Check location restrictions and infrastructure requirements' },
    { company: 'Gather Works', title: 'Full-Stack Engineer', status: 'discovered', priority: 'medium', eligibility: 'confirmed', requirements: [requirement('r1', 'React and TypeScript', 'ev-react'), requirement('r2', 'Backend API ownership', 'ev-backend'), requirement('r3', 'Production experience with Ruby on Rails', undefined, 'gap')], tags: ['React', 'Ruby'], salary: 'Not disclosed', nextAction: 'Review whether Rails is essential' },
    { company: 'Aster Research', title: 'Machine Learning Research Engineer', status: 'archived', priority: 'low', eligibility: 'unknown', requirements: [requirement('r1', 'Peer-reviewed ML research', undefined, 'gap'), requirement('r2', 'Distributed model training', undefined, 'gap'), requirement('r3', 'Python research stack')], tags: ['Research', 'ML'], salary: 'Not disclosed', nextAction: 'Keep archived: outside the current target' },
  ];
  workspace.jobs = records.map((record, index): Job => {
    const job: Job = { id: `demo-job-${index + 1}`, ...record, url: `https://jobs.example/${index + 1}`, source: 'Demo — fictional', sourceId: `fictional-${index + 1}`, location: record.eligibility === 'confirmed' ? 'Worldwide · fictional example' : 'Remote · eligibility unconfirmed', description: 'FICTIONAL DEMO OPPORTUNITY. This company, vacancy, compensation and activity history exist only to demonstrate the portal. They are not real jobs or applications.', discoveredAt: daysAgo(8 - index), updatedAt: daysAgo(index % 3), fit: deriveFit(record.requirements), eligibilityEvidence: record.eligibility === 'confirmed' ? 'Fictional listing says worldwide. In real discovery, the actual location statement is retained here.' : 'No explicit statement confirming applications from Pakistan.', notes: 'Demo data only. No employer has been contacted.', nextActionDate: null, draft: '', contactEmail: '', appliedAt: ['applied', 'interview'].includes(record.status) ? daysAgo(4) : null };
    if (['needs_approval', 'applied', 'interview'].includes(job.status)) job.draft = draftApplication(job, workspace.profile);
    return job;
  });
  workspace.activities = [
    { id: 'demo-event-1', jobId: 'demo-job-1', type: 'draft', title: 'Draft ready for review', body: 'Fictional demo activity. A template draft is ready; no application has been sent.', actor: 'agent', createdAt: daysAgo(0) },
    { id: 'demo-event-2', jobId: 'demo-job-4', type: 'email_received', title: 'Interview invitation · demo', body: 'Fictional demo email: “We would like to arrange an introductory call.” No inbox is connected in this preview.', actor: 'system', createdAt: daysAgo(1) },
    { id: 'demo-event-3', jobId: 'demo-job-3', type: 'email_sent', title: 'Application recorded · demo', body: 'Fictional example of a manually recorded application. No message was sent.', actor: 'you', createdAt: daysAgo(4) },
    { id: 'demo-event-4', jobId: 'demo-job-2', type: 'discovery', title: 'Opportunity added · demo', body: 'Fictional job illustrating a strong requirement match with no salary cutoff.', actor: 'agent', createdAt: daysAgo(5) },
  ];
  return workspace;
}
