import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/pos-dz'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  // Liste séparée par des virgules — l'app desktop packagée (Electron) sert son build depuis un
  // serveur local à port fixe (voir apps/desktop/main.ts, RENDERER_PORT) et compte comme une
  // origine à part entière, distincte du front web déployé sur un vrai domaine.
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
};
