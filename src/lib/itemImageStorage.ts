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
import { getFirebaseStorage, getFirebaseStorageBucketName } from '@/lib/firebase';

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

function isStorageErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function toFriendlyUploadError(error: unknown): Error {
  if (isStorageErrorCode(error, 'storage/retry-limit-exceeded')) {
    return new Error(
      '画像アップロードがタイムアウトしました。ネットワーク接続と Firebase Storage 設定（bucket / ルール）を確認してください。',
    );
  }

  if (
    isStorageErrorCode(error, 'storage/bucket-not-found') ||
    isStorageErrorCode(error, 'storage/no-default-bucket')
  ) {
    return new Error(
      'Firebase Storage のバケット設定が不正です。.env.local の NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET を確認してください。',
    );
  }

  return error instanceof Error ? error : new Error('画像アップロードに失敗しました。');
}

function resolveFallbackBucketName(bucketName: string): string | null {
  if (bucketName.endsWith('.firebasestorage.app')) {
    return bucketName.replace(/\.firebasestorage\.app$/, '.appspot.com');
  }
  if (bucketName.endsWith('.appspot.com')) {
    return bucketName.replace(/\.appspot\.com$/, '.firebasestorage.app');
  }
  return null;
}

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

  const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const imagePath = `items/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName}`;
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, imagePath);

  try {
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
  } catch (firstError) {
    const shouldTryFallbackBucket =
      isStorageErrorCode(firstError, 'storage/retry-limit-exceeded') ||
      isStorageErrorCode(firstError, 'storage/bucket-not-found') ||
      isStorageErrorCode(firstError, 'storage/no-default-bucket');

    if (!shouldTryFallbackBucket) {
      throw toFriendlyUploadError(firstError);
    }

    const fallbackBucketName = resolveFallbackBucketName(getFirebaseStorageBucketName());
    if (!fallbackBucketName) {
      throw toFriendlyUploadError(firstError);
    }

    try {
      const fallbackStorage = getFirebaseStorage(fallbackBucketName);
      const fallbackStorageRef = ref(fallbackStorage, imagePath);
      await uploadBytes(fallbackStorageRef, file, {
        contentType: file.type,
      });
      const imageUrl = await getDownloadURL(fallbackStorageRef);
      return {
        imageUrl,
        imagePath,
      };
    } catch {
      throw toFriendlyUploadError(firstError);
    }
  }

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
