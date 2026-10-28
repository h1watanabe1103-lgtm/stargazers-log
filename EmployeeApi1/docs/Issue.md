# 作業記録（Issue）2026-10-16〜10-19

> GitHubアカウント凍結中のため、Issue・Projectsの代わりにローカルで管理する。
> 復旧後に、下記を GitHub の Issue に登録する。

## 本日の概要

指示書の10/20分（Docker化とSQL Serverへの移行）を前倒しで実施した。必達の項目は完了。

| # | タイトル | 状態 |
|---|---|---|
| 1 | APIのDocker化（Dockerfile、compose.yaml） | 完了 |
| 2 | DBをSQLiteからSQL Server（コンテナー）へ移行 | 完了 |
| 3 | マイグレーションの作り直し | 完了 |
| 4 | テストプロジェクトの修正 | 完了 |
| 5 | 初期データ（シード）の自動投入 | 完了 |
| 6 | README更新（Ver1.04） | 完了 |
| 7 | ローカルへのコミット | 完了 |
| 11 | ルート（/）から Scalar への自動転送 | 完了 |
| 12 | Scalar のリクエスト入力例を変更 | 完了 |
| 13 | 入力にnullを許容しない（入力チェック） | 完了 |
| 14 | エラーメッセージの日本語化 | 完了 |
| 15 | 脆弱性警告の解消（#9 の対応） | 完了（10/16〜19） |
| 16 | マイグレーションの重複整理と作り直し | 完了（10/19） |
| 17 | CI構築（ci.yml の作成） | ローカル確認完了（10/19）。Actions 上の確認は復旧後 |
| 18 | 認証・権限（JWT）の実装 | 実装済み・動作確認完了（10/19 11:23）（詳細は `Auth.md`） |
| 21 | エラーメッセージの日本語化（400・404・415・500） | 実装済み。組み込み・テスト待ち（10/19） |
| 20 | 仮のWeb UI（開発用、`wwwroot/ui`） | 完了（10/19 13:33） |
| 19 | ログイン失敗の制限、パスワードの変更・再設定 | 実装・テスト完了（10/19 13:18。`Auth.md` 第12章） |
| 8 | GitHubアカウント凍結（課題） | 未解決 |
| 9 | 脆弱性警告（課題） | 解消済み（#15 参照） |
| 10 | 登録時のID送信への対策（任意） | 未対応 |

---

## #1 APIのDocker化

- 状態: 完了
- 内容: マルチステージの `Dockerfile`（ビルド用 SDK、実行用 ASP.NET）、`compose.yaml`（api と db）、`.dockerignore`、`.env` を作成した。
- 完了条件: `docker compose up --build` でAPIとSQL Serverが起動する。
- 結果: 8080番でAPIが起動し、Scalar（`/scalar`）が開けることを確認した。
- 発生した問題と対処:
  - `no configuration file provided: not found` → `compose.yaml` のあるフォルダで実行していなかった。移動して解決。
  - `dotnet publish` が `EmployeeApi.Tests.csproj was not found`（MSB3202）で失敗 → ルートに `.slnx` があり、ソリューション全体を対象にしていた。`Dockerfile` で `EmployeeApi.csproj` を明示して解決。

## #2 DBをSQL Serverへ移行

- 状態: 完了
- 内容:
  - パッケージを `Microsoft.EntityFrameworkCore.Sqlite` から `Microsoft.EntityFrameworkCore.SqlServer` へ入れ替えた。
  - `Program.cs` の `UseSqlite` を `UseSqlServer`（接続文字列は設定から取得）に変更した。
  - `appsettings.Development.json` に `ConnectionStrings:DefaultConnection` を追加した。
  - `compose.yaml` で SQL Server 2022（Developer）を起動し、ボリューム `sqlserver-data` にデータを保存する。
  - ヘルスチェックで、DB起動後にAPIが起動する。
- 完了条件: Scalarからデータを登録でき、再起動後もデータが残る。
- 結果: 登録（201）と、`down` → `up` 後のデータ保持を確認した。
- 備考: `EmployeeSearch.cs` は変更不要だった。検索は、SQL Server の既定により大文字小文字を区別しなくなった。

## #3 マイグレーションの作り直し

- 状態: 完了
- 内容: SQLite用の `Migrations` と `employees.db` を削除し、`InitialSqlServer` を作成した。
- 発生した問題と対処:
  - `dotnet ef` が見つからない → `dotnet tool install --global dotnet-ef` で解決。
  - `The name 'InitialSqlServer' is used by an existing migration` → すでに作成済みだったため、作り直しは不要だった。

