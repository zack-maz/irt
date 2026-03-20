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
