using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Text.Json.Nodes;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

// builder：アプリの部品（サービス）を登録するための準備役
var builder = WebApplication.CreateBuilder(args);

// CORS設定：このポリシー名で、画面側のオリジンを許可する
const string AllowFrontend = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowFrontend, policy =>
        policy.WithOrigins(
                "http://localhost:5174",   // ※相手の画面のURLに合わせて変更
                "http://localhost:3000",
                "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// EmployeeDbをDIコンテナーに登録する。データはSQL Serverに保存する
builder.Services.AddDbContext<EmployeeDb>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
    
// エラーの返事（400・404・500 など）を、日本語の ProblemDetails にそろえる
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = ctx => JapaneseProblemDetails.Apply(ctx.ProblemDetails));
// 開発中も、本番と同じように、不正なリクエスト（JSONの形式不正など）は、例外にせず 400 で返す
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);

// パスワードのハッシュ化と、トークンの作成
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<JwtTokenService>();

// 認証（トークンの検証）と権限
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key が設定されていません。");
var jwtIssuer = jwt["Issuer"];
var jwtAudience = jwt["Audience"];
var jwtExpireMinutes = jwt.GetValue<int?>("ExpireMinutes") ?? 60;
var maxFailedAttempts = builder.Configuration.GetValue("Auth:MaxFailedAttempts", 5);
var lockoutMinutes = builder.Configuration.GetValue("Auth:LockoutMinutes", 15);
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key はUTF-8で32バイト以上にしてください。");
if (string.IsNullOrWhiteSpace(jwtIssuer))
    throw new InvalidOperationException("Jwt:Issuer が設定されていません。");
if (string.IsNullOrWhiteSpace(jwtAudience))
    throw new InvalidOperationException("Jwt:Audience が設定されていません。");
if (jwtExpireMinutes is < 1 or > 1440)
    throw new InvalidOperationException("Jwt:ExpireMinutes は1〜1440で設定してください。");
if (maxFailedAttempts is < 1 or > 20)
    throw new InvalidOperationException("Auth:MaxFailedAttempts は1〜20で設定してください。");
if (lockoutMinutes is < 1 or > 1440)
    throw new InvalidOperationException("Auth:LockoutMinutes は1〜1440で設定してください。");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // 追加：roleやnameを長い名前に変換しない
        options.TokenValidationParameters = new TokenValidationParameters // トークンの検証ルールを設定する
        {
            ValidateIssuer = true, // 発行者の検証の有効/無効(true/false)
            ValidIssuer = jwtIssuer, // 有効な発行者の設定
            ValidateAudience = true, // 受信者の検証の有効/無効(true/false))
            ValidAudience = jwtAudience, // 有効な受信者の設定
            ValidateIssuerSigningKey = true, // 署名鍵の検証の有効/無効(true/false)
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), // 署名鍵の設定
            ValidateLifetime = true, // 有効期限の検証の有効/無効(true/false)
            ClockSkew = TimeSpan.FromMinutes(1), // 1分の猶予を設定（トークンの有効期限が切れる直前に検証される場合に備える）
            NameClaimType = "name", // ユーザー名のクレームタイプを設定（デフォルトは "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" で長い）
            RoleClaimType = "role" // 役割のクレームタイプを設定（デフォルトは "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" で長い）
        };
        options.Events = AuthErrorEvents.Create();
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole(Roles.Admin));

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new()
        {
            Title = "社員スキル管理API",
            Version = "v1",
            Description = "社員の氏名・所属・スキルを管理するAPI"
        };
        return Task.CompletedTask;
    });
    // Scalarに Authorize（Bearer）の入力欄を出す
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();

    // Scalarのリクエストボディの初期入力（入力例）を指定する
    options.AddSchemaTransformer((schema, context, cancellationToken) =>
    {
        // Employee のときだけ、入力例を付ける
        if (context.JsonTypeInfo.Type == typeof(EmployeeRequest))
        {
            schema.Examples = new List<JsonNode>
            {
                new JsonObject
                {
                    ["name"] = "山田 太郎",
                    ["department"] = "開発部",
                    ["skills"] = new JsonArray(
                        new JsonObject { ["name"] = "C#" },
                        new JsonObject { ["name"] = "SQL" })
                }
            };
        }
        return Task.CompletedTask;
    });
});



// 登録内容を確定して、アプリ本体(app)を作る。以降はappに設定していく
var app = builder.Build();
using (var scope = app.Services.CreateScope()) 
{
    var db = scope.ServiceProvider.GetRequiredService<EmployeeDb>();
    if (!app.Environment.IsEnvironment("Testing"))
    {
        db.Database.Migrate();
    }

    // 開発モードのときだけ、動作確認用のダミーデータを登録する
    if (app.Environment.IsDevelopment())
    {
        await DbSeeder.SeedAsync(db);
        await DbSeeder.SeedUsersAsync(
            db,
            scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(),
            builder.Configuration);
    }
}

// 予期しない例外（500）と、本文が空のエラー（404 など）を、日本語の ProblemDetails にする
app.UseExceptionHandler();
app.UseStatusCodePages();

// CORSを有効にする（エンドポイントの定義より前に置く）
app.UseCors(AllowFrontend);

// 開発中だけ、仮のWeb UI（wwwroot/ui）を公開する 渡邊さんの画面と連携するときはここを消す
if (app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}
app.UseAuthentication();
app.UseAuthorization();