## #4 テストプロジェクトの修正

- 状態: 完了
- 内容: `EmployeeApi.Tests` に `Microsoft.EntityFrameworkCore.Sqlite` を追加した。
- 原因: 本体からSQLiteを外したため、テストが `SqliteConnection` を参照できなくなった（CS0234、CS0246）。
- 方針: テストは SQLite インメモリ、本番は SQL Server とする。

## #5 初期データ（シード）の自動投入

- 状態: 完了
- 内容: `DbSeeder.cs` を追加した。`Program.cs` で `Migrate()` の後に呼び出す。
  - 開発モード（Development）のときだけ動く。
  - DBが空のときだけ、ダミーの社員5名を登録する（再起動しても重複しない）。
  - `Migrate()` の重複ブロックを1つにまとめた。
- 発生した問題と対処:
  - `CS1022`（Program.cs 57行目）→ ブロックをまとめた際に `}` が余っていた。修正して解決。
  - Dev Container内の `dotnet run` で、SQL Serverに接続できなかった → `localhost` がコンテナ自身を指すため。`docker compose up --build` で起動して解決。
- 結果: `GET /employees` で5名が返り、再起動しても重複しないことを確認した。

## #6 README更新（Ver1.04）

- 状態: 完了
- 内容:
  - 起動方法を、方法A（DBだけDocker＋`dotnet run`、5200）と方法B（Docker Compose、8080）に整理した。
  - DBの記述を SQL Server に変更し、`.env`、ボリューム、`down -v` の説明を追記した。
  - トラブルシューティングを追加した（`no configuration file provided`、`IDENTITY_INSERT`、`Login failed`、ポート1433の競合など）。
  - 初期データの自動登録について追記した。
- 備考: リポジトリに置くときは `README.md` に名前を変える。

## #7 ローカルへのコミット

- 状態: 完了
- 内容: GitHubは使わず、ローカルのgitにコミットした。`.env` はコミット対象から除外した。
- 備考: `push` は、GitHub復旧後に実施する。

---

## 追加対応

### #11 ルート（/）から Scalar への自動転送

- 状態: 完了
- 内容: 開発モードのとき、`/` にアクセスすると `/scalar` へ転送する。`ExcludeFromDescription()` で、API仕様には載せない。
- 発生した問題と対処: `AmbiguousMatchException`（`GET /scalar/{documentName?}` が重複）→ `MapScalarApiReference()` が2回登録されていた。開発モードのブロックを1つにして解決。

### #12 Scalar のリクエスト入力例を変更

- 状態: 完了
- 内容: `AddSchemaTransformer` で、`Employee` の入力例（山田 太郎、スキル C#・SQL）を指定した。`id` と `employeeId` を含めないので、そのまま送信してもエラーにならない。
- 発生した問題と対処: `CS0618`（`OpenApiSchema.Example` は非推奨）→ `schema.Examples = new List<JsonNode> { ... }` に変更して解消。

### #13 入力にnullを許容しない（入力チェック）

- 状態: 完了
- 内容:
  - `Employee.Name`、`Employee.Department`、`Skill.Name` を `string`（非null）にし、`[Required]`、`[StringLength(100)]` を付けた。
  - DBの列が NOT NULL になるため、マイグレーションを追加した（`dotnet ef migrations add RequireNameAndDepartment`）。
  - `InputValidator.cs` を追加し、`CreateEmployee` と `UpdateEmployee` の最初で呼び出す。属性に従って、`Employee` と、その中の `Skill` を検査する。
  - `EmployeeSearch.cs` の `!` を外した。
  - `Skill.EmployeeId` の `[Required]` は外した（`int` には効かず、クライアントが送る項目でもないため）。
- 発生した問題と対処:
  - `department` を `""` で送ると 201 になった（入力チェックが効いていなかった）。`builder.Services.AddValidation();` が抜けていたのが原因の1つ。追加しても効かなかったため、`InputValidator`（`Validator.TryValidateObject` を使う方式）に切り替えた。
  - `department` を `null` で送ると、チェックをすり抜けて DB の NOT NULL 制約に当たり、500 エラーになった。
  - `AddSchemaTransformer` の `if (context.JsonTypeInfo.Type == typeof(Employee))` が抜けており、入力例がすべての型に付いていた。条件を戻して解消。
