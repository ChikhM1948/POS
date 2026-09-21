import { Schema } from 'mongoose';

/**
 * Force tenantId sur tout document et refuse les requêtes find/update/delete
 * qui ne filtrent pas explicitement par tenantId — filet de sécurité contre
 * les fuites de données entre commerces (bug le plus coûteux possible en SaaS multi-tenant).
 */
export function tenantScopePlugin(schema: Schema) {
  schema.add({
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  });

  const requireTenantFilter = function (this: any, next: (err?: Error) => void) {
    const filter = this.getFilter ? this.getFilter() : this._conditions;
    if (!filter || !filter.tenantId) {
      return next(new Error('Requête refusée : tenantId manquant dans le filtre.'));
    }
    next();
  };

  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'updateMany', 'deleteMany', 'countDocuments'], requireTenantFilter);
}
