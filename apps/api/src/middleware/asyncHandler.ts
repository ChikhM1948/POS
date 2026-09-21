import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Sans ça, une promesse rejetée dans un handler async (erreur Mongoose, bug applicatif...)
 * devient une unhandledRejection Node non interceptée — qui **termine tout le process**, pas
 * seulement la requête en cours. Chaque route de l'API doit être enveloppée avec ceci.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
