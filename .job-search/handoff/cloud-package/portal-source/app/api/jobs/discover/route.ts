import { discoverJobs } from '@/lib/jobs/discovery';
import { claimDiscovery, loadWorkspace, persistAction, portalFailure, portalResponse } from '@/lib/jobs/server';
import { assertSameOrigin } from '@/lib/jobs/validation';
// Auth and the POST response stay uncached; public feeds keep their explicit per-source TTL.
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await loadWorkspace();
    await claimDiscovery();
    const result = await discoverJobs(current.profile);
    const workspace = await persistAction({ type: 'import_jobs', jobs: result.jobs, run: result.run });
    return portalResponse({ workspace, run: workspace.runs.find(run => run.id === result.run.id) ?? result.run });
  } catch (error) { return portalFailure(error); }
}
