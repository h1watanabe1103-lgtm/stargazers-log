import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from './EmployeeForm';

describe('EmployeeForm', () => {
  it('氏名と所属が未入力なら保存せず入力エラーを表示する', async () => {
    const onSave = vi.fn();

    render(<EmployeeForm employee={null} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('氏名は必須です。')).toBeTruthy();
    expect(screen.getByText('所属は必須です。')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('入力値を整形して保存処理へ渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<EmployeeForm employee={null} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('氏名'), { target: { value: '  山田太郎  ' } });
    fireEvent.change(screen.getByLabelText('所属'), { target: { value: '  開発部  ' } });
    fireEvent.change(screen.getByLabelText('スキル名 1'), { target: { value: ' React ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      name: '山田太郎',
      department: '開発部',
      skills: [{ name: 'React' }],
    });
  });
});
