# フロント側 接続手順書（Ver2）

Reactアプリを、社員スキル管理APIにつなぐための手順書です。10/20の打ち合わせで決めた内容と、**渡邊さんがやる作業**をまとめています。

- 対象: Reactアプリを持っている人（フロント担当：渡邊さん）
- API担当: 吉田
- 前のバージョンからの大きな変更
  - **APIはログイン必須になりました。** 社員一覧も、ログインしないと `401` になります。
  - **DBがSQL Server（Docker）になりました。** APIを動かすPCには、Docker Desktop が必要です。
  - **GitHubが使えない間は、ZIPで渡します。**
  - **Docker導入は前段のガイドを参照してください。**

---

## 0. 渡邊さんがやることの一覧

優先度の高い順です。上から順に進めると、早い段階で動作確認ができます。

| # | 作業 | 内容 | 詳細 | 期限 |
|---|---|---|---|---|
| 1 | 環境を整える | ZIP受け取り、Docker Desktop、.NET 10 SDK、API起動 | 手順1〜4 | 未定 |
| 2 | 接続先の設定 | API の URL を環境変数 `VITE_API_URL` で持つ | 手順6 | 未定 |
| 3 | API呼び出しの共通処理 | トークンを付ける。401 のときはログイン画面へ戻す | 手順7 | 未定 |
| 4 | ログイン画面 | ID、Password、新規登録へのリンク | 手順8 | 未定 |
| 5 | エラー表示の共通処理 | 入力ミスは入力欄の下、それ以外は画面上部 | 手順9 | 未定 |
| 6 | 社員一覧・検索 | 全件を取得し、並べ替え・ページ分けは画面でやる | 手順10 | 未定 |
| 7 | 社員の登録・編集・削除 | 管理者のときだけボタンを表示。画面でも入力チェック | 手順11 | 未定 |
| 8 | 新規登録とパスワード変更 | 新規登録画面。パスワード変更はログイン後の画面 | 手順12 | 未定 |
| 9 | コードの共有 | 画面のソースをZIPにして、メールで吉田へ | 手順13 | 頻度は相談 |
| 10 | CI（`ci-frontend.yml`） | `npm ci` → リント → ビルド → テスト | 手順14 | **10/28** |

---

## 1. 決まったこと（10/20）

| 項目 | 決まった内容 |
|---|---|
| ログイン画面 | ID、Password、新規登録用のリンク |
| トークンの保管 | **sessionStorage**（タブを閉じるまで残る。再読み込みしても消えない） |
| 期限切れ（401） | トークンを消して、ログイン画面に戻す |
| 権限 | `role` を見て、一般ユーザーには登録・編集・削除のボタンを隠す（できたら基本として実装） |
| エラーの形 | APIの `title`・`errors` に準拠して表示する |
| 登録画面 | 作る |
| パスワード変更 | ログイン後の画面に作る |
| ログイン失敗（429） | 待ち時間は画面に出さない（`title` のメッセージだけ表示） |
| 項目名 | **「所属」で統一**（APIの項目名は `department` のまま） |
| 入力チェック | 画面でも同じチェックを実装する（API の `errors` も表示する） |
| 登録・更新で送るデータ | 名前、所属、スキルのみ |
| 一覧 | 全件を取得し、並べ替え・ページ分けは画面（React）で行う |
| エラーの見せ方 | ユーザーが直せるもの（入力ミスなど）は、直す場所の近くに出す。直せないもの（権限・サーバー障害など）は、画面の目立つ場所に出し、次の行動を示す |
| APIのURL | **`http://localhost:5200`**（`dotnet run`）を採用 |
| CORS | `http://localhost:5173` は許可済み |
| 起動手順 | README に準拠 |
| 確認用ユーザー | 必要に応じて追加する |
| 仮のUI | 開発中は `http://localhost:5200/ui/` で、APIの動きを確認できる |
| API変更の連絡 | チャット |
| ZIPの共有 | メールで送る |
| GitHub復旧後のリポジトリ | とりあえず放置（復旧後に決める） |
| CI | `ci-frontend.yml` を別ファイルで作る。起動条件はAPIと同じ。ジョブは `npm ci` → リント(ESLint) → ビルド → テスト(Vitest など) |
| 困りごとの記録 | 何かあれば GitHub の Issue に登録（復旧後） |

