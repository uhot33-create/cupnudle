'use client';

/**
 * このファイルの役割:
 * - 品名画像入力（ファイル選択 + クリップボード貼り付け）を共通化する。
 *
 * 関連画面:
 * - /items
 *
 * 主要関数:
 * - ItemImageInput
 */

import { useEffect, useMemo } from 'react';
import { validateItemImageFile } from '@/lib/itemImageStorage';

/**
 * この型の用途:
 * - 品名画像入力コンポーネントの受け渡しを固定する。
 */
type ItemImageInputProps = {
  disabled: boolean;
  selectedImageFile: File | null;
  existingImageUrl: string | null;
  onSelectImageFile: (file: File) => void;
  onRemoveImage: () => void;
};

/**
 * このコンポーネントの用途:
 * - 画像アップロードとクリップボード貼り付けを1つのUIで提供する。
 *
 * なぜこの構成にしたか:
 * - 追加フォームと編集フォームで同じ画像入力仕様を再利用し、実装差分をなくすため。
 */
export default function ItemImageInput({
  disabled,
  selectedImageFile,
  existingImageUrl,
  onSelectImageFile,
  onRemoveImage,
}: ItemImageInputProps) {
  /**
   * 選択中ファイルのプレビューURL。
   * なぜこの実装か:
   * - stateを使わず計算値として扱うことで、effect内のsetState禁止ルールに抵触しないようにするため。
   */
  const selectedPreviewUrl = useMemo(() => {
    if (!selectedImageFile) {
      return null;
    }
    return URL.createObjectURL(selectedImageFile);
  }, [selectedImageFile]);

  /**
   * この副作用の用途:
   * - useMemoで作成したObject URLを不要時に解放する。
   */
  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  /**
   * この関数の用途:
   * - ファイル選択イベントから画像を受け取り、検証して親へ渡す。
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      validateItemImageFile(file);
      onSelectImageFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : '画像ファイルの検証に失敗しました。';
      window.alert(message);
      event.target.value = '';
    }
  };

  /**
   * この関数の用途:
   * - クリップボード貼り付けから画像を取り出して親へ渡す。
   */
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (const item of Array.from(items)) {
      if (!item.type.startsWith('image/')) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        continue;
      }

      event.preventDefault();

      try {
        validateItemImageFile(file);
        onSelectImageFile(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : '貼り付け画像の検証に失敗しました。';
        window.alert(message);
      }
      return;
    }
  };

  const previewUrl = selectedPreviewUrl ?? existingImageUrl;

  return (
    <section className="space-y-2">
      <p className="text-xs text-slate-600">画像（アップロード or クリップボード貼り付け）</p>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"
      />

      <div
        onPaste={handlePaste}
        className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600"
      >
        ここで Ctrl + V すると画像を貼り付けできます。
      </div>

      {previewUrl && (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="品名画像のプレビュー"
            className="h-24 w-24 rounded-md object-cover"
          />
          <button
            type="button"
            onClick={onRemoveImage}
            disabled={disabled}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 disabled:opacity-50"
          >
            画像を削除
          </button>
        </div>
      )}
    </section>
  );
}
