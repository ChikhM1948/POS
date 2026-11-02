import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth';
import { getTenantLicenseStatus } from '../modules/license/license.service';

/**
 * Bloque l'API métier (402) quand l'essai / la licence du commerce est expirée. À placer APRÈS
 * requireAuth ; /auth, /license et /health restent accessibles pour pouvoir saisir une nouvelle clé.
 */
export async function requireLicense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const status = await getTenantLicenseStatus(req.auth!.tenantId);
    if (status.expired) {
      return res.status(402).json({ error: 'Licence expirée. Saisissez une clé d\'activation pour continuer.', code: 'LICENSE_EXPIRED', license: status });
    }
    next();
  } catch (err) {
    next(err);
  }
}
