import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { SearchBar } from './components/SearchBar';
import { ProductTable } from './components/ProductTable';
import { RegisterPage } from './components/RegisterPage';
import { EmployeeForm } from './components/EmployeeForm';
import { PasswordChangeForm } from './components/PasswordChangeForm';
import { UserManagement } from './components/UserManagement';
import {
  ApiError,
  clearSession,
  createEmployee,
  deleteEmployee,
  getEmployees,
  getRole,
  getToken,
  login,
  searchEmployees,
  updateEmployee,
  type EmployeeInput,
} from './api.js';
import type { Employee } from './types/Employee';

interface AuthSession {
  token: string;
  id: string;
}

// APIから受け取る社員データ。欠落しうる項目は任意として扱う。
type ApiEmployee = {
  id: number | string;
  name?: string | null;
  department?: string | null;
  skills?: Array<{ name?: string | null }> | null;
};

interface PageError {
  message: string;
  canRetry: boolean;
}

// APIの不定な値を安全に検証するための型ガード。
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiSkill(value: unknown): value is { name?: string | null } {
  if (!isRecord(value)) return false;
  const { name } = value;
  return name === undefined || name === null || typeof name === 'string';
}

function isApiEmployee(value: unknown): value is ApiEmployee {
  if (!isRecord(value)) return false;

  const { id, name, department, skills } = value;
  return (
    (typeof id === 'number' || typeof id === 'string') &&
    (name === undefined || name === null || typeof name === 'string') &&
    (department === undefined || department === null || typeof department === 'string') &&
    (skills === undefined ||
      skills === null ||
      (Array.isArray(skills) && skills.every(isApiSkill)))
  );
}

function isApiEmployeeList(value: unknown): value is ApiEmployee[] {
  return Array.isArray(value) && value.every(isApiEmployee);
}

// APIの社員データを画面表示用の形式にそろえる。
function toEmployeeList(value: unknown): Employee[] {
  if (!isApiEmployeeList(value)) {
    throw new Error('APIレスポンスの形式が正しくありません');
  }

  return value.map((employee) => ({
    id: employee.id,
    name: employee.name ?? '（未設定）',
    department: employee.department ?? '（未設定）',
    skill: (employee.skills ?? []).map((skill) => skill.name ?? '').join(', '),
    skillNames: (employee.skills ?? []).map((skill) => skill.name ?? ''),
    active: true,
  }));
}

function normalizeNameForSearch(value: string) {
  return value.replace(/\s/gu, '').toLocaleLowerCase();
}

// 検索結果と全件一覧の結果をIDで重複排除して統合する。
function mergeEmployees(...groups: Employee[][]) {
  const employeesById = new Map<string, Employee>();
  groups.flat().forEach((employee) => {
    employeesById.set(String(employee.id), employee);
  });
  return [...employeesById.values()];
}

