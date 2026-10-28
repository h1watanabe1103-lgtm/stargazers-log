using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

/// <summary>
/// OpenAPI ドキュメントに「Bearer（JWT）認証」の定義を追加する。
/// これで Scalar に Authorize（認証）の入力欄が出て、トークンを1回貼るだけで、
/// 以降のリクエストに Authorization ヘッダーが自動で付く。
/// </summary>
internal sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "/auth/login で受け取った accessToken を貼り付ける（\"Bearer \" は不要）。"
        };

        // すべてのAPIに「Bearer認証を使う」と宣言する（/auth/* にも鍵マークが付くが、動作は変わらない）
        document.Security =
        [
            new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = []
            }
        ];

        return Task.CompletedTask;
    }
}
