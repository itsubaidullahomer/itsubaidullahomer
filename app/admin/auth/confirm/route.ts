import { handleOwnerRecovery } from '@/lib/jobs/auth-server';

export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleOwnerRecovery(request);
