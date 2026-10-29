import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, getAdminUsers, setAdminUserPassword } from '../api.js';
import { validateAdminPassword } from '../authValidation.js';

interface ManagedUser {
  id: string | number;
  userName: string;
  role: string | null;
}

interface UserManagementProps {
  currentUserName: string;
}

// unknownで受け取ったAPI値がオブジェクトかどうかを判定する。
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// APIの返却形式の違いを吸収し、必要なユーザー情報を検証する。
function parseUsers(response: unknown): ManagedUser[] {
  const values = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.users)
      ? response.users
      : null;

  if (!values) {
    throw new Error('ユーザー一覧のレスポンス形式が正しくありません。');
  }

  return values.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(`ユーザー一覧の${index + 1}件目の形式が正しくありません。`);
    }
    const id = value.userId ?? value.id;
    const userName = value.userName ?? value.username ?? value.name;
    const role = value.role;
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      typeof userName !== 'string' ||
      (role !== undefined && role !== null && typeof role !== 'string')
    ) {
      throw new Error(`ユーザー一覧の${index + 1}件目に必要な情報がありません。`);
    }
    return { id, userName, role: typeof role === 'string' ? role : null };
  });
}

// APIエラーをユーザー管理画面向けのメッセージに置き換える。
function getApiErrorMessage(error: ApiError) {
  if (error.status >= 500) return '時間をおいて、再度お試しください。';
  if (error.status === 403 && error.message.startsWith('HTTPエラー:')) {
    return 'ユーザーを管理する権限がありません。';
  }
  return error.message;
}

export function UserManagement({ currentUserName }: UserManagementProps) {
  // ユーザー一覧、選択中の利用者、パスワード変更の状態を管理する。
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 画面の初回表示時にユーザー一覧を読み込む。
  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      setLoading(true);
      setListError(null);
      try {
        const data = parseUsers(await getAdminUsers());
        if (active) setUsers(data);
      } catch (error) {
        if (!active) return;
        setListError(
          error instanceof ApiError
            ? getApiErrorMessage(error)
            : error instanceof Error
              ? error.message
              : String(error),
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  // 入力内容を検証して、選択したユーザーのパスワードを再設定する。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const validationErrors = validateAdminPassword(newPassword);
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors.NewPassword[0]);
      return;
    }
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await setAdminUserPassword(selectedUser.id, newPassword);
      const message =
        isRecord(response) && typeof response.message === 'string'
          ? response.message
          : 'パスワードを再設定しました。';
      setSuccess(`${selectedUser.userName}: ${message}`);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? getApiErrorMessage(error)
          : error instanceof Error
            ? error.message
            : String(error),
      );
    } finally {
      setSaving(false);
    }
  };

  // 自分自身を管理対象から除外する。
  const otherUsers = users.filter((user) => user.userName !== currentUserName);

  // 読み込み・エラー・空一覧を切り替え、選択した利用者の変更フォームを表示する。
  return (
    <section id="user-management-panel" className="employee-form-panel user-management" aria-labelledby="user-management-title">
      <h3 id="user-management-title">ユーザー管理</h3>
      {loading ? (
        <p>ユーザー一覧を読み込み中...</p>
      ) : listError ? (
        <p className="auth-error" role="alert">{listError}</p>
      ) : otherUsers.length === 0 ? (
        <p>管理対象のユーザーはいません。</p>
      ) : (
        <ul className="user-list">
          {otherUsers.map((user) => (
            <li key={String(user.id)}>
              <span>
                {user.userName}
                {user.role ? ` (${user.role})` : ''}
              </span>
              <button
                className="form-secondary-button"
                type="button"
                onClick={() => {
                  setSelectedUser(user);
                  setNewPassword('');
                  setFormError(null);
                  setSuccess(null);
                }}
              >
                パスワードを変更
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedUser && (
        <form className="employee-form user-password-form" onSubmit={handleSubmit} noValidate>
          <h4>{selectedUser.userName} の新しいパスワード</h4>
          {formError && <p className="auth-error" role="alert">{formError}</p>}
          <label htmlFor="admin-new-password">新しいパスワード（8〜100文字）</label>
          <input
            autoComplete="new-password"
            id="admin-new-password"
            maxLength={100}
            minLength={8}
            required
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <div className="employee-form-actions">
            <button className="auth-submit" type="submit" disabled={saving}>
              {saving ? '更新中...' : 'パスワードを設定'}
            </button>
            <button
              className="form-secondary-button"
              type="button"
              disabled={saving}
              onClick={() => setSelectedUser(null)}
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
      {success && <p className="auth-message" role="status">{success}</p>}
    </section>
  );
}
