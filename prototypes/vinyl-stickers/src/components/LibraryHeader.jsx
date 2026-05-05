import { ChevronDownIcon, SearchIcon } from "./Icons.jsx";

export function SearchField({ state = "default" }) {
  const isDisabled = state === "disabled";
  const value = state === "filled" ? "CTM" : "";
  const placeholder = state === "filled" ? "" : "Search library";

  return (
    <label className={`search-field search-field--${state}`}>
      <SearchIcon />
      <input
        aria-label="Search library"
        disabled={isDisabled}
        readOnly
        placeholder={placeholder}
        value={value}
      />
      <span className="search-field__shortcut" aria-hidden="true">
        <span>⌘</span>
        <span>F</span>
      </span>
    </label>
  );
}

export function SortControl({ state = "default" }) {
  const isDisabled = state === "disabled";
  const isOpen = state === "open";

  return (
    <div className={`sort-control sort-control--${state}`}>
      <button type="button" disabled={isDisabled} aria-expanded={isOpen}>
        <span>Recently added</span>
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="sort-control__menu" role="listbox" aria-label="Sort options">
          <button type="button">Recently added</button>
          <button type="button">Artist</button>
          <button type="button">Album title</button>
        </div>
      )}
    </div>
  );
}

export function LibraryHeader({
  title = "My collection",
  albumCount = 70,
  searchState = "default",
  sortState = "default",
}) {
  return (
    <header className="library-header">
      <div className="library-header__title">
        <h1>{title}</h1>
        <p>{albumCount} albums</p>
      </div>
      <div className="library-header__controls">
        <SearchField state={searchState} />
        <SortControl state={sortState} />
      </div>
    </header>
  );
}
