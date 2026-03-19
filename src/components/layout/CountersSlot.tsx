import { useUIStore } from '@/stores/uiStore';
import { OverlayPanel } from '@/components/ui/OverlayPanel';
import { useCounterData } from '@/components/counters/useCounterData';
import { CounterRow } from '@/components/counters/CounterRow';
import { ENTITY_DOT_COLORS } from '@/components/map/layers/constants';

export function CountersSlot() {
  const isCollapsed = useUIStore((s) => s.isCountersCollapsed);
  const toggleCounters = useUIStore((s) => s.toggleCounters);
  const counters = useCounterData();

  return (
    <div data-testid="counters-slot">
      <OverlayPanel>
        <button
          onClick={toggleCounters}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          <span>Counters</span>
          <span className="text-text-muted">{isCollapsed ? '+' : '-'}</span>
        </button>
        {!isCollapsed && (
          <div className="mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Flights
            </div>
            <div className="mt-0.5 space-y-0.5">
              <CounterRow
                label="Iranian"
                color={ENTITY_DOT_COLORS.flights}
                showRatio={false}
                filtered={counters.iranianFlights}
                total={counters.iranianFlights}
              />
              <CounterRow
                label="Unidentified"
                color={ENTITY_DOT_COLORS.unidentified}
                showRatio={false}
                filtered={counters.unidentifiedFlights}
                total={counters.unidentifiedFlights}
              />
            </div>

            <div className="border-t border-border my-1.5" />

            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Events
            </div>
            <div className="mt-0.5 space-y-0.5">
              <CounterRow
                label="Airstrikes"
                color={ENTITY_DOT_COLORS.airstrikes}
                showRatio={true}
                filtered={counters.airstrikes.filtered}
                total={counters.airstrikes.total}
              />
              <CounterRow
                label="Ground Combat"
                color={ENTITY_DOT_COLORS.groundCombat}
                showRatio={true}
                filtered={counters.groundCombat.filtered}
                total={counters.groundCombat.total}
              />
              <CounterRow
                label="Targeted"
                color={ENTITY_DOT_COLORS.targeted}
                showRatio={true}
                filtered={counters.targeted.filtered}
                total={counters.targeted.total}
              />
              <CounterRow
                label="Total"
                showRatio={true}
                filtered={counters.totalEvents.filtered}
                total={counters.totalEvents.total}
              />
              <CounterRow
                label="Fatalities"
                showRatio={true}
                filtered={counters.fatalities.filtered}
                total={counters.fatalities.total}
              />
            </div>
          </div>
        )}
      </OverlayPanel>
    </div>
  );
}
