'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の本体ページ。
 * - 一覧（name昇順）、追加、編集、削除を1画面で提供する。
 *
 * 関連画面:
 * - `/items` 品名マスタ管理画面（本画面）
 * - `/stocks/new` 在庫登録画面（品名選択でitemsを利用）
 * - `/` 在庫一覧画面（stocksはitemIdとitemNameSnapshotを保持）
 *
 * 主要関数:
 * - `loadItems`（一覧取得）
 * - `handleCreate`（追加）
 * - `handleSaveEdit`（編集保存）
 * - `handleDelete`（削除）
 *
 * Firestore概念の補足:
 * - `collection`: 同種データの集合（items）
 * - `doc`: items内の1レコード
 * - `query`: 条件付き取得命令（name昇順）
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ItemCreateForm from '@/components/items/ItemCreateForm';
import ItemEditModal from '@/components/items/ItemEditModal';
import ItemRow from '@/components/items/ItemRow';
import {
  addItem,
  deleteItem,
  listItems,
  updateItem,
  type Item,
  type ItemImageRef,
} from '@/lib/items';
import { deleteItemImageFile, uploadItemImageFile } from '@/lib/itemImageStorage';
import { countStocksByItemId } from '@/lib/stocks';

/**
 * このページの用途:
 * - 品名マスタCRUDをスマホ優先UIで提供する。
 */
export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const [workingIds, setWorkingIds] = useState<Record<string, boolean>>({});

  /**
   * この関数の用途:
   * - itemsをname昇順で取得して画面へ表示する。
   */
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await listItems();
      setItems(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : '品名一覧の取得に失敗しました。';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const setRowWorking = (id: string, isWorking: boolean) => {
    setWorkingIds((prev) => ({ ...prev, [id]: isWorking }));
  };

  /**
   * この関数の用途:
   * - 品名を新規追加する。
   */
  const handleCreate = async (payload: { name: string; imageFile: File | null }) => {
    setCreateErrorMessage(null);
    setIsCreating(true);

    let uploadedImage: ItemImageRef | null = null;

    try {
      if (payload.imageFile) {
        uploadedImage = await uploadItemImageFile(payload.imageFile);
      }

      await addItem(payload.name, uploadedImage);
      await loadItems();
    } catch (error) {
      // 作成失敗時はアップロード済み画像が残らないよう削除する。
      if (uploadedImage?.imagePath) {
        await deleteItemImageFile(uploadedImage.imagePath).catch(() => null);
      }

      const message = error instanceof Error ? error.message : '品名追加に失敗しました。';
      setCreateErrorMessage(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * この関数の用途:
   * - 編集モーダルからの更新内容を保存する。
   */
  const handleSaveEdit = async (payload: {
    id: string;
    name: string;
    imageFile: File | null;
    keepExistingImage: boolean;
  }) => {
    if (!editingItem) {
      return;
    }

    setIsSavingEdit(true);
    setEditErrorMessage(null);

    let newlyUploadedImage: ItemImageRef | null = null;

    try {
      if (payload.imageFile) {
        newlyUploadedImage = await uploadItemImageFile(payload.imageFile);
      }

      if (newlyUploadedImage) {
        await updateItem(payload.id, {
          name: payload.name,
          imageUrl: newlyUploadedImage.imageUrl,
          imagePath: newlyUploadedImage.imagePath,
        });

        // 新画像を反映できた後で旧画像を削除して、表示切れリスクを減らす。
        if (editingItem.imagePath) {
          await deleteItemImageFile(editingItem.imagePath).catch(() => null);
        }
      } else if (!payload.keepExistingImage) {
        await updateItem(payload.id, {
          name: payload.name,
          imageUrl: null,
          imagePath: null,
        });

        if (editingItem.imagePath) {
          await deleteItemImageFile(editingItem.imagePath).catch(() => null);
        }
      } else {
        await updateItem(payload.id, {
          name: payload.name,
        });
      }

      setEditingItem(null);
      await loadItems();
    } catch (error) {
      // 更新失敗時は新規アップロード画像を消して孤立ファイルを防ぐ。
      if (newlyUploadedImage?.imagePath) {
        await deleteItemImageFile(newlyUploadedImage.imagePath).catch(() => null);
      }

      const message = error instanceof Error ? error.message : '品名更新に失敗しました。';
      setEditErrorMessage(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * この関数の用途:
   * - 品名を削除する。
   *
   * 参照整合性の注意点:
   * - stocksは `itemId` と `itemNameSnapshot` を保存している。
   * - itemを削除すると `itemId` の参照先は消えるが、`itemNameSnapshot` により一覧表示は継続できる。
   * - ただし将来、itemIdで逆参照する機能では欠損が発生するため、削除前に警告を出す。
   */
  const handleDelete = async (item: Item) => {
    setErrorMessage(null);
    setRowWorking(item.id, true);

    try {
      const refCount = await countStocksByItemId(item.id);

      const message =
        refCount > 0
          ? `この品名は在庫${refCount}件から参照されています。削除すると参照先itemは消えますが、在庫の表示はスナップショット名で継続します。削除しますか？`
          : 'この品名を削除します。よろしいですか？';

      const shouldDelete = window.confirm(message);
      if (!shouldDelete) {
        return;
      }

      await deleteItem(item.id);
      if (item.imagePath) {
        await deleteItemImageFile(item.imagePath).catch(() => null);
      }
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : '品名削除に失敗しました。';
      setErrorMessage(message);
    } finally {
      setRowWorking(item.id, false);
    }
  };

  const countLabel = useMemo(() => `全${items.length}件`, [items.length]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4">
      <section className="mx-auto w-full max-w-2xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900">品名マスタ管理</h1>
              <p className="mt-1 text-sm text-slate-600">在庫登録で使う品名を管理します。</p>
            </div>
            <span className="text-xs text-slate-500">{countLabel}</span>
          </div>

          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">削除時の注意</p>
            <p className="mt-1">
              在庫側は `itemId` と `itemNameSnapshot` を保存しています。品名を削除しても在庫表示は続きますが、
              参照先itemは存在しなくなります。
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              在庫一覧へ
            </Link>
            <Link
              href="/stocks/new"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              在庫登録へ
            </Link>
          </div>
        </header>

        <ItemCreateForm isSubmitting={isCreating} errorMessage={createErrorMessage} onSubmit={handleCreate} />

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">品名一覧（name昇順）</h2>

          {isLoading && <p className="py-8 text-center text-sm text-slate-500">読み込み中です...</p>}

          {!isLoading && errorMessage && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
          )}

          {!isLoading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">品名マスタはまだありません。</p>
          )}

          {!isLoading && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isWorking={Boolean(workingIds[item.id])}
                  onEdit={(target) => {
                    setEditErrorMessage(null);
                    setEditingItem(target);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </section>
      </section>

      {editingItem && (
        <ItemEditModal
          key={editingItem.id}
          item={editingItem}
          isSaving={isSavingEdit}
          errorMessage={editErrorMessage}
          onClose={() => {
            if (!isSavingEdit) {
              setEditingItem(null);
            }
          }}
          onSave={handleSaveEdit}
        />
      )}
    </main>
  );
}
