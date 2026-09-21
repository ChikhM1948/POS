import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  // Ne jamais logger env.mongodbUri tel quel : une URI Atlas embarque user:password
  // (mongodb+srv://user:pass@cluster.../db) — on masque avant d'écrire dans les logs.
  const redacted = env.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  // eslint-disable-next-line no-console
  console.log(`[db] connecté à ${redacted}`);
}
