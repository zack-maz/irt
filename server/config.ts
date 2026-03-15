// Environment variable validation and configuration

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

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
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    opensky: {
      clientId: required('OPENSKY_CLIENT_ID'),
      clientSecret: required('OPENSKY_CLIENT_SECRET'),
    },
    aisstream: {
      apiKey: required('AISSTREAM_API_KEY'),
    },
    acled: {
      email: required('ACLED_EMAIL'),
      password: required('ACLED_PASSWORD'),
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
