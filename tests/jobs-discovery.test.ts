import assert from 'node:assert/strict';
import { test } from 'node:test';
import { discoverJobs, DISCOVERY_INTERVAL_MS, DISCOVERY_SOURCES, type DiscoverySourceId } from '../lib/jobs/discovery';
import { initialProfile } from '../lib/jobs/seed';
import { assertJob } from '../lib/jobs/validation';

const now = '2026-10-15T12:00:00.000Z';
const day = 24 * 60 * 60 * 1000;
const profile = initialProfile(now);
const description = '<p>Build accessible React applications.</p><p>Must have experience with TypeScript and Node.js.</p>';
const response = (rows: unknown[]) => Response.json({ jobs: rows });
const fixtures: Record<DiscoverySourceId, Record<string, unknown>> = {
  remotive: { id: 101, title: 'Full Stack Developer', company_name: 'Remotive Fixture', url: 'https://remotive.com/remote-jobs/software-dev/101?utm_source=feed', description, candidate_required_location: 'Worldwide', tags: ['React'], salary: 'USD 90,000–120,000', publication_date: '2026-10-14T12:00:00Z' },
  jobicy: { id: 202, jobTitle: 'AI Product Engineer', companyName: 'Jobicy Fixture', url: 'https://jobicy.com/jobs/202-ai-product-engineer', jobDescription: description, jobGeo: 'Pakistan', jobIndustry: ['Engineering'], jobType: ['Full-Time'], salaryMin: 80_000, salaryMax: 110_000, salaryCurrency: 'USD', salaryPeriod: 'yearly', pubDate: '2026-10-14T12:00:00Z' },
  himalayas: { guid: 'himalayas-fixture-303', title: 'Software Engineer', companyName: 'Himalayas Fixture', applicationLink: 'https://himalayas.app/companies/fixture/jobs/software-engineer', description, locationRestrictions: [{ name: 'Pakistan', alpha2: 'PK', slug: 'pakistan' }], timezoneRestrictions: [5], categories: ['Full-Stack-Developer'], minSalary: 100_000, maxSalary: 150_000, currency: 'USD', salaryPeriod: 'annual', pubDate: Date.parse('2026-10-14T12:00:00Z') / 1000, expiryDate: (Date.parse(now) + day) / 1000 },
};
function sourceFor(input: string | URL | Request): DiscoverySourceId {
  const source = DISCOVERY_SOURCES.find((item) => item.url === String(input));
  assert.ok(source, 'fetch must use an exact fixed source endpoint');
  return source.id;
}
function row(source: DiscoverySourceId, index: number, patch: Record<string, unknown> = {}): Record<string, unknown> {
  const base = fixtures[source];
  const urlKey = source === 'himalayas' ? 'applicationLink' : 'url';
  const baseUrl = String(base[urlKey]).split('?')[0];
  return { ...base, [source === 'himalayas' ? 'guid' : 'id']: `${source}-${index}`, [urlKey]: `${baseUrl}-${index}`, ...patch };
}

test('independent public feeds are fetched in parallel and normalized with source evidence', { timeout: 2000 }, async () => {
  const requested: string[] = [];
  let release!: () => void;
  const allStarted = new Promise<void>((resolve) => { release = resolve; });
  const fetcher: typeof fetch = async (input, init) => {
    const source = sourceFor(input);
    requested.push(source);
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.cache, 'no-store');
    assert.ok(init?.signal);
    assert.deepEqual(init?.headers, { Accept: 'application/json' });
    if (requested.length === 3) release();
    await allStarted;
    return response([fixtures[source]]);
  };
  const result = await discoverJobs(profile, { now, fetcher });
  assert.deepEqual(requested.sort(), ['himalayas', 'jobicy', 'remotive']);
  assert.equal(result.run.status, 'completed');
  assert.equal(result.jobs.length, 3);
  for (const job of result.jobs) {
    assert.doesNotThrow(() => assertJob(job));
    assert.equal(job.fit, 'unknown');
    assert.equal(job.eligibility, 'unknown');
    assert.ok(job.requirements.every((item) => item.assessment === 'unknown'));
    assert.equal(job.status, 'discovered');
    assert.equal(job.draft, '');
    const capture = job.research!.sources[0];
    assert.equal(capture.url, job.url);
    assert.equal(capture.capturedAt, now);
    assert.match(capture.label, new RegExp(job.source));
    assert.match(capture.text, new RegExp(`Source: ${job.source}`));
    assert.ok(capture.text.includes(job.description));
    assert.doesNotMatch(capture.text, /<p>/);
    assert.match(capture.text, /Published: 2026-10-14T12:00:00.000Z/);
    assert.equal(capture.screenshotUrl, '');
    assert.equal(capture.screenshotPath, '');
  }
  const remotive = result.jobs.find((job) => job.source === 'Remotive')!;
  assert.equal(remotive.url, fixtures.remotive.url, 'retain the original official listing link');
  const jobicy = result.jobs.find((job) => job.source === 'Jobicy')!;
  assert.equal(jobicy.salary, 'USD 80,000–110,000 / yearly');
  assert.deepEqual(jobicy.tags, ['Engineering', 'Full-Time']);
  const himalayas = result.jobs.find((job) => job.source === 'Himalayas')!;
  assert.equal(himalayas.url, fixtures.himalayas.applicationLink);
  assert.equal(himalayas.location, 'Pakistan; time zones: UTC+5');
  assert.equal(himalayas.salary, 'USD 100,000–150,000 / annual');
});

