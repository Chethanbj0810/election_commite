import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth([], async (_req, _ctx, session) => {
  return NextResponse.json(session);
});

