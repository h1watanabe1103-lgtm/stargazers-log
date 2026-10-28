import { useMemo, useState } from 'react';
import { ProductRow } from './ProductRow';
import type { Employee } from '../types/Employee';

interface ProductTableProps {
  employees: Employee[];
  filterText: string;
  isAdmin: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

type SortKey = 'name' | 'department' | 'skill';

const PAGE_SIZE = 10;

export function ProductTable({ employees, filterText, isAdmin, onEdit, onDelete }: ProductTableProps) {
  // 並び替え条件と、検索条件ごとのページ位置を保持する。
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const normalizedFilter = filterText.trim().toLocaleLowerCase();
  const [pagination, setPagination] = useState({ page: 0, filter: normalizedFilter });

  // 社員データをコピーしてから選択された列・方向で並べ替える。
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((left, right) => {
      const comparison = left[sortKey].localeCompare(right[sortKey], 'ja');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [employees, sortDirection, sortKey]);

  const pageCount = Math.ceil(sortedEmployees.length / PAGE_SIZE);
  const currentPage = pagination.filter === normalizedFilter
    ? Math.min(pagination.page, Math.max(0, pageCount - 1))
    : 0;
  const visibleEmployees = sortedEmployees.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  // 同じ列なら昇順・降順を切り替え、列を変えたときは昇順に戻す。
  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPagination({ page: 0, filter: normalizedFilter });
  };

  // 現在の並び替え状態を示す操作ボタンを作る。
  const renderSortButton = (key: SortKey, label: string) => (
    <button
      className="table-sort-button"
      type="button"
      onClick={() => changeSort(key)}
      aria-label={`${label}で${sortKey === key && sortDirection === 'asc' ? '降順' : '昇順'}に並べ替え`}
    >
      {label}
      {sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
    </button>
  );

  // 社員行、空状態、件数、ページ移動をまとめて表示する。
  return (
    <>
      <p className="employee-count" aria-live="polite">
        {sortedEmployees.length}件
      </p>
      <table
        className="employee-table"
        border={1}
        cellPadding={8}
        style={{ borderCollapse: 'collapse', marginTop: '10px' }}
      >
        <thead>
          <tr>
            <th scope="col" aria-sort={sortKey === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {renderSortButton('name', '社員名')}
            </th>
            <th scope="col" aria-sort={sortKey === 'department' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {renderSortButton('department', '所属')}
            </th>
            <th scope="col" aria-sort={sortKey === 'skill' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {renderSortButton('skill', 'スキル')}
            </th>
            {isAdmin && <th scope="col">操作</th>}
          </tr>
        </thead>
        <tbody>
          {visibleEmployees.length > 0 ? (
            visibleEmployees.map((employee) => (
              <ProductRow
                employee={employee}
                key={employee.id}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          ) : (
            <tr>
              <td colSpan={isAdmin ? 4 : 3}>該当する社員はいません。</td>
            </tr>
          )}
        </tbody>
      </table>
      <nav className="pagination" aria-label="社員一覧ページ">
        <button
          type="button"
          onClick={() => setPagination({ page: Math.max(0, currentPage - 1), filter: normalizedFilter })}
          disabled={currentPage === 0}
        >
          前へ
        </button>
        <span aria-live="polite">
          {pageCount === 0 ? 0 : currentPage + 1} / {pageCount} ページ
        </span>
        <button
          type="button"
          onClick={() => setPagination({ page: Math.min(pageCount - 1, currentPage + 1), filter: normalizedFilter })}
          disabled={currentPage >= pageCount - 1}
        >
          次へ
        </button>
      </nav>
    </>
  );
}