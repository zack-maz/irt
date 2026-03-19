import { useMemo } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { useEventStore } from '@/stores/eventStore';
import { useUIStore } from '@/stores/uiStore';
import { useFilteredEntities } from '@/hooks/useFilteredEntities';
import { CONFLICT_TOGGLE_GROUPS } from '@/types/ui';
import type { ConflictEventEntity } from '@/types/entities';

export interface CounterValues {
  iranianFlights: number;
  unidentifiedFlights: number;
  airstrikes: { filtered: number; total: number };
  groundCombat: { filtered: number; total: number };
  targeted: { filtered: number; total: number };
  totalEvents: { filtered: number; total: number };
  fatalities: { filtered: number; total: number };
}

const AIRSTRIKE_TYPES: readonly string[] = CONFLICT_TOGGLE_GROUPS.showAirstrikes;
const GROUND_COMBAT_TYPES: readonly string[] = CONFLICT_TOGGLE_GROUPS.showGroundCombat;
const TARGETED_TYPES: readonly string[] = CONFLICT_TOGGLE_GROUPS.showTargeted;

function countByGroup(events: ConflictEventEntity[], types: readonly string[]): number {
  return events.filter((e) => types.includes(e.type)).length;
}

function sumFatalitiesByGroup(events: ConflictEventEntity[], types: readonly string[]): number {
  return events
    .filter((e) => types.includes(e.type))
    .reduce((sum, e) => sum + e.data.fatalities, 0);
}

export function useCounterData(): CounterValues {
  const rawFlights = useFlightStore((s) => s.flights);
  const rawEvents = useEventStore((s) => s.events);

  const showEvents = useUIStore((s) => s.showEvents);
  const showAirstrikes = useUIStore((s) => s.showAirstrikes);
  const showGroundCombat = useUIStore((s) => s.showGroundCombat);
  const showTargeted = useUIStore((s) => s.showTargeted);

  const { events: filteredEvents } = useFilteredEntities();

  return useMemo(() => {
    // Flight counters from raw (no filter/toggle narrowing)
    const iranianFlights = rawFlights.filter((f) => f.data.originCountry === 'Iran').length;
    const unidentifiedFlights = rawFlights.filter((f) => f.data.unidentified).length;

    // Event totals from raw (unfiltered)
    const airstrikesTotal = countByGroup(rawEvents, AIRSTRIKE_TYPES);
    const groundCombatTotal = countByGroup(rawEvents, GROUND_COMBAT_TYPES);
    const targetedTotal = countByGroup(rawEvents, TARGETED_TYPES);

    // Event filtered counts: smart filter + toggle gating
    const airstrikesFiltered = showEvents && showAirstrikes
      ? countByGroup(filteredEvents, AIRSTRIKE_TYPES)
      : 0;
    const groundCombatFiltered = showEvents && showGroundCombat
      ? countByGroup(filteredEvents, GROUND_COMBAT_TYPES)
      : 0;
    const targetedFiltered = showEvents && showTargeted
      ? countByGroup(filteredEvents, TARGETED_TYPES)
      : 0;

    // Totals sum three groups independently
    const totalEventsTotal = airstrikesTotal + groundCombatTotal + targetedTotal;
    const totalEventsFiltered = airstrikesFiltered + groundCombatFiltered + targetedFiltered;

    // Fatalities
    const fatalitiesTotalVal = rawEvents.reduce((sum, e) => sum + e.data.fatalities, 0);

    // Fatalities filtered: sum fatalities from filtered+toggled events
    let fatalitiesFilteredVal = 0;
    if (showEvents && showAirstrikes) {
      fatalitiesFilteredVal += sumFatalitiesByGroup(filteredEvents, AIRSTRIKE_TYPES);
    }
    if (showEvents && showGroundCombat) {
      fatalitiesFilteredVal += sumFatalitiesByGroup(filteredEvents, GROUND_COMBAT_TYPES);
    }
    if (showEvents && showTargeted) {
      fatalitiesFilteredVal += sumFatalitiesByGroup(filteredEvents, TARGETED_TYPES);
    }

    return {
      iranianFlights,
      unidentifiedFlights,
      airstrikes: { filtered: airstrikesFiltered, total: airstrikesTotal },
      groundCombat: { filtered: groundCombatFiltered, total: groundCombatTotal },
      targeted: { filtered: targetedFiltered, total: targetedTotal },
      totalEvents: { filtered: totalEventsFiltered, total: totalEventsTotal },
      fatalities: { filtered: fatalitiesFilteredVal, total: fatalitiesTotalVal },
    };
  }, [rawFlights, rawEvents, filteredEvents, showEvents, showAirstrikes, showGroundCombat, showTargeted]);
}
