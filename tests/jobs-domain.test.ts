import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, deriveFit, draftApplication, normalizeUrl, sortJobs, validateJob } from '../lib/jobs/domain';
import { assessEligibility, discoverJobs, plainText } from '../lib/jobs/discovery';
import { demoWorkspace, emptyWorkspace, initialProfile } from '../lib/jobs/seed';
import type { Job, Requirement } from '../lib/jobs/types';

const now = '2026-10-15T09:00:00.000Z';
const job = (): Job => structuredClone(demoWorkspace(now).jobs[0]);
const requirement = (patch: Partial<Requirement> = {}): Requirement => ({ id: 'r1', text: 'React product development', essential: true, assessment: 'met', evidenceIds: ['ev-react'], explanation: 'Published React experience at Danzee Tech.', ...patch });

test('strong fit needs every essential requirement to be met with evidence', () => {
  assert.equal(deriveFit([]), 'unknown');
  assert.equal(deriveFit([requirement({ evidenceIds: [] })]), 'unknown');
  assert.equal(deriveFit([requirement({ explanation: '' })]), 'unknown');
  assert.equal(deriveFit([requirement(), requirement({ id: 'r2', assessment: 'unknown' })]), 'unknown');
  assert.equal(deriveFit([requirement(), requirement({ id: 'r2', assessment: 'gap' })]), 'stretch');
  assert.equal(deriveFit([requirement()]), 'strong');
});

test('salary never changes ranking and fit is separate from country eligibility', () => {
  const cheap = { ...job(), id: 'cheap', salary: '$1', eligibility: 'unknown' as const };
  const high = { ...job(), id: 'high', fit: 'gaps' as const, salary: '$200000', eligibility: 'confirmed' as const };
  assert.equal(sortJobs([high, cheap])[0].id, 'cheap');
  assert.deepEqual(sortJobs([high, cheap]).map((item) => item.id), sortJobs([{ ...high, salary: '$1' }, { ...cheap, salary: '$500000' }]).map((item) => item.id));
});

test('URL normalization deduplicates tracking variants while retaining ATS job ids', () => {
  assert.equal(normalizeUrl('https://jobs.example/role/?utm_source=a&job=42#apply'), 'https://jobs.example/role?job=42');
  assert.notEqual(normalizeUrl('https://jobs.example/role?job=42'), normalizeUrl('https://jobs.example/role?job=43'));
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.equal(normalizeUrl('https://me:secret@jobs.example/role'), '');
});

test('mutations are immutable, duplicate jobs are rejected, and fake evidence cannot create strong fit', () => {
  const empty = emptyWorkspace(now);
  const candidate = job();
  candidate.requirements = [requirement({ evidenceIds: ['invented'] })];
  candidate.fit = 'strong';
  const added = applyAction(empty, { type: 'add_job', job: candidate }, now);
  assert.equal(empty.jobs.length, 0);
  assert.equal(added.jobs[0].fit, 'unknown');
  assert.equal(added.jobs[0].requirements[0].assessment, 'unknown');
  assert.throws(() => applyAction(added, { type: 'add_job', job: { ...candidate, id: 'duplicate', url: `${candidate.url}?utm_source=other` } }), /already/);
});

test('approval is not submission, editing an approved draft invalidates its approval', () => {
  const initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: job() }, now);
  const approved = applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'approved' } }, now);
  assert.equal(approved.jobs[0].appliedAt, null);
  assert.match(approved.activities[0].body, /Submission has not happened/);
  const revised = applyAction(approved, { type: 'update_job', id: job().id, patch: { draft: 'Different application text.' } }, now);
  assert.equal(revised.jobs[0].status, 'needs_approval');
  assert.equal(revised.jobs[0].appliedAt, null);
  assert.throws(() => applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'approved', draft: '' } }), /Prepare a draft/);
  assert.throws(() => applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'approved', eligibility: 'unknown' } }), /Confirm Pakistan eligibility/);
  const locationCorrected = applyAction(approved, { type: 'update_job', id: job().id, patch: { eligibility: 'unknown' } });
  assert.equal(locationCorrected.jobs[0].status, 'needs_approval');
});

test('manual application records create an honest timeline and preserve the original date', () => {
  const initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: job() }, now);
  const applied = applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'applied' } }, now);
  assert.equal(applied.jobs[0].appliedAt, now);
  assert.match(applied.activities[0].body, /No application was sent/);
  const edited = applyAction(applied, { type: 'update_job', id: job().id, patch: { appliedAt: null, notes: 'A follow-up is due.' } });
  assert.equal(edited.jobs[0].appliedAt, now);
});

