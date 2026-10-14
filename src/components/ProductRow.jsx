export function ProductRow({ employee }) {
  // 在籍状況（active）が false の場合は名前を赤字にするなどの処理
  const name = employee.active ? (
    employee.name
  ) : (
    <span style={{ color: 'red' }}>{employee.name} (休職中)</span>
  );

  return (
    <tr>
      <td>{name}</td>
      <td>{employee.department}</td>
      <td>{employee.skill}</td>
    </tr>
  );
}