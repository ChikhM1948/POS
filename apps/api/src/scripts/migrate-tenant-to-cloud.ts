import { MongoClient, ObjectId } from 'mongodb';

/**
 * Migration ponctuelle d'un commerce "Local" (MongoDB local/LAN) vers le cluster cloud (Atlas),
 * déclenchée quand un admin active la synchronisation en ligne (voir docs/INSTALL.md et
 * TenantSettingsForm — syncEnabled). Script opérateur volontairement séparé de l'API HTTP : une
 * bascule de base de données par commerce est une opération rare et à fort impact, pas quelque
 * chose qu'un simple clic admin (potentiellement un CSRF ou un faux clic) doit pouvoir déclencher.
 *
 * Usage :
 *   npx tsx src/scripts/migrate-tenant-to-cloud.ts \
 *     --tenant-id=<id> \
 *     --source="mongodb://localhost:27017/pos-dz" \
 *     --target="mongodb+srv://user:pass@cluster.mongodb.net/pos-dz?..."
 *
 * Après la migration : reconfigurer MONGODB_URI de ce déploiement apps/api vers --target et
 * redémarrer — voir le récapitulatif affiché en fin de script. Rejouable sans risque (upsert par
 * _id) si le transfert est interrompu à mi-chemin.
 */

// Collections scannées par tenantId — Tenant lui-même est identifié par son propre _id, voir plus bas.
const TENANT_SCOPED_COLLECTIONS = [
  'stores',
  'users',
  'products',
  'customers',
  'suppliers',
  'customerledgerentries',
  'supplierledgerentries',
  'sales',
  'stockmovements',
  'syncqueues',
  'receipts',
] as const;

function parseArgs(): { tenantId: string; source: string; target: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );
  const tenantId = args['tenant-id'];
  const source = args['source'];
  const target = args['target'];
  if (!tenantId || !source || !target) {
    console.error('Usage: tsx migrate-tenant-to-cloud.ts --tenant-id=<id> --source=<uri> --target=<uri>');
    process.exit(1);
  }
  return { tenantId, source, target };
}

async function main() {
  const { tenantId, source, target } = parseArgs();
  const tenantObjectId = new ObjectId(tenantId);

  const sourceClient = new MongoClient(source);
  const targetClient = new MongoClient(target);
  await sourceClient.connect();
  await targetClient.connect();
  const sourceDb = sourceClient.db();
  const targetDb = targetClient.db();

  try {
    const tenantDoc = await sourceDb.collection('tenants').findOne({ _id: tenantObjectId });
    if (!tenantDoc) {
      console.error(`Aucun tenant ${tenantId} trouvé sur la source.`);
      process.exit(1);
    }

    console.log(`Migration du commerce "${tenantDoc.name}" (${tenantId}) vers le cloud…`);

    // syncEnabled=true dans tous les cas : la migration n'a de sens que pour activer la synchro.
    await targetDb
      .collection('tenants')
      .replaceOne({ _id: tenantObjectId }, { ...tenantDoc, syncEnabled: true }, { upsert: true });
    console.log('  tenants: 1 document (tenant lui-même)');

    for (const collectionName of TENANT_SCOPED_COLLECTIONS) {
      const docs = await sourceDb.collection(collectionName).find({ tenantId: tenantObjectId }).toArray();
      if (docs.length === 0) {
        console.log(`  ${collectionName}: 0 document`);
        continue;
      }
      // upsert par _id plutôt qu'insertMany : rejouable si le script est interrompu à mi-chemin.
      const bulk = docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      }));
      await targetDb.collection(collectionName).bulkWrite(bulk, { ordered: false });
      console.log(`  ${collectionName}: ${docs.length} document(s)`);
    }

    console.log('\nMigration terminée.');
    console.log('Prochaines étapes :');
    console.log('  1. Mettre à jour MONGODB_URI de ce déploiement apps/api vers --target ci-dessus.');
    console.log('  2. Redémarrer apps/api.');
    console.log("  3. Les caisses déjà configurées se resynchroniseront automatiquement (SyncEngine) dès leur prochaine connexion.");
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

main().catch((err) => {
  console.error('[migrate-tenant-to-cloud] échec:', err);
  process.exit(1);
});
