import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLayerStore } from '@/stores/layerStore';
import { useFilterStore } from '@/stores/filterStore';

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      isLayersCollapsed: false,
      toggleLayers: vi.fn(),
    }),
}));

import { LayerTogglesSlot } from '@/components/layout/LayerTogglesSlot';

describe('LayerTogglesSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLayerStore.setState({ activeLayers: new Set() });
    useFilterStore.setState({
      showEvents: true,
      showAirstrikes: true,
      showOnGround: true,
      showExplosions: true,
      showTargeted: true,
      showOther: true,
    });
  });

  it('renders "Layers" header text', () => {
    render(<LayerTogglesSlot />);
    expect(screen.getByText('Layers')).toBeTruthy();
  });

  it('renders 6 visualization layer toggles', () => {
    render(<LayerTogglesSlot />);
    // Visualization layer toggles (Geographic, Climate, Water, Threat Density, Political, Ethnic)
    expect(screen.getByLabelText('Toggle Geographic layer')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Climate layer')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Water layer')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Threat Density layer')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Political layer')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Ethnic layer')).toBeTruthy();
  });

  it('renders master Events toggle + 5 event sub-toggles', () => {
    render(<LayerTogglesSlot />);
    // Master toggle
    expect(screen.getByLabelText('Toggle Events')).toBeTruthy();
    // 5 sub-toggles
    expect(screen.getByLabelText('Toggle Airstrikes')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Ground Combat')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Explosions')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Targeted')).toBeTruthy();
    expect(screen.getByLabelText('Toggle Other')).toBeTruthy();
  });

  it('renders 12 total switch roles (6 viz layers + 1 master + 5 sub)', () => {
    render(<LayerTogglesSlot />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(12);
  });

  it('renders toggle rows with correct labels', () => {
    render(<LayerTogglesSlot />);
    expect(screen.getByText('Geographic')).toBeTruthy();
    expect(screen.getByText('Climate')).toBeTruthy();
    expect(screen.getByText('Water')).toBeTruthy();
    expect(screen.getByText('Threat Density')).toBeTruthy();
    expect(screen.getByText('Political')).toBeTruthy();
    expect(screen.getByText('Ethnic')).toBeTruthy();
    expect(screen.getByText('Events')).toBeTruthy();
    expect(screen.getByText('Airstrikes')).toBeTruthy();
    expect(screen.getByText('Ground Combat')).toBeTruthy();
    expect(screen.getByText('Explosions')).toBeTruthy();
    expect(screen.getByText('Targeted')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('clicking a visualization layer toggle calls toggleLayer', () => {
    render(<LayerTogglesSlot />);
    const geoToggle = screen.getByLabelText('Toggle Geographic layer');
    fireEvent.click(geoToggle);
    expect(useLayerStore.getState().activeLayers.has('geographic')).toBe(true);
  });

  it('clicking master Events toggle changes showEvents state', () => {
    render(<LayerTogglesSlot />);
    const eventsToggle = screen.getByLabelText('Toggle Events');
    fireEvent.click(eventsToggle);
    expect(useFilterStore.getState().showEvents).toBe(false);
  });

  it('clicking Airstrikes sub-toggle changes showAirstrikes state', () => {
    render(<LayerTogglesSlot />);
    const toggle = screen.getByLabelText('Toggle Airstrikes');
    fireEvent.click(toggle);
    expect(useFilterStore.getState().showAirstrikes).toBe(false);
  });

  it('renders "Clear cache & reload" button', () => {
    render(<LayerTogglesSlot />);
    expect(screen.getByText('Clear cache & reload')).toBeTruthy();
  });

  it('inactive visualization toggle has opacity-40 class', () => {
    render(<LayerTogglesSlot />);
    const geoToggle = screen.getByLabelText('Toggle Geographic layer');
    expect(geoToggle.className).toContain('opacity-40');
  });

  it('active visualization toggle has opacity-100 class', () => {
    useLayerStore.setState({ activeLayers: new Set(['geographic']) });
    render(<LayerTogglesSlot />);
    const geoToggle = screen.getByLabelText('Toggle Geographic layer');
    expect(geoToggle.className).toContain('opacity-100');
  });

  it('sub-toggles are dimmed when master Events is OFF', () => {
    useFilterStore.setState({ showEvents: false });
    render(<LayerTogglesSlot />);
    const airstrikesToggle = screen.getByLabelText('Toggle Airstrikes');
    expect(airstrikesToggle.className).toContain('opacity-40');
  });

  it('sub-toggles show full opacity when master Events is ON and sub is active', () => {
    useFilterStore.setState({ showEvents: true, showAirstrikes: true });
    render(<LayerTogglesSlot />);
    const airstrikesToggle = screen.getByLabelText('Toggle Airstrikes');
    expect(airstrikesToggle.className).toContain('opacity-100');
  });

  it('political layer is a clickable toggle (not coming-soon)', () => {
    render(<LayerTogglesSlot />);
    const politicalToggle = screen.getByLabelText('Toggle Political layer');
    expect(politicalToggle).toBeTruthy();
    fireEvent.click(politicalToggle);
    expect(useLayerStore.getState().activeLayers.has('political')).toBe(true);
  });

  it('no coming-soon rows', () => {
    render(<LayerTogglesSlot />);
    expect(screen.queryAllByText('soon')).toHaveLength(0);
  });
});
