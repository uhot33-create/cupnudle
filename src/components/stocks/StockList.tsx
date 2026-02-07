'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteStock, incrementStock, listStocks, updateStock, type Stock } from '@/lib/stocks';
import StockEditModal from '@/components/stocks/StockEditModal';
import StockRow from '@/components/stocks/StockRow';

/**
 * このコンポーネントの用途:
 * - 在庫一覧データの取得、ローディング表示、エラー表示、編集モーダル制御をまとめて管理する。
 *
 * なぜこの構成が必要か:
 * - Firestoreアクセスを1か所に集約すると、一覧再取得やエラーハンドリングの挙動を統一できる。
 *
 * どこを変更すればよいか:
 * - 1ページあたり表示件数を追加したい場合は、listStocksの呼び出し部分をページング対応へ変更する。
 */
export default function StockList() {
  // 在庫一覧データ本体。
  const [stocks, setStocks] = useState<Stock[]>([]);
  // 初回読み込み中と再読み込み中の表示制御。
  const [isLoading, setIsLoading] = useState(true);
  // 画面上部に表示するエラーメッセージ。
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 行ごとの処理中状態（+1 / -1 / 削除の二重押下防止）。
  const [workingIds, setWorkingIds] = useState<Record<string, boolean>>({});

  // 編集モーダルで現在開いている在庫。
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  // 編集保存中の状態。
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // 編集モーダル内エラー。
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  /**
   * この関数の用途:
   * - Firestoreから在庫一覧を取得して状態へ反映する。
   *
   * 処理の流れ:
   * - 1) ローディングを開始する。
   * - 2) 既存エラーを消して listStocks を呼ぶ。
   * - 3) 成功時は一覧を更新する。
   * - 4) 失敗時は画面用エラーメッセージへ変換する。
   * - 5) 最後にローディングを終了する。
   */
  const loadStocks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await listStocks();
      setStocks(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在庫一覧の取得に失敗しました。';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回表示で1回だけ在庫一覧を取得する。
  useEffect(() => {
    void loadStocks();
  }, [loadStocks]);

  /**
   * この関数の用途:
   * - 1行単位で処理中フラグを切り替える。
   *
   * なぜ必要か:
   * - +1/-1/削除の連打で同時更新が発生することを防ぐため。
   */
  const setRowWorking = (id: string, isWorking: boolean) => {
    setWorkingIds((prev) => ({ ...prev, [id]: isWorking }));
  };

  /**
   * この関数の用途:
   * - 在庫数量をdelta分だけ増減させる。
   */
  const handleIncrement = async (id: string, delta: number) => {
    setErrorMessage(null);
    setRowWorking(id, true);

    try {
      await incrementStock(id, delta);
      await loadStocks();
    } catch (error) {
      const message = error instanceof Error ? error.message : '在庫数の更新に失敗しました。';
      setErrorMessage(message);
    } finally {
      setRowWorking(id, false);
    }
  };

  /**
   * この関数の用途:
   * - 在庫を1件削除する。
   */
  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('この在庫を削除します。取り消しはできません。');
    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);
    setRowWorking(id, true);

    try {
      await deleteStock(id);
      await loadStocks();
    } catch (error) {
      const message = error instanceof Error ? error.message : '在庫削除に失敗しました。';
      setErrorMessage(message);
    } finally {
      setRowWorking(id, false);
    }
  };

  /**
   * この関数の用途:
   * - 編集モーダルで更新した在庫を保存する。
   */
  const handleSaveEdit = async (payload: { id: string; expiryDate: string; quantity: number }) => {
    setIsSavingEdit(true);
    setEditErrorMessage(null);

    try {
      await updateStock(payload.id, {
        expiryDate: payload.expiryDate,
        quantity: payload.quantity,
      });
      setEditingStock(null);
      await loadStocks();
    } catch (error) {
      const message = error instanceof Error ? error.message : '在庫更新に失敗しました。';
      setEditErrorMessage(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 在庫件数表示用。見出しに数字を出して現状把握をしやすくする。
  const stockCountLabel = useMemo(() => `全${stocks.length}件`, [stocks.length]);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">在庫データ</h2>
        <span className="text-xs text-slate-500">{stockCountLabel}</span>
      </div>

      {/* ローディング表示: 取得完了までプレースホルダを表示する。 */}
      {isLoading && <p className="py-8 text-center text-sm text-slate-500">読み込み中です...</p>}

      {/* エラー表示: 通信失敗や入力エラーを画面上で明示する。 */}
      {!isLoading && errorMessage && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* データなし表示: 初期状態や全削除後に空状態を出す。 */}
      {!isLoading && stocks.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">在庫がありません。</p>
      )}

      {/* 在庫行一覧: 1件ごとに操作ボタンを表示する。 */}
      {!isLoading && stocks.length > 0 && (
        <ul className="space-y-2">
          {stocks.map((stock) => (
            <StockRow
              key={stock.id}
              stock={stock}
              isWorking={Boolean(workingIds[stock.id])}
              onIncrement={handleIncrement}
              onEdit={(target) => {
                setEditErrorMessage(null);
                setEditingStock(target);
              }}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {/* 編集モーダル: スマホで別画面遷移を減らし、一覧文脈のまま即時編集できるようにする。 */}
      {editingStock && (
        <StockEditModal
          key={editingStock.id}
          stock={editingStock}
          isSaving={isSavingEdit}
          errorMessage={editErrorMessage}
          onClose={() => {
            if (!isSavingEdit) {
              setEditingStock(null);
            }
          }}
          onSave={handleSaveEdit}
        />
      )}
    </section>
  );
}
