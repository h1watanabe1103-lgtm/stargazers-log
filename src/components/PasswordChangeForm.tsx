import { useState, type FormEvent } from 'react';
import { ApiError, changePassword } from '../api.js';
import { validatePasswordChange } from '../authValidation.js';

export function PasswordChangeForm() {
  // 現在・新しいパスワードと検証結果、送信状態を保持する。
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 必須条件と新旧パスワードの違いを検証して変更APIを呼び出す。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setError(null);
    setSuccess(null);

    const validationErrors = validatePasswordChange(currentPassword, newPassword);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('パスワードを変更しました。');
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fieldErrors);
        setError(e.status >= 500 ? '時間をおいて、再度お試しください。' : e.message);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // APIが返す項目別エラーから各入力欄に表示する内容を選ぶ。
  const currentPasswordError =
    fieldErrors.CurrentPassword?.[0] ?? fieldErrors.currentPassword?.[0];
  const newPasswordError =
    fieldErrors.NewPassword?.[0] ?? fieldErrors.newPassword?.[0];

  // 入力エラー、通信結果、送信中状態を画面に反映する。
  return (
    <section className="employee-form-panel" aria-labelledby="password-change-title">
      <h3 id="password-change-title">パスワード変更</h3>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {success && <p className="auth-message" role="status">{success}</p>}
      <form className="employee-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="current-password">現在のパスワード</label>
        <input
          autoComplete="current-password"
          id="current-password"
          maxLength={100}
          required
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          aria-invalid={!!currentPasswordError}
          aria-describedby={currentPasswordError ? 'current-password-error' : undefined}
        />
        {currentPasswordError && (
          <p className="field-error" id="current-password-error">{currentPasswordError}</p>
        )}
        <label htmlFor="new-password">新しいパスワード</label>
        <input
          autoComplete="new-password"
          id="new-password"
          maxLength={100}
          required
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-invalid={!!newPasswordError}
          aria-describedby={newPasswordError ? 'new-password-error' : undefined}
        />
        {newPasswordError && (
          <p className="field-error" id="new-password-error">{newPasswordError}</p>
        )}
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? '変更中...' : 'パスワードを変更'}
        </button>
      </form>
    </section>
  );
}
