import { handleOwnerAuth } from '@/lib/jobs/auth-server';

export const POST = (request: Request) => handleOwnerAuth(request, 'verify');
