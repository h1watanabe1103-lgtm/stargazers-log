import type { Employee } from '../types/Employee';

interface ProductRowProps {
  employee: Employee;
  isAdmin: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export function ProductRow({ employee, isAdmin, onEdit, onDelete }: ProductRowProps) {
  // 休職中の社員には状態を追記し、管理者には編集・削除操作を表示する。
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
      {isAdmin && (
        <td className="employee-actions">
          <button type="button" className="form-secondary-button" onClick={() => onEdit(employee)}>
            編集
          </button>
          <button type="button" className="delete-button" onClick={() => onDelete(employee)}>
            削除
          </button>
        </td>
      )}
    </tr>
  );
}