import { useEffect, useState } from 'react';
import { Source, Layer, useMap } from '@vis.gl/react-maplibre';
import { useLayerStore } from '@/stores/layerStore';
import { BORDER_LAYERS } from '../constants';
import { registerPatterns } from './politicalPatterns';
import {
  FACTIONS,
  FACTION_MAP,
  COUNTRIES_GEOJSON,
  DISPUTED_GEOJSON,
} from './politicalData';
import type { FactionId } from './politicalData';

/**
 * Build a MapLibre match expression mapping ADM0_A3 codes to faction hex colors.
 * ['match', ['get', 'ADM0_A3'], isoCode1, color1, isoCode2, color2, ..., fallback]
 */
function buildBorderColorExpression(): unknown[] {
  const expr: unknown[] = ['match', ['get', 'ADM0_A3']];

  // Build a color lookup from faction data
  const colorByFaction: Record<FactionId, string> = {} as Record<FactionId, string>;
  for (const f of FACTIONS) {
    colorByFaction[f.id] = f.color;
  }

  // Expand all ISO codes to their faction color
  for (const [isoCode, factionId] of Object.entries(FACTION_MAP)) {
    expr.push(isoCode, colorByFaction[factionId] ?? '#666666');
  }

  // Fallback for unassigned countries
  expr.push('#666666');
  return expr;
}

const BORDER_COLOR_EXPR = buildBorderColorExpression();

/**
 * Political boundaries overlay: faction-colored diagonal hatching fills,
 * thick faction-colored borders, and dashed disputed territory outlines.
 * Rendered as a child of <Map>.
 */
export function PoliticalOverlay() {
  const isActive = useLayerStore((s) => s.activeLayers.has('political'));
  const { current: map } = useMap();
  const [patternsReady, setPatternsReady] = useState(false);

  // Register fill-pattern images on the map when layer becomes active
  useEffect(() => {
    if (!map || !isActive) {
      setPatternsReady(false);
      return;
    }
    registerPatterns(map.getMap());
    setPatternsReady(true);
  }, [map, isActive]);

  // Toggle CARTO basemap border visibility
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    BORDER_LAYERS.forEach((id) => {
      if (mapInstance.getLayer(id)) {
        mapInstance.setLayoutProperty(id, 'visibility', isActive ? 'none' : 'visible');
      }
    });

    // Cleanup: restore CARTO borders when component unmounts while active
    return () => {
      BORDER_LAYERS.forEach((id) => {
        if (mapInstance.getLayer(id)) {
          mapInstance.setLayoutProperty(id, 'visibility', 'visible');
        }
      });
    };
  }, [map, isActive]);

  if (!isActive || !patternsReady) return null;

  return (
    <>
      <Source id="political-countries" type="geojson" data={COUNTRIES_GEOJSON}>
        {/* One fill layer per faction, each with static fill-pattern */}
        {FACTIONS.map(({ id, isoCodes, patternName }) => (
          <Layer
            key={id}
            id={`political-fill-${id}`}
            type="fill"
            filter={['in', ['get', 'ADM0_A3'], ['literal', isoCodes]]}
            paint={{ 'fill-pattern': patternName }}
          />
        ))}
        {/* Faction-colored border lines */}
        <Layer
          id="political-borders"
          type="line"
          paint={{
            'line-color': BORDER_COLOR_EXPR as any,
            'line-width': 3,
            'line-opacity': 0.9,
          }}
        />
      </Source>
      <Source id="political-disputed" type="geojson" data={DISPUTED_GEOJSON}>
        {/* Dashed white outlines for disputed zones */}
        <Layer
          id="political-disputed-outline"
          type="line"
          paint={{
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [4, 3],
            'line-opacity': 0.8,
          }}
        />
        {/* Zone name labels -- large zones visible at z5+ */}
        <Layer
          id="political-disputed-labels-z5"
          type="symbol"
          minzoom={5}
          filter={['<=', ['get', 'minzoom'], 5]}
          layout={{
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-letter-spacing': 0.15,
            'text-transform': 'uppercase',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          }}
          paint={{
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          }}
        />
        {/* Zone name labels -- smaller zones visible at z7+ */}
        <Layer
          id="political-disputed-labels-z7"
          type="symbol"
          minzoom={7}
          filter={['==', ['get', 'minzoom'], 7]}
          layout={{
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-letter-spacing': 0.15,
            'text-transform': 'uppercase',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          }}
          paint={{
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          }}
        />
      </Source>
    </>
  );
}
