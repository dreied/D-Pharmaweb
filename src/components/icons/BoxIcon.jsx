export function BoxIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
    </svg>
  );
}
