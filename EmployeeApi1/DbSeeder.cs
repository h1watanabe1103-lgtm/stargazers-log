using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

// 動作確認用の初期データ（ダミー）を登録するクラス。開発モードでのみ呼び出す
public static class DbSeeder
{
    public static async Task SeedAsync(EmployeeDb db)
    {
        // すでに社員データがあれば何もしない（再起動しても重複登録されない）
        if (await db.Employees.AnyAsync()) return;

        db.Employees.AddRange(
            new Employee
            {
                Name = "山田 太郎",
                Department = "開発部",
                Skills = new List<Skill> { new() { Name = "C#" }, new() { Name = "SQL" } }
            },
            new Employee
            {
                Name = "佐藤 花子",
                Department = "開発部",
                Skills = new List<Skill> { new() { Name = "TypeScript" }, new() { Name = "React" } }
            },
            new Employee
            {
                Name = "鈴木 一郎",
                Department = "営業部",
                Skills = new List<Skill> { new() { Name = "提案資料作成" }, new() { Name = "Excel" } }
            },
            new Employee
            {
                Name = "高橋 美咲",
                Department = "品質保証部",
                Skills = new List<Skill> { new() { Name = "テスト設計" }, new() { Name = "Playwright" } }
            },
            new Employee
            {
                Name = "田中 健",
                Department = "インフラ部",
                Skills = new List<Skill> { new() { Name = "Docker" }, new() { Name = "SQL Server" } }
            });

        await db.SaveChangesAsync();
    }

    // 動作確認用のユーザー（ダミー）。管理者と一般ユーザーを1人ずつ用意する
    public static async Task SeedUsersAsync(
        EmployeeDb db,
        IPasswordHasher<User> hasher,
        IConfiguration configuration)
    {
        if (await db.Users.AnyAsync()) return;

        var userName = configuration["Auth:SeedAdmin:UserName"];
        var password = configuration["Auth:SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(userName) || !Regex.IsMatch(userName, "^[A-Za-z0-9_.-]{3,50}$"))
            throw new InvalidOperationException("開発用管理者のユーザー名をAuth:SeedAdmin:UserNameに設定してください。");
        if (string.IsNullOrEmpty(password) || password.Length is < 8 or > 100)
            throw new InvalidOperationException("開発用管理者のパスワードをAuth:SeedAdmin:Passwordに8〜100文字で設定してください。");

        db.Users.Add(CreateUser(userName, password, Roles.Admin));
        await db.SaveChangesAsync();

        User CreateUser(string userName, string password, string role)
        {
            var user = new User { UserName = userName, Role = role };
            user.PasswordHash = hasher.HashPassword(user, password);
            return user;
        }
    }
}