using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace EmployeeApi.Tests;

/// <summary>
/// 認証・権限のテスト用に、APIをメモリ上で起動する土台。
/// ・DBは、SQL Server ではなく、メモリ上の SQLite に差し替える
/// ・環境は "Testing"（Program.cs の Migrate／シードは Development だけなので、動かない）
/// ・テスト用のユーザー（admin／user）は、ここで作る
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string AdminName = "test-admin";
    public const string AdminPassword = "Admin_Passw0rd!";
    public const string UserName = "test-user";
    public const string UserPassword = "User_Passw0rd!";

    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public ApiFactory()
    {
        // Program.cs が起動時に設定を読むので、環境変数で先に渡す（確実に効く）
        Environment.SetEnvironmentVariable("Jwt__Key", "test-only-secret-key-0123456789abcdef0123");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "EmployeeApi");
        Environment.SetEnvironmentVariable("Jwt__Audience", "EmployeeApi");
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Server=unused");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // SQL Server 用の EmployeeDb の登録を、すべて外す
            var targets = services
                .Where(d => d.ServiceType.IsGenericType
                            && d.ServiceType.GetGenericArguments().Contains(typeof(EmployeeDb)))
                .ToList();
            foreach (var d in targets) services.Remove(d);

            // メモリ上の SQLite に差し替える
            services.AddDbContext<EmployeeDb>(o => o.UseSqlite(_connection));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        // テーブルを作り、テスト用のユーザーを入れる
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmployeeDb>();
        db.Database.EnsureCreated();

        var hasher = new PasswordHasher<User>();
        var admin = new User { UserName = AdminName, Role = Roles.Admin };
        admin.PasswordHash = hasher.HashPassword(admin, AdminPassword);
        var general = new User { UserName = UserName, Role = Roles.General };
        general.PasswordHash = hasher.HashPassword(general, UserPassword);
        db.Users.AddRange(admin, general);
        db.SaveChanges();

        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

