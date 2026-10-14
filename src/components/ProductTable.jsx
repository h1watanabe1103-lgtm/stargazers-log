import { ProductRow } from './ProductRow';

export function ProductTable({ employees, filterText }) {
  const rows = [];

  employees.forEach((employee) => {
    // 氏名またはスキルに検索ワードが含まれていない場合はスキップ
    const matchName = employee.name.toLowerCase().includes(filterText.toLowerCase());
    const matchSkill = employee.skill.toLowerCase().includes(filterText.toLowerCase());
    const matchDept = employee.department.toLowerCase().includes(filterText.toLowerCase());

    if (!matchName && !matchSkill && !matchDept) {
      return;
    }

    rows.push(
      <ProductRow employee={employee} key={employee.id} />
    );
  });

  return (
    <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
      <thead>
        <tr>
          <th>社員名</th>
          <th>所属</th>
          <th>スキル</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}