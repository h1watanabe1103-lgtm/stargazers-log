using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

/// <summary>
/// 認証・権限のエラー（401／403）を、日本語の JSON（ProblemDetails）で返す。
/// 入力エラー（400）と同じ形（title が日本語）にそろえる。
/// </summary>
public static class AuthErrorEvents
{
    public static JwtBearerEvents Create() => new()
    {
        // 401: トークンがない、または、正しくない
        OnChallenge = async context =>
        {
            // 既定の（本文が空の）401 応答を止めて、こちらで返す
            context.HandleResponse();

            // 認証ヘッダーは付けておく（理由があれば error を付ける）
            context.Response.Headers.WWWAuthenticate = context.AuthenticateFailure switch
            {
                null => "Bearer",
                SecurityTokenExpiredException => "Bearer error=\"invalid_token\", error_description=\"expired\"",
                _ => "Bearer error=\"invalid_token\""
            };

            var detail = context.AuthenticateFailure switch
            {
                null => "ログインしてから、もう一度お試しください。",
                SecurityTokenExpiredException => "ログインの有効期限が切れました。もう一度ログインしてください。",
                _ => "トークンが正しくありません。もう一度ログインしてください。"
            };

            await Results.Problem(
                    title: "ログインが必要です。",
                    detail: detail,
                    statusCode: StatusCodes.Status401Unauthorized)
                .ExecuteAsync(context.HttpContext);
        },

        // 403: ログインはしているが、権限が足りない
        OnForbidden = async context =>
        {
            await Results.Problem(
                    title: "この操作を行う権限がありません。",
                    detail: "管理者（Admin）のみ実行できます。",
                    statusCode: StatusCodes.Status403Forbidden)
                .ExecuteAsync(context.HttpContext);
        }
    };
}
