# Employee API

社員管理とJWT認証を提供するASP.NET Core 10 APIです。SQL Serverを利用します。

## ローカル起動（Docker Compose）

APIの署名鍵・DBパスワード・開発用管理者パスワードは、ソースや設定ファイルに保存しません。

1. `.env.example` を `.env` にコピーして、4つの値を個別に強い値へ置き換えます。
2. 次のコマンドでSQL ServerとAPIを起動します。

```powershell
Copy-Item .env.example .env
# .env のプレースホルダーを編集してから実行
docker compose up --build
```

APIは `http://localhost:8080` で利用できます。このCompose設定は開発用であり、本番環境では使用しないでください。

## APIを直接起動する場合

SQL ServerをComposeで起動し、JWT鍵・DB接続文字列・開発用管理者情報を.NET User Secretsに設定します。

```powershell
docker compose up -d db
dotnet user-secrets init --project EmployeeApi.csproj
$jwtKey = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
dotnet user-secrets set "Jwt:Key" $jwtKey --project EmployeeApi.csproj
dotnet user-secrets set "Jwt:Issuer" "EmployeeApi" --project EmployeeApi.csproj
dotnet user-secrets set "Jwt:Audience" "EmployeeApiClients" --project EmployeeApi.csproj
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=EmployeeDb;User Id=sa;Password=YOUR_LOCAL_SQL_PASSWORD;TrustServerCertificate=True" --project EmployeeApi.csproj
dotnet user-secrets set "Auth:SeedAdmin:UserName" "YOUR_LOCAL_ADMIN_USERNAME" --project EmployeeApi.csproj
dotnet user-secrets set "Auth:SeedAdmin:Password" "YOUR_UNIQUE_LOCAL_ADMIN_PASSWORD" --project EmployeeApi.csproj
dotnet run --project EmployeeApi.csproj --urls http://localhost:5200
```

User Secretsを初期化済みの場合は `dotnet user-secrets init` を再実行する必要はありません。JWT鍵はUTF-8で32バイト以上にしてください。開発用管理者は明示的な設定が必要で、既定の認証情報はありません。

## 認証・権限・入力検証

- `POST /auth/login` は署名済みHS256 JWTを発行します。署名・issuer・audience・有効期限をAPIが検証します。
- 社員APIはログイン必須です。社員の登録・更新・削除、ユーザー一覧、パスワード再設定は `Admin` のみ実行できます。公開登録で作成されるロールは `General` 固定です。
- パスワードはASP.NET Core Identityのハッシュで保存します。アカウントロック中も、ユーザー未登録・認証失敗と同じ401応答にして、ユーザー名の推測を抑えます。
- 登録/ログインの項目長と社員入力をAPI側でも検証し、日本語のProblem Detailsと項目別エラーを返します。社員のDB IDやスキルの外部キーを入力に使うことはできません。
- 画面上のロール判定は表示制御にすぎません。認可は必ずAPI側で行います。
- 開発用の管理者シードは `Development` 環境のみです。本番ではDevelopment環境にせず、別途安全に管理者を初期登録してください。

## テスト

リポジトリのルートからAPIのxUnitテストを実行します。

```powershell
dotnet test EmployeeApi1\EmployeeApi.Tests\EmployeeApi.Tests.csproj
```
