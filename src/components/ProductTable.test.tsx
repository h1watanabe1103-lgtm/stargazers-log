import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductTable } from './ProductTable';
import type { Employee } from '../types/Employee';

const employees: Employee[] = [
  { id: 1, name: '田中太郎', department: '営業部', skill: 'Java', skillNames: ['Java'], active: true },
  { id: 2, name: '佐藤花子', department: '開発部', skill: 'React', skillNames: ['React'], active: true },
];

describe('ProductTable', () => {
  it('社員一覧を表示できる', () => {
    render(
      <ProductTable
        employees={employees}
        filterText=""
        isAdmin={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('cell', { name: '田中太郎' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '営業部' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'React' })).toBeTruthy();
    expect(screen.getByText('2件')).toBeTruthy();
  });

  it('検索結果が0件なら該当メッセージを表示する', () => {
    render(
      <ProductTable
        employees={[]}
        filterText="存在しない社員"
        isAdmin={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('該当する社員はいません。')).toBeTruthy();
    expect(screen.getByText('0件')).toBeTruthy();
  });

  it('社員名の見出しを押すと並び順を変更できる', () => {
    const { container } = render(
      <ProductTable
        employees={employees}
        filterText=""
        isAdmin={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const getDisplayedNames = () =>
      Array.from(container.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
    const originalOrder = getDisplayedNames();
    const nameSortButton = screen.getByRole('button', { name: '社員名で降順に並べ替え' });
    fireEvent.click(nameSortButton);

    expect(screen.getByRole('button', { name: '社員名で昇順に並べ替え' })).toBeTruthy();
    expect(getDisplayedNames()).toEqual([...originalOrder].reverse());
  });
});
