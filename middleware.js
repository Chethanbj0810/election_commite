import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Voters cannot access live results during active polling
  if (pathname.startsWith('/results')) {
    if (!token) {
      return NextResponse.next();
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_middleware_build');
      const verified = await jwtVerify(token, secret);
      if (verified.payload?.role === 'voter') {
        return NextResponse.redirect(new URL('/voter', request.url));
      }
    } catch {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  let payload = null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_middleware_build');
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = payload?.role;

  // Role home mapper
  const roleHome = role === 'admin' ? '/admin' : role === 'officer' ? '/officer' : '/voter';

  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
  } else if (pathname.startsWith('/officer')) {
    if (role !== 'officer' && role !== 'admin') {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
  } else if (pathname.startsWith('/voter')) {
    if (role !== 'voter') {
      return NextResponse.redirect(new URL(roleHome, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/officer/:path*', '/voter/:path*', '/results/:path*', '/results'],
};