---

## 構成のイメージ

画面とAPIは、**どちらも自分のPCで**動かします。

```
自分のPC
 ├─ React（画面）  http://localhost:5173      ← npm run dev
 ├─ API            http://localhost:5200      ← dotnet run
 └─ DB(SQL Server) localhost:1433             ← docker compose up -d db
```

別のPCで動いているAPIには、`localhost` では届きません。必ず**自分のPCでAPIも起動**してください。

---

## 手順1：APIのソースを受け取る

GitHubが使えないため、吉田からZIPで受け取ります。

1. 吉田から届いた ZIP を、好きなフォルダに移して「すべて展開」する
2. ターミナルで、展開したフォルダに移動する
3. `ls`（Mac / Git Bash）または `dir`（Windows）で、`Program.cs`、`compose.yaml`、`README.md` が見えれば、正しい場所です

> ZIPには、`bin`・`obj`・`.env` は含まれていません。
> `.devcontainer` フォルダがありますが、使いません。VS Code で「Reopen in Container」と出たら、選ばずに閉じてください。

## 手順2：必要なツールを入れる

| ツール | 確認コマンド | 入れ方 |
|---|---|---|
| **Docker Desktop**（DBを動かすために必要） | `docker --version` | https://www.docker.com/products/docker-desktop/ |
| **.NET 10 SDK**（`dotnet run` に必要） | `dotnet --version`（`10.x.x`） | https://dotnet.microsoft.com/download/dotnet/10.0 から **SDK** を入れる |

- インストール後は、**開いているターミナルをすべて閉じて、開き直してください。**
- 詳しい手順は、ZIPの `README.md` の「3. 必要なツールを入れる」を見てください。
- **会社のPCにDocker Desktopを入れられない場合は、吉田に連絡してください。** 別の方法を考えます。

## 手順3：APIを起動する（方法A：ポート5200）

ZIPを展開したフォルダ（`Program.cs` があるフォルダ）で実行します。

```bash
docker compose up -d db
dotnet run
```

- 初回は、イメージの取得とビルドで数分かかります。
- ログに `Now listening on: http://localhost:5200` と出れば成功です。
- **このターミナルは開いたまま**にします。止めるときは `Ctrl + C` です。
- DBも止める場合は `docker compose down` です（`-v` は付けないでください。データが消えます）。

## 手順4：APIの動作を確認する

開発モードで起動すると、**ダミーデータが自動登録**されます（DBが空のときだけ）。

| 自動登録されるもの | 内容 |
|---|---|
| 社員 | ダミーの5名 |
| ユーザー | 管理者 `admin` ／ `Admin_Passw0rd!`、一般 `user` ／ `User_Passw0rd!` |

確認の方法は、次のどちらかです。

- **仮のUI**: http://localhost:5200/ui/ を開く（末尾の `/` が必要）。`admin` でログインして、一覧を確認する
- **Scalar（API試用画面）**: http://localhost:5200/scalar を開く

> ブラウザのアドレスバーに `http://localhost:5200/employees` を直接入れると、`401`（ログインが必要です）になります。ログインが必要になったためで、**正常な動き**です。

## 手順5：Reactを起動する

```bash
npm install     # 初回のみ
npm run dev
```

ブラウザのアドレスバーのURLが `http://localhost:5173` なら、CORSの設定は不要です。違う場合は、次の「CORS」を見てください。

### CORS（URLが5173以外のとき）

APIが許可しているのは、次の3つです。

| 許可済みのオリジン |
|---|
| `http://localhost:5173` |
| `http://localhost:5174` |
| `http://localhost:3000` |

画面のURLが違う場合は、`Program.cs` の `WithOrigins(...)` に1行追加して、**APIを再起動**します。

