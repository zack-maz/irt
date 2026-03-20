import { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useFilteredEntities } from '@/hooks/useFilteredEntities';
import { useSiteStore } from '@/stores/siteStore';
import { useEventStore } from '@/stores/eventStore';
import { useFilterStore } from '@/stores/filterStore';
import { computeAttackStatus } from '@/lib/attackStatus';
import { CONFLICT_TOGGLE_GROUPS } from '@/types/ui';
import type { FlightEntity, ConflictEventEntity, SiteEntity } from '@/types/entities';

export interface CounterValues {
  iranianFlights: number;
  unidentifiedFlights: number;
  airstrikes: number;
  groundCombat: number;
  targeted: number;
  fatalities: number;
  hitSites: number;
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
  const showFlights = useUIStore((s) => s.showFlights);
  const showGroundTraffic = useUIStore((s) => s.showGroundTraffic);
  const pulseEnabled = useUIStore((s) => s.pulseEnabled);
  const showEvents = useUIStore((s) => s.showEvents);
  const showAirstrikes = useUIStore((s) => s.showAirstrikes);
  const showGroundCombat = useUIStore((s) => s.showGroundCombat);
  const showTargeted = useUIStore((s) => s.showTargeted);
  const showSites = useUIStore((s) => s.showSites);
  const showNuclear = useUIStore((s) => s.showNuclear);
  const showNaval = useUIStore((s) => s.showNaval);
  const showOil = useUIStore((s) => s.showOil);
  const showAirbase = useUIStore((s) => s.showAirbase);
  const showDesalination = useUIStore((s) => s.showDesalination);
  const showPort = useUIStore((s) => s.showPort);

  const { flights: filteredFlights, events: filteredEvents } = useFilteredEntities();

  const sites = useSiteStore((s) => s.sites);
  const allEvents = useEventStore((s) => s.events);
  const dateStart = useFilterStore((s) => s.dateStart);
  const dateEnd = useFilterStore((s) => s.dateEnd);

  return useMemo(() => {
    // Visible flights: smart filters + toggle gating (matches useEntityLayers logic)
    const visibleFlights = filteredFlights.filter((f: FlightEntity) => {
      if (f.data.unidentified) return pulseEnabled;
      if (f.data.onGround) return showGroundTraffic;
      return showFlights;
    });

    const iranianFlights = visibleFlights.filter((f: FlightEntity) => f.data.originCountry === 'Iran').length;
    const unidentifiedFlights = visibleFlights.filter((f: FlightEntity) => f.data.unidentified).length;

    // Visible event counts: smart filters + toggle gating
    const airstrikes = showEvents && showAirstrikes
      ? countByGroup(filteredEvents, AIRSTRIKE_TYPES)
      : 0;
    const groundCombat = showEvents && showGroundCombat
      ? countByGroup(filteredEvents, GROUND_COMBAT_TYPES)
      : 0;
    const targeted = showEvents && showTargeted
      ? countByGroup(filteredEvents, TARGETED_TYPES)
      : 0;

    // Fatalities from visible events only
    let fatalities = 0;
    if (showEvents && showAirstrikes) {
      fatalities += sumFatalitiesByGroup(filteredEvents, AIRSTRIKE_TYPES);
    }
    if (showEvents && showGroundCombat) {
      fatalities += sumFatalitiesByGroup(filteredEvents, GROUND_COMBAT_TYPES);
    }
    if (showEvents && showTargeted) {
      fatalities += sumFatalitiesByGroup(filteredEvents, TARGETED_TYPES);
    }

    // Hit sites: visible sites with attack status
    let hitSites = 0;
    if (showSites) {
      const visibleSites = sites.filter((s: SiteEntity) => {
        switch (s.siteType) {
          case 'nuclear': return showNuclear;
          case 'naval': return showNaval;
          case 'oil': return showOil;
          case 'airbase': return showAirbase;
          case 'desalination': return showDesalination;
          case 'port': return showPort;
        }
      });
      for (const site of visibleSites) {
        if (computeAttackStatus(site, allEvents, dateStart, dateEnd).isAttacked) {
          hitSites++;
        }
      }
    }

    return { iranianFlights, unidentifiedFlights, airstrikes, groundCombat, targeted, fatalities, hitSites };
  }, [filteredFlights, filteredEvents, showFlights, showGroundTraffic, pulseEnabled, showEvents, showAirstrikes, showGroundCombat, showTargeted, sites, allEvents, dateStart, dateEnd, showSites, showNuclear, showNaval, showOil, showAirbase, showDesalination, showPort]);
}
