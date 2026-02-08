/**
 * このファイルの役割:
 * - ログインAPI。ID/パスワード照合が成功したら認証Cookieを発行する。
 *
 * 関連画面:
 * - /login
 * - /login/error
 *
 * 主要関数:
 * - POST
 */

import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  isValidCredential,
} from '@/lib/auth';

/**
 * この関数の用途:
 * - ログインリクエストを処理し、認証Cookieを設定する。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { loginId?: string; password?: string };

    const loginId = body.loginId?.trim() ?? '';
    const password = body.password ?? '';

    if (loginId.length === 0 || password.length === 0) {
      return NextResponse.json({ message: 'IDとパスワードを入力してください。' }, { status: 400 });
    }

    const valid = isValidCredential(loginId, password);
    if (!valid) {
      return NextResponse.json({ message: 'IDまたはパスワードが一致しません。' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: AUTH_COOKIE_VALUE,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json({ message: 'ログイン処理に失敗しました。' }, { status: 500 });
  }
}
