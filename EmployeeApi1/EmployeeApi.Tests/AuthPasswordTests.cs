using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EmployeeApi.Tests;

/// <summary>
/// パスワードの変更・再設定と、ログイン失敗の制限（ロック）のテスト。
/// テスト用の土台（ApiFactory）は、AuthApiTests.cs にあるものを使う。
/// 各テストは、新しいユーザーを登録して使うので、他のテストに影響しない。
/// </summary>
public class AuthPasswordTests : IClassFixture<ApiFactory>
{
    private const string OldPassword = "Valid_Passw0rd!";
    private const string NewPassword = "Changed_Passw0rd!";

    private readonly ApiFactory _factory;

    public AuthPasswordTests(ApiFactory factory) => _factory = factory;

    // ---- 補助 ----

    // 新しいユーザーを登録して、ユーザー名とIDを返す
    private async Task<(string UserName, int Id)> RegisterAsync()
    {
        var name = "pw" + Guid.NewGuid().ToString("N")[..12];
        var res = await _factory.CreateClient().PostAsJsonAsync("/auth/register",
            new { userName = name, password = OldPassword });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return (name, json.GetProperty("id").GetInt32());
    }

    private Task<HttpResponseMessage> LoginAsync(string userName, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/auth/login", new { userName, password });

    private async Task<HttpClient> ClientWithTokenAsync(string userName, string password)
    {
        var res = await LoginAsync(userName, password);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("accessToken").GetString());
        return client;
    }

    private Task<HttpClient> AdminClientAsync() =>
        ClientWithTokenAsync(ApiFactory.AdminName, ApiFactory.AdminPassword);

    // 間違ったパスワードで、指定した回数だけログインを試す
    private async Task FailLoginAsync(string userName, int times)
    {
        for (var i = 0; i < times; i++)
        {
            var res = await LoginAsync(userName, "Wrong_Passw0rd!");
            Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        }
    }

    // ---- ログイン失敗の制限 ----

    [Fact]
    public async Task Login_FiveFailures_LocksAccountWithoutRevealingAccountExistence()
    {
        var (name, _) = await RegisterAsync();

        await FailLoginAsync(name, 5);              // 5回目までは、通常の401
        var res = await LoginAsync(name, OldPassword);   // ロック中も、存在しないユーザーと同じ応答

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ユーザー名またはパスワードが正しくありません。", json.GetProperty("title").GetString());
        var unknownUser = await LoginAsync("missing" + Guid.NewGuid().ToString("N"), OldPassword);
        Assert.Equal(res.StatusCode, unknownUser.StatusCode);
        var unknownJson = await unknownUser.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(json.GetProperty("title").GetString(), unknownJson.GetProperty("title").GetString());
        Assert.Equal(json.TryGetProperty("detail", out var detail) ? detail.GetString() : null,
            unknownJson.TryGetProperty("detail", out var unknownDetail) ? unknownDetail.GetString() : null);
    }

    [Fact]
    public async Task Login_Success_ResetsFailedCount()
    {
        var (name, _) = await RegisterAsync();

        await FailLoginAsync(name, 4);                    // あと1回で、ロックされる
        var ok = await LoginAsync(name, OldPassword);     // 成功すると、回数が戻る
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        await FailLoginAsync(name, 4);                    // また4回失敗しても、ロックされない
        var again = await LoginAsync(name, OldPassword);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownUser_NeverLocks_Returns401()
    {
        var name = "none" + Guid.NewGuid().ToString("N")[..12];

        await FailLoginAsync(name, 6);   // 存在しないユーザーは、何回でも、同じ401
    }

    // ---- パスワードの変更（本人） ----

    [Fact]
    public async Task ChangePassword_Success_Returns204_AndOldPasswordStopsWorking()
    {
        var (name, _) = await RegisterAsync();
        var client = await ClientWithTokenAsync(name, OldPassword);

        var res = await client.PostAsJsonAsync("/auth/change-password",
            new { currentPassword = OldPassword, newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(name, OldPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(name, NewPassword)).StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns400()
    {
        var (name, _) = await RegisterAsync();
        var client = await ClientWithTokenAsync(name, OldPassword);

        var res = await client.PostAsJsonAsync("/auth/change-password",
            new { currentPassword = "Wrong_Passw0rd!", newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_SameAsCurrent_Returns400()
    {
        var (name, _) = await RegisterAsync();
        var client = await ClientWithTokenAsync(name, OldPassword);

        var res = await client.PostAsJsonAsync("/auth/change-password",
            new { currentPassword = OldPassword, newPassword = OldPassword });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ShortNewPassword_Returns400()
    {
        var (name, _) = await RegisterAsync();
        var client = await ClientWithTokenAsync(name, OldPassword);

        var res = await client.PostAsJsonAsync("/auth/change-password",
            new { currentPassword = OldPassword, newPassword = "1234567" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_NoToken_Returns401()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/auth/change-password",
            new { currentPassword = OldPassword, newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- パスワードの再設定（管理者） ----

    [Fact]
    public async Task Admin_ResetPassword_Returns204_AndUserCanLoginWithNewPassword()
    {
        var (name, id) = await RegisterAsync();
        var admin = await AdminClientAsync();

        var res = await admin.PostAsJsonAsync($"/auth/users/{id}/reset-password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(name, OldPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(name, NewPassword)).StatusCode);
    }

    [Fact]
    public async Task Admin_ResetPassword_UnlocksLockedUser()
    {
        var (name, id) = await RegisterAsync();
        await FailLoginAsync(name, 5);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(name, OldPassword)).StatusCode);

        var admin = await AdminClientAsync();
        var res = await admin.PostAsJsonAsync($"/auth/users/{id}/reset-password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(name, NewPassword)).StatusCode);
    }

    [Fact]
    public async Task Admin_ResetPassword_UnknownUser_Returns404()
    {
        var admin = await AdminClientAsync();

        var res = await admin.PostAsJsonAsync("/auth/users/999999/reset-password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Admin_ResetPassword_ShortPassword_Returns400()
    {
        var (_, id) = await RegisterAsync();
        var admin = await AdminClientAsync();

        var res = await admin.PostAsJsonAsync($"/auth/users/{id}/reset-password", new { newPassword = "1234567" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task GeneralUser_ResetPassword_Returns403()
    {
        var (_, id) = await RegisterAsync();
        var general = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await general.PostAsJsonAsync($"/auth/users/{id}/reset-password", new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_NoToken_Returns401()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/auth/users/1/reset-password",
            new { newPassword = NewPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- ユーザーの一覧（管理者） ----

    [Fact]
    public async Task Admin_ListUsers_Returns200_AndShowsLockedUntil()
    {
        var (name, _) = await RegisterAsync();
        await FailLoginAsync(name, 5);
        var admin = await AdminClientAsync();

        var res = await admin.GetAsync("/auth/users");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var users = await res.Content.ReadFromJsonAsync<JsonElement>();
        var target = users.EnumerateArray().Single(u => u.GetProperty("userName").GetString() == name);
        Assert.NotEqual(JsonValueKind.Null, target.GetProperty("lockedUntil").ValueKind);
        // パスワード（ハッシュ）は返さない
        Assert.False(target.TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task GeneralUser_ListUsers_Returns403()
    {
        var general = await ClientWithTokenAsync(ApiFactory.UserName, ApiFactory.UserPassword);

        var res = await general.GetAsync("/auth/users");

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}