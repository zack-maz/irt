/**
 * Static lookup table of major Middle East cities and landmarks
 * for the near: search tag. Covers the IRAN_BBOX region.
 */

export interface GeoLocation {
  name: string;
  lat: number;
  lng: number;
}

/** Major cities and landmarks in the Greater Middle East region */
export const GEO_NAMES: GeoLocation[] = [
  // Iran
  { name: 'Tehran', lat: 35.6892, lng: 51.389 },
  { name: 'Isfahan', lat: 32.6546, lng: 51.668 },
  { name: 'Shiraz', lat: 29.5918, lng: 52.5837 },
  { name: 'Tabriz', lat: 38.08, lng: 46.2919 },
  { name: 'Mashhad', lat: 36.2605, lng: 59.6168 },
  { name: 'Ahvaz', lat: 31.3183, lng: 48.6706 },
  { name: 'Kerman', lat: 30.2839, lng: 57.0834 },
  { name: 'Bandar Abbas', lat: 27.1865, lng: 56.2808 },
  { name: 'Qom', lat: 34.6416, lng: 50.8746 },
  { name: 'Bushehr', lat: 28.9684, lng: 50.8385 },
  { name: 'Chabahar', lat: 25.2919, lng: 60.643 },
  { name: 'Arak', lat: 34.0917, lng: 49.6892 },
  { name: 'Hamadan', lat: 34.799, lng: 48.515 },
  { name: 'Yazd', lat: 31.8974, lng: 54.3569 },
  { name: 'Rasht', lat: 37.2808, lng: 49.5832 },

  // Iraq
  { name: 'Baghdad', lat: 33.3152, lng: 44.3661 },
  { name: 'Basra', lat: 30.5085, lng: 47.7804 },
  { name: 'Erbil', lat: 36.1901, lng: 44.0119 },
  { name: 'Mosul', lat: 36.335, lng: 43.1189 },
  { name: 'Kirkuk', lat: 35.4681, lng: 44.3922 },
  { name: 'Sulaymaniyah', lat: 35.5553, lng: 45.4354 },

  // Israel / Palestine
  { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818 },
  { name: 'Jerusalem', lat: 31.7683, lng: 35.2137 },
  { name: 'Haifa', lat: 32.794, lng: 34.9896 },
  { name: 'Gaza', lat: 31.5204, lng: 34.4667 },
  { name: 'Beersheba', lat: 31.2518, lng: 34.7913 },
  { name: 'Eilat', lat: 29.5577, lng: 34.9519 },

  // Lebanon / Syria
  { name: 'Beirut', lat: 33.8938, lng: 35.5018 },
  { name: 'Damascus', lat: 33.5138, lng: 36.2765 },
  { name: 'Aleppo', lat: 36.2021, lng: 37.1343 },
  { name: 'Latakia', lat: 35.5317, lng: 35.7919 },

  // Turkey
  { name: 'Ankara', lat: 39.9334, lng: 32.8597 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Izmir', lat: 38.4192, lng: 27.1287 },
  { name: 'Diyarbakir', lat: 37.9144, lng: 40.2306 },
  { name: 'Incirlik', lat: 37.0017, lng: 35.4259 },

  // Saudi Arabia / Gulf
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { name: 'Jeddah', lat: 21.4858, lng: 39.1925 },
  { name: 'Dhahran', lat: 26.2361, lng: 50.0393 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', lat: 25.2854, lng: 51.531 },
  { name: 'Manama', lat: 26.2285, lng: 50.586 },
  { name: 'Kuwait City', lat: 29.3759, lng: 47.9774 },
  { name: 'Muscat', lat: 23.588, lng: 58.3829 },

  // Jordan / Egypt
  { name: 'Amman', lat: 31.9454, lng: 35.9284 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Suez', lat: 29.9668, lng: 32.5498 },

  // Afghanistan / Pakistan
  { name: 'Kabul', lat: 34.5553, lng: 69.2075 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },

  // Yemen
  { name: 'Sanaa', lat: 15.3694, lng: 44.191 },
  { name: 'Aden', lat: 12.7855, lng: 45.0187 },

  // Strait / waterway landmarks
  { name: 'Strait of Hormuz', lat: 26.5667, lng: 56.25 },
  { name: 'Bab el-Mandeb', lat: 12.5833, lng: 43.3333 },
  { name: 'Suez Canal', lat: 30.4167, lng: 32.35 },
];

/** Case-insensitive city/location lookup by name substring */
export function findGeoName(query: string): GeoLocation | undefined {
  const lower = query.toLowerCase();
  // Try exact match first
  const exact = GEO_NAMES.find((g) => g.name.toLowerCase() === lower);
  if (exact) return exact;
  // Then substring match
  return GEO_NAMES.find((g) => g.name.toLowerCase().includes(lower));
}
