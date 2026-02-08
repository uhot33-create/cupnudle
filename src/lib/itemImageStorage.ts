/**
 * このファイルの役割:
 * - 品名画像を「Firestoreへ保存可能なData URL」に変換する処理を提供する。
 * - Firebase Storageを使わず、無料枠で運用しやすい構成にする。
 *
 * 関連画面:
 * - /items
 *
 * 主要関数:
 * - validateItemImageFile
 * - convertImageFileToDataUrl
 *
 * Firestore概念の補足:
 * - collection: 同種データの箱（items）
 * - doc: collection内の1件
 * - query: 条件付き取得命令
 * - 今回は画像本体をdocの文字列フィールドとして保存する（大きすぎる画像は不可）
 */

/**
 * 入力画像の最大サイズ（5MB）。
 * なぜ必要か:
 * - 極端に大きいファイルの読み込みでブラウザが重くなることを防ぐため。
 */
const MAX_INPUT_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Firestoreへ保存するData URLの目安上限（約700KB）。
 * なぜ必要か:
 * - Firestoreドキュメント上限（1MiB）を超えにくくするため。
 */
const MAX_OUTPUT_DATA_URL_BYTES = 700 * 1024;

/**
 * 画像の長辺上限。
 * なぜ必要か:
 * - サムネイル用途として十分な解像度を維持しつつ、容量を下げるため。
 */
const MAX_IMAGE_EDGE_PX = 320;

/**
 * JPEG圧縮品質。
 * なぜ必要か:
 * - 見た目と容量のバランスを取り、Firestore保存に収めるため。
 */
const JPEG_QUALITY = 0.8;

/**
 * この関数の用途:
 * - 画像ファイルの形式とサイズを検証する。
 */
export function validateItemImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  if (file.size > MAX_INPUT_IMAGE_BYTES) {
    throw new Error('画像サイズは5MB以下にしてください。');
  }
}

/**
 * この関数の用途:
 * - 画像のData URLからバイト数を概算する。
 *
 * なぜ必要か:
 * - Firestore保存前に容量超過を防ぐため。
 */
function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) {
    return dataUrl.length;
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  // Base64の概算式: 文字数 * 3 / 4
  return Math.floor((base64.length * 3) / 4);
}

/**
 * この関数の用途:
 * - Blob/FileをData URLへ変換する。
 */
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('画像の読み込みに失敗しました。'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    reader.readAsDataURL(file);
  });
}

/**
 * この関数の用途:
 * - Data URLをImage要素として読み込み、Canvasで再描画できる状態にする。
 */
function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像のデコードに失敗しました。'));
    image.src = dataUrl;
  });
}

/**
 * この関数の用途:
 * - 画像ファイルをData URLへ変換し、Firestoreに保存しやすいサイズへ圧縮する。
 *
 * 処理の流れ:
 * - 1) ファイル形式とサイズを検証する。
 * - 2) Data URLへ変換する。
 * - 3) Canvasで長辺320px以内に縮小する。
 * - 4) JPEGとして再エンコードする。
 * - 5) 容量上限を超える場合はエラーを返す。
 */
export async function convertImageFileToDataUrl(file: File): Promise<string> {
  validateItemImageFile(file);

  const originalDataUrl = await fileToDataUrl(file);
  const image = await loadImageElement(originalDataUrl);

  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('画像変換に必要なCanvasコンテキストを取得できません。');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const compressedDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  const estimatedBytes = estimateDataUrlBytes(compressedDataUrl);
  if (estimatedBytes > MAX_OUTPUT_DATA_URL_BYTES) {
    throw new Error('画像サイズが大きすぎます。別の画像を使用してください。');
  }

  return compressedDataUrl;
}
