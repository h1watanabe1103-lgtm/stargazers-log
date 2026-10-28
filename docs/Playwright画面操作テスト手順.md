# Playwright画面操作テストの実行手順（Windows）

## いちばん簡単な方法

プロジェクト直下の `run-playwright-tests.bat` をダブルクリックすると、パッケージの準備、Chromiumの準備、画面操作テストを順に実行します。

## 初回だけ行う準備

プロジェクト直下（`package.json` があるフォルダー）でPowerShellを開きます。

```powershell
npm install
npx playwright install chromium
```

## テストの実行

```powershell
npm run test:e2e
```

PlaywrightがViteの開発サーバーを自動起動し、ブラウザー上で「ログイン → 社員一覧 → 検索 → 社員登録」を操作します。テスト用のAPI応答を使用するため、実際の社員データベースには登録されません。

既存のNode.jsテスト、Vitestの部品テスト、Playwrightの画面操作テストを続けてすべて実行する場合：

```powershell
npm run test:all
```

ブラウザーを表示して動作を見たい場合：

```powershell
npm run test:e2e:headed
```

## 結果の確認

- `1 passed`：今回の画面操作シナリオが成功。
- `test-results`：テスト失敗時のスクリーンショットやトレースが保存される。
- `playwright-report`：HTMLレポート。必要に応じて `npx playwright show-report` で開く。

初回実行時は、PlaywrightのChromiumブラウザー本体をダウンロードするため、インターネット接続が必要です。
