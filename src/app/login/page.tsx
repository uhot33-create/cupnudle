'use client';

/**
 * このファイルの役割:
 * - ログイン画面 `/login` を表示する。
 * - ID/パスワードを入力し、認証成功で在庫一覧へ遷移する。
 *
 * 関連画面:
 * - /login
 * - /login/error
 * - /
 *
 * 主要関数:
 * - LoginPage
 * - handleSubmit
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * このページの用途:
 * - 静的設定ユーザ（環境変数）と照合するログインUIを提供する。
 */
export default function LoginPage() {
  const router = useRouter();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * この関数の用途:
   * - フォーム送信時にログインAPIを呼び、認証結果に応じて画面遷移する。
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId,
          password,
        }),
      });

      if (response.ok) {
        router.push('/');
        return;
      }

      if (response.status === 401) {
        router.push('/login/error');
        return;
      }

      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setErrorMessage(data?.message ?? 'ログインに失敗しました。');
    } catch {
      setErrorMessage('通信エラーが発生しました。ネットワークを確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ログイン</h1>
        <p className="mt-1 text-sm text-slate-600">IDとパスワードを入力してください。</p>

        <form className="mt-4 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-900">ID</span>
            <input
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
              required
              disabled={isSubmitting}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-900">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
              required
              disabled={isSubmitting}
            />
          </label>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? '認証中...' : 'ログイン'}
          </button>
        </form>
      </section>
    </main>
  );
}
