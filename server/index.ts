import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { loadConfig } from './config.js';

export function createApp() {
  const config = loadConfig();
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Route mounts (Plan 02 will add these)
  // app.use('/api/flights', flightsRouter);
  // app.use('/api/ships', shipsRouter);
  // app.use('/api/events', eventsRouter);

  // Error handler -- must be after routes
  app.use(errorHandler);

  return app;
}

// Only start listening when run directly (not imported for testing)
const isMainModule =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  try {
    const config = loadConfig();
    const app = createApp();
    app.listen(config.port, () => {
      console.log(`[server] listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', (err as Error).message);
    process.exit(1);
  }
}
