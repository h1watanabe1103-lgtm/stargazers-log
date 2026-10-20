// 基本的な型とインターフェースの定義
interface Employee {
  id: number;
  name: string;
  department?: string; // オプショナル（無くてもよい）
}

// 引数と戻り値に型を指定した関数
function getEmployeeInfo(employee: Employee): string {
  const dept = employee.department ?? '未配属';
  return `社員名: ${employee.name} (部署: ${dept})`;
}

// 実行、確認用
const worker: Employee = {
  id: 1,
  name: '渡邊',
  department: '開発部',
};

console.log(getEmployeeInfo(worker));
