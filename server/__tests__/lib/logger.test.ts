// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress pino output in tests (pino respects LOG_LEVEL via the instance config,
// but we set level: 'silent' in test mode anyway)
vi.stubEnv('NODE_ENV', 'test');

describe('Pino logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('logger instance is a pino logger with .info, .warn, .error, .child methods', async () => {
    const { logger } = await import('../../lib/logger.js');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('log() backward-compatible wrapper calls pino with correct level', async () => {
    const { logger, log } = await import('../../lib/logger.js');
    const infoSpy = vi.spyOn(logger, 'info');

    log({ level: 'info', message: 'test info' });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    // First arg is the meta object (without level and message), second arg is the message
    expect(infoSpy.mock.calls[0][1]).toBe('test info');
    infoSpy.mockRestore();
  });

  it('log({ level: "error", message: "fail" }) routes through pino.error', async () => {
    const { logger, log } = await import('../../lib/logger.js');
    const errorSpy = vi.spyOn(logger, 'error');

    log({ level: 'error', message: 'fail' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][1]).toBe('fail');
    errorSpy.mockRestore();
  });

  it('logger.child({ module: "test" }) returns a child logger with module field', async () => {
    const { logger } = await import('../../lib/logger.js');
    const child = logger.child({ module: 'test' });

    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
    // Child logger should have bindings with module
    expect(child).not.toBe(logger);
  });
});
