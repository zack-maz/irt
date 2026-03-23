import { useMemo } from 'react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useEventStore } from '@/stores/eventStore';
import { useLayerStore } from '@/stores/layerStore';
import { useFilterStore } from '@/stores/filterStore';
import { TYPE_WEIGHTS } from '@/lib/severity';
import { EVENT_TYPE_LABELS } from '@/types/ui';
import { LEGEND_REGISTRY } from '@/components/map/MapLegend';
import type { ConflictEventEntity } from '@/types/entities';

// --- Constants ---

const HALF_LIFE_HOURS = 6;

const THREAT_COLOR_RANGE: [number, number, number][] = [
  [45, 0, 0],       // #2d0000 dark
  [139, 30, 30],    // #8b1e1e crimson
  [239, 68, 68],    // #ef4444 red
  [255, 59, 48],    // #ff3b30 bright
  [255, 107, 74],   // #ff6b4a white-hot core
];

// --- Types ---

export interface ThreatZoneData {
  lat: number;
  lng: number;
  eventCount: number;
  dominantType: string;
  latestTime: number;
}

// --- Pure functions ---

/**
 * Compute a threat weight for a single event.
 * Formula: typeWeight * exponentialDecay(6h half-life)
 * This is DIFFERENT from severity.ts rational decay.
 */
export function computeThreatWeight(event: ConflictEventEntity): number {
  const typeWeight = TYPE_WEIGHTS[event.type] ?? 3;
  const ageMs = Math.max(0, Date.now() - event.timestamp);
  const ageHours = ageMs / (1000 * 60 * 60);
  return typeWeight * Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
}

/**
 * Aggregate events into grid cells for tooltip picking.
 * Each cell is `cellSize` degrees wide/tall. Returns center of each occupied cell
 * with event count, dominant type, and latest timestamp.
 */
export function aggregateToGrid(
  events: ConflictEventEntity[],
  cellSize = 1,
): ThreatZoneData[] {
  if (events.length === 0) return [];

  const cells = new Map<
    string,
    { lat: number; lng: number; count: number; types: Map<string, number>; latest: number }
  >();

  for (const event of events) {
    const cellLat = Math.floor(event.lat / cellSize) * cellSize + cellSize / 2;
    const cellLng = Math.floor(event.lng / cellSize) * cellSize + cellSize / 2;
    const key = `${cellLat},${cellLng}`;

    let cell = cells.get(key);
    if (!cell) {
      cell = { lat: cellLat, lng: cellLng, count: 0, types: new Map(), latest: 0 };
      cells.set(key, cell);
    }

    cell.count++;
    cell.types.set(event.type, (cell.types.get(event.type) ?? 0) + 1);
    if (event.timestamp > cell.latest) {
      cell.latest = event.timestamp;
    }
  }

  const result: ThreatZoneData[] = [];
  for (const cell of cells.values()) {
    // Find most frequent type
    let dominantType = '';
    let maxCount = 0;
    for (const [type, count] of cell.types) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    result.push({
      lat: cell.lat,
      lng: cell.lng,
      eventCount: cell.count,
      dominantType,
      latestTime: cell.latest,
    });
  }

  return result;
}

// --- Relative time helper ---

function formatRelativeTime(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Hook ---

interface WeightedPoint {
  position: [number, number];
  weight: number;
}

/**
 * Returns deck.gl layers for threat heatmap visualization:
 * - HeatmapLayer for heat overlay (not pickable)
 * - ScatterplotLayer (invisible) for tooltip picking on aggregated grid
 */
export function useThreatHeatmapLayers() {
  const events = useEventStore((s) => s.events);
  const isActive = useLayerStore((s) => s.activeLayers.has('threat'));
  const dateStart = useFilterStore((s) => s.dateStart);
  const dateEnd = useFilterStore((s) => s.dateEnd);

  return useMemo(() => {
    if (!isActive || events.length === 0) return [];

    // Filter events by date range
    const filtered = events.filter(
      (e) => e.timestamp >= dateStart && e.timestamp <= dateEnd,
    );
    if (filtered.length === 0) return [];

    // Compute weighted data for HeatmapLayer
    const weightedData: WeightedPoint[] = filtered.map((e) => ({
      position: [e.lng, e.lat] as [number, number],
      weight: computeThreatWeight(e),
    }));

    const heatmapLayer = new HeatmapLayer({
      id: 'threat-heatmap',
      data: weightedData,
      getPosition: (d: WeightedPoint) => d.position,
      getWeight: (d: WeightedPoint) => d.weight,
      radiusPixels: 60,
      colorRange: THREAT_COLOR_RANGE,
      intensity: 1,
      threshold: 0.05,
      opacity: 0.45,
      aggregation: 'SUM',
      pickable: false,
      debounceTimeout: 500,
    });

    // Aggregate for picker grid
    const grid = aggregateToGrid(filtered);

    const pickerLayer = new ScatterplotLayer({
      id: 'threat-picker',
      data: grid,
      getPosition: (d: ThreatZoneData) => [d.lng, d.lat],
      getRadius: 50000,
      radiusUnits: 'meters' as const,
      getFillColor: [0, 0, 0, 0],
      pickable: true,
    });

    return [heatmapLayer, pickerLayer];
  }, [isActive, events, dateStart, dateEnd]);
}

// --- Tooltip ---

interface ThreatTooltipProps {
  zone: ThreatZoneData;
  x: number;
  y: number;
}

/**
 * Threat zone tooltip showing event count, dominant type, and relative time.
 * Positioned at cursor coordinates, styled to match WeatherTooltip.
 */
export function ThreatTooltip({ zone, x, y }: ThreatTooltipProps) {
  const typeLabel = EVENT_TYPE_LABELS[zone.dominantType] ?? zone.dominantType;
  const ago = formatRelativeTime(zone.latestTime);

  return (
    <div
      className="pointer-events-none absolute z-[var(--z-tooltip)]"
      style={{ left: x + 12, top: y - 12 }}
    >
      <div className="rounded bg-surface-overlay/90 px-2 py-1.5 text-xs text-text-primary backdrop-blur-sm shadow-lg">
        <div className="mb-0.5 text-[9px] uppercase tracking-wider text-text-muted">
          Threat Zone
        </div>
        <div>{zone.eventCount} events</div>
        <div>Mostly {typeLabel}</div>
        <div>Latest {ago}</div>
      </div>
    </div>
  );
}

// --- Legend registration (module scope) ---

LEGEND_REGISTRY.push({
  layerId: 'threat',
  title: 'Threat Density',
  colorStops: [
    { color: '#2d0000', label: 'Low' },
    { color: '#ff3b30', label: 'High' },
  ],
});
