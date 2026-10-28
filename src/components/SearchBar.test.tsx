import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('検索入力を表示できる', () => {
    render(
      <SearchBar
        filterText=""
        onFilterTextChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('社員名・所属・スキルで検索...')).toBeTruthy();
    expect(screen.getByRole('button', { name: '検索' })).toBeTruthy();
  });

  it('入力した検索語を親へ通知し、検索ボタンで確定できる', () => {
    const onFilterTextChange = vi.fn();
    const onSearch = vi.fn();

    const { rerender } = render(
      <SearchBar
        filterText=""
        onFilterTextChange={onFilterTextChange}
        onSearch={onSearch}
      />,
    );

    const input = screen.getByPlaceholderText('社員名・所属・スキルで検索...');
    fireEvent.change(input, { target: { value: '営業' } });
    expect(onFilterTextChange).toHaveBeenCalledWith('営業');


    // 同じ画面部品を再描画し、親から新しい検索語が渡された状態を再現する。
    rerender(
      <SearchBar
        filterText="営業"
        onFilterTextChange={onFilterTextChange}
        onSearch={onSearch}
      />,
    );
    fireEvent.submit(screen.getByPlaceholderText('社員名・所属・スキルで検索...').closest('form')!);
    expect(onSearch).toHaveBeenCalledWith('営業');
  });
});
