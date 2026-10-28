using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

/// <summary>
/// フレームワークが自動で作るエラーの返事（400・404・500 など）の、英語のタイトルを日本語にする。
/// 自分で日本語のタイトルを付けたエラー（401・403・409 など）は、そのまま残す。
/// </summary>
public static class JapaneseProblemDetails
{
    public static void Apply(ProblemDetails p)
    {
        var status = p.Status ?? 0;

        // 標準のタイトル（"Bad Request" など）のときだけ、置き換える
        var isDefaultTitle = string.IsNullOrEmpty(p.Title)
            || p.Title == ReasonPhrases.GetReasonPhrase(status)
            || p.Title.StartsWith("An error occurred", StringComparison.Ordinal);
        if (!isDefaultTitle) return;

        p.Title = status switch
        {
            400 => "リクエストの内容が正しくありません。",
            401 => "ログインが必要です。",
            403 => "この操作を行う権限がありません。",
            404 => "指定されたデータが見つかりません。",
            405 => "そのURLでは、その操作は使えません。",
            406 => "返事の形式に対応していません。",
            409 => "データが競合しています。",
            415 => "送信するデータの形式が正しくありません。",
            429 => "リクエストが多すぎます。しばらくしてからお試しください。",
            500 => "サーバーでエラーが発生しました。",
            _ => p.Title
        };

        // 説明（detail）が空のときだけ、補足を付ける
        p.Detail ??= status switch
        {
            400 => "送信したデータ（JSON）の形式、または項目の型を確認してください。",
            415 => "Content-Type を application/json にして、JSON で送信してください。",
            500 => "しばらくしてから、もう一度お試しください。続く場合は、管理者に連絡してください。",
            _ => null
        };
    }
}
