/**
 * このファイルの用途:
 * - 在庫（stocksコレクション）へのCRUD操作を画面コードから分離する。
 * - 在庫の数量更新は `incrementStock` で一元化し、競合更新に強い実装にする。
 *
 * なぜこの設定が必要か:
 * - 在庫更新は同時操作が起きやすく、画面ごとに実装すると不整合が起きるため。
 *
 * どこを変更すればよいか:
 * - コレクション名を変更する場合は `STOCKS_COLLECTION` を変更する。
 * - 在庫のフィールドを増やす場合は `StockDoc` と変換処理を同時に変更する。
 *
 * TODO:
 * - 在庫履歴（増減ログ）を追加する場合は、incrementStock内で履歴コレクションへ同時書き込みする。
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type UpdateData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dateInputToTimestamp, type DateInputValue } from '@/lib/date';
import { getItemById } from '@/lib/items';

/**
 * この定数の用途:
 * - Firestoreの在庫コレクション名を1か所で管理する。
 */
const STOCKS_COLLECTION = 'stocks';

/**
 * この型の用途:
 * - 在庫ドキュメントの保存形式を定義する。
 */
export type StockDoc = {
  itemId: string | null;
  itemNameSnapshot: string;
  expiryDate: Timestamp;
  quantity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * この型の用途:
 * - 画面表示で使うID付き在庫型。
 */
export type Stock = StockDoc & {
  id: string;
};

/**
 * この型の用途:
 * - addStockで「itemIdまたはitemName」を受けるための入力型。
 *
 * なぜこの設定が必要か:
 * - マスタ登録済み品目と自由入力品目の両方をMVPで扱うため。
 */
export type AddStockItemRef =
  | { itemId: string; itemName?: never }
  | { itemId?: never; itemName: string };

/**
 * この型の用途:
 * - 在庫更新で受け付ける変更可能項目を定義する。
 */
export type UpdateStockInput = {
  itemId?: string;
  itemName?: string;
  expiryDate?: DateInputValue;
  quantity?: number;
};

/**
 * この関数の用途:
 * - Firestoreの生ドキュメントをアプリ内型へ安全に変換する。
 */
function toStock(snapshot: QueryDocumentSnapshot<DocumentData>): Stock {
  const data = snapshot.data();

  const itemId = data.itemId ?? null;
  if (itemId !== null && typeof itemId !== 'string') {
    throw new Error('stocksドキュメントのitemIdが不正です。');
  }

  if (typeof data.itemNameSnapshot !== 'string' || data.itemNameSnapshot.trim() === '') {
    throw new Error('stocksドキュメントのitemNameSnapshotが不正です。');
  }

  if (!data.expiryDate) {
    throw new Error('stocksドキュメントのexpiryDateが不正です。');
  }

  if (!Number.isInteger(data.quantity) || data.quantity < 0) {
    throw new Error('stocksドキュメントのquantityが不正です。');
  }

  if (!data.createdAt || !data.updatedAt) {
    throw new Error('stocksドキュメントの作成日時または更新日時が不正です。');
  }

  return {
    id: snapshot.id,
    itemId,
    itemNameSnapshot: data.itemNameSnapshot,
    expiryDate: data.expiryDate as Timestamp,
    quantity: data.quantity,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

/**
 * この関数の用途:
 * - 在庫を新規作成する。
 *
 * なぜこの設定が必要か:
 * - 画面入力（itemIdまたはitemName、HTML日付文字列）をDB保存形へ統一変換するため。
 *
 * 処理の流れ:
 * - 1) item参照入力を検証する。
 * - 2) itemId指定ならitemsから品名を取得し、スナップショットを作る。
 * - 3) expiryDateをTimestampへ変換する。
 * - 4) quantityを検証して保存する。
 */
export async function addStock(
  itemRef: AddStockItemRef,
  expiryDate: DateInputValue,
  quantity: number,
): Promise<string> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('個数は0以上の整数で入力してください。');
  }

  let resolvedItemId: string | null = null;
  let itemNameSnapshot = '';

  if ('itemId' in itemRef && itemRef.itemId) {
    const itemId = itemRef.itemId.trim();
    if (itemId.length === 0) {
      throw new Error('itemIdが空です。');
    }

    const item = await getItemById(itemId);
    if (!item) {
      throw new Error('指定されたitemIdの品名マスタが存在しません。');
    }

    resolvedItemId = item.id;
    itemNameSnapshot = item.name;
  } else if ('itemName' in itemRef && itemRef.itemName) {
    const trimmedName = itemRef.itemName.trim();
    if (trimmedName.length === 0) {
      throw new Error('itemNameは空文字にできません。');
    }
    if (trimmedName.length > 100) {
      throw new Error('itemNameは100文字以内で入力してください。');
    }

    resolvedItemId = null;
    itemNameSnapshot = trimmedName;
  } else {
    throw new Error('itemIdまたはitemNameのどちらかを指定してください。');
  }

  const expiryTimestamp = dateInputToTimestamp(expiryDate);

  const docRef = await addDoc(collection(db, STOCKS_COLLECTION), {
    itemId: resolvedItemId,
    itemNameSnapshot,
    expiryDate: expiryTimestamp,
    quantity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * この関数の用途:
 * - 在庫一覧を期限昇順で取得する。
 *
 * なぜこの設定が必要か:
 * - 期限が近い順で表示する要件をDBクエリで満たすため。
 */
export async function listStocks(): Promise<Stock[]> {
  const q = query(collection(db, STOCKS_COLLECTION), orderBy('expiryDate', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toStock);
}

/**
 * この関数の用途:
 * - 在庫を更新する。
 *
 * なぜこの設定が必要か:
 * - フィールド単位更新で無関係な項目上書きを防ぐため。
 *
 * 処理の流れ:
 * - 1) IDと更新項目を検証する。
 * - 2) itemIdまたはitemNameの指定があればスナップショット名を再解決する。
 * - 3) expiryDateとquantityを必要に応じて変換・検証する。
 * - 4) updatedAtを必ず更新する。
 */
export async function updateStock(id: string, updates: UpdateStockInput): Promise<void> {
  if (!id.trim()) {
    throw new Error('更新対象IDが空です。');
  }

  const payload: UpdateData<StockDoc> = {};

  if (updates.itemId !== undefined) {
    const trimmedItemId = updates.itemId.trim();
    if (trimmedItemId.length === 0) {
      throw new Error('itemIdは空文字にできません。');
    }

    const item = await getItemById(trimmedItemId);
    if (!item) {
      throw new Error('指定されたitemIdの品名マスタが存在しません。');
    }

    payload.itemId = item.id;
    payload.itemNameSnapshot = item.name;
  }

  if (updates.itemName !== undefined) {
    const trimmedName = updates.itemName.trim();
    if (trimmedName.length === 0) {
      throw new Error('itemNameは空文字にできません。');
    }
    if (trimmedName.length > 100) {
      throw new Error('itemNameは100文字以内で入力してください。');
    }

    payload.itemId = null;
    payload.itemNameSnapshot = trimmedName;
  }

  if (updates.expiryDate !== undefined) {
    payload.expiryDate = dateInputToTimestamp(updates.expiryDate);
  }

  if (updates.quantity !== undefined) {
    if (!Number.isInteger(updates.quantity) || updates.quantity < 0) {
      throw new Error('個数は0以上の整数で入力してください。');
    }
    payload.quantity = updates.quantity;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('更新対象フィールドがありません。');
  }

  payload.updatedAt = serverTimestamp();
  await updateDoc(doc(db, STOCKS_COLLECTION, id), payload);
}

/**
 * この関数の用途:
 * - 在庫を削除する。
 */
export async function deleteStock(id: string): Promise<void> {
  if (!id.trim()) {
    throw new Error('削除対象IDが空です。');
  }

  await deleteDoc(doc(db, STOCKS_COLLECTION, id));
}

/**
 * この関数の用途:
 * - 在庫個数を差分（delta）で増減する。
 *
 * なぜトランザクションを選ぶのか:
 * - `increment` は単純加算は安全だが、
 *   「更新後に0未満を禁止する」という業務ルールを同時に保証できない。
 * - トランザクションなら「現在値読み取り -> 0未満チェック -> 更新」を原子的に実行できる。
 *
 * 処理の流れ:
 * - 1) トランザクション内で対象在庫を読み取る。
 * - 2) 新しい個数 = 現在個数 + delta を計算する。
 * - 3) 新しい個数が0未満ならErrorを投げて更新を中止する。
 * - 4) 問題なければquantityとupdatedAtを同時更新する。
 */
export async function incrementStock(id: string, delta: number): Promise<void> {
  if (!id.trim()) {
    throw new Error('更新対象IDが空です。');
  }
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('deltaは0以外の整数で指定してください。');
  }

  const stockRef = doc(db, STOCKS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(stockRef);
    if (!snapshot.exists()) {
      throw new Error('更新対象の在庫が存在しません。');
    }

    const data = snapshot.data();
    const currentQuantity = data.quantity;

    if (!Number.isInteger(currentQuantity) || currentQuantity < 0) {
      throw new Error('在庫データのquantityが不正です。');
    }

    const nextQuantity = currentQuantity + delta;
    if (nextQuantity < 0) {
      throw new Error('在庫数を0未満にはできません。');
    }

    transaction.update(stockRef, {
      quantity: nextQuantity,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * この関数の用途:
 * - 単一在庫を取得する。編集画面の初期表示で利用する。
 */
export async function getStockById(id: string): Promise<Stock | null> {
  if (!id.trim()) {
    throw new Error('取得対象IDが空です。');
  }

  const snapshot = await getDoc(doc(db, STOCKS_COLLECTION, id));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  const itemId = data.itemId ?? null;
  if (itemId !== null && typeof itemId !== 'string') {
    throw new Error('stocksドキュメントのitemIdが不正です。');
  }

  if (typeof data.itemNameSnapshot !== 'string' || data.itemNameSnapshot.trim() === '') {
    throw new Error('stocksドキュメントのitemNameSnapshotが不正です。');
  }

  if (!data.expiryDate) {
    throw new Error('stocksドキュメントのexpiryDateが不正です。');
  }

  if (!Number.isInteger(data.quantity) || data.quantity < 0) {
    throw new Error('stocksドキュメントのquantityが不正です。');
  }

  if (!data.createdAt || !data.updatedAt) {
    throw new Error('stocksドキュメントの作成日時または更新日時が不正です。');
  }

  return {
    id: snapshot.id,
    itemId,
    itemNameSnapshot: data.itemNameSnapshot,
    expiryDate: data.expiryDate as Timestamp,
    quantity: data.quantity,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

/**
 * この関数の用途:
 * - 指定したitemIdを参照している在庫件数を取得する。
 *
 * なぜこの設定が必要か:
 * - 品名マスタ削除時に「参照中の在庫があるか」をユーザーへ警告するため。
 *
 * Firestore概念の補足:
 * - `where`: 条件に一致するドキュメントだけを絞り込む。
 * - `query`: 絞り込み条件をまとめた取得命令を作る。
 */
export async function countStocksByItemId(itemId: string): Promise<number> {
  if (!itemId.trim()) {
    throw new Error('参照件数取得対象のitemIdが空です。');
  }

  const q = query(collection(db, STOCKS_COLLECTION), where('itemId', '==', itemId));
  const countSnapshot = await getCountFromServer(q);
  return countSnapshot.data().count;
}

