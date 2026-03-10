import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function roleAllowed(pathname: string, role: string | undefined) {
  if (!role) {
    return false;
  }

  if (pathname.startsWith('/app/admin')) {
    return role === 'ADMIN';
  }

  if (pathname.startsWith('/app/gestionale')) {
    return role === 'ADMIN' || role === 'GESTIONALE';
  }

  if (pathname.startsWith('/app/driver')) {
    return role === 'ADMIN' || role === 'DRIVER';
  }

  if (pathname.startsWith('/app/services') || pathname.startsWith('/services/')) {
    return role === 'ADMIN' || role === 'GESTIONALE';
  }

  if (pathname.startsWith('/app/finance')) {
    return role === 'ADMIN' || role === 'GESTIONALE';
  }

  return true;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/app') && !pathname.startsWith('/services/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const role = request.cookies.get('user_role')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!roleAllowed(pathname, role)) {
    const appUrl = new URL('/app', request.url);
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/services/:path*']
};