```csharp
policy.WithOrigins(
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5175")   // ← 追加（最後の項目の後ろにカンマは付けない）
```

- 末尾に `/` やパスは付けない
- `localhost` と `127.0.0.1` は別物、`http` と `https` も別物

## 手順6：接続先を環境変数にする

プロジェクトの直下に `.env.development` を作ります。

```
VITE_API_URL=http://localhost:5200
```

- コードからは `import.meta.env.VITE_API_URL` で読めます。
- 変更したら、`npm run dev` を再起動してください。
- Dockerで全部動かす場合（方法B）は、`http://localhost:8080` に変えるだけで切り替えられます。

## 手順7：API呼び出しの共通処理を作る

`src/api.js` を作ります。**トークンを付ける処理と、401のときの処理を、ここにまとめます。**

```javascript
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5200";
const TOKEN_KEY = "accessToken";
const ROLE_KEY = "role";

// ---- ログイン情報の保管（sessionStorage） ----
export function saveSession({ accessToken, role }) {
  try {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(ROLE_KEY, role);
  } catch { /* 保存できない環境では、何もしない */ }
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

// ---- APIのエラー ----
export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.title ?? `HTTPエラー: ${status}`);
    this.status = status;
    this.detail = problem?.detail ?? null;
    this.fieldErrors = problem?.errors ?? {}; // 例: { Name: ["氏名は必須です。"] }
  }
}

// ---- 共通の呼び出し ----
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

// ---- よく使う呼び出し ----
export const login = async (userName, password) => {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ userName, password }),
  });
  saveSession(data); // { accessToken, tokenType, expiresAt, role }
  return data;
};
export const register = (userName, password) =>
  apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ userName, password }) });
export const changePassword = (currentPassword, newPassword) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const getEmployees = () => apiFetch("/employees");
export const searchEmployees = (keyword) =>
  apiFetch(`/employees/search?keyword=${encodeURIComponent(keyword)}`);
export const createEmployee = (emp) =>
  apiFetch("/employees", { method: "POST", body: JSON.stringify(emp) });
export const updateEmployee = (id, emp) =>
  apiFetch(`/employees/${id}`, { method: "PUT", body: JSON.stringify(emp) });
export const deleteEmployee = (id) => apiFetch(`/employees/${id}`, { method: "DELETE" });
```

ポイント:

- ログイン情報は **sessionStorage** に入れます。使えない環境でも画面が止まらないよう、`try/catch` で囲んでいます。
- 401 が返ったら、ログイン情報を消して `auth:expired` を通知します。`App.jsx` で受け取って、ログイン画面に戻します。
- 登録・更新で送るのは、`name`・`department`・`skills`（`[{ name }]`）だけです。`id` は送りません。

## 手順8：ログイン画面と `App.jsx`

**ログイン画面に置くもの**: ID、Password、ログインボタン、新規登録へのリンク。

`App.jsx` の骨組みは次のとおりです（`LoginForm` と `EmployeeList` は、各自の画面部品に置き換えてください）。

```jsx
import { useState, useEffect } from "react";
import { getToken, getRole, clearSession } from "./api";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [role, setRole] = useState(getRole());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    // 401（期限切れ）のとき、ログイン画面に戻す
    const onExpired = () => {
      setLoggedIn(false);
      setRole(null);
      setNotice("ログインの有効期限が切れました。もう一度ログインしてください。");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const handleLoggedIn = () => {
    setLoggedIn(true);
    setRole(getRole());
    setNotice(null);
  };
  const handleLogout = () => {
    clearSession();
    setLoggedIn(false);
    setRole(null);
  };

  if (!loggedIn) return <LoginForm notice={notice} onLoggedIn={handleLoggedIn} />;

  const isAdmin = role === "Admin"; // 管理者だけ、登録・編集・削除ができる
  return <EmployeeList isAdmin={isAdmin} onLogout={handleLogout} />;
}
```

ログインボタンの処理:

