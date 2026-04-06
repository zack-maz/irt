// Environment variable configuration — all API keys optional for serverless deployment

export interface AppConfig {
  port: number;
  corsOrigin: string;
  opensky: {
    clientId: string;
    clientSecret: string;
  };
  aisstream: {
    apiKey: string;
  };
  acled: {
    email: string;
    password: string;
  };
  newsRelevanceThreshold: number; // 0-1 threshold for NLP relevance scoring (default 0.7)
  eventConfidenceThreshold: number; // 0-1 threshold for event confidence filtering (default 0.35)
  eventMinSources: number; // Minimum independent sources for event inclusion (default 2)
  eventCentroidPenalty: number; // Confidence multiplier for city-centroid events (default 0.7)
  eventExcludedCameo: string[]; // CAMEO base codes excluded from pipeline (default ['180','192'])
  bellingcatCorroborationBoost: number; // Confidence boost for Bellingcat-corroborated events (default 0.2)
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    opensky: {
      clientId: process.env.OPENSKY_CLIENT_ID ?? '',
      clientSecret: process.env.OPENSKY_CLIENT_SECRET ?? '',
    },
    aisstream: {
      apiKey: process.env.AISSTREAM_API_KEY ?? '',
    },
    acled: {
      email: process.env.ACLED_EMAIL ?? '',
      password: process.env.ACLED_PASSWORD ?? '',
    },
    newsRelevanceThreshold: Math.min(1, Math.max(0,
      parseFloat(process.env.NEWS_RELEVANCE_THRESHOLD ?? '') || 0.7,
    )),
    eventConfidenceThreshold: Math.min(1, Math.max(0,
      parseFloat(process.env.EVENT_CONFIDENCE_THRESHOLD ?? '') || 0.35,
    )),
    eventMinSources: Math.max(1,
      parseInt(process.env.EVENT_MIN_SOURCES ?? '', 10) || 2,
    ),
    eventCentroidPenalty: Math.min(1, Math.max(0,
      parseFloat(process.env.EVENT_CENTROID_PENALTY ?? '') || 0.7,
    )),
    eventExcludedCameo: (process.env.EVENT_EXCLUDED_CAMEO ?? '180,192')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    bellingcatCorroborationBoost: Math.min(1, Math.max(0,
      parseFloat(process.env.BELLINGCAT_CORROBORATION_BOOST ?? '') || 0.2,
    )),
  };
}

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// Convenience alias -- lazy getter that caches on first access
export const config = new Proxy({} as AppConfig, {
  get(_target, prop: string) {
    return getConfig()[prop as keyof AppConfig];
  },
});
