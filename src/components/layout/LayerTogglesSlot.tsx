import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { useLayerStore, type VisualizationLayerId } from '@/stores/layerStore';
import { OverlayPanel } from '@/components/ui/OverlayPanel';
import { EVENT_TYPE_COLORS } from '@/lib/eventColors';

const LAYER_CONFIGS: {
  id: VisualizationLayerId;
  label: string;
  color: string;
  comingSoon?: boolean;
}[] = [
  { id: 'geographic', label: 'Geographic', color: '#94a3b8' },
  { id: 'weather', label: 'Climate', color: '#38bdf8' },
  { id: 'water', label: 'Water', color: '#4ade80' },
  { id: 'threat', label: 'Threat Density', color: '#ef4444' },
  { id: 'political', label: 'Political', color: '#a78bfa' },
  { id: 'ethnic', label: 'Ethnic', color: '#c084fc' },
];

/** Event sub-toggle configuration: label, filterStore key, toggle action, color */
const EVENT_SUB_TOGGLES: {
  label: string;
  stateKey: 'showAirstrikes' | 'showOnGround' | 'showExplosions' | 'showTargeted' | 'showOther';
  toggleKey:
    | 'toggleShowAirstrikes'
    | 'toggleShowOnGround'
    | 'toggleShowExplosions'
    | 'toggleShowTargeted'
    | 'toggleShowOther';
  color: string;
}[] = [
  {
    label: 'Airstrikes',
    stateKey: 'showAirstrikes',
    toggleKey: 'toggleShowAirstrikes',
    color: EVENT_TYPE_COLORS.airstrike,
  },
  {
    label: 'Ground Combat',
    stateKey: 'showOnGround',
    toggleKey: 'toggleShowOnGround',
    color: EVENT_TYPE_COLORS.on_ground,
  },
  {
    label: 'Explosions',
    stateKey: 'showExplosions',
    toggleKey: 'toggleShowExplosions',
    color: EVENT_TYPE_COLORS.explosion,
  },
  {
    label: 'Targeted',
    stateKey: 'showTargeted',
    toggleKey: 'toggleShowTargeted',
    color: EVENT_TYPE_COLORS.targeted,
  },
  {
    label: 'Other',
    stateKey: 'showOther',
    toggleKey: 'toggleShowOther',
    color: EVENT_TYPE_COLORS.other,
  },
];

function LoadingSpinner() {
  return (
    <svg className="ml-auto h-3 w-3 animate-spin text-text-muted" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Wraps ToggleRow with a store-connected hook (avoids calling useLayerStore inside .map) */
function LayerToggleRow({
  id,
  label,
  color,
  comingSoon,
}: {
  id: VisualizationLayerId;
  label: string;
  color: string;
  comingSoon?: boolean;
}) {
  const active = useLayerStore((s) => s.activeLayers.has(id));
  const isLoading = useLayerStore((s) => s.loadingLayers.has(id));

  if (comingSoon) {
    return (
      <div className="flex w-full items-center gap-2 text-xs opacity-25 cursor-not-allowed">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-text-secondary">{label}</span>
        <span className="ml-auto text-[9px] text-text-muted italic">soon</span>
      </div>
    );
  }

  return (
    <button
      role="switch"
      aria-checked={active}
      aria-label={`Toggle ${label} layer`}
      onClick={() => useLayerStore.getState().toggleLayer(id)}
      className={`flex w-full items-center gap-2 text-xs transition-opacity ${
        active ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-text-secondary">{label}</span>
      {isLoading && <LoadingSpinner />}
    </button>
  );
}

/** Master events toggle row */
function EventMasterToggle() {
  const showEvents = useFilterStore((s) => s.showEvents);

  return (
    <button
      role="switch"
      aria-checked={showEvents}
      aria-label="Toggle Events"
      onClick={() => useFilterStore.getState().toggleShowEvents()}
      className={`flex w-full items-center gap-2 text-xs transition-opacity ${
        showEvents ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: '#ef4444' }}
      />
      <span className="text-text-secondary">Events</span>
    </button>
  );
}

/** Individual event sub-toggle row */
function EventSubToggle({
  label,
  stateKey,
  toggleKey,
  color,
  masterOff,
}: {
  label: string;
  stateKey: 'showAirstrikes' | 'showOnGround' | 'showExplosions' | 'showTargeted' | 'showOther';
  toggleKey:
    | 'toggleShowAirstrikes'
    | 'toggleShowOnGround'
    | 'toggleShowExplosions'
    | 'toggleShowTargeted'
    | 'toggleShowOther';
  color: string;
  masterOff: boolean;
}) {
  const active = useFilterStore((s) => s[stateKey]);

  return (
    <button
      role="switch"
      aria-checked={active}
      aria-label={`Toggle ${label}`}
      onClick={() => useFilterStore.getState()[toggleKey]()}
      className={`flex w-full items-center gap-2 pl-4 text-xs transition-opacity ${
        masterOff ? 'opacity-40' : active ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-text-secondary">{label}</span>
    </button>
  );
}

/** Inner content of layer toggles, reusable in Sidebar */
export function LayerTogglesContent() {
  const showEvents = useFilterStore((s) => s.showEvents);

  return (
    <div className="flex flex-col gap-1">
      {LAYER_CONFIGS.map(({ id, label, color, comingSoon }) => (
        <LayerToggleRow key={id} id={id} label={label} color={color} comingSoon={comingSoon} />
      ))}

      {/* Separator */}
      <div className="my-1 border-t border-white/10" />

      {/* Event toggles: master + 5 sub-toggles */}
      <EventMasterToggle />
      {EVENT_SUB_TOGGLES.map(({ label, stateKey, toggleKey, color }) => (
        <EventSubToggle
          key={stateKey}
          label={label}
          stateKey={stateKey}
          toggleKey={toggleKey}
          color={color}
          masterOff={!showEvents}
        />
      ))}

      <button
        onClick={() => {
          localStorage.clear();
          document.cookie.split(';').forEach((c) => {
            document.cookie =
              c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
          });
          window.location.reload();
        }}
        className="mt-2 text-[10px] text-red-400 hover:text-red-300 opacity-60 hover:opacity-100 transition-opacity"
      >
        Clear cache & reload
      </button>
    </div>
  );
}

export function LayerTogglesSlot() {
  const isCollapsed = useUIStore((s) => s.isLayersCollapsed);
  const toggleLayers = useUIStore((s) => s.toggleLayers);

  return (
    <div data-testid="layer-toggles-slot">
      <OverlayPanel>
        <div className="flex flex-col gap-1">
          <button
            onClick={toggleLayers}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary"
          >
            <span>Layers</span>
            <span className="text-text-muted">{isCollapsed ? '+' : '-'}</span>
          </button>
          {!isCollapsed && <LayerTogglesContent />}
        </div>
      </OverlayPanel>
    </div>
  );
}
