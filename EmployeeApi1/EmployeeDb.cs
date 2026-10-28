using Microsoft.EntityFrameworkCore;

// データベースの窓口
public class EmployeeDb : DbContext
{
    // DbContextOptions<EmployeeDb> は、DbContext の設定情報を保持するクラス
    public EmployeeDb(DbContextOptions<EmployeeDb> options)
        : base(options) { }

    // DbSet<Employee> は、Employee テーブルを表すクラス
    public DbSet<Employee> Employees => Set<Employee>();

    // DbSet<User> は、User テーブルを表すクラス
    public DbSet<User> Users => Set<User>();

    // モデルの作成時に呼ばれるメソッド
    // モデルの作成時に、テーブルの構造や制約を定義する
    // ここで定義した内容は、マイグレーションを作成する際に反映される
    // 例えば、UserName に一意制約をつける場合は、ここで定義する
    // 例えば、UserName の最大長を 50 にする場合は、ここで定義する
    // 例えば、Role の最大長を 20 にする場合は、ここで定義する
    // 例えば、Employee テーブルのカラムの最大長を 50 にする場合は、ここで定義する
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.UserName).IsUnique();     // 同じユーザー名を2つ作らせない
            e.Property(u => u.UserName).HasMaxLength(50);
            e.Property(u => u.Role).HasMaxLength(20);
        });
    }
}