```jsx
try {
  await login(userName, password);
  onLoggedIn();
} catch (e) {
  setError(e.message); // 401: ユーザー名またはパスワードが正しくありません。 429: ロック中のメッセージ
}
```

## 手順9：エラーの見せ方

APIのエラーは、いつも次の形で届きます（日本語）。

```json
{
  "title": "入力内容に誤りがあります。",
  "status": 400,
  "detail": "...",
  "errors": { "Name": ["氏名は必須です。"], "Skills[0].Name": ["スキル名は必須です。"] }
}
```

`errors` のキーは、**先頭が大文字**です（`Name`・`Department`・`Skills[0].Name`）。

| ステータス | 意味 | 見せる場所 | 画面の動き |
|---|---|---|---|
| 400 | 入力ミス | 該当の入力欄の下（`errors` のキーで対応づける） | 入力を残して、直してもらう |
| 409 | ユーザー名の重複 | ユーザー名欄の下 | 別の名前を入れてもらう |
| 401（ログイン画面） | ID・Password が違う | ログインフォームの上 | 入力し直してもらう |
| 401（ログイン後） | 期限切れ | 画面上部 | ログイン情報を消して、ログイン画面へ |
| 403 | 権限がない | 画面上部 | ボタンを隠していれば、基本は出ない |
| 404 | 社員が見つからない | 画面上部 | 一覧を取得し直す |
| 429 | ログイン失敗でロック中 | ログインフォームの上 | `title` を表示するだけ（待ち時間は出さない） |
| 500 | サーバーの不具合 | 画面上部 | 「時間をおいて、再度お試しください」。詳細は出さない |

**表示の基本方針**

- ユーザーが直せるもの（400・409 など）は、**直す場所の近く**に出す。
- ユーザーが直せないもの（403・500 など）は、**画面の目立つ場所**に出して、次の行動を示す。
- メッセージは、APIの `title` と `errors` を**そのまま**表示すれば足ります（日本語で届きます）。

入力欄の下に出す例:

```jsx
// e は ApiError。errors のキーと入力欄を対応づける
const nameError = e.fieldErrors?.Name?.[0];
const departmentError = e.fieldErrors?.Department?.[0];
```

## 手順10：社員の一覧・検索

```jsx
import { useState, useEffect } from "react";
import { getEmployees } from "./api";

const [employees, setEmployees] = useState([]);
const [error, setError] = useState(null);

useEffect(() => {
  (async () => {
    try {
      const data = await getEmployees();
      // APIの形 → 既存の画面が期待する形に変換
      setEmployees(
        data.map((emp) => ({
          id: emp.id,
          name: emp.name,
          department: emp.department, // 画面の表示名は「所属」
          skill: (emp.skills ?? []).map((s) => s.name).join(", "),
          active: true, // APIに項目がないため、仮の値
        }))
      );
    } catch (e) {
      setError(e.message);
    }
  })();
}, []);
```

- 一覧は**全件**が返ります（ページ分けなし）。**並べ替えとページ分けは、画面（React）で行います。**
- 画面の列名・ラベルは「所属」にします（APIの項目名は `department` のまま）。
- 検索は `searchEmployees(keyword)`（氏名・所属・スキルを検索）が使えます。画面側で絞り込む方法でもかまいません。
- `active`（在籍状況）はAPIにありません。仮の値（`true`）にしています。

## 手順11：登録・編集・削除（管理者のみ）

**ボタンの出し分け**: `role` が `Admin` のときだけ、登録・編集・削除のボタンを表示します。

```jsx
{isAdmin && <button onClick={onAdd}>社員を登録</button>}
{isAdmin && <button onClick={() => onEdit(emp)}>編集</button>}
{isAdmin && <button onClick={() => onDelete(emp.id)}>削除</button>}
```

> 画面でボタンを隠すのは、使いやすさのためです。本当の権限チェックは、API側にあります（一般ユーザーが送っても `403` で断られます）。

**送るデータ**（`id`・スキルの `id`・`employeeId` は送りません）

