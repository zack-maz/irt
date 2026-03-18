import { useCallback } from 'react';
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
} from '@vis.gl/react-maplibre';
import type { MapEvent } from '@vis.gl/react-maplibre';
import type { PickingInfo } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

import { DeckGLOverlay } from './DeckGLOverlay';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import { useEntityLayers } from '@/hooks/useEntityLayers';
import type { MapEntity, ConflictEventEntity } from '@/types/entities';
import {
  INITIAL_VIEW_STATE,
  MAX_BOUNDS,
  MAP_STYLE,
  TERRAIN_SOURCE_TILES,
  TERRAIN_ENCODING,
  TERRAIN_CONFIG,
  ROAD_LABEL_LAYERS,
  BORDER_LAYERS,
  WATER_LAYERS,
  MINOR_FEATURE_LAYERS,
} from './constants';
import { MapLoadingScreen } from './MapLoadingScreen';
import { MapVignette } from './MapVignette';
import { CoordinateReadout } from './CoordinateReadout';
import { CompassControl } from './CompassControl';

export function BaseMap() {
  const isMapLoaded = useMapStore((s) => s.isMapLoaded);
  const setMapLoaded = useMapStore((s) => s.setMapLoaded);
  const setCursorPosition = useMapStore((s) => s.setCursorPosition);
  const showNews = useUIStore((s) => s.showNews);
  const entityLayers = useEntityLayers();

  const getTooltip = useCallback(
    (info: PickingInfo) => {
      if (!showNews || !info.object) return null;
      const entity = info.object as MapEntity;
      if (entity.type !== 'drone' && entity.type !== 'missile') return null;
      const e = entity as ConflictEventEntity;
      const lines = [
        `<strong>${e.data.eventType}</strong>`,
        e.data.locationName && `Location: ${e.data.locationName}`,
        e.data.actor1 && `Actor 1: ${e.data.actor1}`,
        e.data.actor2 && `Actor 2: ${e.data.actor2}`,
        `Date: ${new Date(e.timestamp).toISOString().slice(0, 10)}`,
        `CAMEO: ${e.data.cameoCode}`,
        `Goldstein: ${e.data.goldsteinScale.toFixed(1)}`,
        e.data.source &&
          `<a href="${e.data.source}" target="_blank" rel="noopener" style="color:#60a5fa">Source</a>`,
      ].filter(Boolean);
      return {
        html: `<div style="font-family:monospace;font-size:11px;line-height:1.5">${lines.join('<br/>')}</div>`,
        style: {
          backgroundColor: 'rgba(0,0,0,0.85)',
          color: '#e5e5e5',
          borderRadius: '6px',
          padding: '8px 12px',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '300px',
          backdropFilter: 'blur(4px)',
        },
      };
    },
    [showNews],
  );

  const handleLoad = useCallback(
    (e: MapEvent) => {
      const map = e.target;

      // Hide road labels
      ROAD_LABEL_LAYERS.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
      });

      // Hide minor features
      MINOR_FEATURE_LAYERS.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
      });

      // Brighten country borders
      BORDER_LAYERS.forEach((id) => {
        if (map.getLayer(id)) {
          map.setPaintProperty(id, 'line-color', '#888888');
          map.setPaintProperty(id, 'line-width', 1.5);
        }
      });

      // Tint water bodies dark blue
      WATER_LAYERS.forEach((id) => {
        if (map.getLayer(id)) {
          // 'waterway' is a line layer, others are fill layers
          if (id === 'waterway') {
            map.setPaintProperty(id, 'line-color', '#0a1628');
          } else {
            map.setPaintProperty(id, 'fill-color', '#0a1628');
          }
        }
      });

      setMapLoaded();
    },
    [setMapLoaded],
  );

  const handleMouseMove = useCallback(
    (e: MapEvent<MouseEvent>) => {
      const lngLat = e.lngLat;
      setCursorPosition(lngLat.lng, lngLat.lat);
    },
    [setCursorPosition],
  );

  return (
    <div className="relative h-full w-full">
      <MapLoadingScreen isLoaded={isMapLoaded} />
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        maxBounds={MAX_BOUNDS}
        minZoom={3}
        maxZoom={15}
        maxPitch={60}
        terrain={TERRAIN_CONFIG}
        onLoad={handleLoad}
        onMouseMove={handleMouseMove}
      >
        <Source
          id="terrain-dem"
          type="raster-dem"
          tiles={TERRAIN_SOURCE_TILES}
          encoding={TERRAIN_ENCODING}
          tileSize={256}
        />
        <Layer
          id="terrain-hillshade"
          type="hillshade"
          source="terrain-dem"
          paint={{
            'hillshade-exaggeration': 0.6,
            'hillshade-shadow-color': '#000000',
            'hillshade-highlight-color': '#444444',
          }}
        />
        <NavigationControl
          showZoom={false}
          showCompass={true}
          visualizePitch={true}
          position="bottom-right"
        />
        <ScaleControl unit="metric" position="bottom-right" />
        <DeckGLOverlay layers={entityLayers} getTooltip={getTooltip} />
        <CompassControl />
      </Map>
      <MapVignette />
      <div className="absolute bottom-8 right-14 z-[var(--z-controls)]">
        <CoordinateReadout />
      </div>
    </div>
  );
}
