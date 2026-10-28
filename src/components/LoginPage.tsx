import { useState, type FormEvent } from 'react';
import { ApiError } from '../api.js';
import { validateLogin } from '../authValidation.js';

interface LoginPageProps {
  message: string | null;
  onLogin: (id: string, password: string) => Promise<void>;
  onRegister: () => void;
}

export function LoginPage({ message, onLogin, onRegister }: LoginPageProps) {
  // ログイン情報とAPIエラー、送信中状態を管理する。
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // ログイン処理を親へ委譲し、失敗時は状況に応じた説明を表示する。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const validationErrors = validateLogin(id.trim(), password);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onLogin(id.trim(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fieldErrors);
        const hasApiTitle = !e.message.startsWith('HTTPエラー:');
        setError(
          e.status === 500
            ? '時間をおいて、再度お試しください。'
            : e.status === 401 && !hasApiTitle
              ? 'ユーザー名またはパスワードが正しくありません。'
              : e.status === 429 && !hasApiTitle
                ? 'ログイン試行が多すぎます。しばらくしてから再度お試しください。'
              : e.message,
        );
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // APIから返る項目名の違いに対応して入力エラーを取り出す。
  const idError =
    fieldErrors.UserName?.[0] ??
    fieldErrors.Username?.[0] ??
    fieldErrors.Id?.[0] ??
    fieldErrors.ID?.[0];
  const passwordError = fieldErrors.Password?.[0];

  // ログイン入力、登録画面への導線、結果メッセージを表示する。
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-eyebrow">EMPLOYEE SKILLS</p>
        <h1 id="login-title" className="auth-title">ログイン</h1>
        <p className="auth-description">アカウント情報を入力してください。</p>
        {message && <p className="auth-message" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-id">ID</label>
          <input
            autoComplete="username"
            id="login-id"
            maxLength={50}
            name="id"
            onChange={(event) => setId(event.target.value)}
            required
            type="text"
            value={id}
            aria-invalid={!!idError}
            aria-describedby={idError ? 'login-id-error' : undefined}
          />
          {idError && <p className="field-error" id="login-id-error">{idError}</p>}
          <label htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            id="login-password"
            maxLength={100}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
          />
          {passwordError && <p className="field-error" id="login-password-error">{passwordError}</p>}
          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <p className="auth-register">
          アカウントをお持ちでない方は{' '}
          <button className="text-link" onClick={onRegister} type="button">
            新規登録
          </button>
        </p>
        <p className="auth-note">ログイン状態はこのタブを閉じるまで保持されます。</p>
      </section>
    </main>
  );
}