- 結果: `name` が `null`、`department` が `""` のとき、400 が返ることを確認した。
- 備考: `AddValidation()`（.NET 10 の最小API機能）は、`Program.cs` 内の最上位の関数をエンドポイントに使う書き方では、検出されない可能性がある。今回は、確実に動く `InputValidator` を採用した。

### #14 エラーメッセージの日本語化

- 状態: 完了
- 内容: `[Display(Name = "氏名")]` と `[Required(ErrorMessage = "{0}は必須です。")]` などで、`errors` のメッセージを日本語にした。`TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。")` で、`title` も日本語にした。
- 結果: メッセージが日本語で返ることを確認した。
- 制限: JSONの形式不正、型の不一致のエラーは、フレームワーク側の英語のまま。エラー返却の共通化は、10/22〜23の入力チェックの実装で対応する。

### #15 脆弱性警告の解消

- 状態: 完了
- 内容: `dotnet add package System.Security.Cryptography.Pkcs` で、`10.0.13` を直接追加した（経由で入っていた `9.0.11` より優先される）。`EmployeeApi.csproj` に `PackageReference` が1行増える。
- 結果: `dotnet build` に、NU1902、NU1903 が出なくなったことを確認した。

### #16 マイグレーションの重複整理と作り直し

- 状態: 完了（10/19）
- 経緯:
  - 名前が `errormassageoutput`（小文字のみ・typo）で、警告 `CS8981` が出た。
  - `dotnet ef migrations remove --force` が、`Cannot allocate memory`（メモリ不足）で途中で止まり、`.cs` だけが消えて `.Designer.cs` が残った（`CS0115`）。
  - 同じ名前 `RequireNameAndDepartment` を2回作ってしまい、`CS0111`（`Up`／`Down` の重複）が出た。
  - Dev Container が起動しなくなり（Docker Desktop の停止、メモリ不足）、整理が中断した。
  - 10/19 に `dotnet ef migrations list` を実行すると `No migrations were found.` と出た（スナップショットだけが残り、マイグレーションのファイルはない状態）。
- 対処: `Migrations` フォルダを削除し（スナップショットも含む）、`dotnet ef migrations add InitialSqlServer` で作り直した。
- 結果:
  - `dotnet ef migrations list` で `20261019005842_InitialSqlServer` の1件だけを確認した。
  - 中身を確認した。`Employees.Name`・`Employees.Department`・`Skill.Name` が `nvarchar(100)`、`nullable: false` になっている。
- 補足:
  - EF ツール（10.0.12）がランタイム（10.0.13）より古いという警告が出る。動作に影響はない。`dotnet tool update --global dotnet-ef` で更新できる。
  - マイグレーション名は、PascalCase の英単語にする（小文字のみは `CS8981`）。
  - `dotnet ef` の実行前は、`docker compose down` で SQL Server を止めると、メモリ不足を避けられる。

### #17 CI構築（GitHub Actions）

- 状態: ローカル確認完了（GitHub Actions 上の実行確認は、復旧後）
- 内容: `.github/workflows/ci.yml` を作成した。
  - 実行のタイミング: `main` への push と、`main` 向けのプルリクエスト（無料枠の節約）。
  - `build-and-test` ジョブ: .NET 10 SDK の準備 → `restore` → `build`（Release）→ `test`。テストは SQLite のインメモリDBで動くので、SQL Server は不要。
  - `docker-build` ジョブ: `compose.yaml` の書式チェック（`docker compose config --quiet`）→ `docker build`。`build-and-test` が通ったときだけ実行。
- 制約: GitHubアカウント凍結のため、GitHub Actions 上での実行確認は、復旧後に行う（#8 参照）。
- ローカルでの確認結果（CIと同じ処理）:

| CIの処理 | ローカルのコマンド | 結果 |
|---|---|---|
| 復元・ビルド | `dotnet build`（Dev Container） | 成功 |
| 単体テスト（カバレッジ計測つき） | `dotnet test EmployeeApi.slnx --configuration Release --collect:"XPlat Code Coverage" --results-directory ./TestResults` | 成功（4件中4件成功、失敗0。`coverage.cobertura.xml` の作成を確認） |
| compose.yaml の書式チェック | `docker compose config --quiet` | 成功 |
| Docker イメージのビルド | `docker build -t employee-api:ci .` | 成功 |
| 起動・動作確認 | `docker compose up --build` → Scalar で確認 | 成功 |

