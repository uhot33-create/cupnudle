/**
 * このファイルの用途:
 * - Firebase SDK を1か所で初期化し、全画面で同じ接続設定を使うための共通モジュール。
 * - Firestore参照 `db` を export して、CRUD実装側で毎回初期化コードを書かないようにする。
 *
 * なぜこの設定が必要か:
 * - 初期化処理を複数ファイルで重複させると、保守時に設定漏れが発生する。
 * - 環境変数から設定を読むことで、公開リポジトリに秘密情報を直接書かずに運用できる。
 *
 * どこを変更すればよいか:
 * - Firebaseプロジェクトを切り替える場合は `.env.local` の値を変更する。
 * - Firestore以外の機能（Auth, Storage）を使う場合は、このファイルでSDK importとexportを追加する。
 *
 * TODO:
 * - 本番運用で複数環境（dev/stg/prod）を分ける場合は、envファイルを環境ごとに分離する。
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase設定値の型。
 * なぜ必要か:
 * - 必須キーを型で固定し、キー名の打ち間違いをコンパイル時に検出するため。
 * どこを変更すればよいか:
 * - Firebase SDK側で新しい必須キーが増えた場合は、この型へ追加する。
 */
type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/**
 * 環境変数の存在を実行時に確認する関数。
 * なぜ必要か:
 * - 値が未設定のまま起動した場合に、どのキーが不足しているかを明確に表示するため。
 * どこを変更すればよいか:
 * - 必須キーを追加したときは `requiredKeys` の配列へ同じキーを追加する。
 *
 * 処理の流れ:
 * - 1) 必須キー一覧を定義する。
 * - 2) 未設定のキーだけを抽出する。
 * - 3) 未設定が1件でもあれば、キー名を含めてエラーを投げる。
 * - 4) すべて設定済みなら FirebaseConfig 形式で返す。
 */
function getFirebaseConfigFromEnv(): FirebaseConfig {
  // Next.jsのクライアントビルドでは、NEXT_PUBLIC_* は「静的参照」のときだけ値が埋め込まれる。
  // そのため process.env[key] のような動的参照を使うと、値が取得できず未設定扱いになる。
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missingKeys = [
    !apiKey ? 'NEXT_PUBLIC_FIREBASE_API_KEY' : null,
    !authDomain ? 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' : null,
    !projectId ? 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' : null,
    !storageBucket ? 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' : null,
    !messagingSenderId ? 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID' : null,
    !appId ? 'NEXT_PUBLIC_FIREBASE_APP_ID' : null,
  ].filter((value): value is string => value !== null);

  if (missingKeys.length > 0) {
    throw new Error(
      `Firebaseの環境変数が未設定です。未設定キー: ${missingKeys.join(', ')}`,
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

/**
 * Firebase App を単一インスタンスで取得する処理。
 * なぜ必要か:
 * - Next.jsの開発時ホットリロードで初期化が複数回走るとエラーになるため、既存Appがあれば再利用する。
 * どこを変更すればよいか:
 * - 複数Firebaseプロジェクトを同時利用する場合は、名前付きApp初期化へ変更する。
 */
let appInstance: ReturnType<typeof initializeApp> | null = null;
let firestoreInstance: Firestore | null = null;

/**
 * Firebase App を遅延初期化で取得する処理。
 * なぜ必要か:
 * - importされた瞬間ではなく、実際に利用される時点で初期化することで、不要な早期エラーを防ぐため。
 */
export function getFirebaseApp() {
  if (appInstance) {
    return appInstance;
  }

  const firebaseConfig = getFirebaseConfigFromEnv();
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

/**
 * Firestore参照。
 * なぜ必要か:
 * - 画面・API層で `import { db } from '@/lib/firebase'` するだけで同一DB接続を使えるため。
 * どこを変更すればよいか:
 * - Emulator接続に切り替える場合は、ここに `connectFirestoreEmulator` を追加する。
 */
/**
 * Firestore参照を遅延初期化で取得する処理。
 * なぜ必要か:
 * - Firebase App初期化と同様に、利用時初期化で安全に動かすため。
 */
export function getDb() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  firestoreInstance = getFirestore(getFirebaseApp());
  return firestoreInstance;
}
