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
  // Licences : clé privée Ed25519 (PEM, \n littéraux acceptés) qui signe les licences remises aux postes
  // desktop ; la clé publique correspondante est embarquée dans l'application (voir scripts/license-keygen.js).
  licensePrivateKey: process.env.LICENSE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  // Secret de l'éditeur pour émettre des clés (en-tête x-admin-key). Sans lui, /license/generate est désactivé.
  licenseAdminKey: process.env.LICENSE_ADMIN_KEY,
  // Dossier des mises à jour desktop publiées (latest.yml + installeur), servi sur /updates.
  updatesDir: process.env.UPDATES_DIR ?? './updates',
  // Paiement en ligne des licences via SofizPay (CIB / Dahabia) — même compte et mêmes variables que la webapp Lingolab.
  sofizpayApiKey: process.env.SOFIZPAY_API_KEY ?? '',
  sofizpayWebhookSecret: process.env.SOFIZPAY_WEBHOOK_SECRET ?? '',
  // URL publique du front web : SofizPay y renvoie le client après le paiement.
  webBaseUrl: (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  // Prix de la licence à vie (DZD).
  lifetimePriceDzd: parseInt(process.env.LICENSE_LIFETIME_PRICE_DZD ?? '8000', 10),
};
