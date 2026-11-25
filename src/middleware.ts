import { NextResponse, type NextRequest } from 'next/server';
import { readSession, SESSION_COOKIE } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSession(token) : null;
  if (session) return NextResponse.next();

  const login = new URL('/login', request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  login.searchParams.set('next', nextPath);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/invoices/:path*'],
};
