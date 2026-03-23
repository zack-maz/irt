import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapLegend, LEGEND_REGISTRY } from '@/components/map/MapLegend';
import { useLayerStore } from '@/stores/layerStore';

describe('MapLegend', () => {
  beforeEach(() => {
    useLayerStore.setState({ activeLayers: new Set() });
  });

  it('renders nothing when no layers are active', () => {
    const { container } = render(<MapLegend />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when LEGEND_REGISTRY is empty even with active layers', () => {
    useLayerStore.setState({ activeLayers: new Set(['geographic', 'weather']) });
    const { container } = render(<MapLegend />);
    // LEGEND_REGISTRY is currently empty, so nothing should render
    expect(container.firstChild).toBeNull();
  });

  it('exports LegendConfig interface and LEGEND_REGISTRY array', () => {
    expect(LEGEND_REGISTRY).toBeDefined();
    expect(Array.isArray(LEGEND_REGISTRY)).toBe(true);
    expect(LEGEND_REGISTRY.length).toBe(0); // currently empty, sub-phases will populate
  });
});
