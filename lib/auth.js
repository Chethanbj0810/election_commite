import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return new TextEncoder().encode(secret);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60, // 8 hours in seconds
  secure: process.env.NODE_ENV === 'production',
};

export async function signToken(payload) {
  const secret = getJwtSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function withAuth(roles, handler) {
  return async (request, context) => {
    try {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      if (roles && roles.length > 0 && !roles.includes(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return await handler(request, context, session);
    } catch (err) {
      const { handleError } = await import('@/lib/errors');
      return handleError(err);
    }
  };
}

