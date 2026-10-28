using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeApi.Tests;

public class EmployeeSearchTests : IDisposable
{

    // _connectionとDisposeでセット
    // _はフィールドであることを示すC#の慣習
    // readonlyなのは、テスト中に誤って別のDBに差し替えてしまうのを意図的に防ぐため。無くても動く
    private readonly SqliteConnection _connection;
    private readonly EmployeeDb _db;

    public EmployeeSearchTests()
    {
        // テストごとにメモリ上のSQLiteを使う指定。空のDBを作る（接続を閉じると消える）
        _connection = new SqliteConnection("DataSource=:memory:");
        // 接続する
        _connection.Open();
        // EmployeeDbにどのDBを使わせるかの設定
        // 本番環境(Program.cs)では、AddDbContextでemployees.dbファイルに対し接続設定しているが、
        // 本ファイルではProgram.csは動かないので、こちらでも設定が必要
        var options = new DbContextOptionsBuilder<EmployeeDb>()
            // _connectionでの接続時にSQLiteを使う
            // _connectionを文字列("Data Source=employees.db")にしたら本番環境のDBになる
            .UseSqlite(_connection)
            // 設定を取り出す
            .Options;

        // 上で作ったoptionsを渡してEmployeeDbのインスタンスを作る
        _db = new EmployeeDb(options);
        // DBが無ければモデル(EmployeeやSkill)に合わせてテーブルを作成する
        // これがないとno such table:Employeesのようなエラーが出る
        // 本番ではMigrationsフォルダのマイグレーションでテーブルを作るが、テストではEnsureCreated()で作るのが一般的
        // 逆にEnsureCreated()はマイグレーションでは使わない(本番DBに使うものではない)
        _db.Database.EnsureCreated();
        // AddRangeは複数件をまとめて追加するメソッド。1件ずつならAddを利用(この時点ではメモリ上での登録)
        _db.Employees.AddRange(
            new Employee
            {
                Name = "山田太郎",
                Department = "開発部",
                Skills = new List<Skill> { new() { Name = "C#" }, new() { Name = "Docker" } }
            },
            new Employee
            {
                Name = "佐藤花子",
                Department = "営業部",
                Skills = new List<Skill> { new() { Name = "Excel" } }
            });
        // ここで初めて上記変更(追加)をDBへ書き込む(INSERT処理)
        _db.SaveChanges();
    }
    /* [Fact]について
    // テストランナーによって実行される個別のテストメソッドを宣言するために使われる。
    // 役割: 付与されたパブリック（public）メソッドを「実行すべきテストケース」としてテストランナーに認識させる。
    // 対象フレームワーク: xUnit.net（C#、F#、Visual Basic など）
    // クラスのインスタンス化: xUnit.net では、[Fact] が付いたテストメソッドが実行されるたびにテストクラスの新しいインスタンスが生成される。
    // [Theory]について
    // [Theory] は、同じコードを実行するが、入力引数が異なる一連のテストを表す。
    // [InlineData] 属性は、これらの入力の値を指定する。
    */
    [Fact]
    public async Task Search_ByName_ReturnsMatchingEmployee()
    {
        var result = await EmployeeSearch.SearchAsync(_db, "山田");

        var employee = Assert.Single(result);
        Assert.Equal("山田太郎", employee.Name);
    }

    [Fact]
    public async Task Search_ByDepartment_ReturnsMatchingEmployee()
    {
        var result = await EmployeeSearch.SearchAsync(_db, "営業");

        var employee = Assert.Single(result);
        Assert.Equal("佐藤花子", employee.Name);
    }

    [Fact]
    public async Task Search_BySkill_ReturnsEmployeeWithSkills()
    {
        var result = await EmployeeSearch.SearchAsync(_db, "Docker");

        var employee = Assert.Single(result);
        Assert.Equal("山田太郎", employee.Name);
        Assert.Contains(employee.Skills, s => s.Name == "C#"); // Includeで関連も取れている
    }

    [Fact]
    public async Task Search_NoMatch_ReturnsEmpty()
    {
        var result = await EmployeeSearch.SearchAsync(_db, "存在しない");

        Assert.Empty(result);
    }

    // 接続を閉じる
    // 先頭で開いた_dbと_connectionを閉じる
    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}