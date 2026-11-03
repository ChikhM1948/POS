import { Types } from 'mongoose';

/** Force une valeur du corps de requête en chaîne : écarte les objets d'opérateurs Mongo (`{"$ne":null}`). */
export function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** ObjectId hexadécimal valide (24 car.) sous forme de chaîne, sinon undefined. */
export function oid(v: unknown): string | undefined {
  return typeof v === 'string' && Types.ObjectId.isValid(v) && /^[0-9a-f]{24}$/i.test(v) ? v : undefined;
}
