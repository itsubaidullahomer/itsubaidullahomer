import { createHash } from 'node:crypto';
import type { AgentRun, CandidateProfile, Eligibility, Job, Requirement } from './types';
import { normalizeUrl, sortJobs } from './domain';

// Fixed public endpoints only. Preserve visible attribution and each official listing/application URL.
export const DISCOVERY_SOURCES = [
  { id: 'remotive', name: 'Remotive', documentation: 'https://github.com/remotive-com/remote-jobs-api', url: 'https://remotive.com/api/remote-jobs?category=software-dev&limit=100', hosts: ['remotive.com', 'www.remotive.com'], minimumIntervalHours: 6 },
  { id: 'jobicy', name: 'Jobicy', documentation: 'https://jobicy.com/jobs-rss-feed', url: 'https://jobicy.com/api/v2/remote-jobs?count=100&tag=react', hosts: ['jobicy.com', 'www.jobicy.com'], minimumIntervalHours: 6 },
  { id: 'himalayas', name: 'Himalayas', documentation: 'https://himalayas.app/docs/remote-jobs-api', url: 'https://himalayas.app/jobs/api/search?q=full%20stack&country=Pakistan&sort=recent', hosts: ['himalayas.app', 'www.himalayas.app'], minimumIntervalHours: 24 },
] as const;
export const DISCOVERY_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_BYTES = 5 * 1024 * 1024;
const SOURCE_TIMEOUT_MS = 12_000;
type Source = typeof DISCOVERY_SOURCES[number];
export type DiscoverySourceId = Source['id'];
type FeedSnapshot = { rows: Record<string, unknown>[]; capturedAt: string };
const cache = new Map<DiscoverySourceId, FeedSnapshot & { until: number }>();
const pending = new Map<DiscoverySourceId, Promise<FeedSnapshot>>();

export type DiscoveryOptions = {
  sources?: DiscoverySourceId[];
  maxResults?: number;
  now?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

const text = (value: unknown, limit = 50000): string => typeof value === 'string' ? value.slice(0, limit) : '';

/** Job descriptions are plain text everywhere; never pass the result to an HTML sink. */
export function plainText(html: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bull: '•' };
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|br)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#')) {
        const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return number >= 32 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : ' ';
      }
      return entities[entity.toLowerCase()] ?? match;
    }).replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function assessEligibility(location: string, description = ''): { eligibility: Eligibility; evidence: string } {
  const clean = location.trim();
  // Feed labels, including Worldwide and Pakistan, are unreviewed source claims.
  // Rules cannot prove the absence of residency, work-authorization, or hiring exceptions.
  // Only an explicit user review can change imported eligibility to confirmed/ineligible.
  const passages = description.split(/\n+|(?<=[.!?])\s+/).map((part) => part.trim()).filter((part) => /Pakistan|worldwide|anywhere|restricted|authori[sz]|right to work|located|resid|based in|hire from|hiring from/i.test(part)).slice(0, 3).map((part) => part.slice(0, 350));
  const evidence = `Source location: “${clean || 'not specified'}”. Pakistan eligibility is unreviewed. Check the complete employer listing for country, residency, and work-authorization conditions before confirming.${passages.length ? ` Source passages to review: ${passages.map((part) => `“${part}”`).join(' ')}` : ''}`;
  return { eligibility: 'unknown', evidence };
}

function relevantRole(title: string, tags: string[]): boolean {
  if (!/engineer|developer/i.test(title) || /manager|director|designer|research scientist/i.test(title)) return false;
  if (/full[ -]?stack|product engineer|(?:applied |generative |gen ?)?AI\b|\bLLM\b/i.test(title)) return true;
  return /software engineer|software developer/i.test(title) && /react|typescript|node\.?js|full.?stack|llm/i.test(tags.join(' '));
}

