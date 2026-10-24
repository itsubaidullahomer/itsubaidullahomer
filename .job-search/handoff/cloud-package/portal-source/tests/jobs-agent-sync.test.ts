import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentBatchMarker, planAgentSync, type AgentApplication, type AgentBatch } from '../lib/jobs/agent-sync';
import { demoWorkspace, emptyWorkspace } from '../lib/jobs/seed';
import recorded from '../data/agent-sync/applications.json';

const now = '2026-10-18T02:00:00.000Z';
const app = (patch: Partial<AgentApplication> = {}): AgentApplication => ({
  key: 'acme-2026-10-18', matchIds: [], company: 'Acme', title: 'Frontend Engineer', url: 'https://acme.example/careers/frontend',
  location: 'Remote', channel: 'email', contactEmail: 'careers@acme.example', appliedAt: '2026-10-18T01:00:00Z', gmailMessageId: 'm1',
  note: 'Applied by email.', nextAction: 'Await reply.', nextActionDate: '2026-10-25', ...patch,
});
const batch = (applications: AgentApplication[]): AgentBatch => ({ id: 'test-batch', recordedAt: now, applications });

test('new applications are added as applied with an email record, once per batch', () => {
  const plan = planAgentSync(emptyWorkspace(now), batch([app()]), now);
  assert.deepEqual([plan.added, plan.updated, plan.failed], [['acme-2026-10-18'], [], []]);
  const job = plan.workspace.jobs[0];
  assert.equal(job.status, 'applied');
  assert.equal(job.appliedAt, '2026-10-18T01:00:00Z');
  assert.equal(job.contactEmail, 'careers@acme.example');
  assert.ok(plan.workspace.activities.some((item) => item.type === 'email_sent' && item.jobId === job.id && item.actor === 'agent'));
  assert.ok(plan.workspace.activities.some((item) => item.title === agentBatchMarker('test-batch')));
  const again = planAgentSync(plan.workspace, batch([app()]), now);
  assert.equal(again.changed, false);
  assert.equal(again.workspace.jobs.length, 1);
});

test('an existing job is marked applied, keeping its notes, and later stages are left alone', () => {
  const workspace = demoWorkspace(now);
  const [first, second] = workspace.jobs;
  second.status = 'interview';
  const plan = planAgentSync(workspace, batch([
    app({ key: 'by-id', matchIds: [first.id], url: 'https://elsewhere.example/job' }),
    app({ key: 'by-url', url: second.url }),
  ]), now);
  assert.deepEqual([plan.updated, plan.skipped, plan.added], [['by-id'], ['by-url'], []]);
  const updated = plan.workspace.jobs.find((job) => job.id === first.id)!;
  assert.equal(updated.status, 'applied');
  assert.ok(updated.notes.startsWith(first.notes) && updated.notes.endsWith('Applied by email.'));
  assert.equal(plan.workspace.jobs.find((job) => job.id === second.id)!.status, 'interview');
  assert.equal(plan.workspace.jobs.length, workspace.jobs.length);
});

test('a decision closes an applied job in a later batch, and leaves later stages alone', () => {
  const outcome = { status: 'rejected' as const, receivedAt: '2026-10-21T13:35:00Z', from: 'Acme', gmailMessageId: 'm2', note: 'Declined.' };
  const first = planAgentSync(emptyWorkspace(now), batch([app(), app({ key: 'b', url: 'https://acme.example/careers/backend', gmailMessageId: 'm3' })]), now);
  first.workspace.jobs.find((job) => job.url.endsWith('/backend'))!.status = 'interview';
  const plan = planAgentSync(first.workspace, { ...batch([app({ outcome }), app({ key: 'b', url: 'https://acme.example/careers/backend', gmailMessageId: 'm3', outcome })]), id: 'later' }, now);
  assert.deepEqual([plan.closed, plan.skipped, plan.failed], [['acme-2026-10-18'], ['b'], []]);
  const closed = plan.workspace.jobs.find((job) => job.url.endsWith('/frontend'))!;
  assert.equal(closed.status, 'rejected');
  assert.equal(closed.appliedAt, '2026-10-18T01:00:00Z');
  assert.ok(closed.notes.endsWith('Declined.') && !closed.nextAction && !closed.nextActionDate);
  assert.ok(plan.workspace.activities.some((item) => item.type === 'email_received' && item.jobId === closed.id && item.actor === 'agent'));
  assert.equal(plan.workspace.jobs.find((job) => job.url.endsWith('/backend'))!.status, 'interview');
});

test('every recorded application passes portal validation', () => {
  const applications = (recorded as AgentBatch).applications;
  const plan = planAgentSync(emptyWorkspace(now), recorded as AgentBatch, now);
  assert.deepEqual(plan.failed, []);
  assert.equal(plan.added.length, applications.length);
  assert.equal(plan.closed.length, applications.filter((item) => item.outcome).length);
  assert.ok(plan.workspace.jobs.every((job) => ['applied', 'rejected'].includes(job.status) && job.appliedAt));
});
