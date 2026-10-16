import { loadWorkspace, persistAction, portalFailure, portalResponse } from '@/lib/jobs/server';
import { assertSameOrigin, parseAction, readLimitedJson } from '@/lib/jobs/validation';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return portalResponse({ workspace: await loadWorkspace() }); } catch (error) { return portalFailure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const action = parseAction(await readLimitedJson(request));
    return portalResponse({ workspace: await persistAction(action) });
  } catch (error) { return portalFailure(error); }
}