/** Rules only identify passages to review. They do not infer proficiency or essentiality from keywords. */
function extractRequirements(description: string, profile: CandidateProfile, jobId: string): Requirement[] {
  const passages = description.split(/\n+/).map((part) => part.trim()).filter((part) => part.length >= 20 && part.length < 700 && /\b(?:must|require[ds]?|experience with|experience in|proficien\w*|expertise|familiarity|knowledge of|years? of)\b/i.test(part)).slice(0, 10);
  const requirements: Requirement[] = passages.map((passage, index) => {
    const evidenceIds = profile.evidence.filter((item) => item.skill.split(/\s*\/\s*/).some((skill) => skill.length >= 4 && passage.toLowerCase().includes(skill.toLowerCase()))).map((item) => item.id);
    return { id: `${jobId}-requirement-${index}`, text: passage, essential: true, assessment: 'unknown', evidenceIds, explanation: 'Automatically selected passage, not an assessed requirement. Check whether it is essential and whether linked portfolio evidence supports the full requirement.' };
  });
  requirements.push({ id: `${jobId}-requirements-review`, text: 'Confirm the complete essential requirements from the original listing.', essential: true, assessment: 'unknown', evidenceIds: [], explanation: 'Rule-based discovery may miss requirements, years of experience, degrees, or location conditions. Replace this checklist item with the reviewed requirements before assigning fit.' });
  return requirements;
}

class SourceError extends Error {}

async function fetchRows(source: Source, fetcher: typeof fetch, capturedAt: string, timeoutMs: number, useFrameworkCache: boolean): Promise<FeedSnapshot> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new SourceError(`${source.name} timed out. Try again on the next refresh.`));
    }, timeoutMs);
  });
  const read = async (): Promise<FeedSnapshot> => {
    const response = await fetcher(source.url, {
      headers: { Accept: 'application/json' }, signal: controller.signal, redirect: 'error', credentials: 'omit',
      // The framework cache survives requests; the in-process cache also coalesces concurrent callers.
      ...(useFrameworkCache ? { cache: 'force-cache' as const, next: { revalidate: source.minimumIntervalHours * 60 * 60 } } : { cache: 'no-store' as const }),
    });
    if (!response.ok) throw new SourceError(`${source.name} returned HTTP ${response.status}. Try again on the next refresh.`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new SourceError(`${source.name} exceeded the response size limit.`);
    if (!response.body) throw new SourceError(`${source.name} returned an empty response.`);
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BYTES) { void reader.cancel().catch(() => {}); throw new SourceError(`${source.name} exceeded the response size limit.`); }
      chunks.push(chunk.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(body)); } catch { throw new SourceError(`${source.name} returned an unexpected format.`); }
    if (!payload || typeof payload !== 'object' || !('jobs' in payload) || !Array.isArray(payload.jobs) || ('success' in payload && payload.success === false)) throw new SourceError(`${source.name} returned an unexpected format.`);
    return { rows: payload.jobs.slice(0, 1500).filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row)), capturedAt };
  };
  try {
    return await Promise.race([read(), timeout]);
  } catch (error) {
    controller.abort();
    void reader?.cancel().catch(() => {});
    throw error instanceof SourceError ? error : new SourceError(`${source.name} could not be reached. Try again on the next refresh.`);
  } finally { clearTimeout(timer); }
}

async function sourceSnapshot(source: Source, options: DiscoveryOptions, now: string): Promise<FeedSnapshot> {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.min(SOURCE_TIMEOUT_MS, options.timeoutMs!)) : SOURCE_TIMEOUT_MS;
  if (options.fetcher) return fetchRows(source, options.fetcher, now, timeoutMs, false);
  const stored = cache.get(source.id);
  if (stored && stored.until > Date.now()) return stored;
  let inFlight = pending.get(source.id);
  if (!inFlight) {
    inFlight = fetchRows(source, fetch, now, timeoutMs, true).then((snapshot) => {
      cache.set(source.id, { ...snapshot, until: Date.now() + source.minimumIntervalHours * 60 * 60 * 1000 });
      return snapshot;
    }).finally(() => { pending.delete(source.id); });
    pending.set(source.id, inFlight);
  }
  return inFlight;
}

const plain = (value: unknown, limit = 50_000): string => plainText(text(value, limit)).slice(0, limit);
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 30).map((item) => plain(item, 100)).filter(Boolean) : [];

function sourceUrl(value: unknown, source: Source): string {
  if (typeof value !== 'string' || value.length > 2048) return '';
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !source.hosts.some((host) => host === url.hostname)) return '';
    return raw;
  } catch { return ''; }
}

