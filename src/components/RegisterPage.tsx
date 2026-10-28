import { useState, type FormEvent } from 'react';
import { ApiError, register } from '../api.js';
import { validateRegistration } from '../authValidation.js';

interface RegisterPageProps {
  onBackToLogin: () => void;
  onRegistered: () => void;
}

export function RegisterPage({ onBackToLogin, onRegistered }: RegisterPageProps) {
  // 登録フォームの入力値、項目エラー、送信状態を管理する。
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // 入力ルールを確認して登録APIを呼び、結果に応じた画面遷移を行う。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const validationErrors = validateRegistration(userName, password);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await register(userName, password);
      onRegistered();
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fieldErrors);
        setError(
          e.status >= 500
            ? '時間をおいて、再度お試しください。'
            : e.message,
        );
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // APIの項目名の表記揺れを吸収して、入力欄ごとのエラーを取り出す。
  const userNameError =
    fieldErrors.UserName?.[0] ??
    fieldErrors.Username?.[0] ??
    fieldErrors.userName?.[0];
  const passwordError = fieldErrors.Password?.[0] ?? fieldErrors.password?.[0];

  // 登録結果と検証エラーを入力欄に関連付けて表示する。
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="auth-eyebrow">EMPLOYEE SKILLS</p>
        <h1 id="register-title" className="auth-title">新規登録</h1>
        <p className="auth-description">一般ユーザーのアカウントを作成します。</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-username">ユーザー名</label>
          <input
            autoComplete="username"
            id="register-username"
            maxLength={50}
            required
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            aria-invalid={!!userNameError}
            aria-describedby={userNameError ? 'register-username-error' : undefined}
          />
          {userNameError && (
            <p className="field-error" id="register-username-error">{userNameError}</p>
          )}
          <label htmlFor="register-password">Password</label>
          <input
            autoComplete="new-password"
            id="register-password"
            maxLength={100}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'register-password-error' : undefined}
          />
          {passwordError && (
            <p className="field-error" id="register-password-error">{passwordError}</p>
          )}
          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? '登録中...' : '登録'}
          </button>
        </form>
        <button className="text-link register-back" onClick={onBackToLogin} type="button">
          ログイン画面へ戻る
        </button>
      </section>
    </main>
  );
}
