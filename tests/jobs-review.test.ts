import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../lib/jobs/domain';
import { assessEligibility } from '../lib/jobs/discovery';
import { demoWorkspace, emptyWorkspace } from '../lib/jobs/seed';
import type { AgentRun } from '../lib/jobs/types';

const now = '2026-10-15T12:00:00.000Z';

test('a worldwide source label cannot confirm contradictory location prose', () => {
  const restrictions = [
    'We do not hire from Pakistan.',
    'We only hire candidates based in Europe.',
    'This role is restricted to applicants in the United States.',
    'Candidates must have the right to work in the UK.',
    'Applicants must be located within the EU.',
  ];
  for (const description of restrictions) {
    assert.notEqual(assessEligibility('Worldwide', description).eligibility, 'confirmed', description);
  }
});

test('rediscovery retains the existing application, notes, and history', () => {
  const source = { ...demoWorkspace(now).jobs[0], status: 'applied' as const, appliedAt: now, notes: 'Recruiter replied; interview on Friday.' };
  const initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: source }, now);
  const run: AgentRun = { id: 'new-run', status: 'completed', startedAt: now, completedAt: now, found: 1, added: 1, message: 'Source refreshed.' };
  const updated = applyAction(initial, { type: 'import_jobs', jobs: [{ ...source, id: 'another-source-id', status: 'discovered', notes: '', draft: '' }], run }, now);
  assert.deepEqual(updated.jobs, initial.jobs);
  assert.equal(updated.runs[0].added, 0);
  assert.ok(initial.activities.every(old => updated.activities.some(next => next.id === old.id)));
});

test('discovery cannot import a claimed approval or application submission', () => {
  const source = { ...demoWorkspace(now).jobs[0], status: 'applied' as const, appliedAt: now, draft: 'Pretend this was already submitted.' };
  const run: AgentRun = { id: 'new-run', status: 'completed', startedAt: now, completedAt: now, found: 1, added: 1, message: 'Source refreshed.' };
  const result = applyAction(emptyWorkspace(now), { type: 'import_jobs', jobs: [source], run }, now);
  assert.equal(result.jobs[0].status, 'discovered');
  assert.equal(result.jobs[0].appliedAt, null);
  assert.equal(result.jobs[0].draft, '');
  assert.ok(result.activities.every(activity => activity.type !== 'email_sent' && activity.type !== 'approval'));
});

test('approval is invalidated when the intended recipient changes', () => {
  let workspace = applyAction(emptyWorkspace(now), { type: 'add_job', job: demoWorkspace(now).jobs[0] }, now);
  workspace = applyAction(workspace, { type: 'update_job', id: workspace.jobs[0].id, patch: { status: 'approved', contactEmail: 'first@example.com' } }, now);
  const result = applyAction(workspace, { type: 'update_job', id: workspace.jobs[0].id, patch: { contactEmail: 'other@example.com' } }, now);
  assert.equal(result.jobs[0].status, 'needs_approval');
  assert.equal(result.jobs[0].appliedAt, null);
  assert.equal(workspace.jobs[0].status, 'approved');
});

test('a failed job edit leaves the original application and timeline intact', () => {
  const workspace = demoWorkspace(now);
  const original = structuredClone(workspace);
  assert.throws(() => applyAction(workspace, { type: 'update_job', id: workspace.jobs[0].id, patch: { url: workspace.jobs[1].url } }, now), /already/);
  assert.deepEqual(workspace, original);
});
