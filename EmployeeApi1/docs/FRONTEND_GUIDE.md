# フロント側 接続手順書

Reactアプリ（`App.jsx`）のダミーデータをやめて、社員スキル管理APIから `fetch` でデータを取得するための手順です。

- 対象: Reactアプリを持っている人（フロント担当）
- 前提: **Dockerは使いません**。APIは自分のPCで `dotnet run` して起動します
- 所要時間の目安: 初回30分程度（.NET SDKの導入を含む）

## 全体の流れ

| # | やること | 目的 |
|---|---|---|
| 1 | APIを取得する | APIのコードを自分のPCに置く |
| 2 | .NET 10 SDKを入れる | APIを起動するために必要 |
| 3 | APIを起動する | `http://localhost:5200` で待ち受ける |
| 4 | テストデータを登録する | APIは空の状態で始まるため |
| 5 | Reactを起動し、URLを確認する | CORS（許可）の確認に使う |
| 6 | CORSを確認し、必要なら許可を追加する | ブラウザにAPIの結果を読ませるため |
| 7 | `App.jsx` を `fetch` に置き換える | 本題 |
| 8 | 動作確認する | 画面にAPIのデータが出ること |

## 構成のイメージ

画面とAPIは**どちらも自分のPCで**動かします。

```
自分のPC
 ├─ React（画面）  http://localhost:5173 など   ← npm run dev
 └─ API            http://localhost:5200        ← dotnet run
```

別のPCで動いているAPIには、`localhost` では届きません。必ず**自分のPCでAPIも起動**してください。

---

## 手順1：APIを取得する

**Gitがある場合**

```bash
git clone https://github.com/yoshida-taiga1999/EmployeeApi.git
cd EmployeeApi
```

**Gitがない場合**

1. https://github.com/yoshida-taiga1999/EmployeeApi をブラウザで開く
2. 緑の「**Code**」ボタン →「**Download ZIP**」
3. ZIPを好きなフォルダで展開する
4. ターミナルで展開したフォルダに移動する（`EmployeeApi-main` など）

`ls`（Mac / Git Bash）または `dir`（Windows）で、`Program.cs` と `Dockerfile` が見えれば正しい場所です。

> リポジトリに `.devcontainer` フォルダがありますが、**Dockerが必要なので使いません**。VS Codeで開いて「Reopen in Container」と表示されても、選ばずに閉じてください。誤って選んだ場合は、左下の緑の表示 →「**Reopen Folder Locally**」で戻せます。

## 手順2：.NET 10 SDK を入れる

**確認**

```bash
dotnet --version
```

`10.x.x` と表示されれば導入済みです。手順3へ進みます。

**インストール**（見つからない、または `10` で始まらない場合）

1. https://dotnet.microsoft.com/download/dotnet/10.0 を開く
2. **SDK**（Runtimeではない）の、自分のOS用インストーラーをダウンロードして実行する
3. インストール後、**開いているターミナルをすべて閉じて開き直す**（開いたままだと反映されません）
4. もう一度 `dotnet --version` を実行し、`10.x.x` と出ることを確認する

## 手順3：APIを起動する

手順1のフォルダ（`Program.cs` があるフォルダ）で実行します。

```bash
dotnet run
```

- 初回はパッケージの取得とビルドで時間がかかります。
- 次の表示が出れば成功です。

```
Now listening on: http://localhost:5200
```

- ブラウザが自動で試用画面（`http://localhost:5200/scalar`）を開きます。
- **このターミナルは開いたまま**にします（閉じるとAPIが止まります）。止めるときは `Ctrl + C` です。

動作確認として、ブラウザで http://localhost:5200/employees を開きます。`[]`（空の配列）が表示されれば、APIは動いています。

## 手順4：テストデータを登録する

APIは**空の状態から始まります**。このままでは画面に何も出ないので、数件登録します。

**Scalar（試用画面）から登録する方法**（Windowsでも簡単）

1. http://localhost:5200/scalar を開く
2. 左の一覧から「**社員を登録する**（POST /employees）」を選ぶ
3. リクエストボディに次を入力して送信する

```json
{
  "name": "山田 太郎",
  "department": "開発部",
  "skills": [
    { "name": "React" },
    { "name": "SQL" }
  ]
}
```

4. `201` が返れば成功。名前などを変えて、2〜3件登録する
5. 「社員の一覧を取得する」（GET /employees）で、登録したデータが返ることを確認する

