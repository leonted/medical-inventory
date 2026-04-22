# 在庫管理アプリ セットアップ手順
## 複数PC・スマホ対応版（Firebase Firestore）

---

## 全体の流れ（所要時間：約30分）

```
① Firebaseプロジェクト作成（無料）
② Viteプロジェクト作成
③ コードを配置
④ Firebase設定を貼り付け
⑤ Vercelにデプロイ → URLが発行される
⑥ PC・スマホどこからでもアクセス可能
```

---

## ① Firebase プロジェクト作成

1. https://console.firebase.google.com/ にアクセス（Googleアカウントでログイン）
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `med-inventory`）→「続行」
4. Google アナリティクスは「無効」で OK → 「プロジェクトを作成」

### Firestore データベースを有効化

1. 左メニュー「構築」→「Firestore Database」
2. 「データベースの作成」をクリック
3. ロケーション: **asia-northeast1（東京）** を選択
4. セキュリティルール: **テストモードで開始**（あとで変更）→「有効にする」

### Webアプリを登録して設定値を取得

1. プロジェクトのトップ画面 → 歯車アイコン →「プロジェクトの設定」
2. 下にスクロール →「アプリを追加」→ `</>` （Web）をクリック
3. アプリのニックネーム入力（例: `web`）→「アプリを登録」
4. 表示される `firebaseConfig` をコピーしておく

```js
// コピーする内容の例（値は各自異なる）
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "med-inventory-xxxxx.firebaseapp.com",
  projectId: "med-inventory-xxxxx",
  storageBucket: "med-inventory-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

### Firestoreのセキュリティルールを設定

Firestore → 「ルール」タブ → 以下に書き換えて「公開」:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // 全ドキュメントの読み書きを許可（院内限定URLで運用する場合）
      allow read, write: if true;
    }
  }
}
```

> ⚠️ より安全にしたい場合は Firebaseの認証（Auth）と組み合わせてルールを絞ります。
> 患者情報を扱わない業務用ツールの場合は上記で問題ありません。

---

## ② Vite プロジェクト作成

ターミナル（Mac: Terminal / Win: PowerShell）で実行:

```bash
npm create vite@latest med-inventory -- --template react
cd med-inventory
npm install
npm install firebase
```

---

## ③ コードを配置

- ダウンロードした `inventory-app-v4.jsx` を `src/App.jsx` に**上書き**する

---

## ④ Firebase 設定を貼り付け

`src/App.jsx` の先頭にある `FIREBASE_CONFIG` オブジェクトを、
①でコピーした値に書き換える:

```js
// 変更前
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  ...
};

// 変更後（自分の値に書き換え）
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "med-inventory-xxxxx.firebaseapp.com",
  projectId: "med-inventory-xxxxx",
  ...
};
```

---

## ⑤ ローカルで動作確認

```bash
npm run dev
```

ブラウザで http://localhost:5173 が開けば成功。
初回ログイン後、Firestoreに自動でデモデータが投入されます。

---

## ⑥ Vercel にデプロイ（URL発行）

### GitHubにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのID/med-inventory.git
git push -u origin main
```

### Vercelでデプロイ

1. https://vercel.com にアクセス → GitHubでログイン
2. 「New Project」→ `med-inventory` リポジトリを選択
3. Framework: `Vite` を選択 → 「Deploy」
4. 完了後 `https://med-inventory-xxx.vercel.app` のURLが発行される

---

## ⑦ スマホ・複数PCからアクセス

発行されたURLをブックマーク or QRコードにしてスタッフに共有するだけです。

- データはFirestoreに保存されるため、どの端末から操作しても即時同期されます
- オフライン時は操作できませんが、再接続時に自動で最新データを取得します

---

## コスト

| サービス | 料金 |
|---|---|
| Firebase Firestore（Sparkプラン） | **無料**（1日5万件読取・2万件書込まで） |
| Vercel（Hobbyプラン） | **無料** |

在庫管理の用途では、無料枠で十分に収まります。

---

## トラブルシューティング

**「FirebaseError: Missing or insufficient permissions」が出る**
→ Firestoreのセキュリティルールが `allow read, write: if true;` になっているか確認

**初回ロードが遅い**
→ Firestoreとの初回接続に数秒かかります。2回目以降はキャッシュが効きます

**デモデータが重複する**
→ Firestoreコンソールでコレクションを削除して再起動すると初期化されます
