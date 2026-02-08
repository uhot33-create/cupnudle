/**
 * このファイルの役割:
 * - ログアウトAPI。認証Cookieを削除する。
 *
 * 関連画面:
 * - /
 * - /login
 *
 * 主要関数:
 * - POST
 */

import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * この関数の用途:
 * - 認証Cookieを削除してログアウト状態へ戻す。
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
