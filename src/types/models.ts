/**
 * このファイルの用途:
 * - Firestoreのドキュメント構造をTypeScript型として固定し、画面とデータの不整合を防ぐ。
 * - どの画面でどの型を使うかをコメントで明示し、変更時の影響範囲を追いやすくする。
 *
 * どこを変更すればよいか:
 * - フィールドを追加する場合は、以下の3点を同時に変更する。
 *   1) MasterDoc / StockDoc などのFirestore保存用型
 *   2) Create...Input / Update...Input などの入力型
 *   3) 画面表示用のViewModel型（MasterListItemView / StockListItemView）
 * - 日付表現の方針を変更する場合は `ExpireDateYmd` と `StockDoc.expiresAt` のコメントを最初に確認する。
 *
 * TODO:
 * - 認証を追加する場合は、全ドキュメントに ownerUid を追加し、クエリ条件にも ownerUid を追加する。
 * - 監査ログを追加する場合は、更新者情報（updatedBy）を型へ追加する。
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * この型の用途:
 * - 文字列として保持するドキュメントIDを統一して扱うための型エイリアス。
 *
 * 画面との対応:
 * - 在庫一覧画面 `/` で在庫編集遷移先 `/stock/[id]/edit` の `id` に利用する。
 * - 品名マスタ一覧画面 `/master` で編集遷移先 `/master/[id]/edit` の `id` に利用する。
 *
 * なぜこの型を使うのか:
 * - ドキュメントIDはFirestore上で文字列のため、型を明示すると可読性が上がる。
 *
 * どこを変更すればよいか:
 * - ID形式をUUIDなどに固定したくなった場合は、バリデーション層で制約を追加する。
 */
export type DocId = string;

/**
 * この型の用途:
 * - 有効期限を「年月日」で入力・表示するための文字列表現。
 * - 例: `2026-02-07`
 *
 * 画面との対応:
 * - 在庫作成画面 `/stock/new` の期限入力欄に利用する。
 * - 在庫編集画面 `/stock/[id]/edit` の期限入力欄に利用する。
 *
 * なぜこの型を使うのか:
 * - HTMLの `input[type="date"]` は `YYYY-MM-DD` 文字列と相性が良いため。
 *
 * どこを変更すればよいか:
 * - 入力形式を `YYYY/MM/DD` に変える場合は、フォーム変換処理と合わせてこのコメントを更新する。
 *
 * TODO:
 * - ランタイムで `YYYY-MM-DD` 形式を厳密検証するユーティリティ関数を追加する。
 */
export type ExpireDateYmd = string;

/**
 * この型の用途:
 * - 品名マスタ（mastersコレクション）のFirestore保存形式を定義する。
 *
 * 画面との対応:
 * - 品名マスタ一覧画面 `/master` の表示元データ。
 * - 品名マスタ作成画面 `/master/new` と編集画面 `/master/[id]/edit` の保存先データ。
 *
 * なぜこの型にするのか:
 * - 要件で必須の `name` と `createdAt` を必ず保持する。
 * - `imageUrl` は要件どおり任意項目にする。
 *
 * どこを変更すればよいか:
 * - 品名にカテゴリを追加する場合は `category` をここへ追加し、入力型にも同じ項目を追加する。
 *
 * TODO:
 * - 更新日時の表示要件が確定したら `updatedAt` を追加する。
 */
export type MasterDoc = {
  /** 品名。必須。画面では1行表示を前提にする。 */
  name: string;
  /** 画像URL。任意。未設定なら null を保存する。 */
  imageUrl: string | null;
  /** 作成日時。Firestoreのサーバー時刻を保存する。 */
  createdAt: Timestamp;
};

/**
 * この型の用途:
 * - 在庫（stocksコレクション）のFirestore保存形式を定義する。
 *
 * 画面との対応:
 * - 在庫一覧画面 `/` の表示元データ。
 * - 在庫作成画面 `/stock/new` と編集画面 `/stock/[id]/edit` の保存先データ。
 *
 * なぜこの型にするのか:
 * - 参照整合性と表示安定性の両立のため、`masterId` と `nameSnapshot` を併用する。
 * - `masterId` は最新マスタ参照用。`nameSnapshot` は在庫登録時の表示名維持用。
 * - `expiresAt` は Timestamp にしてクエリ・並び替え・日付比較を一貫させる。
 *
 * 難しい箇所の処理の流れ:
 * - 在庫作成時:
 *   1) ユーザーが選んだ `masterId` でマスタを取得する。
 *   2) 取得した `name` を `nameSnapshot` にコピーする。
 *   3) 期限入力の `YYYY-MM-DD` をローカル日付の00:00として `Timestamp` 化する。
 *   4) `stocks` に保存する。
 * - 在庫一覧表示時:
 *   1) `expiresAt` 昇順クエリで取得する。
 *   2) 表示名は `nameSnapshot` を使う。
 *   3) 期限30日以内判定は `expiresAt` と今日の日付差で判定する。
 *
 * どこを変更すればよいか:
 * - マスタ変更を在庫へ常時反映したい場合は `nameSnapshot` を廃止し、表示時に `masterId` 参照へ切り替える。
 *
 * TODO:
 * - 将来、画像表示を安定させる場合は `imageUrlSnapshot` も追加する。
 */
