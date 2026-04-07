import type { FeatureCollection, Point } from 'geojson';

interface GeoFeatureProperties {
  name: string;
  minzoom: number;
}

/**
 * ~15 labeled geographic features across the Middle East region.
 * Organized into 3 zoom tiers for progressive disclosure.
 */
export const GEO_FEATURES: FeatureCollection<Point, GeoFeatureProperties> = {
  type: 'FeatureCollection',
  features: [
    // Tier 1 (z4-5): Major geographic features
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [49.5, 33.5] },
      properties: { name: 'Zagros Mountains', minzoom: 4 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [51.0, 27.0] },
      properties: { name: 'Persian Gulf', minzoom: 4 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [50.5, 40.0] },
      properties: { name: 'Caspian Sea', minzoom: 4 },
    },

    // Tier 2 (z6-7): Regional features
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [54.0, 34.5] },
      properties: { name: 'Dasht-e Kavir', minzoom: 6 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [52.5, 36.0] },
      properties: { name: 'Elburz Mountains', minzoom: 6 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [38.5, 22.0] },
      properties: { name: 'Red Sea', minzoom: 6 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [58.0, 32.0] },
      properties: { name: 'Dasht-e Lut', minzoom: 6 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [39.5, 33.0] },
      properties: { name: 'Syrian Desert', minzoom: 6 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [47.0, 22.0] },
      properties: { name: 'Arabian Desert', minzoom: 6 },
    },

    // Tier 3 (z8+): Local features
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [44.0, 33.5] },
      properties: { name: 'Tigris River', minzoom: 8 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [40.5, 35.5] },
      properties: { name: 'Euphrates River', minzoom: 8 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [56.3, 26.6] },
      properties: { name: 'Strait of Hormuz', minzoom: 8 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [43.3, 12.6] },
      properties: { name: 'Bab el-Mandeb', minzoom: 8 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [48.8, 31.3] },
      properties: { name: 'Karun River', minzoom: 8 },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [45.5, 37.5] },
      properties: { name: 'Lake Urmia', minzoom: 8 },
    },
  ],
};
