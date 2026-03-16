import { useUIStore } from '@/stores/uiStore';
import { OverlayPanel } from '@/components/ui/OverlayPanel';

export function FiltersSlot() {
  const isExpanded = useUIStore((s) => s.isFiltersExpanded);
  const toggleFilters = useUIStore((s) => s.toggleFilters);
  const showGroundTraffic = useUIStore((s) => s.showGroundTraffic);
  const toggleGroundTraffic = useUIStore((s) => s.toggleGroundTraffic);

  return (
    <div data-testid="filters-slot">
      <OverlayPanel>
        <button
          onClick={toggleFilters}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          <span>Filters</span>
          <span className="text-text-muted">{isExpanded ? '-' : '+'}</span>
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-1">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showGroundTraffic}
                onChange={toggleGroundTraffic}
                className="accent-emerald-500"
              />
              Show ground traffic
            </label>
          </div>
        )}
      </OverlayPanel>
    </div>
  );
}
