import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';
import { connectDB } from '../src/db/connect';

// Point d'entrée serverless Vercel : même application Express que le serveur Node, sans Socket.IO ni /updates.
const app = createApp({ updates: false });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[api] connexion MongoDB impossible:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Base de données indisponible.' }));
    return;
  }
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
