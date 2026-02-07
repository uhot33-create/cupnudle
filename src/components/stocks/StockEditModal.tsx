'use client';

import { useState } from 'react';
import { timestampToDateInput } from '@/lib/date';
import type { Stock } from '@/lib/stocks';

/**
 * この型の用途:
 * - 編集モーダルが受け取る入力を明示する。
 */
type StockEditModalProps = {
  stock: Stock;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: { id: string; expiryDate: string; quantity: number }) => Promise<void>;
};

/**
 * このコンポーネントの用途:
 * - 在庫編集をモーダルで実行する。
 *
 * なぜモーダルを選ぶのか:
 * - スマホで一覧を見ながら短時間で修正する操作が中心のため、
 *   別画面遷移よりモーダルの方が操作回数が少なくなる。
 *
 * どこを変更すればよいか:
 * - 別画面編集へ切り替える場合は、`onEdit` クリック時に `/stocks/[id]/edit` へ遷移する実装に置き換える。
 */
export default function StockEditModal({
  stock,
  isSaving,
  errorMessage,
  onClose,
  onSave,
}: StockEditModalProps) {
  // フォーム入力値をモーダル内部で保持する。
  const [expiryDate, setExpiryDate] = useState(() => timestampToDateInput(stock.expiryDate));
  const [quantityText, setQuantityText] = useState(() => String(stock.quantity));

  /**
   * この関数の用途:
   * - フォーム入力を検証して保存処理を実行する。
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedQuantity = Number(quantityText);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      window.alert('個数は1以上の整数で入力してください。');
      return;
    }

    await onSave({
      id: stock.id,
      expiryDate,
      quantity: parsedQuantity,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">在庫を編集</h3>
        <p className="mt-1 text-xs text-slate-600">{stock.itemNameSnapshot}</p>

        <form className="mt-4 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          {/* 期限入力: HTML date inputの文字列をそのまま保存処理へ渡す。 */}
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">有効期限</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              required
              disabled={isSaving}
            />
          </label>

          {/* 個数入力: 文字列で保持し、保存時に整数へ変換して厳密に検証する。 */}
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">個数</span>
            <input
              type="number"
              min={1}
              step={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value)}
              required
              disabled={isSaving}
            />
          </label>

          {/* 保存失敗時のエラーをモーダル内で表示する。 */}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {errorMessage}
            </div>
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
