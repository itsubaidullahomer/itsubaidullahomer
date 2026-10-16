import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerClient } from '@supabase/ssr';

// Local owner session only. Never add this session file to a deployment or source control.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionPath = path.join(root, '.job-search/private/session.json');
const portal = 'https://admin.itsubaidullahomer.com';
const supabase = 'https://xhzzmiicctlbtclfkflp.supabase.co';
const publicKey = 'sb_publishable_c12jEqmm_SWrkRxMEXW3qQ_G7p-0O0P';
const ownerId = 'f3cd24e9-75c7-4482-929a-d446f9f7a17c';
process.umask(0o077);

export async function ownerRequest(endpoint, init = {}) {
  if (!/^\/api\/jobs\/(workspace|documents(?:\/[a-f0-9-]+)?|submissions|discover)$/.test(endpoint))
    throw new Error('Choose a supported private job-portal endpoint.');
  const saved = JSON.parse(await fs.readFile(sessionPath, 'utf8'));
  const jar = new Map(saved.cookie.split('; ').filter(Boolean).map(part => {
    const split = part.indexOf('=');
    return [part.slice(0, split), part.slice(split + 1)];
  }));
  const client = createServerClient(supabase, publicKey, {
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== ownerId || data.user.email !== 'itsubaidullahomer@gmail.com')
    throw new Error('The private owner session needs sign-in. Do not use another account.');
  const cookie = Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ');
  await fs.writeFile(sessionPath, JSON.stringify({ cookie }), { mode: 0o600 });
  const headers = new Headers(init.headers);
  headers.set('cookie', cookie);
  headers.set('origin', portal);
  const response = await fetch(portal + endpoint, { ...init, headers, redirect: 'error' });
  // Errors intentionally omit authentication data and response headers.
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Portal ${response.status}: ${payload.error || 'Request failed.'}`);
  }
  return response;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, input] = process.argv.slice(2);
  if (command === 'status') {
    const { workspace } = await (await ownerRequest('/api/jobs/workspace')).json();
    console.log(JSON.stringify({ jobs: workspace.jobs.length, applied: workspace.jobs.filter(j => j.appliedAt).length, fit: workspace.jobs.reduce((counts, job) => ({ ...counts, [job.fit]: (counts[job.fit] ?? 0) + 1 }), {}) }));
  } else if (command === 'apply-actions' && input) {
    const actions = JSON.parse(await fs.readFile(input, 'utf8'));
    if (!Array.isArray(actions)) throw new Error('Provide an array of reviewed workspace actions.');
    for (const action of actions) {
      await ownerRequest('/api/jobs/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) });
    }
    console.log(JSON.stringify({ recordedActions: actions.length }));
  } else {
    throw new Error('Usage: node scripts/jobs-agent-client.mjs status | apply-actions PRIVATE_JSON_PATH');
  }
}
