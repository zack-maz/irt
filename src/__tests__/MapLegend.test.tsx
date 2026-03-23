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

  it('renders elevation legend when geographic layer is active', () => {
    useLayerStore.setState({ activeLayers: new Set(['geographic']) });
    const { getByText } = render(<MapLegend />);
    expect(getByText('Elevation')).toBeTruthy();
    expect(getByText('0m')).toBeTruthy();
    expect(getByText('4000m')).toBeTruthy();
  });

  it('renders nothing when non-registered layer is active', () => {
    useLayerStore.setState({ activeLayers: new Set(['weather']) });
    const { container } = render(<MapLegend />);
    // weather legend not yet registered
    expect(container.firstChild).toBeNull();
  });

  it('exports LegendConfig interface and LEGEND_REGISTRY array', () => {
    expect(LEGEND_REGISTRY).toBeDefined();
    expect(Array.isArray(LEGEND_REGISTRY)).toBe(true);
    expect(LEGEND_REGISTRY.length).toBeGreaterThanOrEqual(1);
  });
});
