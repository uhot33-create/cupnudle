'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の「編集モーダル」を担当する。
 */

import { useState } from 'react';
import ItemImageInput from '@/components/items/ItemImageInput';
import type { Item } from '@/lib/items';

type ItemEditModalProps = {
  item: Item;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: {
    id: string;
    name: string;
    imageDataUrl: string | null;
    keepExistingImage: boolean;
  }) => Promise<void>;
};

export default function ItemEditModal({ item, isSaving, errorMessage, onClose, onSave }: ItemEditModalProps) {
  const [name, setName] = useState(item.name);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(Boolean(item.imageUrl));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      window.alert('品名は必須です。');
      return;
    }
    if (trimmedName.length > 100) {
      window.alert('品名は100文字以内で入力してください。');
      return;
    }

    await onSave({
      id: item.id,
      name: trimmedName,
      imageDataUrl,
      keepExistingImage,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">品名を編集</h3>

        <form className="mt-3 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">品名（必須）</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
              maxLength={100}
              required
              disabled={isSaving}
            />
          </label>

          <ItemImageInput
            disabled={isSaving}
            selectedImageDataUrl={imageDataUrl}
            existingImageUrl={keepExistingImage ? item.imageUrl : null}
            onSelectImageDataUrl={(dataUrl) => {
              setImageDataUrl(dataUrl);
              setKeepExistingImage(false);
            }}
            onRemoveImage={() => {
              setImageDataUrl(null);
              setKeepExistingImage(false);
            }}
          />

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
              onClick={onClose}
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