- 発生した問題と対処:
  - `dotnet test`（Release）が `MSB3374`（`obj/Release/.../EmployeeApi.MvcApplicationPartsAssemblyInfo.cache` の更新時刻を設定できない、アクセス拒否）で失敗した。`obj` の所有者・権限は問題なし。`bin` と `obj`（本体とテストの両方）を削除して再実行し、解消した。原因は、前回のビルドの中間ファイルが、別のプロセスに掴まれていたこと、または途中で止まったビルドの残りと推定。CI（GitHub Actions）はきれいな状態から始まるので、影響しない。
  - `docker build` が `dotnet publish` で失敗した（`exit code: 1`）。原因は、マイグレーションの重複によるコンパイルエラーと推定。#16 の対処後、`dotnet build` は成功している。#16 の対処後に再実行し、成功した（最初の `docker build` は、末尾の `.` を付け忘れて引数エラーになっただけ）。
- 渡邊さんとの確認事項: 画面側のテスト（`npm test`）は、別ファイル `ci-frontend.yml` にする案。ファイルが別なら、変更が衝突しない（10/28 に追加予定）。
- カバレッジ（余裕があれば）: `ci.yml` に、計測（`--collect:"XPlat Code Coverage"`）、`reportgenerator` による集計、ジョブの Summary への表示、結果の保存（`coverage-report`）を追加した。ローカルでは、計測ファイルが作られることまで確認済み。Summary への表示は、GitHub 上でのみ確認できる（復旧後）。
- `.gitignore` に `TestResults/` と `coverage/` を追加する（計測結果をコミットしないため）。
- 復旧後にやること: `git push` → Actions タブでジョブが緑になることを確認 → 失敗したらログを見て直す（`setup-dotnet` の `10.0.x` が解決できない場合は、指定を直す）。
- メモ: VS Code で「GitHub Actions」拡張機能を勧められた。書き方のチェックと入力補完に便利。サインインは不要（凍結中のためスキップ）。

---

## #18 認証・権限（JWT）

- 状態: 実装・動作確認完了（10/19）。仕上げが残り
- 詳細: `Auth.md`
- 内容: ユーザー登録（`/auth/register`）、ログイン（`/auth/login`、JWT 発行）、権限（Admin／General）を追加した。`/employees` はログイン必須。登録・更新・削除は Admin のみ。パスワードは `PasswordHasher` でハッシュ化して保存。初期ユーザーは `admin`／`user`（開発環境のみ）。`Users` テーブルは、マイグレーション `AddUsers` で追加。
- 追加・変更: `User.cs`、`JwtTokenService.cs`、`AuthEndpoints.cs`、`DbSeeder.cs`、`EmployeeDb`、`Program.cs`、`compose.yaml`、`.env.example`、`appsettings.Development.json`。パッケージ `Microsoft.AspNetCore.Authentication.JwtBearer`。
- 動作確認（`Auth.md` 第5章の表、19項目すべて確認済み）:
  - 未ログイン → 401、一般ユーザーの登録・削除 → 403、管理者の登録 → 201
  - 誤ったパスワード → 401、ユーザー名の重複 → 409
  - 入力エラー → 400（日本語）、改ざんしたトークン → 401
  - 下の2項目（8、9、11、14〜19）は、一連の確認ができたとの報告で記録。個別の画面は未保存。
- 発生した問題と対処:
  - `dotnet ef` が見つからない → `dotnet tool update --global dotnet-ef`
  - `CS1061` ×5（`EmployeeDb` に `Users` がない）→ `DbSet<User>` と `OnModelCreating` を追加
  - `postCreateCommand` が動かない → コンテナの新規作成時だけ動く。手で実行。恒久対応は `postStartCommand`
