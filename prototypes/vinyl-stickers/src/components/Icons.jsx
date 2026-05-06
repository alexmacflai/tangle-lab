export function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21 21-4.35-4.35" />
      <circle cx="11" cy="11" r="7" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg className="icon icon--small" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function HeartIcon({ filled = false }) {
  return (
    <svg
      className={`icon icon--heart ${filled ? "icon--heart-filled" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.8 5.9c-1.7-2-4.7-2.1-6.6-.2L12 7.9 9.8 5.7C7.9 3.8 4.9 3.9 3.2 5.9 1.6 7.8 1.8 10.8 3.7 12.6L12 20.5l8.3-7.9c1.9-1.8 2.1-4.8.5-6.7Z" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg className="icon icon--plus" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PreviousTrackIcon() {
  return (
    <svg className="icon icon--transport" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5v14" />
      <path d="m18 6-9 6 9 6V6Z" />
    </svg>
  );
}

export function NextTrackIcon() {
  return (
    <svg className="icon icon--transport" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 5v14" />
      <path d="m6 6 9 6-9 6V6Z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg className="icon icon--transport" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h3v12H8z" />
      <path d="M13 6h3v12h-3z" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg className="icon icon--transport" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4.75v14.5L19 12 6 4.75Z" />
    </svg>
  );
}
