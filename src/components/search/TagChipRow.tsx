import { useSearchStore } from '@/stores/searchStore';

/** Default chip definitions (always shown, in order) */
const DEFAULT_CHIPS = [
  {
    label: 'Events',
    tag: 'type:airstrike OR type:ground_combat OR type:shelling OR type:bombing OR type:assassination OR type:abduction',
  },
  { label: 'Sites', tag: 'type:site' },
  { label: 'Iran', tag: 'country:iran' },
  { label: 'US', tag: 'country:united states' },
] as const;

interface TagChipRowProps {
  onInsertTag: (tag: string) => void;
}

/**
 * Horizontal row of clickable tag chips displayed above the search input.
 * Shows 4 default chips plus recent tags from the last 5 searches.
 */
export function TagChipRow({ onInsertTag }: TagChipRowProps) {
  const recentTags = useSearchStore((s) => s.recentTags);

  // Deduplicate recent tags against default chip tag values
  const defaultTagValues = new Set(DEFAULT_CHIPS.map((c) => c.tag));
  const uniqueRecent = recentTags.filter((t) => !defaultTagValues.has(t));

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2" data-testid="tag-chip-row">
      {DEFAULT_CHIPS.map((chip) => (
        <button
          key={chip.label}
          className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-text-muted transition-colors hover:bg-surface-elevated"
          onClick={() => onInsertTag(chip.tag)}
          type="button"
        >
          {chip.label}
        </button>
      ))}
      {uniqueRecent.map((tag) => (
        <button
          key={tag}
          className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-text-muted transition-colors hover:bg-surface-elevated"
          onClick={() => onInsertTag(tag)}
          type="button"
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