export type StockDoc = {
  /** 参照先マスタID。必須。 */
  masterId: DocId;
  /** 登録時点の品名コピー。必須。 */
  nameSnapshot: string;
  /** 有効期限。日付比較と並び替えのため Timestamp で保存する。 */
  expiresAt: Timestamp;
  /** 個数。整数。最小1を想定する。 */
  quantity: number;
  /** 作成日時。 */
  createdAt: Timestamp;
  /** 更新日時。 */
  updatedAt: Timestamp;
};

/**
 * この型の用途:
 * - 品名マスタ作成フォームの入力値を表す。
 *
 * 画面との対応:
 * - 品名マスタ作成画面 `/master/new`。
 *
 * なぜこの型にするのか:
 * - Firestore保存型と分離し、フォーム段階ではTimestampを持たせないため。
 *
 * どこを変更すればよいか:
 * - 画像URL必須に変更する場合は `imageUrl` を `string` に変更し、バリデーションも必須化する。
 */
export type CreateMasterInput = {
  name: string;
  imageUrl: string | null;
};

/**
 * この型の用途:
 * - 品名マスタ更新フォームの入力値を表す。
 *
 * 画面との対応:
 * - 品名マスタ編集画面 `/master/[id]/edit`。
 *
 * なぜこの型にするのか:
 * - 更新可能な項目のみを明示し、更新不可項目の誤送信を防ぐため。
 *
 * どこを変更すればよいか:
 * - 更新項目を増やす場合はこの型と更新処理の `updateDoc` 引数を同時に変更する。
 */
export type UpdateMasterInput = {
  name: string;
  imageUrl: string | null;
};

/**
 * この型の用途:
 * - 在庫作成フォームの入力値を表す。
 *
 * 画面との対応:
 * - 在庫作成画面 `/stock/new`。
 *
 * なぜこの型にするのか:
 * - フォームでは日付を `YYYY-MM-DD` 文字列で扱い、保存直前にTimestampへ変換するため。
 *
 * どこを変更すればよいか:
 * - 期限未入力を許可する場合は `expiresOn` を `ExpireDateYmd | null` に変更し、保存処理を分岐する。
 */
export type CreateStockInput = {
  masterId: DocId;
  expiresOn: ExpireDateYmd;
  quantity: number;
};

/**
 * この型の用途:
 * - 在庫編集フォームの入力値を表す。
 *
 * 画面との対応:
 * - 在庫編集画面 `/stock/[id]/edit`。
 *
 * なぜこの型にするのか:
 * - 編集可能項目だけを定義して、誤って作成日時などを書き換えないようにするため。
 *
 * どこを変更すればよいか:
 * - 品名変更不可にする場合は `masterId` を削除し、画面も読み取り専用表示へ変更する。
 */
export type UpdateStockInput = {
  masterId: DocId;
  expiresOn: ExpireDateYmd;
  quantity: number;
};

/**
 * この型の用途:
 * - 画面表示用の「ID付き品名マスタ」を定義する。
 *
 * 画面との対応:
 * - 品名マスタ一覧画面 `/master`。
 * - 在庫作成・編集画面の品名選択プルダウン。
 *
 * なぜこの型にするのか:
 * - Firestoreドキュメント本体にIDは含まれないため、画面利用時はID付き構造が必要になる。
 *
 * どこを変更すればよいか:
 * - 表示用に追加項目が必要になった場合はこの型にフィールドを足し、変換処理を更新する。
 */
export type MasterListItemView = {
  id: DocId;
  name: string;
  imageUrl: string | null;
  createdAt: Timestamp;
};

/**
 * この型の用途:
 * - 画面表示用の「ID付き在庫」を定義する。
 *
 * 画面との対応:
 * - 在庫一覧画面 `/`。
 * - 在庫編集画面 `/stock/[id]/edit` の初期表示。
 *
 * なぜこの型にするのか:
 * - 在庫一覧では編集リンク生成にIDが必須で、期限強調判定にも日付情報が必要なため。
 *
 * どこを変更すればよいか:
 * - 将来、強調色種別をサーバー側で持つ場合は `highlightLevel` などを追加する。
 */
export type StockListItemView = {
  id: DocId;
  masterId: DocId;
  nameSnapshot: string;
  expiresAt: Timestamp;
  quantity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