```javascript
await createEmployee({
  name: "山田 太郎",
  department: "開発部",
  skills: [{ name: "React" }, { name: "SQL" }],
});
```

- 更新（PUT）は、**全項目**を送ります。スキルは、送った内容で**置き換え**られます。
- 編集フォームには、`id` やスキルの `employeeId` を持ち込まないでください（送ると SQL Server でエラーになることがあります）。

**画面の入力チェック**（APIと同じルール。APIの `errors` も表示します）

| 項目 | ルール |
|---|---|
| 氏名 | 必須。100文字以内 |
| 所属 | 必須。100文字以内 |
| スキル名 | 必須。100文字以内 |
| スキル | 0件でもよい |

## 手順12：新規登録とパスワード変更

**新規登録**（ログイン画面のリンクから）

```javascript
await register("taro_yamada", "Passw0rd_2026");
```

| 項目 | ルール |
|---|---|
| ユーザー名 | 必須。3〜50文字。半角の英数字と `_` `.` `-` のみ |
| パスワード | 必須。8〜100文字 |

- 登録できるのは、**一般ユーザーだけ**です（管理者は画面から作れません）。
- すでにあるユーザー名は、`409`（「そのユーザー名は、すでに使われています。」）になります。

**パスワード変更**（ログイン後の画面から）

```javascript
await changePassword("現在のパスワード", "新しいパスワード");
```

- 成功すると `204` です。
- 現在のパスワードが違う、新旧が同じ、8文字未満の場合は、`400`（日本語のメッセージ）です。

## 手順13：コードの共有（ZIP）

GitHubが復旧するまでは、画面のソースをZIPにして、**メールで吉田に送ります**。

- `node_modules` は、含めません。
- 顧客のコード・データは含めません（ダミーデータだけを使います）。
- `.env` に鍵などの秘密情報を入れている場合は、含めません。
- 送る頻度は、打ち合わせで相談して決めます。
- メールのルールでZIPが送れない場合は、吉田に相談してください。

GitHub復旧後のリポジトリの分け方は、復旧後に決めます。

## 手順14：CI（`ci-frontend.yml`）

**期限は10/28です。** APIの `ci.yml` とは別ファイルにします（ファイルが別なら、変更が衝突しません）。

| 項目 | 決まった内容 |
|---|---|
| ファイル | `.github/workflows/ci-frontend.yml` |
| 起動条件 | APIと同じ（`main` への push と、`main` 向けのプルリクエスト） |
| ジョブ | `npm ci` → リント（ESLint）→ ビルド（`npm run build`）→ テスト（Vitest など） |

ひな形（`frontend` は、画面のフォルダー名に置き換えてください）:

```yaml
name: CI Frontend
on:
  push:
    branches: [main]
    paths: ["frontend/**"]
  pull_request:
    branches: [main]
    paths: ["frontend/**"]
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22        # 手元の `node -v` に合わせる
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npx vitest run --passWithNoTests   # テストが0件でも失敗にしない
```

- GitHubが使えない間は、実際には動かせません。手元で `npm ci`、`npm run lint`、`npm run build` が通ることを確認しておいてください。
- 復旧後に、はじめて動かして確認します。

---

## 動作確認のチェックリスト

- [ ] APIが起動している（`Now listening on: http://localhost:5200`）
- [ ] 仮のUI（`http://localhost:5200/ui/`）で、`admin` でログインでき、一覧が出る
- [ ] 画面のログインで、`admin` と `user` の両方にログインできる
- [ ] ログイン後、社員の一覧が表示される（ダミーの5名）
- [ ] `user`（一般）でログインすると、登録・編集・削除のボタンが出ない
- [ ] `admin` で、社員の登録・編集・削除ができる
- [ ] 氏名を空にして登録すると、氏名の欄の下にエラーが出る
- [ ] ログアウト後、または期限切れ（401）で、ログイン画面に戻る
- [ ] 間違ったパスワードで、エラーが表示される
- [ ] Consoleに `blocked by CORS policy` が出ていない
- [ ] 新規登録ができる。同じユーザー名で、もう一度登録するとエラーが出る
- [ ] パスワード変更ができる
- [ ] ダミーデータ（`EMPLOYEES`）のコードが残っていない

