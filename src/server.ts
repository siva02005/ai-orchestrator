import { buildEngine } from './engine.js';
import { buildServer } from './api/routes.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const engine = buildEngine({ config });
const app = await buildServer(engine);

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (err) {
  console.error('Failed to start ai-orchestrator:', err);
  process.exit(1);
}

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