// 開発中だけ、API仕様と試用画面を公開する（本番で公開すると、APIの構造が外から見えてしまうため）
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); //MapOpenApiメソッドを使用して、API仕様のJSONを公開する。Scalarがこれを読む
    app.MapScalarApiReference(); //MapScalarApiReferenceメソッドを使用して、ブラウザで仕様を確認したり、APIを試す事ができる画面を公開する。
    // 毎回/scalarの手打ちがめんどくさいのでリダイレクト追加
    // ルートにアクセスしたら、Scalar（試用画面）へ転送する
    app.MapGet("/", () => Results.Redirect("/scalar", permanent: false))
       .ExcludeFromDescription();   // API仕様（Scalar）の一覧に表示しない

}


// 認証・権限
app.MapAuthEndpoints();   // /auth/register、/auth/login、/auth/change-password、/auth/users、/auth/users/{id}/reset-password

// /employees で始まるエンドポイントを、1つのグループにまとめる

var employees = app.MapGroup("/employees")
    .WithTags("社員")
    .RequireAuthorization();   // グループ全体：ログイン必須（未ログインは 401）

employees.MapPost("/", CreateEmployee) // 登録
    .RequireAuthorization("AdminOnly")   // 管理者のみ（一般ユーザーは 403）
    .WithSummary("社員を登録する")
    .WithDescription("氏名・所属・スキルを送ると、社員を1名登録する（管理者のみ）");
employees.MapGet("/", GetAllEmployees) // 一覧
    .WithSummary("社員の一覧を取得する");
employees.MapGet("/search", SearchEmployees) // キーワード検索
    .WithSummary("社員を検索する")
    .WithDescription("氏名・所属・スキルのどれかにキーワードが含まれる社員を返す。キーワードはクエリパラメータで指定する");
employees.MapPut("/{id}", UpdateEmployee) // ID指定で1件を、全項目を送って更新
    .RequireAuthorization("AdminOnly")   // 管理者のみ
    .WithSummary("社員を更新する")
    .WithDescription("ID指定で1件を、全項目を送って更新（管理者のみ）");
employees.MapDelete("/{id}", DeleteEmployee) // ID指定で1件を削除
    .RequireAuthorization("AdminOnly")   // 管理者のみ
    .WithSummary("社員を削除する")
    .WithDescription("ID指定で1件を削除する（管理者のみ）");


app.Run();

// 登録

static async Task<IResult> CreateEmployee(EmployeeRequest request, EmployeeDb db)
{
    var errors = InputValidator.Validate(request);
    if (errors.Count > 0)
        return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

    var employee = ToEmployee(request);
    db.Employees.Add(employee);
    await db.SaveChangesAsync();
    return TypedResults.Created($"/employees/{employee.Id}", employee);
}

// 一覧
static async Task<IResult> GetAllEmployees(EmployeeDb db)
{
    return TypedResults.Ok(await db.Employees.Include(e => e.Skills).ToListAsync());
}

// 検索。氏名・所属・スキルのどれかにキーワードが含まれる社員を返す
static async Task<IResult> SearchEmployees(string keyword, EmployeeDb db)
{
    var result = await EmployeeSearch.SearchAsync(db, keyword);
    return TypedResults.Ok(result);
}

// ID指定で1件を更新する。見つからなければ404。
static async Task<IResult> UpdateEmployee(int id, EmployeeRequest request, EmployeeDb db)
{

    var errors = InputValidator.Validate(request);
    if (errors.Count > 0)
        return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

    /* Include無しのままClear()で更新すると、スキルが削除されないので、Includeを付ける必要がある
    var emp = await db.Employees.FindAsync(id);
    */
    var emp = await db.Employees
        .Include(e => e.Skills)
        .FirstOrDefaultAsync(e => e.Id == id); // ID指定で1件を取得する。見つからなければnullが返る。FindAsyncはIncludeが使えないので、FirstOrDefaultAsyncを使う。
    if (emp is null) return EmployeeNotFound();

    emp.Name = request.Name;
    emp.Department = request.Department;
    /*一致したスキルだけでなく、更新をしたいので古いスキルを削除し、新しいスキルを追加するようにする為、削除
    emp.Skills = employee.Skills;
    */
    // 古いスキルを削除する
    emp.Skills.Clear();
    // 新しいスキルを追加する　
    foreach (var skill in request.Skills!) // foreachで1件ずつ追加する。foreach文は、配列やリストなどのコレクション（複数の要素をまとめて管理するデータ構造）内のすべての要素に対して、順番に同じ処理を繰り返し実行するための構文
    {
        emp.Skills.Add(new Skill { Name = skill.Name });
    }

    await db.SaveChangesAsync();
    return TypedResults.NoContent();
}

// 削除。見つかれば削除して204、なければ404 NotFoundを返す
static async Task<IResult> DeleteEmployee(int id, EmployeeDb db)
{
    if (await db.Employees.FindAsync(id) is Employee emp)
    {
        db.Employees.Remove(emp);
        await db.SaveChangesAsync();
        return TypedResults.NoContent();
    }

    return EmployeeNotFound();
}

// 該当の社員がいないときの返事（404）
static IResult EmployeeNotFound() =>
    TypedResults.Problem(title: "指定した社員は見つかりません。", statusCode: StatusCodes.Status404NotFound);

static Employee ToEmployee(EmployeeRequest request) => new()
{
    Name = request.Name,
    Department = request.Department,
    Skills = request.Skills!.Select(skill => new Skill { Name = skill.Name }).ToList()
};

public partial class Program { }