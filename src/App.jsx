import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ProductTable } from './components/ProductTable';

// 社員データ（10人分）
const EMPLOYEES = [
  { id: 1, name: "山田 太郎", department: "開発部", skill: "React", active: true },
  { id: 2, name: "佐藤 花子", department: "インフラ部", skill: "AWS", active: true },
  { id: 3, name: "鈴木 一郎", department: "開発部", skill: "Java", active: false },
  { id: 4, name: "高橋 恵子", department: "デザイン部", skill: "Figma", active: true },
  { id: 5, name: "田中 健太", department: "開発部", skill: "TypeScript", active: true },
  { id: 6, name: "渡辺 美咲", department: "営業部", skill: "Excel", active: false },
  { id: 7, name: "伊藤 誠", department: "開発部", skill: "Python", active: true },
  { id: 8, name: "山本 由美", department: "インフラ部", skill: "Docker", active: true },
  { id: 9, name: "中村 直人", department: "開発部", skill: "Go", active: false },
  { id: 10, name: "小林 さくら", department: "デザイン部", skill: "Photoshop", active: true }
];

export default function App() {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false); // （今回は社員用に流用するためそのまま置いています）

  return (
    <div style={{ padding: '20px' }}>
      <h2>社員スキル一覧</h2>
      <SearchBar
        filterText={filterText}
        inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText}
        onInStockOnlyChange={setInStockOnly}
      />
      <ProductTable
        employees={EMPLOYEES}
        filterText={filterText}
      />
    </div>
  );
}