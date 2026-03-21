/**
 * Generates a static satellite thumbnail URL for a site's coordinates.
 * Uses ArcGIS World Imagery tile service (free for display, no key required).
 *
 * Converts lat/lng to a tile at zoom 15, then returns the tile URL.
 */

const ZOOM = 15;

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export function useSiteImage(lat: number, lng: number): string {
  const { x, y } = latLngToTile(lat, lng, ZOOM);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${y}/${x}`;
}
