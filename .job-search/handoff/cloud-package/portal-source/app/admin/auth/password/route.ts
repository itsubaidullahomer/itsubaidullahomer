import { handleOwnerPasswordUpdate } from '@/lib/jobs/auth-server';

export const POST = (request: Request) => handleOwnerPasswordUpdate(request);
