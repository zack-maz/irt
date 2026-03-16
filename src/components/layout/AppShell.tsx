import { TitleSlot } from '@/components/layout/TitleSlot';
import { CountersSlot } from '@/components/layout/CountersSlot';
import { LayerTogglesSlot } from '@/components/layout/LayerTogglesSlot';
import { FiltersSlot } from '@/components/layout/FiltersSlot';
import { DetailPanelSlot } from '@/components/layout/DetailPanelSlot';
import { SourceSelector } from '@/components/ui/SourceSelector';
import { BaseMap } from '@/components/map/BaseMap';
import { useFlightPolling } from '@/hooks/useFlightPolling';

export function AppShell() {
  useFlightPolling();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface">
      {/* Map container - fills viewport */}
      <div
        data-testid="map-container"
        className="absolute inset-0 z-[var(--z-map)]"
      >
        <BaseMap />
      </div>

      {/* Top-left: Title */}
      <div className="absolute top-4 left-4 z-[var(--z-overlay)]">
        <TitleSlot />
      </div>

      {/* Top-right: Source selector + Counters + Layer toggles */}
      <div className="absolute top-4 right-4 z-[var(--z-controls)] flex flex-col items-end gap-2">
        <SourceSelector />
        <CountersSlot />
        <LayerTogglesSlot />
      </div>

      {/* Bottom-left: Filters */}
      <div className="absolute bottom-4 left-4 z-[var(--z-controls)]">
        <FiltersSlot />
      </div>

      {/* Left edge: Detail panel (hidden by default) */}
      <DetailPanelSlot />
    </div>
  );
}
