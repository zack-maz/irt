import pino from 'pino';

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  cacheHit?: boolean;
  timestamp?: string;
}

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  ...(!isProd && !isTest
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});

/**
 * Backward-compatible log() wrapper that delegates to the pino logger.
 * Callers can continue using `log({ level, message, ...meta })` while
 * new code uses `logger.info(meta, message)` directly.
 */
export function log(entry: LogEntry): void {
  const { level, message, ...meta } = entry;
  logger[level](meta, message);
}
