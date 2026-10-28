import { useState, type FormEvent } from 'react';
import { ApiError, type EmployeeInput } from '../api.js';
import type { Employee } from '../types/Employee';

interface EmployeeFormProps {
  // 編集中の社員。新規登録のときは null が渡される。
  employee: Employee | null;
  // 入力内容の保存を親画面に依頼する関数。
  onSave: (employee: EmployeeInput) => Promise<void>;
  // キャンセル時に親画面へフォームを閉じてもらう関数。
  onCancel: () => void;
}

export function EmployeeForm({ employee, onSave, onCancel }: EmployeeFormProps) {
  // useStateは入力内容を記憶し、値が変わると画面を更新するReactの機能。
  // 編集時は受け取った社員の情報を表示し、新規登録時は空欄から始める。
  const [name, setName] = useState(employee?.name ?? '');
  const [department, setDepartment] = useState(employee?.department ?? '');
  // スキルは複数入力できるよう、文字列の配列として管理する。
  // 新規登録では空欄を1つ、編集では既存スキルごとに入力欄を用意する。
  const [skills, setSkills] = useState(() => employee?.skillNames ?? ['']);
  // 入力欄ごとのエラー、フォーム全体のエラー、保存中かどうかを記録する。
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 保存ボタンを押したときの処理。入力確認、保存依頼、結果表示を順に行う。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // フォーム送信によるページ再読み込みを止め、React内で処理する。
    event.preventDefault();
    // 前回のエラーを消してから、今回の入力内容を確認する。
    setFieldErrors({});
    setFormError(null);

    // 送信前に前後の空白を取り除き、スキルをAPIが受け取る形に変換する。
    // 空欄のスキルは除外し、それぞれを { name: "..." } の形にまとめる。
    const payload: EmployeeInput = {
      name: name.trim(),
      department: department.trim(),
      skills: skills.map((skill) => skill.trim()).filter(Boolean).map((skill) => ({ name: skill })),
    };
    // 入力に問題があった場合、項目名とメッセージをここに集める。
    const validationErrors: Record<string, string[]> = {};

    // 氏名と所属は必須で、どちらも100文字以内で入力する。
    if (!payload.name) validationErrors.Name = ['氏名は必須です。'];
    else if (payload.name.length > 100) validationErrors.Name = ['氏名は100文字以内で入力してください。'];
    if (!payload.department) validationErrors.Department = ['所属は必須です。'];
    else if (payload.department.length > 100) validationErrors.Department = ['所属は100文字以内で入力してください。'];

    // スキル名も100文字以内か確認する。空欄は送信しないため番号に含めない。
    // この番号をAPIの項目名と合わせることで、返されたエラーを正しい欄に表示できる。
    let apiSkillIndex = 0;
    skills.forEach((value) => {
      const skillName = value.trim();
      if (!skillName) return;
      if (skillName.length > 100) {
        validationErrors[`Skills[${apiSkillIndex}].Name`] = ['スキル名は100文字以内で入力してください。'];
      }
      apiSkillIndex += 1;
    });

    // エラーが1つでもあれば表示し、入力を直すまでAPIへ送信しない。
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    // 保存中は送信ボタンを無効にし、同じ内容の連続送信を防ぐ。
    setSaving(true);
    try {
      // 登録か更新かの判断とAPI呼び出しは親画面に任せ、完了を待つ。
      await onSave(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        // サーバーから届いた入力欄ごとのエラーを、そのまま画面表示に使う。
        setFieldErrors(error.fieldErrors);
        // サーバーが説明を返していない場合は、状況に合う日本語の案内を出す。
        const hasApiTitle = !error.message.startsWith('HTTPエラー:');
        setFormError(
          error.status >= 500
            ? '時間をおいて、再度お試しください。'
            : error.status === 403 && !hasApiTitle
              ? 'この操作を行う権限がありません。'
              : error.status === 404 && !hasApiTitle
                ? '社員が見つかりません。一覧を再取得してください。'
                : error.message,
        );
      } else {
        // API以外のエラーも、画面に表示できる文字列に変換する。
        setFormError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      // 成功・失敗のどちらでも保存中状態を解除し、ボタンを再び使えるようにする。
      setSaving(false);
    }
  };

  // 指定された名前のエラーを順番に探し、最初に見つかったメッセージを返す。
  // サーバーから届く項目名の大文字・小文字の違いにも対応する。
  const firstError = (...keys: string[]) => keys.map((key) => fieldErrors[key]?.[0]).find(Boolean);

  // 社員情報の入力欄を表示する。社員データの有無で登録・編集の見出しを変える。
  return (
    <section className="employee-form-panel" aria-labelledby="employee-form-title">
      <h3 id="employee-form-title">{employee ? '社員情報を編集' : '社員を登録'}</h3>
      {/* 保存処理全体で問題が起きた場合は、フォーム上部に案内を表示する。 */}
      {formError && <p className="auth-error" role="alert">{formError}</p>}
      <form className="employee-form" onSubmit={handleSubmit} noValidate>
        {/* valueに現在値を表示し、入力のたびにstate（記憶している値）を更新する。 */}
        <label htmlFor="employee-name">氏名</label>
        <input
          id="employee-name"
          maxLength={100}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!firstError('Name')}
          aria-describedby={firstError('Name') ? 'employee-name-error' : undefined}
        />
        {/* 氏名にエラーがあるときだけ、入力欄の近くに理由を表示する。 */}
        {firstError('Name') && <p className="field-error" id="employee-name-error">{firstError('Name')}</p>}

        <label htmlFor="employee-department">所属</label>
        <input
          id="employee-department"
          maxLength={100}
          required
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          aria-invalid={!!firstError('Department')}
          aria-describedby={firstError('Department') ? 'employee-department-error' : undefined}
        />
        {/* 所属のエラーも氏名と同じように、該当する入力欄の近くへ表示する。 */}
        {firstError('Department') && <p className="field-error" id="employee-department-error">{firstError('Department')}</p>}

        {/* fieldsetでスキル欄をひとまとめにし、複数のスキルを入力できるようにする。 */}
        <fieldset className="employee-skills">
          <legend>スキル（任意）</legend>
          {skills.map((skill, index) => {
            // 画面上の位置ではなく、空欄を除いた送信時のスキル番号を数える。
            // 入力欄の番号とAPIの番号を合わせ、エラーを正しい欄に表示するため。
            const apiSkillIndex = skills
              .slice(0, index)
              .filter((value) => value.trim()).length;
            // APIが返す項目名の大文字・小文字どちらの形式でもエラーを探す。
            const skillError = firstError(
              `Skills[${apiSkillIndex}].Name`,
              `Skills[${apiSkillIndex}].name`,
            );
            return (
              <div className="skill-input-row" key={index}>
                <div>
                  {/* 見た目には表示しないが、読み上げソフトには欄の名前を伝える。 */}
                  <label className="visually-hidden" htmlFor={`employee-skill-${index}`}>
                    スキル名 {index + 1}
                  </label>
                  <input
                    id={`employee-skill-${index}`}
                    maxLength={100}
                    value={skill}
                    onChange={(event) =>
                      // 入力された行だけを書き換え、他のスキルはそのまま残す。
                      setSkills((current) =>
                        current.map((value, skillIndex) => skillIndex === index ? event.target.value : value),
                      )
                    }
                    aria-invalid={!!skillError}
                    aria-describedby={skillError ? `employee-skill-${index}-error` : undefined}
                  />
                  {/* 該当するスキルにエラーがある場合だけ、入力欄の下に表示する。 */}
                  {skillError && <p className="field-error" id={`employee-skill-${index}-error`}>{skillError}</p>}
                </div>
                {/* 押された行だけを配列から取り除き、そのスキル欄を削除する。 */}
                <button
                  type="button"
                  className="form-secondary-button"
                  onClick={() => setSkills((current) => current.filter((_, skillIndex) => skillIndex !== index))}
                  aria-label={`スキル ${index + 1} を削除`}
                >
                  削除
                </button>
              </div>
            );
          })}
            {/* 空の入力欄を末尾に加え、新しいスキルを入力できるようにする。 */}
            <button
            type="button"
            className="form-secondary-button"
            onClick={() => setSkills((current) => [...current, ''])}
          >
            スキルを追加
          </button>
        </fieldset>

        {/* 保存中は状況を表示し、保存と取消の操作を一時的に無効にする。 */}
        <div className="employee-form-actions">
          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button className="form-secondary-button" type="button" onClick={onCancel} disabled={saving}>
            キャンセル
          </button>
        </div>
      </form>
    </section>
  );
}
