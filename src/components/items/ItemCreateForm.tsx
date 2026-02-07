'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の「追加フォーム」を担当する。
 * - name必須、imageUrl任意の入力を受け取り、親へ送信する。
 *
 * 関連画面:
 * - `/items` 品名マスタ管理画面
 *
 * 主要関数:
 * - `ItemCreateForm`（入力UIと送信）
 *
 * Firestore概念の補足:
 * - `collection`: 同じ種類のデータをまとめる箱（ここでは `items`）。
 * - `doc`: collectionの中の1件（1つの品名マスタ）。
 * - `query`: 条件付きでデータを取る命令（一覧はname昇順）。
 */

import { useState } from 'react';

/**
 * この型の用途:
 * - 追加フォームが親へ渡すデータ形式を固定し、受け渡しミスを防ぐ。
 */
type ItemCreateFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: { name: string; imageUrl: string | null }) => Promise<void>;
};

/**
 * このコンポーネントの用途:
 * - 品名マスタの新規追加フォームを表示する。
 *
 * なぜこの構成にしたか:
 * - フォームを分離すると、画面本体の状態管理（一覧取得・編集・削除）が読みやすくなるため。
 */
export default function ItemCreateForm({ isSubmitting, errorMessage, onSubmit }: ItemCreateFormProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  /**
   * この関数の用途:
   * - 入力値を検証して親へ送信する。
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      window.alert('品名は必須です。');
      return;
    }
    if (trimmedName.length > 100) {
      window.alert('品名は100文字以内で入力してください。');
      return;
    }

    const normalizedImageUrl = imageUrl.trim().length > 0 ? imageUrl.trim() : null;

    await onSubmit({
      name: trimmedName,
      imageUrl: normalizedImageUrl,
    });

    // 登録成功時のみ入力欄を初期化する。
    setName('');
    setImageUrl('');
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h2 className="text-base font-semibold text-slate-900">品名を追加</h2>

      <form className="mt-3 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        {/* 品名入力: 必須項目。 */}
        <label className="block">
          <span className="mb-1 block text-xs text-slate-600">品名（必須）</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="例: カップヌードル シーフード"
            maxLength={100}
            required
            disabled={isSubmitting}
          />
        </label>

        {/* 画像URL入力: 任意項目。 */}
        <label className="block">
          <span className="mb-1 block text-xs text-slate-600">画像URL（任意）</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://example.com/item.jpg"
            disabled={isSubmitting}
          />
        </label>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? '追加中...' : '追加する'}
        </button>
      </form>
    </section>
  );
}
