import { useEffect } from 'react';
import { Source, Layer } from '@vis.gl/react-maplibre';
import { useLayerStore } from '@/stores/layerStore';
import { GEO_FEATURES } from './geoFeatures';
import { setupContourProtocol, CONTOUR_TILE_URL } from './contourSetup';

/**
 * Geographic visualization layer: elevation color tinting, contour lines,
 * and geographic feature labels. Rendered as a child of <Map>.
 */
export function GeographicOverlay() {
  const isActive = useLayerStore((s) => s.activeLayers.has('geographic'));

  useEffect(() => {
    setupContourProtocol();
  }, []);

  if (!isActive) return null;

  return (
    <>
      {/* Color-relief elevation tinting (reuses existing terrain-dem source) */}
      <Layer
        id="elevation-tint"
        type={'color-relief' as any}
        source="terrain-dem"
        paint={{
          'color-relief-opacity': 0.25,
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['elevation'],
            0,
            '#1a1a2e',
            1500,
            '#334155',
            4000,
            '#94a3b8',
          ],
        }}
      />

      {/* Contour lines from maplibre-contour vector tiles */}
      <Source
        id="contour-source"
        type="vector"
        tiles={[CONTOUR_TILE_URL]}
        maxzoom={13}
      />
      <Layer
        id="contour-lines"
        type="line"
        source="contour-source"
        source-layer="contours"
        paint={{
          'line-color': 'rgba(255, 255, 255, 0.18)',
          'line-width': ['case', ['>', ['get', 'level'], 0], 1.2, 0.6],
        }}
        minzoom={7}
      />

      {/* Geographic feature labels (GeoJSON point labels) */}
      <Source id="geo-labels" type="geojson" data={GEO_FEATURES} />
      <Layer
        id="geo-feature-labels"
        type="symbol"
        source="geo-labels"
        layout={{
          'text-field': ['get', 'name'],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.3,
          'text-size': 11,
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': 'rgba(148, 163, 184, 0.5)',
          'text-halo-color': 'rgba(0, 0, 0, 0.6)',
          'text-halo-width': 1,
        }}
        filter={['<=', ['get', 'minzoom'], ['zoom']]}
      />
    </>
  );
}
