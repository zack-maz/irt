import { useLayerStore, type VisualizationLayerId } from '@/stores/layerStore';

export interface LegendConfig {
  layerId: VisualizationLayerId;
  title: string;
  colorStops: Array<{ color: string; label: string }>;
}

/**
 * Registry of legend configurations for visualization layers.
 * Sub-phases 20.1-20.5 will register their legends here.
 */
export const LEGEND_REGISTRY: LegendConfig[] = [];

// Geographic elevation legend (Phase 20.1)
LEGEND_REGISTRY.push({
  layerId: 'geographic',
  title: 'Elevation',
  colorStops: [
    { color: '#1a1a2e', label: '0m' },
    { color: '#334155', label: '1500m' },
    { color: '#94a3b8', label: '4000m' },
  ],
});

// Temperature legend (Phase 20.1 - Weather layer)
LEGEND_REGISTRY.push({
  layerId: 'weather',
  title: 'Temperature',
  colorStops: [
    { color: 'rgb(0, 100, 255)', label: '-5C / 23F' },
    { color: 'rgb(0, 200, 100)', label: '15C / 59F' },
    { color: 'rgb(255, 220, 0)', label: '30C / 86F' },
    { color: 'rgb(255, 50, 0)', label: '45C / 113F' },
  ],
});

function LegendItem({ config }: { config: LegendConfig }) {
  const gradient = config.colorStops
    .map((stop) => stop.color)
    .join(', ');

  return (
    <div className="pointer-events-auto rounded bg-surface-overlay/80 px-2 py-1.5 backdrop-blur-sm">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary">
        {config.title}
      </div>
      <div
        className="h-2 w-32 rounded-sm"
        style={{ background: `linear-gradient(to right, ${gradient})` }}
      />
      <div className="mt-0.5 flex justify-between text-[8px] text-text-muted">
        <span>{config.colorStops[0]?.label}</span>
        <span>{config.colorStops[config.colorStops.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function MapLegend() {
  const activeLayers = useLayerStore((s) => s.activeLayers);

  const activeLegends = LEGEND_REGISTRY.filter((legend) =>
    activeLayers.has(legend.layerId),
  );

  if (activeLegends.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-[var(--z-controls)] pointer-events-none flex flex-col gap-2">
      {activeLegends.map((legend) => (
        <div
          key={legend.layerId}
          className="transition-opacity duration-300"
        >
          <LegendItem config={legend} />
        </div>
      ))}
    </div>
  );
}
