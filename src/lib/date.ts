/**
 * このファイルの用途:
 * - HTMLの日付入力値（YYYY-MM-DD）とFirestore保存値（Timestamp）を相互変換する。
 * - 日付の入力チェックを共通化し、画面ごとの実装差分でバグが出ることを防ぐ。
 *
 * なぜこの設定が必要か:
 * - `input[type="date"]` は文字列を返す一方で、Firestoreは日付比較をTimestampで行うため、
 *   変換処理を分離しないと一覧ソートや期限判定が崩れる。
 *
 * どこを変更すればよいか:
 * - タイムゾーンをUTC基準に変更したい場合は、`dateInputToTimestamp` の生成ロジックを変更する。
 * - 入力フォーマットを変更したい場合は、`assertValidDateInput` の正規表現を変更する。
 *
 * TODO:
 * - タイムゾーン固定（例: Asia/Tokyo）を厳密に行う要件が確定したら日付計算を専用化する。
 */

import { Timestamp } from 'firebase/firestore';

/**
 * この型の用途:
 * - HTML date input の値を型として明示する。
 *
 * なぜこの設定が必要か:
 * - 文字列の中でも日付入力専用の値であることをコード上で区別できる。
 *
 * どこを変更すればよいか:
 * - 入力コンポーネントをISO日時（YYYY-MM-DDTHH:mm）へ変更する場合は型名とコメントを更新する。
 */
export type DateInputValue = string;

/**
 * この関数の用途:
 * - `YYYY-MM-DD` の形式かどうかを検証し、不正な値を早期に弾く。
 *
 * なぜこの設定が必要か:
 * - 無効な日付がFirestoreに保存されると、一覧ソート・期限計算が壊れるため。
 *
 * どこを変更すればよいか:
 * - 年月日の入力ルールを変える場合は、正規表現とエラーメッセージを変更する。
 *
 * 処理の流れ:
 * - 1) 文字列形式（YYYY-MM-DD）を正規表現で確認する。
 * - 2) Dateオブジェクトへ変換し、実在しない日付を除外する。
 * - 3) 不正ならErrorを投げ、正しい値だけ後続処理へ渡す。
 */
export function assertValidDateInput(dateInput: DateInputValue): void {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateInput)) {
    throw new Error('日付は YYYY-MM-DD 形式で入力してください。');
  }

  const [yearText, monthText, dayText] = dateInput.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const candidate = new Date(year, month - 1, day);
  const isSameDate =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!isSameDate) {
    throw new Error('存在しない日付です。正しい日付を入力してください。');
  }
}

/**
 * この関数の用途:
 * - HTML date input（YYYY-MM-DD）をFirestore Timestampへ変換する。
 *
 * なぜこの設定が必要か:
 * - Firestoreの並び替え・比較はTimestampが安定しているため。
 *
 * どこを変更すればよいか:
 * - 日付の基準時刻を00:00以外にしたい場合は、Date生成時の時分秒を変更する。
 */
export function dateInputToTimestamp(dateInput: DateInputValue): Timestamp {
  assertValidDateInput(dateInput);

  const [yearText, monthText, dayText] = dateInput.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  // ローカルタイムの00:00:00で固定することで、日付単位の運用を統一する。
  const localMidnight = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Timestamp.fromDate(localMidnight);
}

/**
 * この関数の用途:
 * - Firestore TimestampをHTML date inputで扱える`YYYY-MM-DD`へ変換する。
 *
 * なぜこの設定が必要か:
 * - 編集画面で既存データをフォーム初期値に入れるときに必要になる。
 *
 * どこを変更すればよいか:
 * - 表示形式を `YYYY/MM/DD` にしたい場合は戻り値の生成部分を変更する。
 */
export function timestampToDateInput(timestamp: Timestamp): DateInputValue {
  const date = timestamp.toDate();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
