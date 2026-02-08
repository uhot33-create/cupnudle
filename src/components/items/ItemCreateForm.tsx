'use client';

/**
 * このファイルの役割:
 * - 品名マスタ管理画面 `/items` の「追加フォーム」を担当する。
 * - name必須、画像（Data URL保存）任意を受け取り、親へ送信する。
 */

import { useState } from 'react';
import ItemImageInput from '@/components/items/ItemImageInput';

type ItemCreateFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: { name: string; imageDataUrl: string | null }) => Promise<void>;
};

export default function ItemCreateForm({ isSubmitting, errorMessage, onSubmit }: ItemCreateFormProps) {
  const [name, setName] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

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

    await onSubmit({
      name: trimmedName,
      imageDataUrl,
    });

    setName('');
    setImageDataUrl(null);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h2 className="text-base font-semibold text-slate-900">品名を追加</h2>

      <form className="mt-3 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-600">品名（必須）</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
            placeholder="例: カップヌードル シーフード"
            maxLength={100}
            required
            disabled={isSubmitting}
          />
        </label>

        <ItemImageInput
          disabled={isSubmitting}
          selectedImageDataUrl={imageDataUrl}
          existingImageUrl={null}
          onSelectImageDataUrl={(dataUrl) => setImageDataUrl(dataUrl)}
          onRemoveImage={() => setImageDataUrl(null)}
        />

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? '追加中...' : '追加する'}
        </button>
      </form>
    </section>
  );
}
