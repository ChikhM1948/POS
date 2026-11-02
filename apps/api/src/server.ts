import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { connectDB } from './db/connect';
import { createApp } from './app';

async function main() {
  await connectDB();

  const app = createApp({ updates: true });
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: env.corsOrigin } });

  io.on('connection', (socket) => {
    socket.on('join-tenant', (tenantId: string) => socket.join(`tenant:${tenantId}`));
  });

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] démarré sur http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] échec du démarrage:', err);
  process.exit(1);
});
