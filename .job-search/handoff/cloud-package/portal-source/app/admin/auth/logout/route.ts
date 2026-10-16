import { createJobsClient } from '@/lib/jobs/server';
import { assertSameOrigin } from '@/lib/jobs/validation';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try { assertSameOrigin(request); const client = await createJobsClient(); await client.auth.signOut(); }
  catch { return NextResponse.json({ error: 'Sign out could not be completed.' }, { status: 400 }); }
  return NextResponse.redirect(new URL('/admin/login', request.url), 303);
}
