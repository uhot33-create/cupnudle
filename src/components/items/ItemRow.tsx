'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の1行表示を担当する。
 *
 * 関連画面:
 * - `/items` 品名マスタ管理画面
 *
 * 主要関数:
 * - `ItemRow`（行表示、編集・削除ボタン）
 *
 * Firestore概念の補足:
 * - `doc` のIDを使って、更新・削除対象を特定する。
 */

import type { Item } from '@/lib/items';

/**
 * この型の用途:
 * - ItemRowに必要な入力値とイベントを固定する。
 */
type ItemRowProps = {
  item: Item;
  isWorking: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => Promise<void>;
};

/**
 * このコンポーネントの用途:
 * - 品名マスタ1件を表示し、編集・削除操作を提供する。
 */
export default function ItemRow({ item, isWorking, onEdit, onDelete }: ItemRowProps) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {item.imageUrl ? (
            // 外部URL画像をそのまま表示する要件のため標準imgを利用する。
            // Next/Image利用時は next.config.ts の許可ドメイン設定が別途必要になる。
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={`${item.name} の画像`} className="h-12 w-12 rounded-md object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-200 text-[10px] text-slate-500">
              画像なし
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="truncate text-xs text-slate-600">{item.imageUrl ?? '画像URL未設定'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-blue-700 disabled:opacity-50"
            onClick={() => onEdit(item)}
            disabled={isWorking}
          >
            編集
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-700 disabled:opacity-50"
            onClick={() => void onDelete(item)}
            disabled={isWorking}
          >
            削除
          </button>
        </div>
      </div>
    </li>
  );
}
