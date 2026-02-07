'use client';

/**
 * このファイルの役割:
 * - 在庫登録画面 `/stocks/new` で使う「品名選択UI」を担当する。
 * - 品名マスタから選ぶ方法と直接入力する方法を1つのコンポーネントで切り替える。
 *
 * 関連画面:
 * - `/stocks/new` 在庫登録画面
 * - `/` 在庫一覧画面（登録完了後に戻る）
 *
 * 主要関数:
 * - `ItemSelect`（表示と入力切り替え）
 *
 * Firestore概念の補足:
 * - `collection`: ドキュメントの入れ物（例: items）
 * - `doc`: 1件のデータ（例: 1つの品名）
 * - `query`: 条件付き取得（例: 名前順）
 */

import type { Item } from '@/lib/items';

/**
 * この型の用途:
 * - ItemSelectが受け取る値とイベントを型で固定し、親コンポーネントとの受け渡しミスを防ぐ。
 */
type ItemSelectProps = {
  items: Item[];
  mode: 'select' | 'direct';
  selectedItemId: string;
  directItemName: string;
  isDisabled: boolean;
  masterCreatePath: string;
  onModeChange: (mode: 'select' | 'direct') => void;
  onSelectItemIdChange: (itemId: string) => void;
  onDirectItemNameChange: (itemName: string) => void;
};

/**
 * このコンポーネントの用途:
 * - 品名入力を「選択」「直接入力」の2モードで提供する。
 *
 * なぜこの構成にしたか:
 * - セレクトと直接入力を同時に有効にすると、どちらを優先するか曖昧になる。
 * - モードを明示的に分けることで、入力ミスと実装バグを防ぐ。
 *
 * どこを変更すればよいか:
 * - 品名マスタ作成画面のURLを変更する場合は `masterCreatePath` を変更する。
 * - 画像表示サイズを変える場合はサムネイルのTailwindクラスを変更する。
 */
export default function ItemSelect({
  items,
  mode,
  selectedItemId,
  directItemName,
  isDisabled,
  masterCreatePath,
  onModeChange,
  onSelectItemIdChange,
  onDirectItemNameChange,
}: ItemSelectProps) {
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">品名</p>
        <p className="text-xs text-slate-600">選択リストか直接入力のどちらか一方を使います。</p>
      </div>

      {/* モード切り替えボタン: 入力手段を明示してUXを分かりやすくする。 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={[
            'rounded-lg border px-3 py-2 text-sm',
            mode === 'select' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700',
          ].join(' ')}
          onClick={() => onModeChange('select')}
          disabled={isDisabled || items.length === 0}
        >
          リストから選択
        </button>
        <button
          type="button"
          className={[
            'rounded-lg border px-3 py-2 text-sm',
            mode === 'direct' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700',
          ].join(' ')}
          onClick={() => onModeChange('direct')}
          disabled={isDisabled}
        >
          直接入力
        </button>
      </div>

      {/* 品名マスタ未登録時の導線。まず登録してから選べることを明示する。 */}
      {items.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p>品名マスタが未登録です。先に品名を登録してください。</p>
          <p className="mt-1 text-xs">
            登録画面URL: <span className="font-mono">{masterCreatePath}</span>
          </p>
        </div>
      )}

      {/* セレクトUI: modeがdirectのときは無効化し、入力の競合を防ぐ。 */}
      <label className="block">
        <span className="mb-1 block text-xs text-slate-600">品名を選択</span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          value={selectedItemId}
          onChange={(event) => onSelectItemIdChange(event.target.value)}
          disabled={isDisabled || mode === 'direct' || items.length === 0}
        >
          <option value="">選択してください</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {/*
        画像サムネイルの代替UI:
        - HTMLのネイティブselectはoption内に画像を描画できない。
        - そのため「選択後のプレビュー」を表示して、画像付き選択の代替体験を提供する。
      */}
      {selectedItem && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {selectedItem.imageUrl ? (
            // 外部URL画像をそのまま表示する要件のため、ここでは標準imgを使う。
            // Next/Imageを使う場合は next.config.ts に許可ドメイン設定が必要になる。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedItem.imageUrl}
              alt={`${selectedItem.name} のサムネイル`}
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-200 text-[10px] text-slate-500">
              画像なし
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-900">{selectedItem.name}</p>
            <p className="text-xs text-slate-600">選択中の品名プレビュー</p>
          </div>
        </div>
      )}

      {/* 直接入力UI: modeがselectのときは無効化して、どちらの入力を使うか明確にする。 */}
      <label className="block">
        <span className="mb-1 block text-xs text-slate-600">品名を直接入力</span>
        <input
          type="text"
          value={directItemName}
          onChange={(event) => onDirectItemNameChange(event.target.value)}
          placeholder="例: カップヌードル チリトマト"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          disabled={isDisabled || mode === 'select'}
          maxLength={100}
        />
      </label>
    </section>
  );
}
