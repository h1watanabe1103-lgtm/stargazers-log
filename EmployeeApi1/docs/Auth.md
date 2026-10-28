# 認証・権限の実装 作業記録

> 全体の記録は `Issue.md`を参照
> 昨今のセキュリティ問題に着目し、認証関連についてはこちらで整理を行う。
---

## 1. 目的と、指示書の要件

### 目的
社員スキル管理API を、ログインしないと使えないようにし、権限によって操作を分ける。

### 指示書の必達（これが終われば合格）
- [x] ログインしないと、社員情報APIが使えない（確認済み: 表の1）
- [x] 一般ユーザーは、登録・削除ができない（確認済み: 表の4、5。403）
- [x] 入力エラー時に、分かりやすいメッセージが返る（確認済み: 表の14、15）
- [ ] 中間報告メールを送った（10/23 の夕会後、18:00 まで）

### 指示書の「できたら」
- パスワードの再設定
- ログイン失敗回数の制限

### うまくいかない時（プランB）
認証で詰まったら、**固定のAPIキーによる簡易認証**に切り替える。JWT は課題ログへ。必達は、これでも満たせる。
切り替えの目安: 1つの問題に **45分以上** かかったとき（指示書の「困ったときの順番」に従う）。

---

## 2. 設計

### 方式
- **JWT（JSON Web Token）による、トークン認証**。ログインに成功すると、トークンを返す。以降のAPIには、`Authorization: Bearer （トークン）` を付けて呼ぶ。
- サーバーは、トークンの署名・有効期限・発行者・対象を検証する。ユーザー情報を、サーバー側に持ち続ける必要がない。

### 権限（ロール）

| 操作 | 未ログイン | 一般（General） | 管理者（Admin） |
|---|---|---|---|
| `POST /auth/register`、`POST /auth/login` | 可 | 可 | 可 |
| `GET /employees`、`GET /employees/search` | **401** | 可 | 可 |
| `POST /employees`（登録） | **401** | **403** | 可 |
| `PUT /employees/{id}`（更新） | **401** | **403** | 可 |
| `DELETE /employees/{id}`（削除） | **401** | **403** | 可 |

- 一般は「参照のみ」。更新も管理者のみにした（指示書の「管理者＝登録・削除可／一般＝参照のみ」に合わせた）。
- 401 は「ログインしていない（またはトークンが不正）」、403 は「ログインしているが、権限がない」。

### エンドポイント

| メソッド | パス | 説明 | 成功時 | 主なエラー |
|---|---|---|---|---|
| POST | `/auth/register` | ユーザー登録（**一般ユーザーのみ**登録される） | 201 | 400（入力不正）、409（ユーザー名が重複） |
| POST | `/auth/login` | ログイン。トークンを返す | 200 | 400（入力不正）、401（ユーザー名またはパスワードが違う） |