test('one failing or malformed source does not discard healthy source jobs', async () => {
  const result = await discoverJobs(profile, { now, fetcher: async (input) => {
    const source = sourceFor(input);
    if (source === 'jobicy') return new Response('upstream private details', { status: 429 });
    if (source === 'himalayas') return Response.json({ jobs: 'invalid', error: 'upstream private details' });
    return response([fixtures.remotive]);
  } });
  assert.equal(result.run.status, 'completed');
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].source, 'Remotive');
  assert.match(result.run.message, /Jobicy returned HTTP 429/);
  assert.match(result.run.message, /Himalayas returned an unexpected format/);
  assert.doesNotMatch(result.run.message, /upstream private details/);
});

test('each source has a time bound even when a fetch ignores its abort signal', async () => {
  const started = Date.now();
  const result = await discoverJobs(profile, { now, timeoutMs: 20, fetcher: async (input) => {
    const source = sourceFor(input);
    if (source === 'jobicy') return new Promise<Response>(() => {});
    return response([fixtures[source]]);
  } });
  assert.ok(Date.now() - started < 1000);
  assert.equal(result.run.status, 'completed');
  assert.deepEqual(result.jobs.map((job) => job.source).sort(), ['Himalayas', 'Remotive']);
  assert.match(result.run.message, /Jobicy timed out/);
});

test('response byte limits cover declared and streamed sizes without losing other sources', async () => {
  for (const oversized of [
    () => new Response('{}', { headers: { 'content-length': String(6 * 1024 * 1024) } }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1)); controller.close(); } })),
  ]) {
    const result = await discoverJobs(profile, { now, fetcher: async (input) => sourceFor(input) === 'jobicy' ? oversized() : response([fixtures[sourceFor(input)]]) });
    assert.equal(result.jobs.length, 2);
    assert.equal(result.run.status, 'completed');
    assert.match(result.run.message, /Jobicy exceeded the response size limit/);
  }
});

test('invalid feed envelopes fail cleanly and unsupported sources are never fetched', async () => {
  for (const body of ['not json', '{}', '{"jobs":{}}', '{"jobs":[],"success":false}']) {
    const result = await discoverJobs(profile, { sources: ['jobicy'], now, fetcher: async () => new Response(body) });
    assert.equal(result.run.status, 'failed');
    assert.deepEqual(result.jobs, []);
    assert.match(result.run.message, /unexpected format/);
  }
  for (const sources of [[], ['untrusted' as DiscoverySourceId]]) {
    let requested = false;
    const result = await discoverJobs(profile, { sources, now, fetcher: async () => { requested = true; return response([]); } });
    assert.equal(result.run.status, 'failed');
    assert.equal(requested, false);
  }
});

test('unsafe listing URLs and malformed rows are excluded for every source', async () => {
  const result = await discoverJobs(profile, { now, fetcher: async (input) => {
    const source = sourceFor(input);
    const urlKey = source === 'himalayas' ? 'applicationLink' : 'url';
    const hostname = new URL(DISCOVERY_SOURCES.find((item) => item.id === source)!.url).hostname;
    const invalid = ['javascript:alert(1)', `http://${hostname}/jobs/a`, `https://${hostname}.evil.example/jobs/a`, `https://user:password@${hostname}/jobs/a`, `https://${hostname}:8443/jobs/a`, 'https://evil.example/jobs/a'];
    return response([
      null, [], 5, 'invalid',
      ...invalid.map((url, index) => row(source, index, { [urlKey]: url })),
      row(source, 20, { [source === 'jobicy' ? 'jobTitle' : 'title']: '' }),
      row(source, 21, { [source === 'remotive' ? 'company_name' : 'companyName']: {} }),
      row(source, 22, { [source === 'jobicy' ? 'jobDescription' : 'description']: null }),
      row(source, 23, { [source === 'jobicy' ? 'jobTitle' : 'title']: 'Marketing Manager' }),
      row(source, 24),
    ]);
  } });
  assert.equal(result.jobs.length, 3);
  assert.ok(result.jobs.every((job) => job.url.endsWith('-24')));
});

