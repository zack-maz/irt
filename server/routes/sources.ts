import { Router } from 'express';

export const sourcesRouter = Router();

sourcesRouter.get('/', (_req, res) => {
  res.json({
    opensky: {
      configured: !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET),
    },
    adsblol: {
      configured: true,
    },
  });
});
