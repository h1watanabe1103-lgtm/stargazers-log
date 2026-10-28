# 社員スキル管理API

社員（氏名・所属・スキル）を管理するWeb APIです。登録・一覧・更新・削除・キーワード検索ができます。

- 言語/FW: C# / ASP.NET Core（.NET 10）
- DB: SQL Server 2022 Developer版（Dockerコンテナーで動作。別途DBのインストールは不要）
- API仕様の確認・試用画面: Scalar（開発モードのみ）
- 認証・権限: JWT（Bearer）。ログインが必要で、権限は「管理者（Admin）」と「一般（General）」の2種類
- テスト: xUnit（テストのみSQLiteインメモリDBを使用）
- CI: GitHub Actions（push時に自動テスト）

## 目次

1. [起動方法を選ぶ](#1-起動方法を選ぶ)
2. [リポジトリを取得する](#2-リポジトリを取得する)
3. [必要なツールを入れる](#3-必要なツールを入れる)
4. [APIを起動する](#4-apiを起動する)
5. [動作確認](#5-動作確認)
6. [フロントエンドから呼び出す（CORS）](#6-フロントエンドから呼び出すcors)
7. [認証と権限（ログイン）](#7-認証と権限ログイン)
8. [APIの使い方](#8-apiの使い方)
9. [テスト](#9-テスト)
10. [トラブルシューティング](#10-トラブルシューティング)

---
## 1. 起動方法を選ぶ

起動方法は2通りあります。どちらか一方でOKです。**どちらもDocker Desktopが必要です**（DBのSQL ServerをDockerで動かすため）。

| 方法 | 必要なツール | APIのポート | こんな人向け |
|---|---|---|---|
| **A. dotnet run で起動**（DBだけDocker） | Docker Desktop + .NET 10 SDK | **5200** | コードを修正しながら動かしたい |
| **B. Docker Composeで起動**（API・DBとも Docker） | Docker Desktop | **8080** | 手軽に全部まとめて動かしたい（推奨） |

> **ポート番号が方法によって違います。** A は `5200`、B は `8080` です。以降の手順・フロントエンドの接続先URLは、選んだ方法のポートに読み替えてください。
> SQL Server のポートは、どちらの方法でも `1433` です。
---

## 2. リポジトリを取得する

次のどちらかの方法で取得します。Gitが入っていない環境では、方法2を使ってください。

**方法1：git clone（Gitがある場合）**

```Terminal
git clone https://github.com/yoshida-taiga1999/EmployeeApi.git
cd EmployeeApi
```

**方法2：ZIPでダウンロード（Gitがない場合）**

1. ブラウザで https://github.com/yoshida-taiga1999/EmployeeApi を開く
2. 緑色の「**Code**」ボタン →「**Download ZIP**」を選ぶ
3. ダウンロードしたZIPを、好きなフォルダに移して「すべて展開」する
4. ターミナルで、展開したフォルダに移動する

**方法3：ZIPでダウンロード（Githubアカウント凍結中の代替）**
1. ZIPファイルを共有してもらう
3. ダウンロードしたZIPを、好きなフォルダに移して「すべて展開」する
4. ターミナルで、展開したフォルダに移動する

```Terminal
cd <展開したフォルダのパス>
```

展開後のフォルダ名は `EmployeeApi-main` などになります。`dir`（Windows）または `ls`（Mac / Git Bash）で、`Dockerfile`、`compose.yaml`、`Program.cs`、`Migrations`、`README.md` が見えれば正しい場所です。

> 以降のコマンドは、すべて**この場所（`Program.cs` があるフォルダ）**で実行します。

---

## 3. 必要なツールを入れる

**Docker Desktop は方法A・Bの両方で必要**です。**.NET 10 SDK は方法Aを選ぶ場合のみ**必要です。すでに入っている場合は、確認コマンドだけ実行してください。

### 方法Aのみ：.NET 10 SDK を入れる

**① 入っているか確認**

```Terminal
dotnet --version
```

`10.x.x` と表示されれば導入済みです。スキップして [4. APIを起動する](#4-apiを起動する) へ進んでください。
`dotnet` が見つからない、または `10` で始まらない場合は、次の手順で入れます。

**② インストール**

1. 公式ダウンロードページを開く: https://dotnet.microsoft.com/download/dotnet/10.0
2. **SDK**（Runtimeではありません）の、自分のOS用インストーラーをダウンロードして実行する
3. 画面の案内に従ってインストールする

Windowsでコマンドから入れたい場合（任意）:

```powershell
winget install Microsoft.DotNet.SDK.10
```

**③ ターミナルを開き直して確認**

インストール後は、**開いているターミナルをすべて閉じて、新しく開き直してください**（開いたままだと反映されません）。

```Terminal
dotnet --version
```

`10.x.x` と表示されれば完了です。

### 方法A・B共通：Docker Desktop を入れる

**① 入っているか確認**

```Terminal
docker --version
```

バージョンが表示されれば導入済みです。スキップして [4. APIを起動する](#4-apiを起動する) へ進んでください。

**② インストール**

1. 公式ダウンロードページを開く: https://www.docker.com/products/docker-desktop/
2. 自分のOS用のインストーラーをダウンロードして実行する
3. 画面の案内に従ってインストールする（Windowsは再起動が必要な場合があります）

| OS | 補足 |
|---|---|
| Windows | WSL 2 を使う設定が既定です。インストーラーの案内に従ってください。会社PCでは、インストールに管理者権限が必要な場合があります |
| Mac | チップ（Apple Silicon / Intel）に合ったものを選びます |

**③ Docker Desktop を起動して確認**

1. **Docker Desktop のアプリを起動する**（インストールしただけでは動いていません）
2. 画面左下などに「Engine running」のような表示が出るまで待つ
3. ターミナルで確認する

```Terminal
docker --version
docker info
```

`docker info` がエラーにならなければ、使える状態です。

> **メモリの目安:** SQL Server コンテナーは **2GB 以上のメモリ**が必要です。足りない場合は、Docker Desktop（Windowsは WSL2 の `.wslconfig`）で割り当てを増やしてください。
> **Apple Silicon（M1〜M4）の Mac:** SQL Server の公式イメージは amd64 用です。Docker Desktop の設定で「Use Rosetta for x86_64/amd64 emulation」を有効にしてください。

> **注意:** Docker Desktop の利用条件（大企業などでは有償になる場合があります）は、公式サイトで確認してください。

---
## 4. APIを起動する

### 事前準備（共通）

- `compose.yaml` があるフォルダで実行します。
- SQL Server の SA パスワードは、`.env` ファイルで指定できます（任意）。`.env.example` を `.env` にコピーして使います。ファイルがなくても、既定値で動きます。
  - Windows: `copy .env.example .env`
  - Mac / Linux: `cp .env.example .env`
- `.env` は Git に入れません（`.gitignore` に追加済み）。パスワードは**開発用のダミー**です。
- パスワードは、大文字・小文字・数字・記号を含む8文字以上にしてください（SQL Server の条件です）。
- ログインのトークンに署名する鍵 `JWT_KEY` も、`.env` で指定できます（任意）。32文字以上にしてください。ファイルがなくても、開発用の既定値で動きます（[7. 認証と権限](#7-認証と権限ログイン) の「設定」を参照）。

### 方法A：dotnet run で起動（ポート 5200）

DBだけDockerで起動し、APIは `dotnet run` で動かします。

```Terminal
docker compose up -d db
dotnet run
```

- `docker compose up -d db` で、SQL Server がバックグラウンドで起動します。初回はイメージの取得に数分かかります。
- APIの接続先は `appsettings.Development.json` の `ConnectionStrings:DefaultConnection`（`Server=localhost,1433`）です。パスワードは `.env`（または既定値）と同じにしてください。
- ログに `Now listening on: http://localhost:5200` と出れば起動成功です。
- 開発モードで起動するため、ブラウザが自動で試用画面（Scalar）を開きます。開かない場合は手動で開いてください。
- 止めるときは `Ctrl + C`。DBも止める場合は `docker compose down`。

### 方法B：Docker Composeで起動（ポート 8080）

API と SQL Server を、まとめて起動します。

```Terminal
docker compose up --build
```

- 初回は、イメージの取得とビルドに数分かかります。
- ログに `SQL Server is now ready for client connections.` と `Now listening on: http://[::]:8080` が出れば起動成功です。
- 開発モード（`ASPNETCORE_ENVIRONMENT=Development`）は、`compose.yaml` で設定済みです。API仕様と試用画面（Scalar）が見られます。
- 止めるときは `Ctrl + C`、そのあと `docker compose down`。

### 共通の仕様

- DBは起動時に自動で作成・更新されます（マイグレーション自動適用）。
- **開発モードでは、DBが空のときだけ、動作確認用のダミーデータ（社員5名）と、ログイン用の初期ユーザー（`admin`／`user`）が、起動時に自動登録されます。** すでにデータがある場合は何もしないので、再起動しても重複しません。初期ユーザーは [7. 認証と権限](#7-認証と権限ログイン) を参照してください。
- データは Docker のボリューム（`sqlserver-data`）に保存されます。`docker compose down` では**消えません**。
- `docker compose down -v` を実行すると、ボリュームごと**データが消えます**。
---

## 5. 動作確認

### ① 起動の確認

ブラウザで次を開きます。

| 確認するもの | 方法A（5200） | 方法B（8080） |
|---|---|---|
| 試用画面（Scalar） | http://localhost:5200/scalar | http://localhost:8080/scalar |
| API仕様（JSON） | http://localhost:5200/openapi/v1.json | http://localhost:8080/openapi/v1.json |

> 社員一覧（`/employees`）は、ログインが必要です。ブラウザのアドレスバーで直接開くと、`401`（ログインが必要です）になります。これは正常な動きです。確認は、②の手順（Scalar でログインしてから）で行います。

試用画面（Scalar）が開き、画面左に「認証」「社員」の一覧が出れば、APIは起動しています。

### ② データを登録する（Scalarで）

curl が使いにくい環境（Windows PowerShell など）では、Scalarから登録するのが簡単です。

1. 試用画面（Scalar）を開く
2. **先にログインする。** 管理者（`admin`）でログインし、トークンを Authentication に貼る（手順は [7. 認証と権限](#7-認証と権限ログイン) の「Scalar でログインする」）。社員の登録は、**管理者のみ**できます
3. 左の一覧から「**社員を登録する**（POST /employees）」を選ぶ
4. リクエストボディに、次のJSONを入力する（Scalarの入力例に `id` や `employeeId` が入っている場合は、**削除**してください。SQL Server では、`id` を指定するとエラーになります）

```json
{
  "name": "山田 太郎",
  "department": "開発部",
  "skills": [
    { "name": "C#" },
    { "name": "SQL" }
  ]
}
```

5. 送信ボタンを押し、`201` が返ることを確認する
6. もう一度「社員の一覧を取得する」（GET /employees）を実行し、登録したデータが返ることを確認する

---

## 6. フロントエンドから呼び出す（CORS）

別オリジン（画面とAPIでURLやポートが違う場合）から呼び出すには、APIが画面側のURLを許可している必要があります。

### 現在許可しているオリジン

| URL | 想定 |
|---|---|
| `http://localhost:5173` | Viteの既定 |
| `http://localhost:5174` | Viteの別ポート |
| `http://localhost:3000` | その他の開発サーバー |

### 画面側のURLが上記と違う場合

`Program.cs` の `WithOrigins(...)` にそのURLを追加し、**APIを再起動**してください（方法Bは `docker compose up --build` で再ビルドします）。

```C#
policy.WithOrigins(
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:XXXX")   // ← 追加する画面のURL
```

書き方のルール:

- ブラウザのアドレスバーに表示されるURLから、**`スキーム + ホスト + ポート`だけ**を書く（例: `http://localhost:5173`）
- 末尾に `/` を付けない。パス（`/employees` など）も書かない
- `localhost` と `127.0.0.1` は別物として扱われる
- `http` と `https` も別物

### 画面側（React など）のコード

接続先は、起動方法のポートに合わせます。

```javascript
// 方法A（dotnet run）の場合
const API_URL = "http://localhost:5200";
// 方法B（Docker）の場合
// const API_URL = "http://localhost:8080";

// ① ログインして、トークンを受け取る
const loginRes = await fetch(`${API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userName: "user", password: "User_Passw0rd!" }),
});
if (!loginRes.ok) throw new Error(`ログイン失敗: ${loginRes.status}`);
const { accessToken } = await loginRes.json();

// ② 社員APIには、トークンを Authorization ヘッダーに付けて呼ぶ
const res = await fetch(`${API_URL}/employees`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
const employees = await res.json();
```

- 画面とAPIは**どちらも起動している**必要があります。
- 画面を動かすPCと、APIを動かすPCが**別**の場合、`localhost` では届きません。**同じPCでAPIも起動**してください。
- トークンは、画面側で保管します。有効期限は60分です。期限が切れると `401` になるので、ログインし直してください。
- 更新（PUT）は**全項目を送る**仕様です。必須項目（氏名・所属）が足りない場合は、400 エラーになります（[8. 入力規則](#入力規則)）。

---

## 7. 認証と権限（ログイン）

社員のAPI（`/employees`）は、**ログインしないと使えません**。ログインすると「トークン」（長い文字列）が返ってくるので、以降のリクエストに付けて送ります。

### 権限（ロール）

| 権限 | できること |
|---|---|
| 管理者（`Admin`） | 社員の一覧・検索に加えて、登録・更新・削除ができる |
| 一般（`General`） | 社員の一覧・検索だけ（登録・更新・削除は不可） |

| 操作 | 未ログイン | 一般 | 管理者 |
|---|---|---|---|
| `GET /employees`、`GET /employees/search` | 401 | 200 | 200 |
| `POST /employees`（登録） | 401 | 403 | 201 |
| `PUT /employees/{id}`（更新） | 401 | 403 | 204 |
| `DELETE /employees/{id}`（削除） | 401 | 403 | 204 |
| `POST /auth/register`、`POST /auth/login` | 誰でも使える | 誰でも使える | 誰でも使える |
| `POST /auth/change-password`（自分のパスワードを変更） | 401 | 204 | 204 |
| `GET /auth/users`（ユーザーの一覧） | 401 | 403 | 200 |
| `POST /auth/users/{id}/reset-password`（パスワードの再設定） | 401 | 403 | 204 |

- `401` は「ログインが必要です（トークンがない、または正しくない）」、`403` は「ログインはしているが、権限がない」という意味です。
- 画面から登録できるのは、**一般ユーザーだけ**です。管理者は、画面からは作れません（権限を勝手に上げられないようにするため）。

### 初期ユーザー（開発モードのみ）

開発モードで起動して、ユーザーが1人もいないときだけ、次の2人が自動で作られます。

| ユーザー名 | パスワード | 権限 |
|---|---|---|
| `admin` | `Admin_Passw0rd!` | 管理者 |
| `user` | `User_Passw0rd!` | 一般 |

> これは**開発用のダミー**です。本番では使いません（本番ではシードを動かさないため、作られません）。実際の運用では、別の方法で管理者を作る必要があります。

### 認証のAPI

| メソッド | パス | 説明 | 成功時 |
|---|---|---|---|
| POST | `/auth/register` | ユーザーを登録（一般ユーザーとして作られる） | 201 Created |
| POST | `/auth/login` | ログイン。トークンを返す | 200 OK |
| POST | `/auth/change-password` | パスワードを変更する（本人。要ログイン） | 204 No Content |
| GET | `/auth/users` | ユーザーの一覧（管理者のみ） | 200 OK |
| POST | `/auth/users/{id}/reset-password` | パスワードを再設定する（管理者のみ） | 204 No Content |

**登録（`/auth/register`）に送るデータ**

```json
{ "userName": "taro_yamada", "password": "Passw0rd_2026" }
```

| 項目 | ルール |
|---|---|
| `userName`（ユーザー名） | 必須。3〜50文字。半角の英数字と `_` `.` `-` のみ（全角・空白は不可）。すでにあるユーザー名は使えない（409） |
| `password`（パスワード） | 必須。8〜100文字 |

**ログイン（`/auth/login`）に送るデータと、返ってくるデータ**

```json
{ "userName": "user", "password": "User_Passw0rd!" }
```

```json
{
  "accessToken": "eyJhbGciOi...（長い文字列）",
  "tokenType": "Bearer",
  "expiresAt": "2026-10-19T04:00:00+00:00",
  "role": "General"
}
```

- `accessToken` を、`Authorization: Bearer <accessToken>` の形で、リクエストのヘッダーに付けて送ります。
- トークンの有効期限は、**60分**です。切れたら、ログインし直します。
- パスワードは、そのままでは保存しません（ハッシュ化して保存します）。

### ログイン失敗の制限（ロック）

パスワードの総当たりを防ぐため、**連続で5回**ログインに失敗すると、そのユーザーを**15分間**ロックします。

- ロック中は、正しいパスワードでも、ログインできません（`429 Too Many Requests`）。待つ時間は、`Retry-After` ヘッダーと、メッセージに出ます。
- ログインに成功すると、失敗の回数は 0 に戻ります。
- ロックは、15分たてば自動で解除されます。急ぐときは、管理者が「パスワードの再設定」をすると、解除されます。
- 存在しないユーザー名は、数えません（いつもの 401 です）。
- 回数と時間は、設定で変えられます（下の「設定」を参照）。

> ロック中のユーザーには 429 を返すので、「そのユーザー名は存在する」と分かってしまいます。学習用の仕様です。

### パスワードの変更・再設定

メールを送る仕組みはないため、「メールで再設定のリンクを送る」方式はありません。次の2つで対応します。

**① 自分で変更する（ログイン済みの本人）**

`POST /auth/change-password` に、現在のパスワードと、新しいパスワードを送ります。

```json
{ "currentPassword": "User_Passw0rd!", "newPassword": "New_Passw0rd_2026" }
```

- 成功すると `204` です。次のログインから、新しいパスワードを使います。
- 現在のパスワードが違う、新旧が同じ、新しいパスワードが8文字未満の場合は、`400`（日本語のメッセージ）です。
- 変更しても、すでに発行したトークンは、有効期限（60分）まで使えます。

**② 管理者が再設定する（パスワードを忘れたとき）**

1. 管理者（`admin`）でログインする
2. `GET /auth/users` で、対象のユーザーの `id` を調べる（`lockedUntil` に日時があれば、ロック中）
3. `POST /auth/users/{id}/reset-password` に、新しいパスワードを送る

```json
{ "newPassword": "Temp_Passw0rd_2026" }
```

- 成功すると `204` です。ロックも解除されます。
- 新しいパスワードは、本人に、安全な方法で伝えます。本人は、ログイン後に、①の方法で、自分のパスワードに変更します。
- `id` が存在しない場合は `404` です。

### Scalar でログインする

1. 試用画面（Scalar）を開く
2. 左の一覧から「**認証** → **ログインする**（POST /auth/login）」を選ぶ
3. リクエストボディに、`userName` と `password` を入れて送信する（例: `admin` / `Admin_Passw0rd!`）
4. 返ってきた `accessToken` の値を、コピーする（両端の `"` と、`Bearer` の文字は含めない）
5. 左のメニュー（またはリクエスト画面）の **Authentication** を開き、**Bearer Token** の欄に貼る
6. 以降のリクエストには、`Authorization` ヘッダーが自動で付く。「社員の一覧を取得する」を送って、`200` を確認する

> Authentication の欄が出ないときは、ブラウザで `Ctrl + F5` を押して、再読み込みしてください。

### curl でログインする

```Terminal
# ログインして、トークンを変数に入れる（Mac / Linux / Git Bash）
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"user","password":"User_Passw0rd!"}' \
  | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

# トークンを付けて、社員一覧を取得する
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/employees
```

※Windows PowerShell では、`curl` ではなく `curl.exe` を使うか、Scalar の試用画面から試すのが簡単です。

### エラーのときの返事

| 状況 | ステータス | メッセージ（`title` など） |
|---|---|---|
| トークンがない、または期限切れ・改ざん | 401 | 「ログインが必要です。」（`detail` に理由） |
| 権限がない（一般ユーザーが登録・更新・削除） | 403 | 「この操作を行う権限がありません。」 |
| ユーザー名またはパスワードが違う（ログイン） | 401 | 「ユーザー名またはパスワードが正しくありません。」 |
| ユーザー名がすでに使われている（登録） | 409 | 「そのユーザー名は、すでに使われています。」 |
| 入力が規則に合わない（登録・ログイン・パスワードの変更など） | 400 | 日本語のメッセージ（「入力内容に誤りがあります。」） |
| ログインの失敗が続き、ロック中 | 429 | 「ログインに失敗した回数が多いため、一時的にロックしています。」（`Retry-After` ヘッダー付き） |
| 再設定の対象のユーザーがいない | 404 | 「ユーザーが見つかりません。」 |

> ログインの失敗は、ユーザー名が違う場合も、パスワードが違う場合も、**同じメッセージ**です（ユーザー名が存在するかどうかを、外から分からなくするため）。

### 設定（トークンの鍵など）

トークンの署名には、秘密の「鍵」を使います。設定は `Jwt` の項目です。

| 項目 | 内容 | 既定 |
|---|---|---|
| `Jwt:Key` | 署名の鍵。**32文字以上**。必須（未設定だと、起動時にエラー） | なし |
| `Jwt:Issuer` | 発行者の名前 | `appsettings.Development.json` を参照 |
| `Jwt:Audience` | 利用者の名前 | `appsettings.Development.json` を参照 |
| `Jwt:ExpireMinutes` | トークンの有効期限（分） | 60 |
| `Auth:MaxFailedAttempts` | ロックするまでの、連続の失敗回数 | 5 |
| `Auth:LockoutMinutes` | ロックする時間（分） | 15 |

- 方法A（dotnet run）: `appsettings.Development.json` の `Jwt` に書いてあります。
- 方法B（Docker Compose）: `compose.yaml` の `Jwt__Key` に、`.env` の `JWT_KEY` が入ります。`.env` に書かなければ、開発用の既定値が使われます。
- **本番では、必ず別の鍵に変えてください。** 鍵を知っていると、誰でも管理者のトークンを作れてしまいます。鍵は、Git に入れません（`.env` や環境変数で渡します）。

---

## 8. APIの使い方

### エンドポイント一覧

| メソッド | パス | 説明 | 必要な権限 | 成功時 |
|---|---|---|---|---|
| POST | `/employees` | 社員を登録 | 管理者 | 201 Created |
| GET | `/employees` | 社員の一覧を取得（スキル含む） | ログイン済み | 200 OK |
| GET | `/employees/search?keyword=○○` | 氏名・所属・スキルにキーワードを含む社員を検索 | ログイン済み | 200 OK |
| PUT | `/employees/{id}` | 社員を更新（全項目を送る。スキルは置き換え） | 管理者 | 204 No Content |
| DELETE | `/employees/{id}` | 社員を削除 | 管理者 | 204 No Content |

すべてのAPIで、ログイン（`Authorization: Bearer ...`）が必要です。詳しくは [7. 認証と権限](#7-認証と権限ログイン) を参照してください。

検索は、大文字小文字を区別しません（SQL Server の既定の動作）。
PUT / DELETE で該当IDがない場合は 404 Not Found が返ります。
社員を削除すると、その社員のスキルも一緒に削除されます。

### データ構造

社員（Employee）1人に対して、スキル（Skill）を複数持てます。スキルは別テーブルで管理しています。

**送るデータ（登録・更新）**

```json
{
  "name": "山田 太郎",
  "department": "開発部",
  "skills": [
    { "name": "C#" },
    { "name": "SQL" }
  ]
}
```

- `id` は自動採番されるので**送りません**（送ると SQL Server でエラーになることがあります）。
- スキルの `id` / `employeeId` も自動で付くので、送りません。
- `name`（氏名）、`department`（所属）、スキルの `name` は**必須**です。`null` や空文字は受け付けません（下の「入力規則」を参照）。
- 更新（PUT）では、スキルは送った内容で**すべて置き換え**られます（送らなかったスキルは削除されます）。

**返ってくるデータ（一覧・検索）**

```json
{
  "id": 1,
  "name": "山田 太郎",
  "department": "開発部",
  "skills": [
    { "id": 1, "name": "C#", "employeeId": 1 },
    { "id": 2, "name": "SQL", "employeeId": 1 }
  ]
}
```

### 入力規則

登録（POST）と更新（PUT）で、次のチェックをします。

| 項目 | ルール |
|---|---|
| `name`（氏名） | 必須（`null`・空文字は不可）、100文字以内 |
| `department`（所属） | 必須（`null`・空文字は不可）、100文字以内 |
| `skills[].name`（スキル名） | 必須（`null`・空文字は不可）、100文字以内 |
| `skills` | 空の配列（`[]`）は可。`null` は不可 |
| `id` / `skills[].id` / `skills[].employeeId` | 送らない（自動採番） |

ルールに違反すると、**400 Bad Request** が返り、`errors` に日本語のメッセージが入ります。

```json
{
  "title": "入力内容に誤りがあります。",
  "status": 400,
  "errors": {
    "Name": ["氏名は必須です。"]
  }
}
```

- 上記以外のエラー（JSONの形式が不正、型が違うなど）のメッセージは、英語のままです。
- 401（ログインが必要）と 403（権限がない）は、日本語のメッセージで返ります（[7. 認証と権限](#7-認証と権限ログイン)）。
- `skills` の中の項目は、`Skills[0].Name` のように、何番目のスキルかが `errors` のキーに入ります。
- DBの `Name`・`Department` 列は NOT NULL（最大100文字）です。

### 呼び出し例（curl）

以下はポート `5200`（方法A）の例です。Dockerの場合は `8080` に読み替えてください。`$TOKEN` は、[7. 認証と権限](#7-認証と権限ログイン) の手順で取得したトークンです（登録・更新・削除は、**管理者**のトークンが必要です）。

```Terminal
# 登録（管理者）
curl -X POST http://localhost:5200/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"山田 太郎","department":"開発部","skills":[{"name":"C#"}]}'

# 一覧
curl -H "Authorization: Bearer $TOKEN" http://localhost:5200/employees

# 検索（# は %23 にエンコード）
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5200/employees/search?keyword=C%23"

# 更新（管理者）
curl -X PUT http://localhost:5200/employees/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"山田 太郎","department":"営業部","skills":[{"name":"C#"}]}'

# 削除（管理者）
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5200/employees/1
```

※Windows PowerShell では `curl` が別物のため、Scalarの試用画面から試すのが簡単です。

---

## 9. テスト

```Terminal
dotnet test
```

.NET 10 SDK が必要です。テストは SQLite のインメモリDBで実行するため、SQL Server の起動は不要です。push / pull request 時に GitHub Actions でも自動実行されます。

| テスト | 内容 |
|---|---|
| `EmployeeSearchTests` | 検索（氏名・所属・スキル）のテスト |
| `AuthApiTests` | ログイン、ユーザー登録、権限（401／403／201／204／404）のテスト。APIをメモリ上で起動して、実際にリクエストを送って確かめる |
| `AuthPasswordTests` | ログイン失敗のロック（429）、パスワードの変更、管理者による再設定、ユーザーの一覧のテスト |

認証のテスト用に、環境名 `Testing` で起動します。このとき、`Program.cs` は、マイグレーション（SQL Server 用）を実行しません。テスト用のユーザー（`test-admin`／`test-user`）は、テストの中で作ります。

---
## 10. トラブルシューティング

### 起動前

| 症状 | 対処 |
|---|---|
| `dotnet` が見つからない（`command not found` など） | .NET 10 SDK が未導入です（方法Aのみ必要）。[3. 必要なツールを入れる](#3-必要なツールを入れる) を実施し、**ターミナルを開き直して**ください |
| `dotnet --version` が `10` で始まらない | 古いSDKのみ入っています。.NET 10 SDK を追加で入れてください |
| `docker` が見つからない | Docker Desktop が未導入です。[3. 必要なツールを入れる](#3-必要なツールを入れる) を実施してください |
| `Cannot connect to the Docker daemon` などのエラー | Docker Desktop が**起動していません**。アプリを起動し、準備完了まで待ってから再実行してください |
| `no configuration file provided: not found` | `compose.yaml` があるフォルダで実行していません。`cd` で移動してください（`ls` / `dir` で `compose.yaml` が見えれば正しい場所です） |
| `dotnet run` で「プロジェクトが見つからない」 | `Program.cs` があるフォルダにいるか確認（`ls` / `dir`）。違う場所なら `cd` で移動 |
| `Jwt:Key が設定されていません。` で起動しない | 署名の鍵が未設定です。方法Aは `appsettings.Development.json` の `Jwt:Key`、方法Bは `compose.yaml` の `Jwt__Key`（`.env` の `JWT_KEY`）を確認します。鍵は32文字以上です |
| `dotnet ef` が見つからない（マイグレーションを作る場合のみ） | `dotnet tool install --global dotnet-ef` を実行し、ターミナルを開き直してください |

### 起動後

| 症状 | 対処 |
|---|---|
| `db` コンテナーがすぐ終了する | `docker compose logs db` を確認します。**パスワードの条件不足**（大文字・小文字・数字・記号を含む8文字以上）や、**メモリ不足**（2GB以上必要）が多い原因です |
| `api` が `Login failed for user 'sa'` で落ちる | `.env` と接続文字列のパスワードが一致しているか確認します。一度起動したあとに `.env` のパスワードを変えた場合、DB側には古いパスワードが残ります。データが消えてよければ `docker compose down -v` で作り直してください |
| M1〜M4 Mac で `db` が起動しない | Docker Desktop の設定で「Use Rosetta for x86_64/amd64 emulation」を有効にしてください |
| `/scalar` が開けない（404） | 開発モードで起動しているか確認。方法Bは `compose.yaml` で設定済み。方法Aは `dotnet run` の既定のプロファイルで起動してください |
| すべてのAPIが `401`（「ログインが必要です。」） | ログインしていません。`/auth/login` でトークンを取り、`Authorization: Bearer <トークン>` を付けてください（[7. 認証と権限](#7-認証と権限ログイン)） |
| ログインしたのに `401` | トークンの有効期限（60分）が切れています。ログインし直してください。貼るときに、`Bearer ` の文字まで含めていないか、途中で切れていないかも確認します |
| 登録・更新・削除が `403`（「この操作を行う権限がありません。」） | 一般ユーザーでログインしています。管理者（`admin`）でログインし直してください |
| ログインが `401`（「ユーザー名またはパスワードが正しくありません。」） | ユーザー名かパスワードが違います。初期ユーザーは、開発モードで、ユーザーが1人もいないときだけ作られます。`docker compose down -v` でデータを消してから、起動し直すと、作り直されます |
| ログインが `429`（「一時的にロックしています」） | ログインの失敗が5回続いたため、15分間ロックされています。待つか、管理者に、パスワードの再設定（ロックも解除されます）を頼んでください |
| パスワードを忘れた | メールでの再設定はありません。管理者に、`POST /auth/users/{id}/reset-password` で再設定してもらい、ログイン後に、`/auth/change-password` で変更します |
| ユーザー登録が `409` | そのユーザー名は、すでに使われています。別の名前にしてください |
| Scalar に Authentication が出ない | ブラウザで `Ctrl + F5` を押して、再読み込みします。それでも出なければ、`/openapi/v1.json` に `securitySchemes` があるか確認してください |
| 登録・更新で 400 エラー（`errors` に「〜は必須です」など） | 入力規則に違反しています。必須項目（氏名・所属・スキル名）が `null` や空文字になっていないか、100文字を超えていないか確認してください（[8. 入力規則](#入力規則)） |
| 登録（POST）で 500 エラー（`IDENTITY_INSERT is set to OFF` など） | リクエストのJSONから `id` と、スキルの `employeeId` を**削除**してください。Scalarの入力例に含まれていることがあります |
| ポート使用中（方法B：8080） | `compose.yaml` の `api` の `ports` を `"8081:8080"` のように、左側の番号を変える（アクセスは `localhost:8081`） |
| ポート使用中（方法A：5200） | 他のアプリが使用中です。そのアプリを止めるか、`dotnet run --urls "http://localhost:5201"` で別ポートにする（画面側の接続先も変更） |
| ポート使用中（SQL Server：1433） | PC に別の SQL Server が動いています。`compose.yaml` の `db` の `ports` を `"1434:1433"` に変更し、方法Aの場合は接続文字列も `localhost,1434` にします |
| 方法Aで `dotnet run` が DB に接続できない | `docker compose up -d db` で DB を起動したか、`appsettings.Development.json` の接続文字列が正しいか確認します |
| ブラウザから呼ぶと `blocked by CORS policy` | 画面側のURLが許可オリジンに入っているか確認（[6. CORS](#6-フロントエンドから呼び出すcors)）。追加後はAPIを再起動 |
| 画面で `ERR_CONNECTION_REFUSED` / `Failed to fetch` | APIが起動していない、または接続先のポートが違います（方法A: 5200、方法B: 8080） |
| 一覧が `[]` のまま | データが空の状態です。開発モード以外で起動した場合は、ダミーデータは自動登録されません。[5. 動作確認](#5-動作確認) の手順で、管理者でログインして登録してください |
| データが消えた | `docker compose down -v` を実行すると、ボリュームごとデータが消えます。`-v` を付けない `docker compose down` では消えません |