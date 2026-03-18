import { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { useFlightStore } from '@/stores/flightStore';
import { useEventStore } from '@/stores/eventStore';
import { OverlayPanel } from '@/components/ui/OverlayPanel';
import { RangeSlider } from '@/components/filter/RangeSlider';
import { CountryFilter } from '@/components/filter/CountryFilter';
import { ProximityFilter } from '@/components/filter/ProximityFilter';
import { DateRangeFilter } from '@/components/filter/DateRangeFilter';
import type { FilterKey } from '@/stores/filterStore';

function SectionHeader({
  label,
  active,
  filterKey,
  onClear,
}: {
  label: string;
  active: boolean;
  filterKey: FilterKey;
  onClear: (key: FilterKey) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] ${active ? 'text-accent-blue' : 'text-text-muted'}`}>
          {active ? '\u25B6' : '---'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </span>
      </div>
      {active && (
        <button
          onClick={() => onClear(filterKey)}
          className="text-[10px] text-text-muted hover:text-accent-red"
          aria-label={`Clear ${label} filter`}
        >
          x
        </button>
      )}
    </div>
  );
}

export function FilterPanelSlot() {
  const isCollapsed = useUIStore((s) => s.isFiltersCollapsed);
  const toggleFilters = useUIStore((s) => s.toggleFilters);

  const selectedCountries = useFilterStore((s) => s.selectedCountries);
  const addCountry = useFilterStore((s) => s.addCountry);
  const removeCountry = useFilterStore((s) => s.removeCountry);
  const speedMin = useFilterStore((s) => s.speedMin);
  const speedMax = useFilterStore((s) => s.speedMax);
  const setSpeedRange = useFilterStore((s) => s.setSpeedRange);
  const altitudeMin = useFilterStore((s) => s.altitudeMin);
  const altitudeMax = useFilterStore((s) => s.altitudeMax);
  const setAltitudeRange = useFilterStore((s) => s.setAltitudeRange);
  const proximityPin = useFilterStore((s) => s.proximityPin);
  const proximityRadiusKm = useFilterStore((s) => s.proximityRadiusKm);
  const isSettingPin = useFilterStore((s) => s.isSettingPin);
  const setProximityPin = useFilterStore((s) => s.setProximityPin);
  const setProximityRadius = useFilterStore((s) => s.setProximityRadius);
  const setSettingPin = useFilterStore((s) => s.setSettingPin);
  const dateStart = useFilterStore((s) => s.dateStart);
  const dateEnd = useFilterStore((s) => s.dateEnd);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const clearFilter = useFilterStore((s) => s.clearFilter);
  const clearAll = useFilterStore((s) => s.clearAll);
  const activeFilterCount = useFilterStore((s) => s.activeFilterCount);

  const activeCount = activeFilterCount();

  // Derive available countries from current entity data
  const flights = useFlightStore((s) => s.flights);
  const events = useEventStore((s) => s.events);
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => {
      if (f.data.originCountry) set.add(f.data.originCountry);
    });
    events.forEach((e) => {
      if (e.data.actor1) set.add(e.data.actor1);
      if (e.data.actor2) set.add(e.data.actor2);
    });
    return Array.from(set).sort();
  }, [flights, events]);

  // Active state per filter
  const isCountryActive = selectedCountries.length > 0;
  const isSpeedActive = speedMin !== null || speedMax !== null;
  const isAltitudeActive = altitudeMin !== null || altitudeMax !== null;
  const isProximityActive = proximityPin !== null;
  const isDateActive = dateStart !== null || dateEnd !== null;

  return (
    <div data-testid="filter-panel-slot">
      <OverlayPanel>
        <div className="flex flex-col gap-1">
          <button
            onClick={toggleFilters}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary"
          >
            <span>
              Filters
              {activeCount > 0 && (
                <span className="ml-1 text-accent-blue">({activeCount})</span>
              )}
            </span>
            <span className="text-text-muted">{isCollapsed ? '+' : '-'}</span>
          </button>
          {!isCollapsed && (
            <div className="mt-1 flex flex-col gap-3">
              {/* Country */}
              <div>
                <SectionHeader label="Country" active={isCountryActive} filterKey="country" onClear={clearFilter} />
                <div className="mt-1">
                  <CountryFilter
                    selectedCountries={selectedCountries}
                    onAdd={addCountry}
                    onRemove={removeCountry}
                    availableCountries={availableCountries}
                  />
                </div>
              </div>

              {/* Speed */}
              <div>
                <SectionHeader label="Speed" active={isSpeedActive} filterKey="speed" onClear={clearFilter} />
                <div className="mt-1">
                  <RangeSlider
                    label="Speed"
                    min={0}
                    max={700}
                    step={10}
                    unit="kn"
                    valueMin={speedMin}
                    valueMax={speedMax}
                    onChangeMin={(v) => setSpeedRange(v, speedMax)}
                    onChangeMax={(v) => setSpeedRange(speedMin, v)}
                  />
                </div>
              </div>

              {/* Altitude */}
              <div>
                <SectionHeader label="Altitude" active={isAltitudeActive} filterKey="altitude" onClear={clearFilter} />
                <div className="mt-1">
                  <RangeSlider
                    label="Altitude"
                    min={0}
                    max={60000}
                    step={500}
                    unit="ft"
                    valueMin={altitudeMin}
                    valueMax={altitudeMax}
                    onChangeMin={(v) => setAltitudeRange(v, altitudeMax)}
                    onChangeMax={(v) => setAltitudeRange(altitudeMin, v)}
                  />
                </div>
              </div>

              {/* Proximity */}
              <div>
                <SectionHeader label="Proximity" active={isProximityActive} filterKey="proximity" onClear={clearFilter} />
                <div className="mt-1">
                  <ProximityFilter
                    pin={proximityPin}
                    radiusKm={proximityRadiusKm}
                    isSettingPin={isSettingPin}
                    onSetPin={setProximityPin}
                    onClearPin={() => clearFilter('proximity')}
                    onRadiusChange={setProximityRadius}
                    onStartSettingPin={() => setSettingPin(true)}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <SectionHeader label="Date Range" active={isDateActive} filterKey="date" onClear={clearFilter} />
                <div className="mt-1">
                  <DateRangeFilter
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    onDateRange={setDateRange}
                  />
                </div>
              </div>

              {/* Clear all */}
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="self-start text-[10px] text-accent-red hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </OverlayPanel>
    </div>
  );
}
