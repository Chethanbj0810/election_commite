import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('token', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production',
    });
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (err) {
    return handleError(err);
  }
}

