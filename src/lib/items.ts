/**
 * このファイルの用途:
 * - 品名マスタ（itemsコレクション）へのCRUD操作を画面コードから分離する。
 * - 画面はこの関数群を呼ぶだけにし、Firestore詳細を知らなくてよい構造にする。
 *
 * なぜこの設定が必要か:
 * - 画面コンポーネントにDB処理を直接書くと再利用できず、修正漏れが発生しやすいため。
 *
 * どこを変更すればよいか:
 * - コレクション名を変更する場合は `ITEMS_COLLECTION` を変更する。
 * - 追加フィールドが増える場合は `ItemDoc` と入出力型を同時に変更する。
 *
 * TODO:
 * - 認証導入時は ownerUid を追加し、全クエリに where 条件を加える。
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

/**
 * この定数の用途:
 * - Firestoreの品名マスタコレクション名を1か所で管理する。
 *
 * なぜこの設定が必要か:
 * - 文字列の直書きを減らし、リネーム時の修正漏れを防ぐため。
 */
const ITEMS_COLLECTION = 'items';

/**
 * この型の用途:
 * - itemsコレクションのドキュメント形式を定義する。
 *
 * どこを変更すればよいか:
 * - フィールド追加時は list変換処理 `toItem` も同時に変更する。
 */
export type ItemDoc = {
  name: string;
  imageUrl: string | null;
  createdAt: Timestamp;
};

/**
 * この型の用途:
 * - 画面表示で使うID付きの品名マスタ型。
 */
export type Item = ItemDoc & {
  id: string;
};

/**
 * この型の用途:
 * - 品名更新で受け付ける変更可能フィールドだけを定義する。
 */
export type UpdateItemInput = {
  name?: string;
  imageUrl?: string | null;
};

/**
 * この関数の用途:
 * - Firestoreの生ドキュメントをアプリ内型へ安全に変換する。
 *
 * なぜこの設定が必要か:
 * - Firestoreは実行時に型保証がないため、最低限のフィールド検証を行う必要がある。
 */
function toItem(snapshot: QueryDocumentSnapshot<DocumentData>): Item {
  const data = snapshot.data();

  if (typeof data.name !== 'string' || data.name.trim() === '') {
    throw new Error('itemsドキュメントのnameが不正です。');
  }

  const imageUrl = data.imageUrl ?? null;
  if (imageUrl !== null && typeof imageUrl !== 'string') {
    throw new Error('itemsドキュメントのimageUrlが不正です。');
  }

  if (!data.createdAt) {
    throw new Error('itemsドキュメントのcreatedAtが不正です。');
  }

  return {
    id: snapshot.id,
    name: data.name,
    imageUrl,
    createdAt: data.createdAt as Timestamp,
  };
}

/**
 * この関数の用途:
 * - 品名マスタを新規作成する。
 *
 * なぜこの設定が必要か:
 * - 作成時に入力検証とDB保存をまとめて実行し、呼び出し側の処理を単純化するため。
 *
 * どこを変更すればよいか:
 * - 品名の文字数制限を変える場合は、以下のバリデーション条件を変更する。
 */
export async function addItem(name: string, imageUrl?: string): Promise<string> {
  const db = getDb();
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error('品名は必須です。');
  }
  if (trimmedName.length > 100) {
    throw new Error('品名は100文字以内で入力してください。');
  }

  const normalizedImageUrl = imageUrl?.trim() ? imageUrl.trim() : null;

  const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
    name: trimmedName,
    imageUrl: normalizedImageUrl,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * この関数の用途:
 * - 品名マスタ一覧を名前昇順で取得する。
 *
 * なぜこの設定が必要か:
 * - 一覧表示を安定させ、ユーザーが目的の品名を探しやすくするため。
 */
export async function listItems(): Promise<Item[]> {
  const db = getDb();
  const q = query(collection(db, ITEMS_COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toItem);
}

/**
 * この関数の用途:
 * - 品名マスタを更新する。
 *
 * なぜこの設定が必要か:
 * - フィールド単位で更新できるようにし、不要な上書きを防ぐため。
 *
 * 処理の流れ:
 * - 1) IDと更新内容を検証する。
 * - 2) 更新可能フィールドだけをペイロードへ詰める。
 * - 3) 空更新を拒否する。
 * - 4) updateDocを実行する。
 */
export async function updateItem(id: string, updates: UpdateItemInput): Promise<void> {
  const db = getDb();
  if (!id.trim()) {
    throw new Error('更新対象IDが空です。');
  }

  const payload: Partial<Pick<ItemDoc, 'name' | 'imageUrl'>> = {};

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('品名は空文字にできません。');
    }
    if (trimmedName.length > 100) {
      throw new Error('品名は100文字以内で入力してください。');
    }
    payload.name = trimmedName;
  }

  if (updates.imageUrl !== undefined) {
    const trimmedImageUrl = updates.imageUrl?.trim() ?? null;
    payload.imageUrl = trimmedImageUrl && trimmedImageUrl.length > 0 ? trimmedImageUrl : null;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('更新対象フィールドがありません。');
  }

  await updateDoc(doc(db, ITEMS_COLLECTION, id), payload);
}

/**
 * この関数の用途:
 * - 品名マスタを削除する。
 *
 * なぜこの設定が必要か:
 * - Firestore削除処理を関数化し、画面側の責務を減らすため。
 */
export async function deleteItem(id: string): Promise<void> {
  const db = getDb();
  if (!id.trim()) {
    throw new Error('削除対象IDが空です。');
  }

  await deleteDoc(doc(db, ITEMS_COLLECTION, id));
}

/**
 * この関数の用途:
 * - 在庫登録時に使うため、単一の品名マスタを取得する。
 *
 * なぜこの設定が必要か:
 * - `stocks.ts` で itemId 指定時に品名スナップショットを作るため。
 */
export async function getItemById(id: string): Promise<Item | null> {
  const db = getDb();
  if (!id.trim()) {
    throw new Error('取得対象IDが空です。');
  }

  const snapshot = await getDoc(doc(db, ITEMS_COLLECTION, id));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    throw new Error('itemsドキュメントのnameが不正です。');
  }

  const imageUrl = data.imageUrl ?? null;
  if (imageUrl !== null && typeof imageUrl !== 'string') {
    throw new Error('itemsドキュメントのimageUrlが不正です。');
  }

  if (!data.createdAt) {
    throw new Error('itemsドキュメントのcreatedAtが不正です。');
  }

  return {
    id: snapshot.id,
    name: data.name,
    imageUrl,
    createdAt: data.createdAt as Timestamp,
  };
}