function salary(minimum: unknown, maximum: unknown, currency: unknown, period: unknown): string {
  const amount = (value: unknown): number | null => {
    const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : null;
  };
  const min = amount(minimum); const max = amount(maximum);
  if ((min === null && max === null) || (min !== null && max !== null && max < min)) return 'Not disclosed';
  const code = plain(currency, 10).toUpperCase();
  const unit = plain(period, 30);
  const prefix = /^[A-Z]{3}$/.test(code) ? `${code} ` : '';
  const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const range = min !== null && max !== null ? `${prefix}${format(min)}${min === max ? '' : `–${format(max)}`}` : min !== null ? `From ${prefix}${format(min)}` : `Up to ${prefix}${format(max!)}`;
  return `${range}${unit ? ` / ${unit}` : ''}`;
}

function dateValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
  const milliseconds = numeric === null ? (typeof value === 'string' ? Date.parse(value) : NaN) : numeric < 1e11 ? numeric * 1000 : numeric;
  return Number.isFinite(milliseconds) && milliseconds >= 0 && milliseconds <= 8.64e15 ? milliseconds : null;
}

function himalayasLocation(row: Record<string, unknown>): string {
  const locations = Array.isArray(row.locationRestrictions) ? row.locationRestrictions.map((item) => {
    if (typeof item === 'string') return plain(item, 100);
    if (item && typeof item === 'object' && !Array.isArray(item)) return plain(item.name || item.alpha2 || item.slug, 100);
    return '';
  }).filter(Boolean).slice(0, 30) : [];
  const region = locations.length ? locations.join(', ') : Array.isArray(row.locationRestrictions) && row.locationRestrictions.length === 0 ? 'Worldwide (source claim)' : 'Country eligibility not specified';
  const zones = Array.isArray(row.timezoneRestrictions) ? row.timezoneRestrictions.slice(0, 50).map((item) => typeof item === 'number' && Number.isFinite(item) ? `UTC${item >= 0 ? '+' : ''}${item}` : plain(item, 30)).filter(Boolean) : [];
  return `${region}${zones.length ? `; time zones: ${zones.join(', ')}` : ''}`.slice(0, 500);
}

function normalizeRow(row: Record<string, unknown>, source: Source, profile: CandidateProfile, now: string, capturedAt: string): Job | null {
  const isJobicy = source.id === 'jobicy';
  const isHimalayas = source.id === 'himalayas';
  const title = plain(isJobicy ? row.jobTitle : row.title, 250);
  const company = plain(source.id === 'remotive' ? row.company_name : row.companyName, 250);
  const description = plain(isJobicy ? row.jobDescription : row.description);
  const tags = isJobicy ? [...strings(row.jobIndustry), ...strings(row.jobType)] : strings(isHimalayas ? row.categories : row.tags);
  if (!title || !company || !description || !relevantRole(title, [...tags, description])) return null;
  const url = sourceUrl(isHimalayas ? row.applicationLink : row.url, source);
  if (!url) return null;
  const expiry = row.expiryDate ?? row.expiration_date ?? row.expires_at;
  if (expiry !== undefined && expiry !== null && expiry !== '') {
    const expiresAt = dateValue(expiry);
    if (expiresAt === null || expiresAt <= Date.parse(now)) return null;
  }
  if (typeof row.status === 'string' && /^(closed|expired|filled)$/i.test(row.status)) return null;
  const rawId = isHimalayas ? row.guid : row.id;
  const sourceId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).slice(0, 250) : url.slice(0, 250);
  const idPart = /^[a-zA-Z0-9_-]{1,100}$/.test(sourceId) ? sourceId : createHash('sha256').update(url).digest('hex').slice(0, 24);
  const id = `${source.id}-${idPart}`;
  const location = isHimalayas ? himalayasLocation(row) : plain(isJobicy ? row.jobGeo : row.candidate_required_location, 500);
  const eligibility = assessEligibility(location, description);
  const pay = source.id === 'remotive' ? plain(row.salary, 500) || 'Not disclosed' : salary(isJobicy ? row.salaryMin : row.minSalary, isJobicy ? row.salaryMax : row.maxSalary, isJobicy ? row.salaryCurrency : row.currency, row.salaryPeriod);
  const publication = dateValue(isJobicy || isHimalayas ? row.pubDate : row.publication_date);
  const header = `Source: ${source.name}\nOriginal listing: ${url}\nCaptured: ${capturedAt}${publication === null ? '' : `\nPublished: ${new Date(publication).toISOString()}`}\n\n`;
  const captureLimit = 20_000 - header.length;
  const capturedText = header + (description.length > captureLimit ? `${description.slice(0, captureLimit - 65)}\n[Capture truncated. Review the original listing for full text.]` : description);
  return {
    id, title, company, url, location: location || 'Remote — country eligibility unknown', salary: pay, description, source: source.name, sourceId,
    discoveredAt: now, updatedAt: now, status: 'discovered', priority: 'medium', fit: 'unknown', eligibility: 'unknown', eligibilityEvidence: eligibility.evidence,
    requirements: extractRequirements(description, profile, id), tags: tags.slice(0, 30), notes: '', nextAction: 'Confirm Pakistan eligibility, then review requirements', nextActionDate: null, draft: '', contactEmail: '', appliedAt: null,
    research: { companyUrl: '', contacts: [], sources: [{ id: `${id}-source`, label: `${source.name} job listing`, url, text: capturedText, capturedAt, screenshotUrl: '', screenshotPath: '' }] },
  };
}

