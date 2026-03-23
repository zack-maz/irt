import { useMemo } from 'react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { useWeatherStore, type WeatherGridPoint } from '@/stores/weatherStore';
import { useLayerStore } from '@/stores/layerStore';
import { getWindBarbIcon } from './windBarbs';

/**
 * Returns deck.gl layers for weather visualization:
 * - HeatmapLayer for temperature gradient
 * - IconLayer for wind barbs
 * - ScatterplotLayer (invisible) for tooltip picking
 */
export function useWeatherLayers() {
  const grid = useWeatherStore((s) => s.grid);
  const isActive = useLayerStore((s) => s.activeLayers.has('weather'));

  return useMemo(() => {
    if (!isActive || grid.length === 0) return [];

    const heatmapLayer = new HeatmapLayer({
      id: 'weather-temp-heatmap',
      data: grid,
      getPosition: (d: WeatherGridPoint) => [d.lng, d.lat],
      getWeight: (d: WeatherGridPoint) => d.temperature,
      radiusPixels: 60,
      intensity: 1,
      threshold: 0.05,
      colorRange: [
        [0, 100, 255, 70],
        [0, 200, 100, 70],
        [255, 220, 0, 70],
        [255, 50, 0, 70],
      ],
      colorDomain: [-5, 45],
      aggregation: 'MEAN',
      pickable: false,
    });

    // Filter to every 3rd degree for sparser wind barb rendering
    const sparseGrid = grid.filter(
      (d) => d.lat % 3 === 0 && d.lng % 3 === 0,
    );

    const windBarbLayer = new IconLayer({
      id: 'weather-wind-barbs',
      data: sparseGrid,
      getPosition: (d: WeatherGridPoint) => [d.lng, d.lat],
      getIcon: (d: WeatherGridPoint) => ({
        url: getWindBarbIcon(d.windSpeed),
        width: 32,
        height: 64,
        anchorY: 32,
      }),
      getSize: 24,
      sizeUnits: 'pixels' as const,
      getAngle: (d: WeatherGridPoint) => -d.windDirection,
      billboard: true,
      pickable: false,
    });

    const pickerLayer = new ScatterplotLayer({
      id: 'weather-picker',
      data: grid,
      getPosition: (d: WeatherGridPoint) => [d.lng, d.lat],
      getRadius: 50000,
      radiusUnits: 'meters' as const,
      getFillColor: [0, 0, 0, 0],
      pickable: true,
    });

    return [heatmapLayer, windBarbLayer, pickerLayer];
  }, [isActive, grid]);
}

/** Compass direction labels for 8-way cardinal/intercardinal directions */
const COMPASS_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function directionToCompass(degrees: number): string {
  const index = Math.round(degrees / 45) % 8;
  return COMPASS_LABELS[index];
}

interface WeatherTooltipProps {
  point: WeatherGridPoint;
  x: number;
  y: number;
}

/**
 * Weather tooltip showing temperature (C/F) and wind (direction + speed).
 * Positioned at cursor coordinates, styled to match EntityTooltip.
 */
export function WeatherTooltip({ point, x, y }: WeatherTooltipProps) {
  const tempC = point.temperature.toFixed(1);
  const tempF = (point.temperature * 9 / 5 + 32).toFixed(1);
  const compass = directionToCompass(point.windDirection);

  return (
    <div
      className="pointer-events-none absolute z-[var(--z-tooltip)]"
      style={{ left: x + 12, top: y - 12 }}
    >
      <div className="rounded bg-surface-overlay/90 px-2 py-1.5 text-xs text-text-primary backdrop-blur-sm shadow-lg">
        <div className="mb-0.5 text-[9px] uppercase tracking-wider text-text-muted">
          Weather
        </div>
        <div>{tempC}C / {tempF}F</div>
        <div>Wind: {compass} {Math.round(point.windSpeed)} kn</div>
      </div>
    </div>
  );
}