test('known expired and closed listings are dropped using ISO, seconds and milliseconds', async () => {
  const past = Date.parse(now) - 1;
  const future = Date.parse(now) + day;
  const result = await discoverJobs(profile, { sources: ['himalayas'], now, fetcher: async () => response([
    row('himalayas', 1, { expiryDate: new Date(past).toISOString() }),
    row('himalayas', 2, { expiryDate: past / 1000 }),
    row('himalayas', 3, { expiryDate: past }),
    row('himalayas', 4, { expiryDate: Date.parse(now) }),
    row('himalayas', 5, { expiryDate: 'not-a-date' }),
    row('himalayas', 6, { expiryDate: new Date(future).toISOString() }),
    row('himalayas', 7, { expiryDate: future / 1000 }),
    row('himalayas', 8, { expiryDate: future }),
    row('himalayas', 9, { status: 'closed' }),
  ]) });
  assert.equal(result.jobs.length, 3);
  assert.ok(result.jobs.every((job) => /-[678]$/.test(job.url)));
});

test('tracking variants and repeated source IDs are deduplicated before fair source selection', async () => {
  const result = await discoverJobs(profile, { now, maxResults: 1000, fetcher: async (input) => {
    const source = sourceFor(input);
    const rows = Array.from({ length: 80 }, (_, index) => row(source, index));
    const key = source === 'himalayas' ? 'applicationLink' : 'url';
    const duplicateUrl = row(source, 999, { [key]: `${rows[0][key]}?utm_campaign=duplicate#apply` });
    const duplicateId = { ...rows[0], [key]: `${rows[0][key]}-duplicate` };
    return response([...Array.from({ length: 80 }, () => rows[0]), duplicateUrl, duplicateId, ...rows]);
  } });
  assert.equal(result.jobs.length, 100);
  const counts = DISCOVERY_SOURCES.map((source) => result.jobs.filter((job) => job.source === source.name).length);
  assert.deepEqual(counts, [34, 33, 33]);
  assert.equal(new Set(result.jobs.map((job) => job.id)).size, 100);
  assert.ok(result.jobs.every((job) => !job.url.includes('duplicate')));
});

test('long captured descriptions respect job/research limits and label truncation', async () => {
  const result = await discoverJobs(profile, { sources: ['jobicy'], now, fetcher: async () => response([row('jobicy', 1, { jobDescription: `<p>TypeScript experience required. ${'Source words. '.repeat(5000)}</p>` })]) });
  assert.equal(result.jobs.length, 1);
  const job = result.jobs[0];
  assert.doesNotThrow(() => assertJob(job));
  assert.ok(job.description.length <= 50_000);
  assert.ok(job.research!.sources[0].text.length <= 20_000);
  assert.match(job.research!.sources[0].text, /Capture truncated/);
});

test('source caches coalesce concurrent calls and use six-hour versus daily lifetimes', async (t) => {
  let clock = Date.parse(now);
  const calls = new Map<DiscoverySourceId, number>();
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit & { next?: { revalidate: number } }) => {
    const source = sourceFor(input);
    calls.set(source, (calls.get(source) ?? 0) + 1);
    assert.equal(init?.cache, 'force-cache');
    assert.equal(init?.next?.revalidate, source === 'himalayas' ? 86_400 : 21_600);
    return response([fixtures[source]]);
  });
  await Promise.all([discoverJobs(profile, { now }), discoverJobs(profile, { now })]);
  assert.deepEqual([...calls.values()], [1, 1, 1]);
  clock += DISCOVERY_INTERVAL_MS + 1000;
  const refreshed = await discoverJobs(profile, { now: new Date(clock).toISOString() });
  assert.equal(calls.get('remotive'), 2);
  assert.equal(calls.get('jobicy'), 2);
  assert.equal(calls.get('himalayas'), 1);
  assert.equal(refreshed.jobs.find((job) => job.source === 'Himalayas')!.research!.sources[0].capturedAt, now);
  clock = Date.parse(now) + day + 1000;
  await discoverJobs(profile, { now: new Date(clock).toISOString() });
  assert.equal(calls.get('himalayas'), 2);
});
