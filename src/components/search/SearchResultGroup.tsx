import type { MapEntity, SiteEntity } from '@/types/entities';
import type { SearchResult } from '@/lib/searchUtils';
import { SearchResultItem } from '@/components/search/SearchResultItem';

interface SearchResultGroupProps {
  type: string;
  results: SearchResult<MapEntity | SiteEntity>[];
  onSelect: (entity: MapEntity | SiteEntity) => void;
}

export function SearchResultGroup({ type, results, onSelect }: SearchResultGroupProps) {
  if (results.length === 0) return null;

  return (
    <div className="py-1">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {type}
        </span>
        <span className="rounded-full bg-surface-elevated px-1.5 text-[10px] text-text-secondary">
          {results.length}
        </span>
      </div>

      {/* Result items */}
      {results.map((r) => (
        <SearchResultItem
          key={r.entity.id}
          entity={r.entity}
          matchField={r.matchField}
          matchValue={r.matchValue}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