## 手順5：Reactを起動し、アドレスバーのURLを確認する

Reactのプロジェクトで、別のターミナルを開いて起動します。

```bash
npm install     # 初回のみ
npm run dev
```

ブラウザでReactの画面を開き、**アドレスバーに表示されているURL**を控えます。

| 例 | 控える値（末尾の `/` やパスは除く） |
|---|---|
| `http://localhost:5173/` | `http://localhost:5173` |
| `http://127.0.0.1:5173/` | `http://127.0.0.1:5173` |

## 手順6：CORSを確認する

**CORS**とは、ブラウザが「このページから、別オリジン（ポートが違うサーバーなど）のAPIの結果を読んでよいか」を判断する仕組みです。APIが「このURLの画面は許可する」と宣言していないと、**APIが正常にデータを返していても、ブラウザがJavaScriptに渡してくれません**（Consoleに `blocked by CORS policy` と出ます）。

APIには、次のオリジンがすでに許可されています。

| 許可済みのオリジン |
|---|
| `http://localhost:5173` |
| `http://localhost:5174` |
| `http://localhost:3000` |

### 手順5のURLが上の表に「ある」場合

何もせず、手順7へ進みます。

### 手順5のURLが上の表に「ない」場合（許可を追加する）

自分のPCでAPIを動かしているので、自分で追加できます。

1. APIのフォルダにある `Program.cs` を開く
2. `WithOrigins(...)` に、手順5で控えたURLを1行追加する

   ```csharp
   policy.WithOrigins(
           "http://localhost:5174",
           "http://localhost:3000",
           "http://localhost:5173",
           "http://localhost:5175")   // ← 追加（最後の項目の後ろにカンマは付けない）
   ```

3. `dotnet run` を `Ctrl + C` で止め、**もう一度 `dotnet run` で再起動する**（再起動しないと反映されません）

書き方のルール:

- 末尾に `/` を付けない。パス（`/employees` など）も書かない
- `localhost` と `127.0.0.1` は**別物**
- `http` と `https` も**別物**

### 追加できたかの確認（任意）

APIを起動したまま、別のターミナルで実行します（`http://localhost:5173` は自分のURLに置き換える）。

```bash
curl -i http://localhost:5200/employees -H "Origin: http://localhost:5173"
```

Windows PowerShell では `curl.exe` と入力します。レスポンスに次の行があれば、許可されています。

```
Access-Control-Allow-Origin: http://localhost:5173
```

## 手順7：`App.jsx` を `fetch` に置き換える

### 7-1．ダミーデータとAPIの違いを理解する

| 項目 | ダミーデータ（`EMPLOYEES`） | API |
|---|---|---|
| `id` | あり | あり |
| `name` | あり | あり（`null` の場合あり） |
| `department` | あり | あり（`null` の場合あり） |
| スキル | `skill: "React"`（**文字列1つ**） | `skills: [{ id, name, employeeId }]`（**配列**） |
| `active` | あり | **ありません** |

そのまま置き換えると、`skill` が空欄になります。そこで、`fetch` で取得した後に、**画面が期待する形（`skill` が文字列、`active` あり）へ変換**します。これなら `ProductTable` や `SearchBar` は変更不要です。

### 7-2．置き換え後の `App.jsx`

