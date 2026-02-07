'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の「編集モーダル」を担当する。
 *
 * 関連画面:
 * - `/items` 品名マスタ管理画面
 *
 * 主要関数:
 * - `ItemEditModal`（編集UIと更新送信）
 *
 * Firestore概念の補足:
 * - `updateDoc`: 既存docの一部フィールドを更新する操作。
 */

import { useState } from 'react';
import type { Item } from '@/lib/items';

/**
 * この型の用途:
 * - 編集モーダルが親から受け取る値を固定する。
 */
type ItemEditModalProps = {
  item: Item;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: { id: string; name: string; imageUrl: string | null }) => Promise<void>;
};

/**
 * このコンポーネントの用途:
 * - 品名マスタの更新をモーダルで行う。
 *
 * なぜモーダルを選ぶのか:
 * - スマホで一覧を見ながら1件だけ素早く編集でき、画面遷移が不要になるため。
 */
export default function ItemEditModal({ item, isSaving, errorMessage, onClose, onSave }: ItemEditModalProps) {
  const [name, setName] = useState(item.name);
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? '');

  /**
   * この関数の用途:
   * - 編集値の検証と保存処理を行う。
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

    await onSave({
      id: item.id,
      name: trimmedName,
      imageUrl: normalizedImageUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">品名を編集</h3>

        <form className="mt-3 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">品名（必須）</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={100}
              required
              disabled={isSaving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">画像URL（任意）</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={isSaving}
            />
          </label>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
              onClick={onClose}
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
