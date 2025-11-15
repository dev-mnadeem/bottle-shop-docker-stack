import http from 'node:http';
import { env } from './config/env';
import { buildProductionContainer } from './container';
import { AppDataSource } from './data-source';
import { logger } from './logger';
import { buildExpressApp } from './server';

/** How long an in-flight request has to finish once a shutdown signal arrives. */
const SHUTDOWN_GRACE_MS = 10_000;

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const container = buildProductionContainer(AppDataSource);
  const server = http.createServer(buildExpressApp(container));

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    // Stop accepting connections, then release the pools. The timer is the
    // backstop for a client that never closes its keep-alive socket.
    const forced = setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS);
    forced.unref();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled([AppDataSource.destroy(), container.store.close()]);
    logger.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