function getLoginToken(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const token = value.token ?? value.accessToken;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

// ページを再読み込みしても保存済みの認証トークンがあればログイン状態を復元する。
function getStoredSession(): AuthSession | null {
  const token = getToken();
  if (!token) return null;

  return { token, id: '' };
}

export default function App() {
  // 認証、画面表示、社員一覧、フォームの状態を管理する。
  const [session, setSession] = useState<AuthSession | null>(getStoredSession);
  const [role, setRole] = useState<string | null>(() => (getToken() ? getRole() : null));
  const [page, setPage] = useState<'login' | 'register' | 'employees'>(
    () => (session ? 'employees' : 'login'),
  );
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PageError | null>(null);
  const [filterText, setFilterText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // API共通処理から通知される認証期限切れを受けてログイン画面に戻す。
  useEffect(() => {
    const handleAuthExpired = () => {
      clearSession();
      setSession(null);
      setRole(null);
      setError(null);
      setLoginMessage('セッションの有効期限が切れました。再度ログインしてください。');
      setPage('login');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // ログイン中の社員一覧を取得し、検索語に応じて検索結果を整える。
  useEffect(() => {
    if (page !== 'employees' || !session) return;

    let active = true;
    const keyword = filterText.trim();
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        let matchingEmployees: Employee[];
        if (!keyword) {
          matchingEmployees = toEmployeeList(await getEmployees());
        } else {
          if (/\s/u.test(keyword)) {
            matchingEmployees = toEmployeeList(await searchEmployees(keyword));
          } else {
            const [searchData, allEmployeesData] = await Promise.all([
              searchEmployees(keyword),
              getEmployees(),
            ]);
            const searchResults = toEmployeeList(searchData);
            const allEmployees = toEmployeeList(allEmployeesData);
            const normalizedKeyword = normalizeNameForSearch(keyword);
            const matchingNames = allEmployees.filter((employee) =>
              normalizeNameForSearch(employee.name).includes(normalizedKeyword),
            );
            matchingEmployees = mergeEmployees(searchResults, matchingNames);
          }
        }
        if (active) setEmployees(matchingEmployees);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError) {
          const isServerError = e.status >= 500;
          const isNotFound = e.status === 404;
          const hasApiTitle = !e.message.startsWith('HTTPエラー:');
          setError({
            message: isServerError
              ? '時間をおいて、再度お試しください。'
              : isNotFound
                ? hasApiTitle ? e.message : '社員が見つかりません。'
                : e.status === 403 && !hasApiTitle
                  ? 'この操作を行う権限がありません。'
                  : e.message,
            canRetry: isNotFound,
          });
        } else {
          setError({
            message: e instanceof Error ? e.message : String(e),
            canRetry: false,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEmployees();
    return () => {
      active = false;
    };
  }, [page, session, filterText, refreshKey]);

  // 認証APIの応答からトークンを確認し、ログイン状態と画面を更新する。
  const handleLogin = async (id: string, password: string) => {
    const data: unknown = await login(id, password);
    const token = getLoginToken(data);
    if (!token) {
      clearSession();
      throw new Error('ログイン応答にトークンが含まれていません');
    }

    const nextSession: AuthSession = { token, id };
    setSession(nextSession);
    setRole(getRole());
    setLoginMessage(null);
    setPage('employees');
  };

  // 保存済みの認証情報を消してログイン画面へ戻る。
  const handleLogout = () => {
    clearSession();
    setSession(null);
    setRole(null);
    setPage('login');
  };

  // 検索語を確定し、同じ語でも一覧を再取得できるよう更新キーを進める。
  const handleSearch = (keyword: string) => {
    setFilterText(keyword.trim());
    setRefreshKey((key) => key + 1);
  };

  // 管理者のみ社員の新規登録または既存情報の更新を行う。
  const handleSaveEmployee = async (employeeData: EmployeeInput) => {
    if (!isAdmin) {
      throw new Error('この操作を行う権限がありません。');
    }

    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, employeeData);
    } else {
      await createEmployee(employeeData);
    }
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setRefreshKey((key) => key + 1);
  };

  // 管理者の確認後に社員を削除し、失敗時は再試行可否も含めて表示する。
  const handleDeleteEmployee = async (employee: Employee) => {
    if (!isAdmin || !window.confirm(`「${employee.name}」を削除しますか？`)) return;

    setError(null);
    try {
      await deleteEmployee(employee.id);
      setRefreshKey((key) => key + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        const hasApiTitle = !e.message.startsWith('HTTPエラー:');
        setError({
          message: e.status >= 500
            ? '時間をおいて、再度お試しください。'
            : e.status === 403 && !hasApiTitle
              ? 'この操作を行う権限がありません。'
              : e.status === 404 && !hasApiTitle
                ? '社員が見つかりません。一覧を再取得してください。'
                : e.message,
          canRetry: e.status === 404,
        });
      } else {
        setError({
          message: e instanceof Error ? e.message : String(e),
          canRetry: false,
        });
      }
    }
  };

  // ログイン・登録画面は、社員一覧画面より先に分岐して表示する。
  if (page === 'login') {
    return (
      <LoginPage
        message={loginMessage}
        onLogin={handleLogin}
        onRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onBackToLogin={() => setPage('login')}
        onRegistered={() => {
          setLoginMessage('登録が完了しました。ログインしてください。');
          setPage('login');
        }}
      />
    );
  }

  // 管理者ロールに応じて社員・ユーザー管理機能の表示を切り替える。
  const isAdmin = role === 'Admin';

  // ログイン後の画面。管理操作、エラー、検索、社員一覧を組み立てる。
  return (
    <div style={{ padding: '20px' }}>
      <div className="employee-header">
        <span>
          {session?.id ? `ログイン中: ${session.id}` : 'ログイン中'}
          {role && ` (${isAdmin ? '管理者' : role})`}
        </span>
        <button
          className="logout-button"
          type="button"
          onClick={handleLogout}
        >
          ログアウト
        </button>
        <button
          className="logout-button"
          type="button"
          onClick={() => setShowPasswordChange((visible) => !visible)}
          aria-expanded={showPasswordChange}
        >
          自分のパスワード変更
        </button>
        {isAdmin && (
          <button
            className="logout-button"
            type="button"
            onClick={() => setShowUserManagement((visible) => !visible)}
            aria-expanded={showUserManagement}
          >
            ユーザー管理
          </button>
        )}
      </div>
      {showPasswordChange && <PasswordChangeForm />}
      {isAdmin && showUserManagement && (
        <UserManagement currentUserName={session?.id ?? ''} />
      )}
      {error && (
        <div className="page-error" role="alert">
          <p>{error.message}</p>
          {error.canRetry && (
            <button
              className="retry-button"
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              一覧を再取得
            </button>
          )}
        </div>
      )}
      <h2>社員スキル一覧</h2>
      {isAdmin && !showEmployeeForm && (
        <button
          className="auth-submit employee-add-button"
          type="button"
          onClick={() => {
            setEditingEmployee(null);
            setShowEmployeeForm(true);
          }}
        >
          社員を登録
        </button>
      )}
      {isAdmin && showEmployeeForm && (
        <EmployeeForm
          key={editingEmployee?.id ?? 'new'}
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onCancel={() => {
            setShowEmployeeForm(false);
            setEditingEmployee(null);
          }}
        />
      )}
      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        null
      ) : (
        <>
          <SearchBar
            filterText={searchInput}
            onFilterTextChange={setSearchInput}
            onSearch={handleSearch}
          />
          <ProductTable
            employees={employees}
            filterText={filterText}
            isAdmin={isAdmin}
            onEdit={(employee) => {
              setEditingEmployee(employee);
              setShowEmployeeForm(true);
            }}
            onDelete={handleDeleteEmployee}
          />
        </>
      )}
    </div>
  );
}