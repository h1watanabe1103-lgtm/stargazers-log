using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace EmployeeApi.Tests;

/// <summary>
/// フレームワークが自動で作るエラー（400・404・415）が、日本語で返ることのテスト。
/// テスト用の土台（ApiFactory）は、AuthApiTests.cs にあるものを使う。
/// </summary>
public class ErrorResponseTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ErrorResponseTests(ApiFactory factory) => _factory = factory;

    private async Task<HttpClient> AdminClientAsync()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/auth/login",
            new { userName = ApiFactory.AdminName, password = ApiFactory.AdminPassword });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", json.GetProperty("accessToken").GetString());
        return client;
    }

    private static async Task<string?> TitleAsync(HttpResponseMessage res)
    {
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("title").GetString();
    }

    [Fact]
    public async Task PostEmployee_BrokenJson_Returns400WithJapaneseTitle()
    {
        var admin = await AdminClientAsync();
        var body = new StringContent("{ \"name\": ", Encoding.UTF8, "application/json");   // 途中で切れたJSON

        var res = await admin.PostAsync("/employees", body);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("リクエストの内容が正しくありません。", await TitleAsync(res));
    }

    [Fact]
    public async Task PostEmployee_WrongType_Returns400WithJapaneseTitle()
    {
        var admin = await AdminClientAsync();
        var body = new StringContent("{ \"name\": 123, \"department\": \"開発部\", \"skills\": [] }",
            Encoding.UTF8, "application/json");   // name が数字

        var res = await admin.PostAsync("/employees", body);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("リクエストの内容が正しくありません。", await TitleAsync(res));
    }

    [Fact]
    public async Task PostEmployee_NotJson_Returns415WithJapaneseTitle()
    {
        var admin = await AdminClientAsync();
        var body = new StringContent("name=test", Encoding.UTF8, "text/plain");

        var res = await admin.PostAsync("/employees", body);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, res.StatusCode);
        Assert.Equal("送信するデータの形式が正しくありません。", await TitleAsync(res));
    }

    [Fact]
    public async Task PutEmployee_NotFound_Returns404WithJapaneseTitle()
    {
        var admin = await AdminClientAsync();

        var res = await admin.PutAsJsonAsync("/employees/999999",
            new { name = "山田 太郎", department = "開発部", skills = new[] { new { name = "C#" } } });

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("指定した社員は見つかりません。", await TitleAsync(res));
    }

    [Fact]
    public async Task DeleteEmployee_NotFound_Returns404WithJapaneseTitle()
    {
        var admin = await AdminClientAsync();

        var res = await admin.DeleteAsync("/employees/999999");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("指定した社員は見つかりません。", await TitleAsync(res));
    }

    [Fact]
    public async Task UnknownUrl_Returns404WithJapaneseTitle()
    {
        var res = await _factory.CreateClient().GetAsync("/no-such-path");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("指定されたデータが見つかりません。", await TitleAsync(res));
    }

    [Fact]
    public async Task ExistingJapaneseTitles_AreKept()
    {
        // 自分で日本語のタイトルを付けたエラー（401）は、上書きされない
        var res = await _factory.CreateClient().GetAsync("/employees");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.Equal("ログインが必要です。", await TitleAsync(res));
    }
}