public class AuthApiTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthApiTests(ApiFactory factory) => _factory = factory;

    // ---- 補助 ----

    private async Task<string> LoginAsync(string userName, string password)
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/auth/login", new { userName, password });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("accessToken").GetString()!;
    }

    private async Task<HttpClient> ClientWithTokenAsync(string userName, string password)
    {
        var token = await LoginAsync(userName, password);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static object NewEmployee() => new
    {
        name = "テスト 太郎",
        department = "開発部",
        skills = new[] { new { name = "C#" } }
    };

    // ---- ログイン ----

    [Fact]
    public async Task Login_Success_ReturnsTokenAndRole()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/login",
            new { userName = ApiFactory.UserName, password = ApiFactory.UserPassword });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(json.GetProperty("accessToken").GetString()));
        Assert.Equal("General", json.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/login",
            new { userName = ApiFactory.UserName, password = "Wrong_Passw0rd!" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownUser_Returns401()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/login",
            new { userName = "no-such-user", password = "Whatever_Passw0rd!" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- ユーザー登録 ----

    [Fact]
    public async Task Register_NewUser_Returns201AsGeneral()
    {
        var client = _factory.CreateClient();
        var name = "reg" + Guid.NewGuid().ToString("N")[..12];

        var res = await client.PostAsJsonAsync("/auth/register",
            new { userName = name, password = "Valid_Passw0rd!", role = Roles.Admin });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("General", json.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Register_LongPassword_Returns400WithJapaneseFieldErrors()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/register",
            new { userName = "long" + Guid.NewGuid().ToString("N")[..8], password = new string('p', 101) });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("入力内容に誤りがあります。", json.GetProperty("title").GetString());
        Assert.True(json.GetProperty("errors").TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task Login_OversizedCredentials_Returns400WithJapaneseFieldErrors()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/login",
            new { userName = new string('u', 51), password = new string('p', 101) });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("入力内容に誤りがあります。", json.GetProperty("title").GetString());
        Assert.True(json.GetProperty("errors").TryGetProperty("UserName", out _));
        Assert.True(json.GetProperty("errors").TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task Register_DuplicateUserName_Returns409()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/register",
            new { userName = ApiFactory.UserName, password = "Valid_Passw0rd!" });

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Register_ShortPassword_Returns400()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/register",
            new { userName = "short" + Guid.NewGuid().ToString("N")[..8], password = "1234567" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Register_InvalidUserName_Returns400()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/auth/register",
            new { userName = "全角 名前", password = "Valid_Passw0rd!" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // ---- 権限（401／403） ----

    [Fact]
    public async Task GetEmployees_NoToken_Returns401WithJapaneseTitle()
    {
        var client = _factory.CreateClient();

        var res = await client.GetAsync("/employees");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ログインが必要です。", json.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetEmployees_TamperedToken_Returns401()
    {
        var token = await LoginAsync(ApiFactory.UserName, ApiFactory.UserPassword);
        // 末尾の1文字を変えて、署名を壊す
        var tampered = token[..^1] + (token[^1] == 'A' ? 'B' : 'A');
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tampered);

        var res = await client.GetAsync("/employees");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GeneralUser_GetEmployees_Returns200()
    {
        var client = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await client.GetAsync("/employees");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task GeneralUser_PostEmployee_Returns403WithJapaneseTitle()
    {
        var client = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await client.PostAsJsonAsync("/employees", NewEmployee());

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("この操作を行う権限がありません。", json.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GeneralUser_DeleteEmployee_Returns403()
    {
        var client = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await client.DeleteAsync("/employees/1");

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Admin_PostEmployee_Returns201()
    {
        // ログイン結果の role を確認する
        var loginClient = _factory.CreateClient();
        var loginRes = await loginClient.PostAsJsonAsync("/auth/login",
            new { userName = ApiFactory.AdminName, password = ApiFactory.AdminPassword });
        var loginJson = await loginRes.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginJson.GetProperty("accessToken").GetString()!;
        var role = loginJson.GetProperty("role").GetString();

        // トークンの中身（payload）を読む
        var payload = token.Split('.')[1].Replace('-', '+').Replace('_', '/');
        payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        var payloadText = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await client.PostAsJsonAsync("/employees", NewEmployee());
        var body = await res.Content.ReadAsStringAsync();

        Assert.True(res.StatusCode == HttpStatusCode.Created,
            $"status={res.StatusCode} loginRole={role} payload={payloadText} body={body}");
    }

    // ---- 管理者の更新・削除（PUT／DELETE） ----

    // 管理者で社員を1名登録し、その id を返す（更新・削除のテスト用）
    private async Task<int> CreateEmployeeAsAdminAsync()
    {
        var admin = await ClientWithTokenAsync(ApiFactory.AdminName, ApiFactory.AdminPassword);
        var res = await admin.PostAsJsonAsync("/employees", NewEmployee());
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task Admin_PutEmployee_Returns204()
    {
        var id = await CreateEmployeeAsAdminAsync();
        var admin = await ClientWithTokenAsync(ApiFactory.AdminName, ApiFactory.AdminPassword);

        var res = await admin.PutAsJsonAsync($"/employees/{id}", new
        {
            name = "更新 花子",
            department = "営業部",
            skills = new[] { new { name = "Excel" } }
        });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
    }

    [Fact]
    public async Task Admin_DeleteEmployee_Returns204()
    {
        var id = await CreateEmployeeAsAdminAsync();
        var admin = await ClientWithTokenAsync(ApiFactory.AdminName, ApiFactory.AdminPassword);

        var res = await admin.DeleteAsync($"/employees/{id}");

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
    }

    [Fact]
    public async Task Admin_DeleteEmployee_NotFound_Returns404()
    {
        var admin = await ClientWithTokenAsync(ApiFactory.AdminName, ApiFactory.AdminPassword);

        var res = await admin.DeleteAsync("/employees/999999");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GeneralUser_PutEmployee_Returns403()
    {
        var id = await CreateEmployeeAsAdminAsync();
        var general = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await general.PutAsJsonAsync($"/employees/{id}", NewEmployee());

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}