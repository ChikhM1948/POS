import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Alternative à `docker compose up -d mongo` quand Docker n'est pas disponible (ex. sandbox CI,
 * environnement sans accès root) : télécharge et lance un vrai binaire mongod en mémoire.
 * Les données ne survivent PAS au redémarrage — usage dev/démo uniquement, jamais en prod.
 */
async function main() {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbName: 'pos-dz' } });
  console.log(`[dev-mongo] prêt sur ${mongod.getUri('pos-dz')}`);
  console.log('[dev-mongo] Ctrl+C pour arrêter.');

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev-mongo] échec du démarrage:', err);
  process.exit(1);
});
