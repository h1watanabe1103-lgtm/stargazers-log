// APIデータを画面表示用に変換した社員情報。
export interface Employee {
  id: number | string;
  name: string;
  department: string;
  skill: string;
  skillNames: string[];
  active: boolean;
}