export async function discoverJobs(profile: CandidateProfile, options: DiscoveryOptions = {}): Promise<{ jobs: Job[]; run: AgentRun }> {
  const now = options.now ?? new Date().toISOString();
  const run: AgentRun = { id: globalThis.crypto.randomUUID(), status: 'running', startedAt: now, completedAt: null, found: 0, added: 0, message: '' };
  try {
    if (!Number.isFinite(Date.parse(now))) throw new Error('The discovery timestamp is invalid.');
    if (options.sources?.some((id) => !DISCOVERY_SOURCES.some((source) => source.id === id))) throw new Error('Unsupported job source.');
    const sources = DISCOVERY_SOURCES.filter((source) => !options.sources || options.sources.includes(source.id));
    if (!sources.length) throw new Error('Enable a job source first.');
    const results = await Promise.allSettled(sources.map((source) => sourceSnapshot(source, options, now)));
    const failures: string[] = [];
    const groups: Job[][] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        failures.push(result.reason instanceof SourceError ? result.reason.message : `${sources[index].name} could not be read.`);
        continue;
      }
      const source = sources[index];
      const uniqueUrls = new Set<string>();
      const uniqueIds = new Set<string>();
      const jobs: Job[] = [];
      for (const row of result.value.rows) {
        const job = normalizeRow(row, source, profile, now, result.value.capturedAt);
        if (!job) continue;
        const key = normalizeUrl(job.url);
        if (uniqueUrls.has(key) || uniqueIds.has(job.id)) continue;
        uniqueUrls.add(key); uniqueIds.add(job.id); jobs.push(job);
      }
      groups.push(sortJobs(jobs));
    }
    if (!groups.length) throw new Error(failures.join(' '));
    const requestedLimit = Math.floor(options.maxResults ?? 40);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 40;
    const selected: Job[] = [];
    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();
    // Round-robin selection keeps a large first feed from crowding out the other sources.
    for (let offset = 0; selected.length < limit && groups.some((group) => offset < group.length); offset++) {
      for (const group of groups) {
        const job = group[offset];
        if (!job || selected.length >= limit) continue;
        const key = normalizeUrl(job.url);
        if (seenUrls.has(key) || seenIds.has(job.id)) continue;
        seenUrls.add(key); seenIds.add(job.id); selected.push(job);
      }
    }
    const credit = sources.filter((_, index) => results[index].status === 'fulfilled').map((source) => source.name).join(', ');
    return { jobs: sortJobs(selected), run: { ...run, status: 'completed', completedAt: new Date().toISOString(), found: selected.length, message: `${selected.length} relevant roles found via ${credit}. Source data can be delayed; Himalayas refreshes daily. Fit, requirements, and Pakistan eligibility need review; no applications were sent.${failures.length ? ` Some sources were unavailable: ${failures.join(' ')}` : ''}` } };
  } catch (error) {
    return { jobs: [], run: { ...run, status: 'failed', completedAt: new Date().toISOString(), message: error instanceof Error ? error.message : 'Discovery could not complete.' } };
  }
}