test('job detail edits retain exact old and new values in the activity history', () => {
  const initialJob = { ...job(), contactEmail: 'before@example.com' };
  const initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: initialJob }, now);
  const patch = { company: 'Changed Company', title: 'Changed role', url: 'https://jobs.example/new-role', description: 'New full job description.', location: 'New location wording', contactEmail: 'after@example.com' };
  const updated = applyAction(initial, { type: 'update_job', id: initialJob.id, patch }, now);
  const event = updated.activities.find((item) => item.title === 'Job details updated');
  assert.ok(event);
  const changes = JSON.parse(event.body);
  for (const field of Object.keys(patch) as Array<keyof typeof patch>) {
    assert.equal(changes[field].previous, initialJob[field]);
    assert.equal(changes[field].current, patch[field]);
  }
});

test('approval retains the exact draft, recipient, job and candidate evidence snapshot', () => {
  const candidate = { ...job(), contactEmail: 'hiring@example.com' };
  const initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: candidate }, now);
  const approved = applyAction(initial, { type: 'update_job', id: candidate.id, patch: { status: 'approved' } }, now);
  const approval = approved.activities.find((item) => item.type === 'approval');
  assert.ok(approval);
  const snapshot = JSON.parse(approval.body.split('Approved snapshot:\n')[1]);
  assert.equal(snapshot.draft, candidate.draft);
  assert.equal(snapshot.recipient, candidate.contactEmail);
  assert.equal(snapshot.job.description, candidate.description);
  assert.equal(snapshot.job.url, candidate.url);
  assert.deepEqual(snapshot.candidate.evidence, initial.profile.evidence);
  const edited = applyAction(approved, { type: 'update_job', id: candidate.id, patch: { description: 'Changed after approval' } }, now);
  assert.equal(edited.jobs[0].status, 'needs_approval');
  assert.equal(edited.activities.find((item) => item.type === 'approval')?.body, approval.body);
});

test('rewriting job context invalidates stale fit, eligibility and approval while preserving history', () => {
  let initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: job() }, now);
  initial = applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'approved' } }, now);
  const approval = initial.activities.find((item) => item.type === 'approval')!;
  for (const patch of [{ company: 'Different employer' }, { title: 'Different role' }, { url: 'https://jobs.example/different' }, { description: 'Requires unrelated skills and different work authorization.' }]) {
    const changed = applyAction(initial, { type: 'update_job', id: job().id, patch }, now);
    assert.equal(changed.jobs[0].fit, 'unknown');
    assert.ok(changed.jobs[0].requirements.every((item) => item.assessment === 'unknown'));
    assert.equal(changed.jobs[0].eligibility, 'unknown');
    assert.equal(changed.jobs[0].status, 'needs_approval');
    assert.match(changed.jobs[0].eligibilityEvidence, /job details or location changed/i);
    assert.equal(changed.activities.find((item) => item.type === 'approval')!.body, approval.body);
  }
  assert.equal(initial.jobs[0].fit, 'strong');
});

test('changing only the job location requires eligibility review without discarding skill evidence', () => {
  let initial = applyAction(emptyWorkspace(now), { type: 'add_job', job: job() }, now);
  initial = applyAction(initial, { type: 'update_job', id: job().id, patch: { status: 'approved' } }, now);
  const changed = applyAction(initial, { type: 'update_job', id: job().id, patch: { location: 'UK only', eligibility: 'confirmed' } }, now);
  assert.equal(changed.jobs[0].eligibility, 'unknown');
  assert.equal(changed.jobs[0].status, 'needs_approval');
  assert.equal(changed.jobs[0].fit, 'strong');
  assert.deepEqual(changed.jobs[0].requirements, initial.jobs[0].requirements);
});

test('profile changes invalidate stale matches and approved drafts', () => {
  let workspace = applyAction(emptyWorkspace(now), { type: 'add_job', job: job() }, now);
  workspace = applyAction(workspace, { type: 'update_job', id: job().id, patch: { status: 'approved' } }, now);
  const profile = structuredClone(workspace.profile);
  profile.evidence.find((item) => item.id === 'ev-ai')!.statement = 'This statement is being corrected.';
  const updated = applyAction(workspace, { type: 'update_profile', profile }, now);
  assert.equal(updated.jobs[0].fit, 'unknown');
  assert.equal(updated.jobs[0].status, 'needs_approval');
  assert.equal(workspace.jobs[0].fit, 'strong');
});

test('the template includes only linked existing claims and never turns a gap into a claim', () => {
  const profile = initialProfile(now);
  const candidate = job();
  candidate.requirements = [requirement(), requirement({ id: 'gap', text: 'PhD in ML', assessment: 'gap', evidenceIds: [] })];
  const draft = draftApplication(candidate, profile);
  assert.ok(draft.includes(profile.evidence.find((item) => item.id === 'ev-react')!.statement));
  assert.ok(!draft.includes('PhD'));
  assert.ok(!draft.includes(profile.evidence.find((item) => item.id === 'ev-ai')!.statement));
});

