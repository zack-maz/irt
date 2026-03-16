import { Router } from 'express';
import { EntityCache } from '../cache/entityCache.js';
import { fetchFlights as fetchOpenSky } from '../adapters/opensky.js';
import { fetchFlights as fetchAdsbExchange } from '../adapters/adsb-exchange.js';
import { fetchFlights as fetchAdsbLol } from '../adapters/adsb-lol.js';
import { IRAN_BBOX, CACHE_TTL } from '../constants.js';
import { RateLimitError } from '../types.js';
import type { FlightEntity, FlightSource } from '../types.js';

const openskyCache = new EntityCache<FlightEntity[]>(CACHE_TTL.flights);
const adsbCache = new EntityCache<FlightEntity[]>(CACHE_TTL.adsbFlights);
const adsblolCache = new EntityCache<FlightEntity[]>(CACHE_TTL.adsblolFlights);

function parseSource(raw: unknown): FlightSource {
  if (raw === 'opensky') return 'opensky';
  if (raw === 'adsb') return 'adsb';
  if (raw === 'adsblol') return 'adsblol';
  return 'adsblol';
}

function getCache(source: FlightSource): EntityCache<FlightEntity[]> {
  switch (source) {
    case 'opensky': return openskyCache;
    case 'adsb': return adsbCache;
    case 'adsblol': return adsblolCache;
  }
}

function getFetcher(source: FlightSource): () => Promise<FlightEntity[]> {
  switch (source) {
    case 'opensky': return () => fetchOpenSky(IRAN_BBOX);
    case 'adsb': return fetchAdsbExchange;
    case 'adsblol': return fetchAdsbLol;
  }
}

export const flightsRouter = Router();

flightsRouter.get('/', async (req, res) => {
  const source = parseSource(req.query.source);
  const cache = getCache(source);

  // Credential checks for sources that require API keys
  if (source === 'adsb' && !process.env.ADSB_EXCHANGE_API_KEY) {
    return res.status(503).json({ error: 'ADS-B Exchange API key not configured' });
  }

  if (source === 'opensky' && !(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET)) {
    return res.status(503).json({ error: 'OpenSky credentials not configured' });
  }

  // Check cache first -- avoid unnecessary upstream calls (API credit conservation)
  const cached = cache.get();
  if (cached && !cached.stale) {
    return res.json(cached);
  }

  try {
    const flights = await getFetcher(source)();

    cache.set(flights);
    res.json({ data: flights, stale: false, lastFresh: Date.now() });
  } catch (err) {
    console.error(`[flights:${source}] upstream error:`, (err as Error).message);

    // Distinguish rate limit errors from generic errors
    if (err instanceof RateLimitError) {
      if (cached) {
        return res.json({ ...cached, rateLimited: true });
      }
      return res.status(429).json({ error: 'Rate limited', rateLimited: true });
    }

    if (cached) {
      res.json(cached); // Serve stale cache on error
    } else {
      throw err; // Express 5 catches and forwards to errorHandler
    }
  }
});
