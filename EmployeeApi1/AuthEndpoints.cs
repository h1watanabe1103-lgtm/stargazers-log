using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

// ユーザー登録とログインのエンドポイント
public static class AuthEndpoints
{
    private static readonly string DummyPasswordHash = CreateDummyPasswordHash();

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/auth").WithTags("認証");

        auth.MapPost("/register", Register)
            .WithSummary("ユーザーを登録する")
            .WithDescription("登録されるのは一般ユーザー（参照のみ）。管理者は、開発モードの初期データで用意する");
        auth.MapPost("/login", Login)
            .WithSummary("ログインする")
            .WithDescription("成功するとアクセストークン（JWT）を返す。以降のAPIには「Authorization: Bearer トークン」を付けて呼ぶ。連続で失敗すると一定時間ロックされる。");
        auth.MapPost("/change-password", ChangePassword)
            .RequireAuthorization()   // ログイン済みなら誰でも（自分のパスワードだけ変更できる）
            .WithSummary("パスワードを変更する（本人）")
            .WithDescription("現在のパスワードと、新しいパスワードを送る。成功すると204");
        auth.MapGet("/users", ListUsers)
            .RequireAuthorization("AdminOnly")   // 管理者のみ
            .WithSummary("ユーザーの一覧を取得する（管理者）")
            .WithDescription("パスワードの再設定で使うIDを調べるための一覧。ロック中かどうかも分かる");
        auth.MapPost("/users/{id}/reset-password", ResetPassword)
            .RequireAuthorization("AdminOnly")   // 管理者のみ
            .WithSummary("パスワードを再設定する（管理者）")
            .WithDescription("指定したユーザーのパスワードを、新しいパスワードに置き換える。ログイン失敗のロックも解除する。成功すると204");
    }

    static async Task<IResult> Register(RegisterRequest req, EmployeeDb db, IPasswordHasher<User> hasher)
    {
        var errors = ValidateModel(req);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

        if (await db.Users.AnyAsync(u => u.UserName == req.UserName))
            return TypedResults.Problem(title: "そのユーザー名は、すでに使われています。", statusCode: StatusCodes.Status409Conflict);

        // 登録できるのは、一般ユーザーのみ（管理者になれるのは、あらかじめ用意したユーザーだけ）
        var user = new User { UserName = req.UserName, Role = Roles.General };
        user.PasswordHash = hasher.HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return TypedResults.Json(new { user.Id, user.UserName, user.Role }, statusCode: StatusCodes.Status201Created);
    }

    static async Task<IResult> Login(
        LoginRequest req, EmployeeDb db, IPasswordHasher<User> hasher,
        JwtTokenService tokens, IConfiguration config)
    {
        var errors = ValidateModel(req);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

        // 連続で失敗してよい回数と、ロックする時間（設定がなければ、5回・15分）
        var maxAttempts = config.GetValue("Auth:MaxFailedAttempts", 5);
        var lockoutMinutes = config.GetValue("Auth:LockoutMinutes", 15);

        var user = await db.Users.FirstOrDefaultAsync(u => u.UserName == req.UserName);

        // 未登録ユーザーもパスワード検証を行い、処理時間からのユーザー名推測を難しくする。
        if (user is null)
        {
            hasher.VerifyHashedPassword(new User(), DummyPasswordHash, req.Password);
            return TypedResults.Problem(title: "ユーザー名またはパスワードが正しくありません。", statusCode: StatusCodes.Status401Unauthorized);
        }

        var now = DateTime.UtcNow;

        var isLockedOut = user.LockoutEnd is { } lockEnd && lockEnd > now;

        var passwordResult = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (isLockedOut || passwordResult == PasswordVerificationResult.Failed)
        {
            if (isLockedOut)
                return InvalidCredentials();

            // ロックの期間が終わっていれば、解除して、数え直す
            user.LockoutEnd = null;
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= maxAttempts)
            {
                user.LockoutEnd = now.AddMinutes(lockoutMinutes);
                user.FailedLoginCount = 0;
            }
            await db.SaveChangesAsync();

            return InvalidCredentials();
        }

        // 成功したら、失敗の回数を戻す
        if (user.FailedLoginCount != 0 || user.LockoutEnd is not null)
        {
            user.FailedLoginCount = 0;
            user.LockoutEnd = null;
            await db.SaveChangesAsync();
        }

        var (token, expiresAt) = tokens.Create(user);
        return TypedResults.Ok(new
        {
            accessToken = token,
            tokenType = "Bearer",
            expiresAt,
            role = user.Role
        });
    }

    // パスワードの変更（本人）。トークンの sub（ユーザーID）で、本人を特定する
    static async Task<IResult> ChangePassword(
        ChangePasswordRequest req, ClaimsPrincipal principal, EmployeeDb db, IPasswordHasher<User> hasher)
    {
        var errors = ValidateModel(req);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

        if (!int.TryParse(principal.FindFirst("sub")?.Value, out var userId))
            return TypedResults.Problem(title: "ログインが必要です。", statusCode: StatusCodes.Status401Unauthorized);

        var user = await db.Users.FindAsync(userId);
        if (user is null)
            return TypedResults.Problem(title: "ログインが必要です。", statusCode: StatusCodes.Status401Unauthorized);

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]> { ["CurrentPassword"] = ["現在のパスワードが正しくありません。"] },
                title: "入力内容に誤りがあります。");
        }

        if (req.CurrentPassword == req.NewPassword)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]> { ["NewPassword"] = ["新しいパスワードは、現在のパスワードと違うものにしてください。"] },
                title: "入力内容に誤りがあります。");
        }

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        await db.SaveChangesAsync();
        return TypedResults.NoContent();
    }

    // ユーザーの一覧（管理者のみ）。パスワード（ハッシュ）は返さない
    static async Task<IResult> ListUsers(EmployeeDb db)
    {
        var now = DateTime.UtcNow;
        var users = await db.Users.OrderBy(u => u.Id).ToListAsync();
        return TypedResults.Ok(users.Select(u => new
        {
            u.Id,
            u.UserName,
            u.Role,
            LockedUntil = u.LockoutEnd is { } end && end > now ? end : (DateTime?)null
        }));
    }

    // パスワードの再設定（管理者のみ）。ログイン失敗のロックも解除する
    static async Task<IResult> ResetPassword(int id, ResetPasswordRequest req, EmployeeDb db, IPasswordHasher<User> hasher)
    {
        var errors = ValidateModel(req);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors, title: "入力内容に誤りがあります。");

        var user = await db.Users.FindAsync(id);
        if (user is null)
            return TypedResults.Problem(title: "ユーザーが見つかりません。", statusCode: StatusCodes.Status404NotFound);

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        await db.SaveChangesAsync();
        return TypedResults.NoContent();
    }

    // 属性（[Required] など）に従って入力を検査し、項目名ごとのエラーメッセージにまとめる
    static Dictionary<string, string[]> ValidateModel(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);

        return results
            .SelectMany(r => (r.MemberNames.Any() ? r.MemberNames : new[] { "" })
                .Select(member => (Member: member, Message: r.ErrorMessage ?? "入力内容が正しくありません。")))
            .GroupBy(x => x.Member)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Message).ToArray());
    }

    static IResult InvalidCredentials() =>
        TypedResults.Problem(
            title: "ユーザー名またはパスワードが正しくありません。",
            statusCode: StatusCodes.Status401Unauthorized);

    static string CreateDummyPasswordHash()
    {
        var randomPassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        return new PasswordHasher<User>().HashPassword(new User(), randomPassword);
    }
}