- Scalar の Authorize: 完了（10/19 11:52。`BearerSecuritySchemeTransformer.cs` を追加し、`Program.cs` に `AddDocumentTransformer<BearerSecuritySchemeTransformer>()` を足した。Authentication の欄が出ることを確認）
- 401・403 の日本語化: 完了（10/19 12:03。`AuthErrorEvents.cs` を追加し、`AddJwtBearer` に `options.Events = AuthErrorEvents.Create();` を足した）
- 自動テスト: 完了（10/19 12:52。`AuthApiTests.cs` 17件＋既存4件＝全21件が成功）。テストが、管理者の登録が 403 になる不具合を発見した。原因は `MapInboundClaims`（`role` の名前が変換される）。`options.MapInboundClaims = false;` で解決。
- README Ver1.06: 作成済み（10/19）。認証と権限の章（初期ユーザー、権限の表、Scalar と curl の手順、エラー、設定）を追加。起動後の確認手順、CORS の画面側コード、curl の例、テストの章、トラブルシューティングも、ログイン前提に更新した。リポジトリでは `README.md` にして置く。
- 管理者の更新・削除の自動テスト（4件）: 追加済み、成功（10/19 13:04）。`Auth.md` 表8、9も確認済み。
- コミット: 完了（10/19 13:07。ローカルのみ。GitHub の凍結中なので push は復旧後）
- 残り: 10/23 中間報告メール

---

## #19 ログイン失敗の制限、パスワードの変更・再設定

- 状態: 実装・自動テスト完了（10/19 13:18。全件成功）。詳細は `Auth.md` 第12章
- 内容: 連続5回の失敗で15分ロック（429）。パスワードの変更（本人）と、再設定（管理者）。管理者用のユーザー一覧。
- 方針: メールを送る環境がなく、有料のサービスも使えないため、「メールで再設定」は作らない。
- 変更: `User.cs`、`AuthEndpoints.cs`、マイグレーション `AddLoginLockout`、テスト `AuthPasswordTests.cs`（16件）
- README: Ver1.07 作成済み（ロック、パスワードの変更・再設定、設定、トラブルシューティングを追加）
- 残り: Scalar での手動確認、コミット

---

## #20 仮のWeb UI（開発用）

- 状態: 完了（10/19 13:33）。組み込み済み。本物のAPIで、画面から、さまざまなエラーの表示まで確認した（本人報告）
- 目的: 渡邊さんの画面（React）が届くまで、開発中に、自分でも画面上でAPIを確認できるようにする。
- 内容: `wwwroot/ui/index.html`（1ファイル、外部の部品なし）。ログイン、ユーザー登録、社員の一覧・検索、登録・更新・削除（管理者）、パスワード変更、ユーザー一覧とパスワードの再設定（管理者）。権限がないときの 403 や、ロックの 429 も、日本語で表示する。
- 見る場所: `http://localhost:8080/ui/`（方法Aは `5200`）。**開発モードのときだけ**公開する。
- 変更: `Program.cs` に、`UseDefaultFiles()`／`UseStaticFiles()`（開発モードのみ）を追加。APIと同じ場所から配るので、CORS の設定は不要。
- 位置づけ: 仮置き。渡邊さんの画面が届いたら、そちらを使う。不要になれば、`wwwroot/ui` を消す。
- 確認: 疑似のAPIで、ログイン、一覧、登録、400 のメッセージ、ユーザー一覧、再読み込み後のログイン維持を確認。そのあと、本物のAPIで、画面から、さまざまなエラー（400、401、403 など）の表示を確認した（10/19 13:33、本人報告）。

---

## #21 エラーメッセージの日本語化（400・404・415・500）

- 状態: 実装済み（10/19 13:55）。組み込み・テストの結果待ち
- 内容: フレームワークが自動で作る、英語のエラーの返事を、日本語の ProblemDetails にそろえた。
  - 400: JSON の形式不正、項目の型の違い → 「リクエストの内容が正しくありません。」
  - 404: 存在しない社員の更新・削除 → 「指定した社員は見つかりません。」、存在しない URL → 「指定されたデータが見つかりません。」
  - 415: JSON 以外で送信 → 「送信するデータの形式が正しくありません。」
  - 500: 予期しない例外 → 「サーバーでエラーが発生しました。」（詳細は返さない。ログに出る）
- 自分で日本語のタイトルを付けたエラー（401・403・409・入力エラーの 400）は、上書きしない。
- 変更: `Program.cs`（`AddProblemDetails`、`ThrowOnBadRequest = false`、`UseExceptionHandler`、`UseStatusCodePages`、404 の返事）、`JapaneseProblemDetails.cs`（新規）、`ErrorResponseTests.cs`（新規、7件）
- 注意: 開発中も、500 は、画面に詳細を出さず、日本語のメッセージにする（詳細は、ログで見る）。
- 残り: 組み込み、テスト実行、README の「上記以外のエラーは英語」の記述を直す（次の README で）、コミット

---

## 課題（未解決）

### #8 GitHubアカウント凍結