ログイン成功時の返却:

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresAt": "2026-10-19T02:00:00Z",
  "role": "Admin"
}
```

### トークンの中身（クレーム）

| 名前 | 内容 |
|---|---|
| `sub` | ユーザーID |
| `name` | ユーザー名 |
| `role` | 権限（`Admin` または `General`） |
| `iss` / `aud` | 発行者 `EmployeeApi`／対象 `EmployeeApiClients` |
| `exp` | 有効期限（既定は60分） |

### パスワードの扱い
- パスワードそのものは**保存しない**。ASP.NET Core 標準の `PasswordHasher<User>`（PBKDF2、ソルト付き）で**ハッシュ化**したものだけを、`Users.PasswordHash` に保存する。
- ログイン時は、ハッシュと照合する。ユーザーが存在しない場合も、パスワードが違う場合も、**同じメッセージ**（「ユーザー名またはパスワードが正しくありません。」）を返す。ユーザーの存在の有無を、外から分からなくするため。

### ユーザーの種類
- 一般ユーザー: `/auth/register` で誰でも登録できる。
- 管理者: 画面からは作れない。**開発モードの初期データ（ダミー）**で用意する。

| ユーザー名 | パスワード（開発用ダミー） | 権限 |
|---|---|---|
| `admin` | `Admin_Passw0rd!` | Admin |
| `user` | `User_Passw0rd!` | General |

### 入力規則（ユーザー登録）

| 項目 | ルール |
|---|---|
| ユーザー名 | 必須、3〜50文字、半角英数字と `_` `.` `-` のみ |
| パスワード | 必須、8〜100文字 |

### 設定値

| キー | 内容 | 開発用の値 |
|---|---|---|
| `Jwt:Key` | 署名用の鍵（**32文字以上**） | `dev-only-secret-key-change-me-0123456789abcdef` |
| `Jwt:Issuer` | 発行者 | `EmployeeApi` |
| `Jwt:Audience` | 対象 | `EmployeeApiClients` |
| `Jwt:ExpireMinutes` | 有効期限（分） | `60` |

- ローカル（`dotnet run`）: `appsettings.Development.json` から読む。
- Docker: `compose.yaml` の環境変数 `Jwt__Key`（`.env` の `JWT_KEY`）で渡す。
- `Jwt:Key` が未設定だと、起動時に例外で止まる（鍵なしで動いてしまうのを防ぐ）。

---

## 3. 変更するファイル

| 区分 | ファイル | 内容 | 状態 |
|---|---|---|---|
| 新規 | `User.cs` | ユーザー、権限（`Roles`）、登録・ログインの入力クラス | 完了（動作確認済み） |
| 新規 | `JwtTokenService.cs` | トークンの作成 | 完了（動作確認済み） |
| 新規 | `AuthEndpoints.cs` | `/auth/register`、`/auth/login` | 完了（動作確認済み） |
| 変更 | `DbSeeder.cs` | 初期ユーザー（admin／user）の追加 | 完了（動作確認済み） |
| 変更 | `compose.yaml` | `Jwt__Key` の受け渡しを追加 | 変更済み |
| 変更 | `.env.example` | `JWT_KEY` を追加 | 変更済み |
| 変更 | `EmployeeDb`（`DbSet<User>`、一意制約） | 手作業で変更 | 完了 |
| 変更 | `appsettings.Development.json`（`Jwt`） | 手作業で変更 | 完了 |
| 変更 | `Program.cs`（認証の設定、エンドポイントの保護） | 手作業で変更 | 完了 |
| 追加 | パッケージ `Microsoft.AspNetCore.Authentication.JwtBearer` | `dotnet add package` | 完了 |
| 追加 | マイグレーション `AddUsers` | `Users` テーブルの作成 | 完了 |
| 新規 | `AuthErrorEvents.cs` | 401・403 を日本語の JSON で返す（`AddJwtBearer` の `options.Events`） | 完了（動作確認済み） |
| 新規 | `BearerSecuritySchemeTransformer.cs` | Scalar に Authorize（Bearer）を出す | 完了（Scalar に Authentication が出ることを確認。10/19 11:52） |

> コードは、作成した環境に .NET がなく、コンパイルを確認できなかった。手元でビルドして、エラーを修正した（第6章を参照）。

---

## 4. 実装の手順（チェックリスト）

- [x] 1. `User.cs`、`JwtTokenService.cs`、`AuthEndpoints.cs`、`DbSeeder.cs`、`compose.yaml` を配置する
- [x] 2. `dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer`（バージョンが `10.x` であること）
- [x] 3. `EmployeeDb` に、`DbSet<User> Users` と、`OnModelCreating`（ユーザー名の一意制約、最大長）を追加する
- [x] 4. `appsettings.Development.json` に `Jwt` を追加する
- [x] 5. `Program.cs` を変更する
  - [x] 先頭に `using` を追加（`System.Text`、`JwtBearer`、`Identity`、`IdentityModel.Tokens`）
  - [x] `IPasswordHasher<User>`、`JwtTokenService` の登録
  - [x] `AddAuthentication().AddJwtBearer(...)`、`AddAuthorizationBuilder()`（`AdminOnly`）
  - [x] `Migrate()` の後に、`SeedUsersAsync` を呼ぶ
  - [x] `app.UseCors(...)` の後に、`UseAuthentication()`、`UseAuthorization()`
  - [x] `app.MapAuthEndpoints()` を追加
  - [x] `/employees` グループに `RequireAuthorization()`、登録・更新・削除に `RequireAuthorization("AdminOnly")`
- [x] 6. `dotnet ef migrations add AddUsers`（名前は単語の頭を大文字に。小文字のみは `CS8981`）
- [x] 7. `dotnet build`（エラー・警告なし）
- [x] 8. `docker compose down -v` → `docker compose up --build`
- [x] 9. 下の「動作確認」を実施する（第5章の表1〜19、すべて確認済み。10/19 11:23）

---

## 5. 動作確認

Scalar には、トークンを入れる画面がまだない（後述）。**各リクエストの Headers に、`Authorization` = `Bearer （トークン）` を手で追加**する。

手順: `POST /auth/login` → 返ってきた `accessToken` をコピー → 各リクエストの Headers に貼る。


| # | 操作 | 期待する結果 | 実際の結果 | 状態 |
|---|---|---|---|---|
| 1 | トークンなしで `GET /employees` | 401 | 401 が返った（10/19 11:17） | 確認済み |
| 2 | `user`（一般）でログイン | 200、`role` が `General` | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 3 | `user` のトークンで `GET /employees` | 200（シード5名） | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 4 | `user` のトークンで `POST /employees` | 403 | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 5 | `user` のトークンで `DELETE /employees/1` | 403 | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 6 | `admin` でログイン | 200、`role` が `Admin` | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 7 | `admin` のトークンで `POST /employees` | 201 | 201 が返った（10/19 12:52、本人確認。自動テストも成功）。修正前は 403 だった | 確認済み |
| 8 | `admin` のトークンで `PUT /employees/{id}` | 204 | 自動テスト `Admin_PutEmployee_Returns204`／`Admin_DeleteEmployee_Returns204` が成功（10/19 13:04。全21件成功） | 確認済み |
| 9 | `admin` のトークンで `DELETE /employees/{id}` | 204 | 自動テスト `Admin_PutEmployee_Returns204`／`Admin_DeleteEmployee_Returns204` が成功（10/19 13:04。全21件成功） | 確認済み |
| 10 | 間違ったパスワードでログイン | 401（「ユーザー名またはパスワードが正しくありません。」） | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 11 | 存在しないユーザー名でログイン | 10 と同じ 401、同じメッセージ | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 12 | `/auth/register` で新規ユーザーを登録 | 201、`role` が `General` | 期待どおり（10/19 11:14、本人報告） | 確認済み |
| 13 | 12 と同じユーザー名で、もう一度登録 | 409（「そのユーザー名は、すでに使われています。」） | 期待どおり（10/19 11:18、本人報告） | 確認済み |
| 14 | パスワード7文字で登録 | 400（日本語のメッセージ） | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 15 | ユーザー名に全角や空白を入れて登録 | 400（日本語のメッセージ） | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 16 | 改ざんしたトークン（末尾の1文字を変える）で `GET /employees` | 401 | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 17 | 登録直後のユーザーで、ログインして `GET /employees` | 200 | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 18 | `docker compose down`（`-v` なし）→ `up` の後、`admin` でログイン | 200（ユーザーが残っている） | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 19 | `GET /`（ブラウザでルートを開く） | `/scalar` に転送される（認証不要） | 期待どおり（10/19 11:23、本人報告：一連の確認を実施） | 確認済み |
| 20 | Scalar に Authentication（Bearer）の欄が出る | 出る | 出た（10/19 11:52、本人報告） | 確認済み |
| 21 | トークンを1回貼って、`GET /employees` が手動のヘッダーなしで通る | 200、Request Headers に `authorization: Bearer ...` | 200 が返った（10/19 11:55、本人報告） | 確認済み |
| 22 | 401・403 の応答が、日本語の JSON（ProblemDetails）で返る | 401「ログインが必要です。」、403「この操作を行う権限がありません。」 | 期待どおり（10/19 12:03、本人報告） | 確認済み |

---

## 6. 発生した問題と対処

> 問題が起きたら、ここに追記する（エラーメッセージ、原因、対処、かかった時間）。
> 45分以上かかったら、プランB（APIキー認証）への切り替えを検討する。

| 日時 | 問題 | 原因 | 対処 | かかった時間 |
|---|---|---|---|---|
| 10/19 | `dotnet ef` が見つからない | Dev Container を作り直したため、グローバルツール `dotnet-ef` が消えていた | `dotnet tool update --global dotnet-ef` で再インストール | 数分 |
| 10/19 | `dotnet build` で `CS1061` が5件（`EmployeeDb` に `Users` がない） | `EmployeeDb` に `DbSet<User> Users` を追加していなかった。5件とも同じ原因 | `public DbSet<User> Users => Set<User>();` と `OnModelCreating` を追加 | 数分 |
| 10/19 | （参考）Scalar の Headers の場所が分からなかった | Scalar のレスポンス欄の「Request Headers／Response Headers」に出る。F12 の Network タブでも見られる | 画面で確認（登録 201 の結果で確認） | 数分 |
| 10/19 | 管理者（`admin`）のトークンで `POST /employees` が 403 になる（自動テストで発見。トークンの `role` は `Admin` で正しい） | `AddJwtBearer` で `RoleClaimType = "role"` を指定しているが、`MapInboundClaims`（既定は true）で、`role` が `ClaimTypes.Role` の長い名前に変換され、`RequireRole` が一致しない、と推定（10/19 12:45 時点）。なお、表7〜9の「確認済み」は、項目ごとの結果を見ずに記録したため、実際には未確認だった可能性がある | `AddJwtBearer` に `options.MapInboundClaims = false;` を追加。管理者の登録が 201、自動テストも成功（10/19 12:52） | 解決 |
| 10/19 | `devcontainer.json` に追加した `postCreateCommand` が動かなかった | `postCreateCommand` は、コンテナを**新しく作ったとき**にだけ動く。設定の書き換えだけでは動かない | 手で実行して回避。恒久対応は、`Rebuild Container` か、`postStartCommand` に変更 | — |

---

## 7. セキュリティ上の注意と、割り切り

| 項目 | 現状 | 本番に向けて |
|---|---|---|
| 署名の鍵 | 開発用のダミーを、`appsettings.Development.json` と `compose.yaml` の既定値に書いている | 本番では、環境変数 `Jwt__Key` で別の値を渡す。リポジトリに本物の鍵を入れない |
| 初期ユーザーのパスワード | 開発モードだけで作る、ダミーのパスワード | 本番では作らない（`IsDevelopment()` のときだけ動く） |
| 通信 | HTTP（暗号化なし） | 本番では HTTPS を使う。トークンが、通信の途中で盗まれる |
| トークンの無効化 | できない（有効期限が切れるまで有効） | 有効期限を短くする、リフレッシュトークンを検討する |
| ログイン失敗の制限 | なし | 「できたら」の項目。総当たり攻撃を防ぐため、将来対応する |
| 管理者の作成 | 画面からは作れない | 本番では、管理者を追加する手順（運用手順書）が必要 |
| Scalar と OpenAPI | 開発モードでのみ公開（認証は不要） | 本番では公開しない（現状どおり） |
| 検証用データ | すべてダミー | 実データ・顧客データは入れない（指示書の禁止事項） |

---

## 8. 用語メモ

| 用語 | 意味 |
|---|---|
| 認証（Authentication） | 「あなたは誰か」を確かめること（ログイン） |
| 認可（Authorization） | 「あなたに、その操作をする権限があるか」を確かめること |
| JWT | 署名つきのトークン。ユーザー名や権限が入っていて、改ざんされると検証に失敗する |
| ロール | 権限の種類。ここでは `Admin`（管理者）と `General`（一般） |
| ハッシュ化 | 元に戻せない形に変換すること。パスワードそのものを保存しないために使う |
| ソルト | ハッシュ化のときに足す、ランダムな値。同じパスワードでも、違うハッシュになる |
| 401 Unauthorized | ログインしていない、またはトークンが不正 |
| 403 Forbidden | ログインしているが、権限がない |
| 409 Conflict | すでに存在する（ユーザー名の重複など） |
| Bearer | 「このトークンの持ち主として扱ってほしい」という、Authorization ヘッダーの書き方 |

---

## 9. 参考

- ASP.NET Core の認証: https://learn.microsoft.com/ja-jp/aspnet/core/security/authentication/
- JWT bearer 認証: https://learn.microsoft.com/ja-jp/aspnet/core/security/authentication/configure-jwt-bearer-authentication
- 最小APIでの認可: https://learn.microsoft.com/ja-jp/aspnet/core/fundamentals/minimal-apis/security

---

## 10. 追加機能：ログイン失敗の制限、パスワードの変更・再設定
### 10-1. 設計

**ログイン失敗の制限（アカウントのロック）**

| 項目 | 内容 |
|---|---|
| 仕組み | `Users` テーブルに、`FailedLoginCount`（連続の失敗回数）と `LockoutEnd`（ロックが終わる日時、UTC）を追加 |
| ロックの条件 | 連続で **5回** 失敗すると、**15分間**ロックする（`Auth:MaxFailedAttempts`、`Auth:LockoutMinutes` で変更できる） |
| ロック中の動き | パスワードが合っていても、ログインさせない。**429**（`Retry-After` ヘッダー付き） |
| 成功したとき | 失敗の回数を 0 に戻す |
| 存在しないユーザー | 数えない。いつもの 401（ユーザーの存在を教えないため） |
| 割り切り | ロック中のユーザーには 429 を返すので、「そのユーザー名は存在する」と分かってしまう。学習用のため許容する（本番では、IP ごとの制限なども検討する） |

**パスワードの変更・再設定**

メールを送る環境（SMTP など）がなく、有料のサービスも使えないため、「メールで再設定のリンクを送る」方式は作らない。代わりに、次の2つにする。

| 機能 | エンドポイント | 権限 | 内容 |
|---|---|---|---|
| 変更（本人） | `POST /auth/change-password` | ログイン済み | 現在のパスワードと、新しいパスワードを送る。成功で 204。現在のパスワードが違う、または新旧が同じなら 400 |
| ユーザーの一覧 | `GET /auth/users` | 管理者 | 再設定で使う ID を調べる。`lockedUntil`（ロック中なら日時）が分かる。パスワードは返さない |
| 再設定（管理者） | `POST /auth/users/{id}/reset-password` | 管理者 | 新しいパスワードに置き換える。**ロックも解除**する。成功で 204。ID がなければ 404 |

- 新しいパスワードは、登録のときと同じ規則（8〜100文字）。
- **割り切り**: パスワードを変えても、すでに発行したトークンは、有効期限（60分）まで使える（JWT は、サーバー側で取り消せないため）。
- **割り切り**: 再設定のあと、ユーザーに「次回ログイン時に変更させる」仕組みは作らない。

### 10-2. 変更するファイル

| 区分 | ファイル | 内容 | 状態 |
|---|---|---|---|
| 変更 | `User.cs` | `User` に2項目、`ChangePasswordRequest`、`ResetPasswordRequest` を追加 | 組み込み済み。テスト成功（10/19 13:18） |
| 変更 | `AuthEndpoints.cs` | ロックの処理、`/auth/change-password`、`/auth/users`、`/auth/users/{id}/reset-password` | 組み込み済み。テスト成功（10/19 13:18） |
| 追加 | マイグレーション `AddLoginLockout` | `Users` に `FailedLoginCount`、`LockoutEnd` を追加 | 作成済み（テスト成功） |
| 新規 | `AuthPasswordTests.cs`（テスト） | 16件 | 全件成功（10/19 13:18） |

### 10-3. 手順

- [ ] 1. `User.cs`、`AuthEndpoints.cs` を差し替える
- [ ] 2. マイグレーションを作る: `dotnet ef migrations add AddLoginLockout`
- [ ] 3. `dotnet build`
- [ ] 4. `AuthPasswordTests.cs` をテストフォルダに置く → `dotnet test EmployeeApi.slnx`
- [ ] 5. `docker compose down`（`-v` は付けない）→ `docker compose up --build` → 下の表を、Scalar で確認する
- [ ] 6. README を Ver1.07 にする（`README_Ver1.07.md` 作成済み）、`Issue.md` を更新する、コミットする

### 10-4. 動作確認

| # | 操作 | 期待する結果 | 実際の結果 | 状態 |
|---|---|---|---|---|
| 23 | 一般ユーザーを登録し、間違ったパスワードで5回ログイン | 5回とも 401 | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 24 | 6回目に、正しいパスワードでログイン | 429（「一時的にロックしています」）、`Retry-After` が付く | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 25 | `admin` で `GET /auth/users` | 200。そのユーザーの `lockedUntil` に日時が入っている | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 26 | `admin` で `POST /auth/users/{id}/reset-password` | 204 | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 27 | 新しいパスワードでログイン | 200（ロックも解除されている） | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 28 | 一般ユーザーでログインし、`POST /auth/change-password` | 204 | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 29 | 変更前のパスワードでログイン | 401 | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 30 | 現在のパスワードを間違えて変更 | 400（日本語のメッセージ） | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 31 | 一般ユーザーで `GET /auth/users` と reset-password | 403 | 自動テストで確認（10/19 13:18、本人報告：全件成功）。Scalar での手動確認は未実施 | 確認済み（テスト） |
| 32 | 自動テスト（既存21件＋追加16件） | 全件成功 | 全件成功（10/19 13:18、本人報告） | 確認済み |

### 10-5. 発生した問題と対処

特に無し。