---

## うまくいかないとき

| 症状 | 原因と対処 |
|---|---|
| 一覧が `401` になる | ログインしていない、またはトークンが付いていない。`Authorization: Bearer <accessToken>` が付いているか、Networkタブで確認する |
| 登録・更新・削除が `403` になる | 一般ユーザーでログインしている。`admin` でログインし直す |
| ログインが `429` になる | 連続5回の失敗で、15分ロックされた。待つか、吉田に連絡する（管理者が解除できる） |
| ログインが `401` になる | ID・Passwordが違う。`admin` ／ `Admin_Passw0rd!`、`user` ／ `User_Passw0rd!`（開発用ダミー）を確認する |
| 登録が `400` になる | 入力規則に合っていない。`errors` のメッセージを確認する。`id` を送っていないかも確認する |
| 登録が `409` になる | ユーザー名がすでに使われている |
| Consoleに `blocked by CORS policy` | 画面のURLが許可リストにない。手順5のCORSを実施し、**APIを再起動**する |
| `ERR_CONNECTION_REFUSED` / `Failed to fetch` | APIが起動していない、または `VITE_API_URL` のポートが違う（5200か確認）。`.env.development` を変えたら、`npm run dev` を再起動する |
| `dotnet run` で DB につながらない | `docker compose up -d db` を先に実行する。DBの起動に少し時間がかかるので、10秒ほど待ってから `dotnet run` する |
| `dotnet` が見つからない | .NET 10 SDK が未導入、またはターミナルを開き直していない |
| `dotnet run` で「ポート5200は使用中」 | 他のアプリが使用中。止めるか、`dotnet run --urls "http://localhost:5201"` にして、`VITE_API_URL` も合わせる |
| 画面は出るが一覧が空 | DBが空のときだけ、ダミーが入る。吉田に連絡するか、管理者で登録する |
| 画面に「エラー: 500」 | APIの内部エラー。`dotnet run` のターミナルのログを確認し、吉田に連絡する |
| 仕様が分からない | ZIPの `README.md`（7章 認証と権限、8章 APIの使い方）と、Scalar（`http://localhost:5200/scalar`）を見る |
| VS Codeで「Reopen in Container」が出る | 使わない。閉じるか、「Reopen Folder Locally」を選ぶ |

---

## 参考：API仕様

詳しくは、ZIPの `README.md` と、Scalar（`http://localhost:5200/scalar`）を見てください。仕様が変わるときは、吉田からチャットで連絡します。

**社員のAPI**（すべてログインが必要）

| メソッド | パス | 説明 | 権限 | 成功時 |
|---|---|---|---|---|
| GET | `/employees` | 社員の一覧（スキル含む） | ログイン済み | 200 |
| GET | `/employees/search?keyword=○○` | 氏名・所属・スキルで検索 | ログイン済み | 200 |
| POST | `/employees` | 社員を登録 | **管理者** | 201 |
| PUT | `/employees/{id}` | 社員を更新（全項目を送る。スキルは置き換え） | **管理者** | 204 |
| DELETE | `/employees/{id}` | 社員を削除 | **管理者** | 204 |

**認証のAPI**

| メソッド | パス | 説明 | 成功時 |
|---|---|---|---|
| POST | `/auth/login` | ログイン。`accessToken`・`tokenType`・`expiresAt`・`role` を返す | 200 |
| POST | `/auth/register` | 新規登録（一般ユーザーとして作られる） | 201 |
| POST | `/auth/change-password` | パスワードの変更（本人。要ログイン） | 204 |

トークンの有効期限は **60分** です。

**ログインの返事**

```json
{
  "accessToken": "eyJhbGciOi...（長い文字列）",
  "tokenType": "Bearer",
  "expiresAt": "2026-10-20T12:30:00+00:00",
  "role": "General"
}
```

`role` は `"Admin"`（管理者）か `"General"`（一般）です。
