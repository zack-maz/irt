interface FilterChipProps {
  label: string;
  onClear: () => void;
}

/**
 * Small pill showing the active search query with a dismiss button.
 * Rendered in the sidebar Filters section when search filter mode is active.
 */
export function FilterChip({ label, onClear }: FilterChipProps) {
  const truncated = label.length > 20 ? label.slice(0, 20) + '...' : label;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/20 px-2 py-0.5 text-xs text-accent-blue">
      {/* Magnifying glass icon */}
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <span className="truncate" title={label}>
        {truncated}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent-blue/30"
        aria-label="Clear search filter"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
