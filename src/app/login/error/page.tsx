/**
 * このファイルの役割:
 * - ログイン不一致時に表示するエラー画面 `/login/error` を提供する。
 *
 * 関連画面:
 * - /login
 * - /login/error
 *
 * 主要関数:
 * - LoginErrorPage
 */

import Link from 'next/link';

/**
 * このページの用途:
 * - ID/パスワード不一致時に明示的なエラー画面を表示する。
 */
export default function LoginErrorPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-red-700">認証エラー</h1>
        <p className="mt-2 text-sm text-slate-700">IDまたはパスワードが一致しませんでした。</p>

        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
          >
            ログイン画面へ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
