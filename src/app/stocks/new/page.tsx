'use client';

/**
 * このファイルの役割:
 * - 在庫登録画面 `/stocks/new` を提供する。
 * - 品名選択/直接入力、有効期限、個数を受け取り、Firestoreへ在庫を登録する。
 *
 * 関連画面:
 * - `/stocks/new` 在庫登録画面（本ファイル）
 * - `/` 在庫一覧画面（登録成功後に遷移）
 *
 * 主要関数:
 * - `StocksNewPage`（ページ全体）
 * - `validateForm`（送信前検証）
 * - `handleSubmit`（登録実行）
 *
 * Firestore概念の補足:
 * - `collection`: 同じ種類のデータをまとめる箱（例: `items`, `stocks`）
 * - `doc`: collection内の1件のレコード
 * - `query`: 条件つき取得（例: 品名を名前順で取得）
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ItemSelect from '@/components/stocks/ItemSelect';
import { assertValidDateInput } from '@/lib/date';
import { listItems, type Item } from '@/lib/items';
import { addStock, type AddStockItemRef } from '@/lib/stocks';

/**
 * この型の用途:
 * - 送信前バリデーションに通ったデータを型で表し、
 *   addStockへ安全に渡せるようにする。
 */
type ValidatedPayload = {
  itemRef: AddStockItemRef;
  expiryDate: string;
  quantity: number;
};

/**
 * この関数の用途:
 * - input type=date の初期値として当日文字列(YYYY-MM-DD)を作る。
 *
 * なぜ必要か:
 * - 空欄のままだと送信時エラーが増えるため、初期値をセットして入力負荷を下げる。
 */
function createTodayDateInput(): string {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * このページの用途:
 * - 在庫追加フォームを表示し、送信時にFirestoreのstocksへ登録する。
 *
 * なぜこの実装にしたか:
 * - 入力検証をページ側で先に行うことで、Firestore呼び出し前に分かりやすいエラーを出せる。
 * - 登録成功後は一覧(`/`)へ戻して、登録結果をすぐ確認できるようにする。
 *
 * どこを変更すればよいか:
 * - 登録後遷移先を変える場合は `router.push('/')` の引数を変更する。
 * - 品名マスタ作成画面の導線先を変える場合は `MASTER_CREATE_PATH` を変更する。
 */
export default function StocksNewPage() {
  const router = useRouter();

  // 品名マスタ画面への導線URL。実際のマスタ画面ルートに合わせて変更する。
  const MASTER_CREATE_PATH = '/master/new';

  // 品名マスタ一覧。
  const [items, setItems] = useState<Item[]>([]);
  // 品名マスタ読み込み状態。
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  // 品名マスタ読み込みエラー。
  const [itemsError, setItemsError] = useState<string | null>(null);

  // 品名入力モード。
  const [mode, setMode] = useState<'select' | 'direct'>('select');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [directItemName, setDirectItemName] = useState('');

  // 有効期限と個数。
  const [expiryDate, setExpiryDate] = useState(createTodayDateInput());
  const [quantityText, setQuantityText] = useState('1');

  // 送信中状態とエラー表示。
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * この副作用の用途:
   * - 画面表示時にitemsコレクションを取得して品名セレクトへ表示する。
   */
  useEffect(() => {
    const load = async () => {
      setIsLoadingItems(true);
      setItemsError(null);

      try {
        const rows = await listItems();
        setItems(rows);

        // 品名マスタが0件なら直接入力モードへ自動切替して、入力可能状態を保証する。
        if (rows.length === 0) {
          setMode('direct');
          setSelectedItemId('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '品名マスタの取得に失敗しました。';
        setItemsError(message);
      } finally {
        setIsLoadingItems(false);
      }
    };

    void load();
  }, []);

  /**
   * この関数の用途:
   * - 送信前に入力値を検証し、addStockへ渡せる形に変換する。
   *
   * 処理の流れ:
   * - 1) モードに応じて itemRef を確定する。
   * - 2) 有効期限文字列を検証する。
   * - 3) 個数を整数へ変換し、0以上か確認する。
   * - 4) 問題なければValidatedPayloadを返す。
   */
  const validateForm = (): ValidatedPayload => {
    let itemRef: AddStockItemRef;

    if (mode === 'select') {
      if (selectedItemId.trim().length === 0) {
        throw new Error('品名を選択してください。');
      }
      itemRef = { itemId: selectedItemId };
    } else {
      const trimmedName = directItemName.trim();
      if (trimmedName.length === 0) {
        throw new Error('直接入力の品名を入力してください。');
      }
      if (trimmedName.length > 100) {
        throw new Error('品名は100文字以内で入力してください。');
      }
      itemRef = { itemName: trimmedName };
    }

    assertValidDateInput(expiryDate);

    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('個数は0以上の整数で入力してください。');
    }

    return {
      itemRef,
      expiryDate,
      quantity,
    };
  };

  /**
   * この関数の用途:
   * - フォーム送信を処理し、addStock実行後に一覧へ戻す。
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const payload = validateForm();

      setIsSubmitting(true);
      await addStock(payload.itemRef, payload.expiryDate, payload.quantity);

      // 成功後は一覧に戻し、ユーザーが登録結果をすぐ確認できるようにする。
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : '在庫登録に失敗しました。';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 選択中モードに応じて補足文言を変更する。
  const modeDescription = useMemo(() => {
    if (mode === 'select') {
      return '既存の品名マスタを参照して登録します。';
    }
    return '自由入力した品名を在庫のスナップショットとして保存します。';
  }, [mode]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">在庫を登録</h1>
          <p className="mt-1 text-sm text-slate-600">入力後に保存すると在庫一覧へ戻ります。</p>
        </header>

        {/* 品名マスタ取得エラー。登録フォームより先に原因を見せる。 */}
        {itemsError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {itemsError}
          </div>
        )}

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {/* 品名入力ブロック。読み込み中は入力を無効化する。 */}
          <ItemSelect
            items={items}
            mode={mode}
            selectedItemId={selectedItemId}
            directItemName={directItemName}
            isDisabled={isSubmitting || isLoadingItems}
            masterCreatePath={MASTER_CREATE_PATH}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              // モード切り替え時に反対側の入力値を空にして、どちらを送るか明確にする。
              if (nextMode === 'select') {
                setDirectItemName('');
              } else {
                setSelectedItemId('');
              }
            }}
            onSelectItemIdChange={(itemId) => {
              setSelectedItemId(itemId);
              // 選択時に直接入力を空にすることで、入力の競合を防ぐ。
              if (itemId.length > 0) {
                setMode('select');
                setDirectItemName('');
              }
            }}
            onDirectItemNameChange={(name) => {
              setDirectItemName(name);
              // 直接入力が始まったら直接入力モードへ切り替える。
              if (name.length > 0) {
                setMode('direct');
                setSelectedItemId('');
              }
            }}
          />

          <p className="text-xs text-slate-600">{modeDescription}</p>

          {/* 有効期限入力。HTML date inputを使い、保存時にTimestampへ変換する。 */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-900">有効期限</span>
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
              disabled={isSubmitting}
            />
          </label>

          {/* 個数入力。数量計算の誤差を防ぐため整数のみ許可する。 */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-900">個数</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
              disabled={isSubmitting}
            />
          </label>

          {/* 送信エラー表示。どの入力が原因か分かるメッセージをそのまま表示する。 */}
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              一覧へ戻る
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isSubmitting || isLoadingItems}
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
