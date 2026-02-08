/**
 * このファイルの役割:
 * - 品名画像を Firebase Storage へ保存・削除する処理を提供する。
 *
 * 関連画面:
 * - /items
 *
 * 主要関数:
 * - validateItemImageFile
 * - uploadItemImageFile
 * - deleteItemImageFile
 *
 * Firestore概念の補足:
 * - 画像本体はFirestoreではなくStorageへ保存する。
 * - Firestoreのitemsには参照情報（imageUrl / imagePath）だけ保持する。
 */

import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';

/**
 * 画像サイズ上限（5MB）。
 * なぜ必要か:
 * - 極端に大きい画像を防ぎ、通信失敗や表示遅延を減らすため。
 */
const MAX_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * この型の用途:
 * - Storageへ保存した画像の参照情報をまとめる。
 */
export type StoredItemImage = {
  imageUrl: string;
  imagePath: string;
};

/**
 * この関数の用途:
 * - アップロード前にファイル形式とサイズを検証する。
 */
export function validateItemImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  if (file.size > MAX_ITEM_IMAGE_BYTES) {
    throw new Error('画像サイズは5MB以下にしてください。');
  }
}

/**
 * この関数の用途:
 * - 画像ファイルをStorageへ保存し、ダウンロードURLを返す。
 *
 * なぜこの実装にしたか:
 * - URL手入力ではなく、画像本体を保存して管理できるようにするため。
 */
export async function uploadItemImageFile(file: File): Promise<StoredItemImage> {
  validateItemImageFile(file);

  const storage = getFirebaseStorage();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const imagePath = `items/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName}`;

  const storageRef = ref(storage, imagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const imageUrl = await getDownloadURL(storageRef);
  return {
    imageUrl,
    imagePath,
  };
}

/**
 * この関数の用途:
 * - 既存画像をStorageから削除する。
 */
export async function deleteItemImageFile(imagePath: string): Promise<void> {
  if (!imagePath.trim()) {
    return;
  }

  const storage = getFirebaseStorage();
  const storageRef = ref(storage, imagePath);
  await deleteObject(storageRef);
}
