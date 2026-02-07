'use client';

import { timestampToDateInput } from '@/lib/date';
import type { Stock } from '@/lib/stocks';

/**
 * この型の用途:
 * - 1行表示コンポーネントが受け取る入力を明示する。
 */
type StockRowProps = {
  stock: Stock;
  isWorking: boolean;
  onIncrement: (id: string, delta: number) => Promise<void>;
  onEdit: (stock: Stock) => void;
  onDelete: (id: string) => Promise<void>;
};

/**
 * この関数の用途:
 * - 期限が今日から30日以内かどうかを判定する。
 *
 * 期限判定ロジックの実装箇所:
 * - `src/components/stocks/StockRow.tsx` の `isExpiringWithin30Days` 関数。
 *
 * 処理の流れ:
 * - 1) 今日の0時と期限日の0時を作る。
 * - 2) ミリ秒差を日数へ変換する。
 * - 3) 0日以上30日以下なら強調対象と判定する。
 */
function isExpiringWithin30Days(expiryDateText: string): boolean {
  const [year, month, day] = expiryDateText.split('-').map(Number);
  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryAtMidnight = new Date(year, month - 1, day);

  const diffMs = expiryAtMidnight.getTime() - todayAtMidnight.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

/**
 * このコンポーネントの用途:
 * - 在庫1件分の表示と操作ボタン（+1 / -1 / 編集 / 削除）をまとめる。
 */
export default function StockRow({ stock, isWorking, onIncrement, onEdit, onDelete }: StockRowProps) {
  // Firestore Timestampを表示用のYYYY-MM-DDへ変換する。
  const expiryDateText = timestampToDateInput(stock.expiryDate);
  // 期限30日以内なら背景色と枠色を強調する。
  const isExpiringSoon = isExpiringWithin30Days(expiryDateText);

  return (
    <li
      className={[
        'rounded-xl border p-3 transition-colors',
        isExpiringSoon ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{stock.itemNameSnapshot}</p>
          <p className="mt-1 text-xs text-slate-600">期限: {expiryDateText}</p>
        </div>
        <p className="text-sm font-bold text-slate-900">{stock.quantity}個</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* -1ボタン: 在庫を1つ減らす。0未満の制御はincrementStock側で実施する。 */}
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 disabled:opacity-50"
          onClick={() => void onIncrement(stock.id, -1)}
          disabled={isWorking}
        >
          -1
        </button>

        {/* +1ボタン: 在庫を1つ増やす。 */}
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 disabled:opacity-50"
          onClick={() => void onIncrement(stock.id, 1)}
          disabled={isWorking}
        >
          +1
        </button>

        {/* 編集ボタン: モーダルを開いて期限と数量を変更する。 */}
        <button
          type="button"
          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-sm text-blue-700 disabled:opacity-50"
          onClick={() => onEdit(stock)}
          disabled={isWorking}
        >
          編集
        </button>

        {/* 削除ボタン: 対象行を削除する。 */}
        <button
          type="button"
          className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-sm text-red-700 disabled:opacity-50"
          onClick={() => void onDelete(stock.id)}
          disabled={isWorking}
        >
          削除
        </button>
      </div>
    </li>
  );
}
