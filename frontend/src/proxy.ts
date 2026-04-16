/**
 * Next.js 16 Proxy (middleware 대체)
 * - 인증 필요 경로 보호
 * - /admin/* 경로: role=admin만 허용
 * - 미인증 → /login 리다이렉트
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const PUBLIC_PATHS = ['/login', '/api/auth'];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/approvals',
  '/messages',
  '/schedule',
  '/posts',
  '/ai',
  '/admin',
  '/attendance',
  '/files',
  '/projects',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* 경로는 admin 역할만
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
