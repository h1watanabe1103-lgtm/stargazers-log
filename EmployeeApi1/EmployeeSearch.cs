using Microsoft.EntityFrameworkCore;

public static class EmployeeSearch
{
    public static Task<List<Employee>> SearchAsync(EmployeeDb db, string keyword)
    {
        return db.Employees
            .Include(e => e.Skills)
            .Where(e => e.Name.Contains(keyword)
                     || e.Department.Contains(keyword)
                     || e.Skills.Any(s => s.Name.Contains(keyword)))
            .ToListAsync();
    }
}