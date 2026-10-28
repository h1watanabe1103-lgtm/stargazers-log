interface ProductCategoryRowProps {
  category: string;
}

// 一覧表の複数列にまたがるカテゴリ見出し行。
export function ProductCategoryRow({ category }: ProductCategoryRowProps) {
  return (
    <tr>
      <th colSpan={2}>{category}</th>
    </tr>
  );
}