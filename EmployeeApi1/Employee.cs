using System.ComponentModel.DataAnnotations;

// 社員1人分のデータ。プロパティがDBのカラムに対応する
// 1人に対して複数スキルを保持するようスキルをリストに変更
// リストの作り方はEFcore入門チュートリアルでBlogにList<Post> postsがあったので流用
// Skillクラスに分離するのは、入門チュートリアルでBlogIdを外部キーとして保持していたため流用
// EmproyeeクラスにSkillを保持するとJSON変換時に循環参照が発生するため、SkillクラスにEmployeeIdを持たせるようにする必要あり

public class Employee
{
    public int Id { get; set; }

    [Display(Name = "氏名")] // 表示名を設定することで、エラーメッセージに表示される
    [Required(ErrorMessage = "{0}は必須です。")]    // 必須
    [StringLength(100, ErrorMessage = "{0}は{1}文字以内で入力してください。")] // 必須、最大100文字
    public string Name { get; set; } = "";   // 初期値を空文字にすることで、null回避
    [Display(Name = "所属")] // 表示名を設定することで、エラーメッセージに表示される
    [Required(ErrorMessage = "{0}は必須です。")]    // 必須
    [StringLength(100, ErrorMessage = "{0}は{1}文字以内で入力してください。")] // 必須、最大100文字
    public string Department { get; set; } = "";   // 初期値を空文字にすることで、null回避
    [Display(Name = "スキル")] // 表示名を設定することで、エラーメッセージに表示される
    public List<Skill> Skills { get; set; } = new();   // 文字列から、リストに変える
}

public class Skill
{
    public int Id { get; set; }

    [Display(Name = "スキル名")]
    [Required(ErrorMessage = "{0}は必須です。")]
    [StringLength(100, ErrorMessage = "{0}は{1}文字以内で入力してください。")]
    public string Name { get; set; } = "";

    public int EmployeeId { get; set; }   // どの社員のスキルか（外部キー）。クライアントは送らない
}