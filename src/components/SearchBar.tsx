interface SearchBarProps {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  onSearch: (value: string) => void;
}

// 入力中の検索語を親へ通知し、送信時に検索を確定するフォーム。
export function SearchBar({ filterText, onFilterTextChange, onSearch }: SearchBarProps) {
  return (
    <form
      className="employee-search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(filterText);
      }}
    >
      <input
        type="text"
        value={filterText}
        placeholder="社員名・所属・スキルで検索..."
        onChange={(e) => onFilterTextChange(e.target.value)}
      />
      <button type="submit">検索</button>
    </form>
  );
}