using System.ComponentModel.DataAnnotations;

// 社員の入力チェック。Employee と、その中の Skill を、属性（[Required] など）に従って検査する
public static class InputValidator
{
    public static Dictionary<string, string[]> Validate(Employee employee)
    {
        var errors = new Dictionary<string, List<string>>();

        void Check(object target, string prefix)
        {
            var results = new List<ValidationResult>();
            Validator.TryValidateObject(target, new ValidationContext(target), results, validateAllProperties: true);

            foreach (var r in results)
            {
                var members = r.MemberNames.Any() ? r.MemberNames : new[] { "" };
                foreach (var member in members)
                {
                    var key = prefix + member;
                    if (!errors.TryGetValue(key, out var list)) errors[key] = list = new List<string>();
                    list.Add(r.ErrorMessage ?? "入力内容が正しくありません。");
                }
            }
        }

        Check(employee, "");

        if (employee.Skills is null)
        {
            errors["Skills"] = new List<string> { "スキルは必須です（空の場合は [] を送ってください）。" };
        }
        else
        {
            for (var i = 0; i < employee.Skills.Count; i++)
            {
                if (employee.Skills[i] is null)
                    errors[$"Skills[{i}]"] = new List<string> { "スキルの内容が空です。" };
                else
                    Check(employee.Skills[i], $"Skills[{i}].");
            }
        }

        return errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
    }
}