import { TitleSlot } from '@/components/layout/TitleSlot';
import { CountersSlot } from '@/components/layout/CountersSlot';
import { LayerTogglesSlot } from '@/components/layout/LayerTogglesSlot';
import { FilterPanelSlot } from '@/components/layout/FilterPanelSlot';
import { DetailPanelSlot } from '@/components/layout/DetailPanelSlot';
import { StatusPanel } from '@/components/ui/StatusPanel';
import { BaseMap } from '@/components/map/BaseMap';
import { useFlightPolling } from '@/hooks/useFlightPolling';
import { useShipPolling } from '@/hooks/useShipPolling';
import { useEventPolling } from '@/hooks/useEventPolling';
import { useSiteFetch } from '@/hooks/useSiteFetch';
import { useNewsPolling } from '@/hooks/useNewsPolling';
import { useMarketPolling } from '@/hooks/useMarketPolling';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { MarketsSlot } from '@/components/layout/MarketsSlot';

export function AppShell() {
  useFlightPolling();
  useShipPolling();
  useEventPolling();
  useSiteFetch();
  useNewsPolling();
  useMarketPolling();
  useNotifications();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface">
      {/* Map container - fills viewport */}
      <div
        data-testid="map-container"
        className="absolute inset-0 z-[var(--z-map)]"
      >
        <BaseMap />
      </div>

      {/* Top-left: Title + Status + Counters + Layer toggles */}
      <div className="absolute top-4 left-4 z-[var(--z-controls)] flex flex-col items-start gap-2">
        <TitleSlot />
        <StatusPanel />
        <CountersSlot />
        <LayerTogglesSlot />
      </div>

      {/* Top-right: Notification bell + Markets panel */}
      <NotificationBell />
      <MarketsSlot />

      {/* Right side: Filter panel + Detail panel */}
      <FilterPanelSlot />
      <DetailPanelSlot />
    </div>
  );
}
