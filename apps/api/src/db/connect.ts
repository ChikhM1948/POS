import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  // eslint-disable-next-line no-console
  console.log(`[db] connecté à ${env.mongodbUri}`);
}
