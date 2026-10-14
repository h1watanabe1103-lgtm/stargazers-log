export function SearchBar({ filterText, onFilterTextChange }) {
  return (
    <form>
      <input
        type="text"
        value={filterText}
        placeholder="社員名・所属・スキルで検索..."
        onChange={(e) => onFilterTextChange(e.target.value)}
      />
    </form>
  );
}