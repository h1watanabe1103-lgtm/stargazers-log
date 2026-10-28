# 社員スキル一覧アプリ

Reactのコンポーネント分割と検索機能を学習・応用して作成した、社内向けの社員スキル検索アプリケーションです。

## 使用技術
- **TypeScript**
- **React** (useState フック)
- **Vite** (開発ビルドツール)
- **Git / GitHub**

##主な機能
- **社員一覧表示**: 10名分の社員データ（氏名・所属・スキル・稼働ステータス）をテーブル形式で一覧表示します。
- **キーワード検索機能**: 検索バーに入力したキーワード（氏名、所属、スキル名）に一致する社員をリアルタイムで絞り込みます。
- **コンポーネントのモジュール化**: 画面のパーツごとにコンポーネントを独立したファイルに分割し、メンテナンス性と再利用性を高めています。

## フォルダ構成
```text
src/
 ┣ components/
 ┃  ┣ ProductCategoryRow.tsx  # （※商品一覧の流用パーツ）
 ┃  ┣ ProductRow.tsx          # 社員1行分の表示パーツ
 ┃  ┣ ProductTable.tsx        # テーブル全体の表示パーツ
 ┃  ┗ SearchBar.tsx           # 検索バーのパーツ
 ┣ types/
 ┃  ┗ Employee.ts             # 社員データの共通interface
 ┣ App.tsx                    # メインの親コンポーネント（社員データを管理）
 ┣ main.tsx
 ┗ index.css


## 動作方法（ローカル環境での起動手順）

 このリポジトリをクローン後、以下のコマンドを実行してローカルサーバーを起動してください。

 # 1. リポジトリのクローン
git clone <あなたのリポジトリのURL>

# 2. フォルダへ移動
cd <プロジェクトのフォルダ名>

# 3. 必要なパッケージのインストール
npm install

# 4. 開発用サーバーの起動
npm run dev

# TypeScriptの型チェック
npm run typecheck

# フロントエンド単体テスト
npm test

## 自動テスト（Vitest + React Testing Library）
- `npm test` は既存のAPI・入力検証テストに加えて、Reactコンポーネントのテストも実行します。
- コンポーネントテストは `src/components/*.test.tsx` に配置しています。
- 一覧表示、検索入力・検索確定、検索結果0件、並び替え、必須入力チェック、保存時の入力値整形を確認します。
- `npm run test:components` だけを実行すると、Reactコンポーネントテストのみ確認できます。

## 認証API
- ログインは `POST http://localhost:5200/auth/login` に `{ "userName": "...", "password": "..." }` を送信します。
- 成功レスポンスには `accessToken` または `token` と `role` を含めてください。ロール値 `Admin` は管理者画面の表示切り替えに使います。
- トークンはタブ単位の `sessionStorage` に保存し、APIリクエストへBearerトークンとして送信します。401ではセッションを消去してログイン画面に戻します。
- 登録時のユーザー名は半角英数字と `_ . -` の3〜50文字、パスワードは8〜100文字です。クライアント検証は使いやすさのためのもので、API側でも同じ制約を必ず検証してください。
- 管理者向け操作の表示はクライアント側のロール情報で切り替えます。アクセス制御はAPI側でJWT署名・issuer・audience・有効期限・ロールを検証して行い、一般ユーザーから管理操作を拒否します。401/403や入力エラーは日本語のProblem Details形式で返します。
- 単体テストは `npm test` で入力検証ルールを実行できます。

## APIバックエンド
- ASP.NET Core 10のAPI本体とxUnitテストを `EmployeeApi/` に配置しています。
- APIの起動、DB/JWTシークレット設定、認証・権限仕様は [EmployeeApi/README.md](./EmployeeApi/README.md) を参照してください。
- APIテストは `dotnet test EmployeeApi\EmployeeApi.Tests\EmployeeApi.Tests.csproj` で実行します。

## Playwright画面操作テスト
- いちばん簡単な実行方法：`run-playwright-tests.bat` をダブルクリック
- 初回準備：`npm install` と `npx playwright install chromium`
- 画面操作テスト：`npm run test:e2e`
- 既存テスト・Vitest・Playwrightをすべて実行：`npm run test:all`
- テスト観点表：[`docs/テスト観点表.md`](./docs/テスト観点表.md)
- 詳しい実行手順：[`docs/Playwright画面操作テスト手順.md`](./docs/Playwright画面操作テスト手順.md)

Playwrightシナリオはログイン、社員一覧の表示、検索、社員登録をブラウザーで操作します。APIはテスト用に模擬するため、実際の社員データベースには書き込みません。失敗時のスクリーンショットとトレースを保存します。

