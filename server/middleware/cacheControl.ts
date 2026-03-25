import type { Request, Response, NextFunction } from 'express';

export function cacheControl(sMaxAge: number, staleWhileRevalidate: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (sMaxAge === 0 && staleWhileRevalidate === 0) {
      res.set('Cache-Control', 'no-store');
    } else {
      res.set(
        'Cache-Control',
        `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
      );
    }
    next();
  };
}
