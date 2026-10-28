using System.ComponentModel.DataAnnotations;

// ログインするユーザー。パスワードそのものは保存せず、ハッシュ（元に戻せない形）だけを保存する
public class User
{
    public int Id { get; set; }
    public string UserName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = Roles.General;

    // ログイン失敗の制限用。連続で失敗した回数と、ロックが終わる日時（UTC）。ロックされていなければ null
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEnd { get; set; }
}

// 権限（ロール）。管理者＝登録・更新・削除ができる／一般＝参照のみ
public static class Roles
{
    public const string Admin = "Admin";
    public const string General = "General";
}

// ユーザー登録で受け取るデータ
public class RegisterRequest
{
    [Display(Name = "ユーザー名")]
    [Required(ErrorMessage = "{0}は必須です。")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "{0}は{2}〜{1}文字で入力してください。")]
    [RegularExpression(@"^[A-Za-z0-9_.\-]+$", ErrorMessage = "{0}は、半角英数字と _ . - だけで入力してください。")]
    public string UserName { get; set; } = "";

    [Display(Name = "パスワード")]
    [Required(ErrorMessage = "{0}は必須です。")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "{0}は{2}〜{1}文字で入力してください。")]
    public string Password { get; set; } = "";
}

// ログインで受け取るデータ
public class LoginRequest
{
    [Display(Name = "ユーザー名")]
    [Required(ErrorMessage = "{0}は必須です。")]
    public string UserName { get; set; } = "";

    [Display(Name = "パスワード")]
    [Required(ErrorMessage = "{0}は必須です。")]
    public string Password { get; set; } = "";
}

// パスワードの変更（本人）で受け取るデータ
public class ChangePasswordRequest
{
    [Display(Name = "現在のパスワード")]
    [Required(ErrorMessage = "{0}は必須です。")]
    public string CurrentPassword { get; set; } = "";

    [Display(Name = "新しいパスワード")]
    [Required(ErrorMessage = "{0}は必須です。")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "{0}は{2}〜{1}文字で入力してください。")]
    public string NewPassword { get; set; } = "";
}

// パスワードの再設定（管理者）で受け取るデータ
public class ResetPasswordRequest
{
    [Display(Name = "新しいパスワード")]
    [Required(ErrorMessage = "{0}は必須です。")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "{0}は{2}〜{1}文字で入力してください。")]
    public string NewPassword { get; set; } = "";
}
