// 社員の登録・更新APIへ送るデータ形式。
export interface EmployeeInput {
  name: string;
  department: string;
  skills: Array<{ name: string }>;
}

// APIエラーのHTTP状態、詳細、項目別エラーを扱うクラス。
export class ApiError extends Error {
  status: number;
  detail: string | null;
  fieldErrors: Record<string, string[]>;
}

// 認証情報の保存・取得・消去と、API呼び出し関数の型定義。
export function saveSession(session: {
  accessToken?: string;
  token?: string;
  role?: string;
}): void;
export function getToken(): string | null;
export function getRole(): string | null;
export function clearSession(): void;
export function apiFetch(path: string, options?: RequestInit): Promise<unknown>;
export function login(userName: string, password: string): Promise<unknown>;
export function register(userName: string, password: string): Promise<unknown>;
export function changePassword(currentPassword: string, newPassword: string): Promise<unknown>;
export function getAdminUsers(): Promise<unknown>;
export function setAdminUserPassword(userId: string | number, newPassword: string): Promise<unknown>;
export function getEmployees(): Promise<unknown>;
export function searchEmployees(keyword: string): Promise<unknown>;
export function createEmployee(employee: EmployeeInput): Promise<unknown>;
export function updateEmployee(id: number | string, employee: EmployeeInput): Promise<unknown>;
export function deleteEmployee(id: number | string): Promise<unknown>;
