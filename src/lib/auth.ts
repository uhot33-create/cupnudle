/**
 * このファイルの役割:
 * - 静的設定のログイン認証で共通利用する定数と判定関数を提供する。
 *
 * 関連画面:
 * - /login
 * - /login/error
 * - / （在庫一覧）
 *
 * 主要関数:
 * - getStaticAuthConfig
 * - isValidCredential
 * - isAuthenticatedCookieValue
 */

/**
 * 認証済み状態を保持するCookie名。
 * なぜ必要か:
 * - 画面遷移ごとにログイン判定を行うため、ブラウザへ認証状態を保存する必要がある。
 */
export const AUTH_COOKIE_NAME = 'cupnudle_auth';

/**
 * 認証Cookieに保存する値。
 * なぜ必要か:
 * - middleware側で「この値が入っているか」を見てログイン済み判定を行うため。
 */
export const AUTH_COOKIE_VALUE = 'authenticated';

/**
 * この型の用途:
 * - 静的ユーザ設定（ID/パスワード）を型で固定する。
 */
export type StaticAuthConfig = {
  loginId: string;
  loginPassword: string;
};

/**
 * この関数の用途:
 * - 環境変数から静的ログイン設定を読み取る。
 *
 * なぜこの設定が妥当か:
 * - 認証情報をコードに直書きせず、Vercelの環境変数で安全に管理できるため。
 *
 * どこを変更すればよいか:
 * - ログインID/パスワードを変更する場合は Vercel の
 *   `AUTH_LOGIN_ID` と `AUTH_LOGIN_PASSWORD` を変更する。
 */
export function getStaticAuthConfig(): StaticAuthConfig {
  const loginId = process.env.AUTH_LOGIN_ID;
  const loginPassword = process.env.AUTH_LOGIN_PASSWORD;

  if (!loginId || !loginPassword) {
    throw new Error('認証用環境変数が未設定です。AUTH_LOGIN_ID / AUTH_LOGIN_PASSWORD を設定してください。');
  }

  return {
    loginId,
    loginPassword,
  };
}

/**
 * この関数の用途:
 * - 入力されたID/パスワードが静的設定と一致するか判定する。
 */
export function isValidCredential(inputId: string, inputPassword: string): boolean {
  const config = getStaticAuthConfig();
  return inputId === config.loginId && inputPassword === config.loginPassword;
}

/**
 * この関数の用途:
 * - Cookie値が認証済み値か判定する。
 */
export function isAuthenticatedCookieValue(cookieValue: string | undefined): boolean {
  return cookieValue === AUTH_COOKIE_VALUE;
}