- 状態: 問い合わせ中（復旧時期未定）
- 影響:
  - Issue・Projectsボードへの登録（10/19）
  - GitHub Actions の CI の実行確認（10/21）
  - GitHub Copilot の検証（10/28）
- 対応: Issueはこのファイルで代替する。CIは、YAMLを作成してローカルで同じコマンドを実行する。Copilotは、他の生成AIで代替する。
- 復旧後にやること: Issue登録、`git push`、CIの実行確認、Copilotの検証。
- 連絡: 本社担当者への共有、10/23の中間報告メールの共有事項への記載。

### #9 脆弱性警告

- 状態: 解消済み（#15 参照）
- 内容: `System.Security.Cryptography.Pkcs 9.0.11` に、重大度 high（GHSA-846f-f764-76mx）と moderate（GHSA-2fmv-rv2c-59x7）の警告（NU1902、NU1903）が出ていた。
- 対応: `10.0.13` を直接追加して解消した。
- 残り: テストプロジェクトと Docker のビルドでも、警告が出ないことの確認（#17 の確認で一緒に見る）。

### #10 登録時のID送信への対策（任意）

- 状態: 未対応
- 内容: Scalarの入力例の `id`、スキルの `employeeId` をそのまま送ると、SQL Server で 500 エラーになる（`IDENTITY_INSERT is set to OFF`、外部キー制約違反）。SQLite では、エラーにならなかった。
- 現状: `id` を送らなければ、問題なく登録できる。READMEに、「`id` は送らない」と記載した。
- 対応案: `CreateEmployee` と `UpdateEmployee` で、`Id = 0`、`EmployeeId = 0` に上書きする。または、リクエスト専用のクラス（DTO）を作る。10/22〜23の入力チェックの実装で、あわせて対応するのが効率的。

## 開発の流れ（メモ）

| 変更した内容 | マイグレーション | `down -v` | 起動 |
|---|---|---|---|
| エンドポイント、メッセージ、入力例、ロジックなど（DBに関係しない） | 不要 | 不要 | `docker compose up --build` |
| モデルの形（項目の追加・削除、`[Required]`、`[StringLength]`、型の変更） | 必要 | 必要な場合のみ | `docker compose up --build` |
| 初期データ（シード）の内容 | 不要 | 必要（DBが空のときだけ登録されるため） | `docker compose up --build` |

- マイグレーションの作成: `dotnet ef migrations add 名前`（`[Display]` や `ErrorMessage` だけの変更では不要）
- 変更の有無の確認: `dotnet ef migrations has-pending-model-changes`
- `-v` はデータが消えるので、毎回は付けない。
- `dotnet ef`、`dotnet build` は Dev Container 内、`docker compose` はホスト側の PowerShell で実行する。
- コマンドは `docker compose`（`dotnet compose` ではない）。

## 補足メモ

- `.devcontainer/DockerFile` は、`devcontainer.json` から参照されておらず未使用。また、`//` コメントがあるため、使うとエラーになる。削除するか、`#` に直す。
- Dev Container内からの `docker compose` は、`docker-outside-of-docker` の追加が必要。現状は、ホスト側のPowerShellで実行している。
- Dev Container内で `dotnet run` する場合は、接続先を `host.docker.internal,1433` にする必要がある。
- テストは SQLite、本番は SQL Server と、DBが異なる。DB固有の挙動の違い（自動採番、大文字小文字）に注意する。

## 次にやること

- [x] #17 のローカル確認（`dotnet test`、`docker compose config --quiet`、`docker build`、`docker compose up --build`）
- [x] 10/16 分と10/19 分の変更をコミットする（`git add .` → `git status` で `.env` が入っていないことを確認 → `git commit`）。`.github/workflows/ci.yml` を含める
- [x] README を Ver1.06 に置き換える（`README_Ver1.06.md` → `README.md`）
- [ ] `dotnet tool update --global dotnet-ef`（EF ツールの更新、任意）
- [ ] 本社担当者へのGitHub凍結の連絡
- [ ] 渡邊さんと、CI設定の置き場所（`ci.yml` と `ci-frontend.yml`）、API連携・CORSの確認
- [x] 認証の仕上げ（コミット）→ `Auth.md` 第8章
- [ ] 10/23 中間報告メール（18:00 まで）
- [ ] 10/20 以降の指示書のタスクへ（10/20 の Docker 化は前倒しで完了済み）
