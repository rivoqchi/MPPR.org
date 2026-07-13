import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  ROOT_DIR,
  ensureEnvFile,
  ensurePortAvailable,
  fail,
  isPortOpen,
  isPostgresDataDirInitialised,
  log,
  removeStalePostmasterPid,
  tryExec,
  waitForPort,
  warn,
} from './utils.mjs';

const POSTGRES_PORT = 5432;
const REDIS_PORT = 6379;
const managedProcesses = [];

function registerCleanup(handler) {
  const shutdown = async () => {
    for (const proc of managedProcesses) {
      if (!proc.killed) {
        proc.kill();
      }
    }
    await handler?.();
  };

  process.on('SIGINT', () => {
    shutdown().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    shutdown().finally(() => process.exit(0));
  });
}

async function startDockerInfra() {
  if (!tryExec('docker compose version')) {
    return false;
  }

  log('Starting PostgreSQL and Redis via Docker Compose...');
  if (!tryExec('docker compose up -d postgres redis')) {
    return false;
  }

  return true;
}

async function startEmbeddedPostgres() {
  log('Starting embedded PostgreSQL (no Docker detected)...');

  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dataDir = path.join(ROOT_DIR, '.data', 'postgres');

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'user',
    password: 'password',
    port: POSTGRES_PORT,
    persistent: true,
  });

  if (!isPostgresDataDirInitialised(dataDir)) {
    await pg.initialise();
  } else {
    log('Embedded PostgreSQL data directory already initialised.');
    removeStalePostmasterPid(dataDir);
  }

  await pg.start();

  registerCleanup(async () => {
    await pg.stop();
  });

  log(`Embedded PostgreSQL running on port ${POSTGRES_PORT}`);
  return true;
}

async function startEmbeddedRedis() {
  log('Starting embedded Redis (no Docker detected)...');

  const { RedisMemoryServer } = await import('redis-memory-server');
  const redis = new RedisMemoryServer({
    instance: {
      port: REDIS_PORT,
      ip: '127.0.0.1',
    },
    autoStart: false,
  });

  await redis.start();
  const host = await redis.getHost();
  const port = await redis.getPort();

  registerCleanup(async () => {
    await redis.stop();
  });

  log(`Embedded Redis running on ${host}:${port}`);
  return true;
}

async function ensureInfrastructure() {
  const postgresReady = await isPortOpen(POSTGRES_PORT);
  const redisReady = await isPortOpen(REDIS_PORT);

  if (postgresReady && redisReady) {
    log('PostgreSQL and Redis are already running.');
    return;
  }

  if (!postgresReady || !redisReady) {
    const dockerStarted = await startDockerInfra();

    if (dockerStarted) {
      const postgresUp = postgresReady || (await waitForPort(POSTGRES_PORT));
      const redisUp = redisReady || (await waitForPort(REDIS_PORT));

      if (postgresUp && redisUp) {
        log('Docker infrastructure is ready.');
        return;
      }

      warn('Docker Compose started but services are not ready yet.');
    }
  }

  if (!(await isPortOpen(POSTGRES_PORT))) {
    await startEmbeddedPostgres();
    if (!(await waitForPort(POSTGRES_PORT))) {
      fail(`PostgreSQL did not become available on port ${POSTGRES_PORT}.`);
    }
  }

  if (!(await isPortOpen(REDIS_PORT))) {
    await startEmbeddedRedis();
    if (!(await waitForPort(REDIS_PORT))) {
      fail(`Redis did not become available on port ${REDIS_PORT}.`);
    }
  }
}

async function prepareDatabase() {
  const prismaClient = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client', 'index.js');

  log('Generating Prisma client...');
  if (!tryExec('npm run prisma:generate')) {
    if (existsSync(prismaClient)) {
      warn('Prisma generate skipped (client already exists, likely server is running).');
    } else {
      fail('Prisma client generation failed. Close other Node processes and retry.');
    }
  }

  log('Applying database migrations...');
  if (!tryExec('npx prisma migrate deploy')) {
    warn('Migration deploy failed.');
  }

  log('Syncing database schema for local development...');
  if (!tryExec('npx prisma db push --accept-data-loss')) {
    fail('Database setup failed. Check DATABASE_URL in .env');
  }

  if (!tryExec('npm run prisma:seed')) {
    warn('Database seed skipped or failed. Run manually: npm run prisma:seed');
  }
}

function startNestWatch() {
  log('Starting NestJS in watch mode...');

  const nest = spawn('npx', ['nest', 'start', '--watch'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PGCLIENTENCODING: 'UTF8',
    },
  });

  managedProcesses.push(nest);

  nest.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function getApiPort() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf8').match(/^PORT=(\d+)/m);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return Number.parseInt(process.env.PORT ?? '3000', 10);
}

async function main() {
  ensureEnvFile();
  await ensureInfrastructure();
  await prepareDatabase();
  await ensurePortAvailable(getApiPort());
  startNestWatch();
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
