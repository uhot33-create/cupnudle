/**
 * このファイルの役割:
 * - App Router全体のアクセス制御を行うmiddleware。
 * - 未認証ユーザを `/login` へ誘導し、認証済みユーザは保護画面へアクセスできるようにする。
 *
 * 関連画面:
 * - /login
 * - /login/error
 * - /, /items, /stocks/new
 *
 * 主要関数:
 * - middleware
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isAuthenticatedCookieValue } from '@/lib/auth';

/**
 * この関数の用途:
 * - リクエストごとにログイン状態を確認し、必要に応じてリダイレクトする。
 *
 * 処理の流れ:
 * - 1) 公開パス（/login系, /api, 静的ファイル）ならそのまま通す。
 * - 2) 保護パスで未認証なら /login へリダイレクト。
 * - 3) /login に認証済みで来た場合は / へ戻す。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico';

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = isAuthenticatedCookieValue(authCookie);

  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === '/login' || pathname.startsWith('/login/')) && isAuthenticated) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

/**
 * middleware適用対象。
 * なぜ必要か:
 * - Next.jsの静的アセットを除外し、必要な画面だけ判定するため。
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
