import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { applyAction } from './domain';
import { emptyWorkspace } from './seed';
import { assertJob, isOwner, PortalError } from './validation';
import type { Workspace, WorkspaceAction } from './types';

/** Owner settings, trimmed: a stray space or newline pasted into the host's settings must not lock the owner out. */
export function ownerSettings(): { ownerId?: string; ownerEmail?: string } {
  return { ownerId: process.env.JOBS_ADMIN_USER_ID?.trim() || undefined, ownerEmail: process.env.JOBS_ADMIN_EMAIL?.trim() || undefined };
}
export function portalConfigured(): boolean {
  const { ownerId, ownerEmail } = ownerSettings();
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && ownerId && ownerEmail);
}
export async function createJobsClient() {
  if (!portalConfigured()) throw new PortalError('The private portal is not connected yet.', 503);
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) { try { for (const { name, value, options } of values) store.set(name, value, options); } catch { /* Server Components are read-only; proxy persists refreshed cookies. */ } },
    },
  });
}
export async function refreshJobsSession(request: NextRequest, makeResponse: (request: NextRequest) => NextResponse): Promise<NextResponse> {
  if (!portalConfigured()) return makeResponse(request);
  let response = makeResponse(request);
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = makeResponse(request);
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });
  try { await client.auth.getClaims(); } catch { /* Routes verify the owner afresh and fail closed. */ }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export async function ownerClient(): Promise<{ client: SupabaseClient; userId: string; email: string }> {
  const client = await createJobsClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new PortalError('Sign in to access your private workspace.', 401);
  const { ownerId, ownerEmail } = ownerSettings();
  if (!isOwner(user, ownerId, ownerEmail)) throw new PortalError('This account cannot access the portal.', 403);
  const owner = await client.from('jobs_owners').select('user_id').eq('user_id', user.id).maybeSingle();
  if (owner.error) throw new PortalError('The portal database is not ready. Complete the database setup.', 503);
  if (!owner.data) throw new PortalError('This account has not been enabled for the portal.', 403);
  return { client, userId: user.id, email: user.email! };
}
export async function getPortalSession(): Promise<{ configured: boolean; authenticated: boolean; email?: string; error?: string }> {
  if (!portalConfigured()) return { configured: false, authenticated: false };
  try { const owner = await ownerClient(); return { configured: true, authenticated: true, email: owner.email }; }
  catch (error) { return { configured: true, authenticated: false, ...(error instanceof PortalError && error.status === 503 ? { error: error.message } : {}) }; }
}
async function readWorkspace(client: SupabaseClient): Promise<{ workspace: Workspace; revision: number }> {
  const { data, error } = await client.rpc('jobs_load_workspace');
  if (error) throw new PortalError('Your workspace could not be loaded. Check the database connection and migration.', 503);
  const seed = emptyWorkspace();
  return { workspace: { jobs: data.jobs ?? [], activities: data.activities ?? [], runs: data.runs ?? [], profile: data.profile ?? seed.profile }, revision: data.revision ?? 0 };
}
export async function loadWorkspace(): Promise<Workspace> {
  const { client } = await ownerClient(); return (await readWorkspace(client)).workspace;
}
export async function persistAction(action: WorkspaceAction): Promise<Workspace> {
  const { client } = await ownerClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { workspace, revision } = await readWorkspace(client);
    if (action.type === 'update_job') {
      const previous = workspace.jobs.find(job => job.id === action.id);
      if (!previous) throw new PortalError('This job no longer exists.', 404);
      assertJob({ ...previous, ...action.patch });
    }
    if (action.type === 'add_activity' && action.activity.jobId && !workspace.jobs.some(job => job.id === action.activity.jobId)) throw new PortalError('Choose an existing job for this activity.', 404);
    let next: Workspace;
    try { next = applyAction(workspace, action); } catch (error) { throw new PortalError(error instanceof Error ? error.message : 'The action could not be applied.'); }
    const result = await client.rpc('jobs_save_workspace', { p_workspace: next, p_expected_revision: revision });
    if (!result.error) return next;
    if (result.error.code !== '40001') throw new PortalError('Your changes could not be saved. Please try again.', 503);
  }
  throw new PortalError('Another update arrived at the same time. Please try again.', 409);
}
export async function claimDiscovery(): Promise<void> {
  const { client } = await ownerClient();
  const { data, error } = await client.rpc('jobs_claim_discovery');
  if (error) throw new PortalError('Discovery could not start. Check the database connection.', 503);
  if (!data.allowed) throw new PortalError(`Discovery was checked recently. The next free-source refresh is available ${new Date(data.next_at).toISOString()}.`, 429);
}
export function portalResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
}
export function portalFailure(error: unknown): Response {
  if (error instanceof PortalError) return portalResponse({ error: error.message }, error.status);
  return portalResponse({ error: 'The portal could not complete this request.' }, 500);
}