```jsx
import { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { ProductTable } from './components/ProductTable';

// APIのURL（dotnet run のポートは5200）
const API_URL = "http://localhost:5200";

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/employees`);
        if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
        const data = await res.json();

        // APIの形 → 既存の画面が期待する形に変換
        const converted = data.map((emp) => ({
          id: emp.id,
          name: emp.name ?? "（未設定）",
          department: emp.department ?? "（未設定）",
          skill: (emp.skills ?? []).map((s) => s.name).join(", "),
          active: true, // APIに項目がないため仮の値
        }));
        setEmployees(converted);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>社員スキル一覧</h2>
      <SearchBar
        filterText={filterText}
        inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText}
        onInStockOnlyChange={setInStockOnly}
      />
      <ProductTable
        employees={employees}
        filterText={filterText}
      />
    </div>
  );
}
```

### 7-3．変更点

| 変更 | 内容 |
|---|---|
| `EMPLOYEES` を削除 | ダミーデータをやめる |
| `useState` で `employees` を持つ | 取得したデータの入れ物 |
| `useEffect` + `fetch` | 画面表示時にAPIを1回呼ぶ |
| `data.map(...)` で変換 | `skills` 配列を文字列に、`null` を代替文字に |
| `active: true` | APIに項目がないため仮の値 |
| `<ProductTable employees={employees} ...>` | `EMPLOYEES` から `employees` に変更 |

### 7-4．`active` について

APIには在籍状況（`active`）がありません。今回は仮の値（`true`）にしています。`ProductTable` が `active` で絞り込む処理を持っていても、全員が「在籍中」として扱われます。本当に必要になった場合は、API側に項目を追加する相談をしてください。

## 手順8：動作確認する

**確認の前に**: 次の2つが両方起動していること。

| 起動しているもの | 確認 |
|---|---|
| API | `dotnet run` のターミナルが開いたまま（ポート5200） |
| React | `npm run dev` のターミナルが開いたまま |

**確認手順**

1. ブラウザでReactの画面を開き、`F5` で再読み込みする
2. `F12` → **Console** タブを開き、エラーが出ていないか確認する
3. `F12` → **Network** タブで `employees` のリクエストを選び、次を確認する
   - ステータスが `200`
   - Response Headers に `Access-Control-Allow-Origin` がある
4. 手順4で登録したデータが、一覧に表示される
5. 検索ボックスに文字を入れて、絞り込みが動く

**完了チェックリスト**

- [ ] 画面にAPIのデータが表示される
- [ ] Consoleに `blocked by CORS policy` が出ていない
- [ ] Networkタブの `employees` が `200`
- [ ] 検索で絞り込みができる
- [ ] ダミーデータ（`EMPLOYEES`）のコードが残っていない

---

## うまくいかないとき

| 症状 | 原因と対処 |
|---|---|
| `dotnet` が見つからない | .NET 10 SDK が未導入、またはターミナルを開き直していない。手順2を実施し、**ターミナルを開き直す** |
| `dotnet run` で「プロジェクトが見つからない」 | `Program.cs` があるフォルダにいない。`cd` で移動する |
| `dotnet run` で「ポート5200は使用中」 | 他のアプリが使用中。止めるか、`dotnet run --urls "http://localhost:5201"` で別ポートにし、`App.jsx` の `API_URL` も合わせる |
| Consoleに `blocked by CORS policy` | 画面のURLが許可リストにない。手順5のURLを手順6で追加し、**APIを再起動**する |
| 追加したのにCORSエラーのまま | APIを再起動していない。または `localhost` / `127.0.0.1`、ポート、`http` / `https` が1文字でも違う |
| `ERR_CONNECTION_REFUSED` / `Failed to fetch` | APIが起動していない、または `API_URL` のポートが違う（5200か確認） |
| 画面に「エラー: HTTPエラー: 500」 | APIの内部エラー。`dotnet run` のターミナルのログを確認する |
| 画面は出るが一覧が空 | 手順4のデータ登録がまだ。`http://localhost:5200/employees` が `[]` か確認する |
| 名前や部署が「（未設定）」になる | APIのデータの `name` / `department` が `null`。更新（PUT）で全項目を送らなかった場合に起こる |
| VS Codeで「Reopen in Container」が出る | Dockerが無い環境では使えない。閉じるか「Reopen Folder Locally」を選ぶ |

## 参考：API仕様

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/employees` | 社員一覧（スキル含む） |
| GET | `/employees/search?keyword=○○` | 氏名・所属・スキルで検索 |
| POST | `/employees` | 社員を登録 |
| PUT | `/employees/{id}` | 社員を更新（**全項目を送る**。スキルは置き換え） |
| DELETE | `/employees/{id}` | 社員を削除 |

詳細は、APIを起動した状態で http://localhost:5200/scalar（試用画面）を開くと確認できます。

**登録・更新で送るJSON**（`id` は送りません）

```json
{
  "name": "山田 太郎",
  "department": "開発部",
  "skills": [{ "name": "React" }]
}
```

登録・更新・削除は、`fetch` で `method` と `Content-Type` を指定して呼びます。

```javascript
await fetch(`${API_URL}/employees`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "新人", department: "開発部", skills: [{ name: "React" }] }),
});
```

JSONを送る呼び出しでは、ブラウザが事前確認（OPTIONS）を自動で送ります。APIが自動で応答するため、画面側で特別な対応は不要です。
