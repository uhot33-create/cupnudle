'use client';

/**
 * このファイルの役割:
 * - ログアウト操作を提供する共通ボタンコンポーネント。
 *
 * 関連画面:
 * - /
 *
 * 主要関数:
 * - LogoutButton
 * - handleLogout
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * このコンポーネントの用途:
 * - ログアウトAPIを呼び、成功後にログイン画面へ遷移する。
 */
export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * この関数の用途:
   * - ログアウトAPIを呼び出して認証Cookieを削除し、ログイン画面へ戻す。
   */
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      router.push('/login');
      router.refresh();
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
    >
      {isLoading ? 'ログアウト中...' : 'ログアウト'}
    </button>
  );
}
