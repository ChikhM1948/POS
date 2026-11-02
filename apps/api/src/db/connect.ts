import mongoose from 'mongoose';
import { env } from '../config/env';

let pending: Promise<typeof mongoose> | null = null;

/** Idempotent : réutilise la connexion existante (indispensable en serverless, où le module reste chaud entre deux requêtes). */
export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  pending ??= mongoose.connect(env.mongodbUri).catch((err) => { pending = null; throw err; });
  await pending;
  // Ne jamais logger env.mongodbUri tel quel : une URI Atlas embarque user:password
  // (mongodb+srv://user:pass@cluster.../db) — on masque avant d'écrire dans les logs.
  const redacted = env.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  // eslint-disable-next-line no-console
  console.log(`[db] connecté à ${redacted}`);
}