test('empty live workspaces never inherit fictional demo jobs or invented skill verification', () => {
  assert.equal(emptyWorkspace(now).jobs.length, 0);
  assert.equal(emptyWorkspace(now).profile.email, '');
  assert.ok(initialProfile(now).evidence.every((item) => !item.verified && item.level === 'unverified'));
  assert.ok(demoWorkspace(now).jobs.every((item) => item.source === 'Demo — fictional' && new URL(item.url).hostname.endsWith('.example')));
});

test('malformed jobs fail validation without leaking through mutation', () => {
  for (const malformed of [null, { ...job(), requirements: [null] }, { ...job(), status: 'sent' }, { ...job(), tags: ['a', null] }]) assert.equal(validateJob(malformed).valid, false);
});

test('all imported eligibility needs review, including Worldwide and Pakistan source labels', () => {
  assert.equal(assessEligibility('Remote').eligibility, 'unknown');
  assert.equal(assessEligibility('EMEA').eligibility, 'unknown');
  assert.equal(assessEligibility('Worldwide').eligibility, 'unknown');
  assert.equal(assessEligibility('Pakistan').eligibility, 'unknown');
  assert.equal(assessEligibility('Worldwide', 'Candidates must be based in the United States.').eligibility, 'unknown');
  assert.equal(assessEligibility('Worldwide', 'This position is open only to the United States.').eligibility, 'unknown');
  assert.equal(assessEligibility('Worldwide', 'Not Pakistan').eligibility, 'unknown');
});

test('Worldwide never overrides country exclusions or legal work conditions', () => {
  for (const restriction of ['We do not hire from Pakistan.', 'This role is restricted to applicants in the United States.', 'Candidates must have the right to work in the UK.', 'Applicants must be located within the EU.']) {
    const result = assessEligibility('Worldwide', restriction);
    assert.equal(result.eligibility, 'unknown');
    assert.ok(result.evidence.includes(restriction));
  }
});

test('description text drops scripts and keeps human-readable requirement boundaries', () => {
  assert.equal(plainText('<script>alert(1)</script><p>React &amp; Node</p><li>3 years of experience</li>'), 'React & Node\n\n3 years of experience');
});

test('public-source discovery is bounded and conservative, retains attribution, and excludes unsafe links', async () => {
  let requestUrl = '';
  const rows = [
    { id: 1, title: 'AI Product Engineer', company_name: 'Example real source fixture', candidate_required_location: 'Worldwide', url: 'https://remotive.com/remote-jobs/one', description: '<p>Must have experience with React and TypeScript.</p><p>Requires 10 years of experience.</p>', tags: ['React'] },
    { id: 2, title: 'Full Stack Developer', company_name: 'Unknown country fixture', candidate_required_location: 'Remote', url: 'https://remotive.com/remote-jobs/two', description: 'Build applications.', tags: [] },
    { id: 3, title: 'AI Engineer', company_name: 'Bad link fixture', candidate_required_location: 'Worldwide', url: 'https://evil.example/job', description: 'Test' },
    { id: 4, title: 'Marketing Manager', company_name: 'Wrong role fixture', candidate_required_location: 'Worldwide', url: 'https://remotive.com/remote-jobs/four', description: 'Test' },
  ];
  const fetcher: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.credentials, 'omit');
    return new Response(JSON.stringify({ jobs: rows }), { headers: { 'content-type': 'application/json' } });
  };
  const result = await discoverJobs(initialProfile(now), { sources: ['remotive'], fetcher, now });
  assert.ok(requestUrl.startsWith('https://remotive.com/api/remote-jobs'));
  assert.equal(result.run.status, 'completed');
  assert.equal(result.jobs.length, 2);
  assert.equal(result.jobs[0].eligibility, 'unknown');
  assert.equal(result.jobs[1].eligibility, 'unknown');
  assert.ok(result.jobs.every((item) => item.fit === 'unknown' && item.source === 'Remotive' && item.requirements.every((requirement) => requirement.assessment === 'unknown')));
  const workspace = applyAction(emptyWorkspace(now), { type: 'import_jobs', ...result }, now);
  const repeated = applyAction(workspace, { type: 'import_jobs', ...result }, now);
  assert.equal(repeated.jobs.length, 2);
  assert.equal(repeated.runs[0].added, 0);
});

test('failed or oversized discovery produces a failed run, never fake opportunities', async () => {
  const failed = await discoverJobs(initialProfile(now), { sources: ['remotive'], fetcher: async () => new Response('', { status: 429 }) });
  assert.equal(failed.run.status, 'failed');
  assert.equal(failed.jobs.length, 0);
  const oversized = await discoverJobs(initialProfile(now), { sources: ['remotive'], fetcher: async () => new Response('{}', { headers: { 'content-length': String(6 * 1024 * 1024) } }) });
  assert.equal(oversized.run.status, 'failed');
  assert.match(oversized.run.message, /size limit/);
});
