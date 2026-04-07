interface FilterButtonProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  color: string;
  /** Compact mode for grid layouts (smaller padding, centered) */
  compact?: boolean;
}

export function FilterButton({ label, active, onToggle, color, compact }: FilterButtonProps) {
  return (
    <button
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={`rounded-full font-semibold uppercase tracking-wider transition-all ${
        compact ? 'px-1.5 py-0.5 text-[9px] text-center' : 'px-2.5 py-0.5 text-[11px]'
      } ${
        active ? 'bg-white/10 text-text-secondary' : 'bg-transparent text-text-muted opacity-40'
      }`}
    >
      <span
        className={`inline-block rounded-full ${compact ? 'h-1 w-1 mr-1' : 'h-1.5 w-1.5 mr-1.5'}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}
