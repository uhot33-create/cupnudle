import Link from 'next/link';
import StockList from '@/components/stocks/StockList';

/**
 * このページの用途:
 * - ルートパス `/` で在庫一覧画面を表示する。
 *
 * なぜこの構成が必要か:
 * - App Routerのページはルーティング入口として薄く保ち、
 *   実際の状態管理やFirestore操作は子コンポーネントへ分離した方が保守しやすいため。
 *
 * どこを変更すればよいか:
 * - 画面のヘッダー文言やレイアウト余白を変更したい場合はこのファイルを編集する。
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4">
      {/* 画面タイトルと説明を表示して、ユーザーが今いる画面を明確にする。 */}
      <header className="mx-auto mb-4 w-full max-w-2xl">
        <h1 className="text-xl font-bold text-slate-900">在庫一覧</h1>
        <p className="mt-1 text-sm text-slate-600">有効期限が近い在庫を優先して管理できます。</p>

        {/* 操作用の導線ボタン。空データ状態でも次の行動が分かるように常時表示する。 */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/stocks/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
          >
            在庫を追加
          </Link>
          <Link
            href="/items"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            品名を管理
          </Link>
        </div>
      </header>

      {/* 在庫一覧の本体。Firestore読み込み、エラー、編集、削除、増減をこのコンポーネントで管理する。 */}
      <StockList />
    </main>
  );
}
