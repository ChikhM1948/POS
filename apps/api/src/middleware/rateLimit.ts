import type { NextFunction, Request, Response } from 'express';

/**
 * Limiteur de débit en mémoire (fenêtre fixe) par IP + clé optionnelle. Sans dépendance.
 * Sur serverless (Vercel) chaque instance a son propre compteur : c'est un frein, pas une garantie —
 * pour une garantie, déléguer au pare-feu Vercel / à un compteur partagé (Redis, Mongo).
 */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  let lastSweep = Date.now();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now - lastSweep > opts.windowMs) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      lastSweep = now;
    }
    const id = `${req.ip}|${opts.key?.(req) ?? ''}`;
    let h = hits.get(id);
    if (!h || h.reset <= now) hits.set(id, (h = { count: 0, reset: now + opts.windowMs }));
    if (++h.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: opts.message ?? 'Trop de requêtes. Réessayez plus tard.' });
    }
    next();
  };
}
