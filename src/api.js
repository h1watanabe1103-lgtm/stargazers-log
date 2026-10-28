const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:5200";
const TOKEN_KEY = "accessToken";
const ROLE_KEY = "role";

// ログイン情報をタブ単位で保持し、ブラウザー再起動後には残さない。
export function saveSession(session) {
  const token = session?.accessToken ?? session?.token;
  const role = session?.role;
  if (typeof token !== "string" || token.length === 0) {
    clearSession();
    throw new Error("ログイン応答に認証トークンが含まれていません。");
  }
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (typeof role === "string") {
      sessionStorage.setItem(ROLE_KEY, role);
    } else {
      sessionStorage.removeItem(ROLE_KEY);
    }
  } catch {
    clearSession();
    throw new Error("ログイン状態を保存できません。ブラウザーの設定を確認してください。");
  }
}
export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function getRole() {
  try { return sessionStorage.getItem(ROLE_KEY); } catch { return null; }
}
export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  } catch { /* 何もしない */ }
}

// HTTPエラーの状態と、APIから返された詳細・項目別エラーをまとめる。
export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.title ?? `HTTPエラー: ${status}`);
    this.status = status;
    this.detail = problem?.detail ?? null;
    this.fieldErrors = problem?.errors ?? {}; // 例: { Name: ["氏名は必須です。"] }
  }
}

// 認証ヘッダー、通信エラー、レスポンス解析を共通化してAPIを呼び出す。
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, { title: "APIにつながりません。APIが起動しているか確認してください。" });
  }

  if (res.ok) {
    return res.status === 204 ? null : res.json(); // 204 は中身なし
  }

  let problem = null;
  try { problem = await res.json(); } catch { /* 中身がない場合 */ }

  // トークンの期限切れ：ログイン情報を消して、画面に知らせる
  if (res.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event("auth:expired"));
  }
  throw new ApiError(res.status, problem);
}

// 認証関連のAPI。ログイン成功時は返却された認証情報を保存する。
export const login = async (userName, password) => {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ userName, password }),
  });
  saveSession(data); // { accessToken, tokenType, expiresAt, role }
  return data;
};

// アカウント作成、パスワード変更、管理者によるユーザー管理を行う。
export const register = (userName, password) =>
  apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ userName, password }) });
export const changePassword = (currentPassword, newPassword) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
export const getAdminUsers = () => apiFetch("/auth/users");
export const setAdminUserPassword = (userId, newPassword) =>
  apiFetch(`/auth/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });

// 社員一覧の取得、検索、登録、更新、削除を行うAPI。
export const getEmployees = () => apiFetch("/employees");
export const searchEmployees = (keyword) =>
  apiFetch(`/employees/search?keyword=${encodeURIComponent(keyword)}`);
export const createEmployee = (emp) =>
  apiFetch("/employees", { method: "POST", body: JSON.stringify(emp) });
export const updateEmployee = (id, emp) =>
  apiFetch(`/employees/${id}`, { method: "PUT", body: JSON.stringify(emp) });
export const deleteEmployee = (id) => apiFetch(`/employees/${id}`, { method: "DELETE" });