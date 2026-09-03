import path from 'node:path';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  ROOT_DIR,
  ensureEnvFile,
  ensurePortAvailable,
  fail,
  freePort,
  isPortOpen,
  isPostgresDataDirInitialised,
  loadEnvFile,
  log,
  removeStalePostmasterPid,
  tryExec,
  waitForPort,
  warn,
} from './utils.mjs';
import { ensureBlankDocxTemplate } from './ensure-blank-docx.mjs';

const POSTGRES_PORT = Number.parseInt(process.env.DEV_POSTGRES_PORT ?? '5433', 10);
const REDIS_PORT = 6379;
const managedProcesses = [];
let embeddedRedis = null;

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

  log('Starting PostgreSQL, Redis and OnlyOffice via Docker Compose...');
  if (!tryExec('docker compose up -d postgres redis onlyoffice')) {
    return false;
  }

  return true;
}

function missingPackageMessage(packageName) {
  return (
    `Cannot find package '${packageName}'.\n` +
    `npm install tugamagan (Redis 8 yig'ilishi macOS Make 3.81 da yiqiladi).\n` +
    `Qayta o'rnating:\n` +
    `  cd Backend && rm -rf node_modules && npm install\n` +
    `Keyin:\n` +
    `  npm run dev`
  );
}

async function startEmbeddedPostgres() {
  log('Starting embedded PostgreSQL (no Docker detected)...');

  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import('embedded-postgres'));
  } catch {
    fail(missingPackageMessage('embedded-postgres'));
  }
  const dataDir = path.join(ROOT_DIR, '.data', `postgres-${POSTGRES_PORT}`);

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

  try {
    await pg.createDatabase('ppr_db');
    log('Created database ppr_db');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      warn(`Could not create ppr_db: ${message}`);
    }
  }

  registerCleanup(async () => {
    await pg.stop();
  });

  log(`Embedded PostgreSQL running on port ${POSTGRES_PORT}`);
  return true;
}

async function startEmbeddedRedis() {
  log('Starting embedded Redis (no Docker detected)...');
  log('Redis 7 birinchi marta yig\'ilishi 1-2 daqiqa olishi mumkin.');

  let RedisMemoryServer;
  try {
    ({ RedisMemoryServer } = await import('redis-memory-server'));
  } catch {
    fail(missingPackageMessage('redis-memory-server'));
  }

  const redis = new RedisMemoryServer({
    instance: {
      port: REDIS_PORT,
      ip: '127.0.0.1',
    },
    binary: {
      version: '7.4.2',
    },
    autoStart: false,
  });

  await redis.start();
  const host = await redis.getHost();
  const port = await redis.getPort();
  embeddedRedis = redis;

  registerCleanup(async () => {
    await redis.stop();
    embeddedRedis = null;
  });

  log(`Embedded Redis running on ${host}:${port}`);
  return true;
}

async function restartEmbeddedRedisIfNeeded() {
  if (await isPortOpen(REDIS_PORT)) {
    return;
  }

  warn(`Redis on port ${REDIS_PORT} stopped unexpectedly. Restarting embedded Redis...`);

  if (embeddedRedis) {
    try {
      await embeddedRedis.stop();
    } catch {
      // Ignore stale process cleanup errors.
    }
    embeddedRedis = null;
  }

  await startEmbeddedRedis();
  if (!(await waitForPort(REDIS_PORT, { timeoutMs: 30_000 }))) {
    warn(`Redis did not come back on port ${REDIS_PORT}. Restart npm run dev.`);
  }
}

function startInfrastructureWatchdog() {
  setInterval(() => {
    restartEmbeddedRedisIfNeeded().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      warn(`Infrastructure watchdog failed: ${message}`);
    });
  }, 15_000);
}

async function isPostgresReady(port = POSTGRES_PORT) {
  if (!(await isPortOpen(port))) {
    return false;
  }

  // Port open is not enough — stale ghost listeners can accept TCP but not serve Postgres.
  return tryExec(
    `npx prisma db execute --schema prisma/schema.prisma --stdin`,
    {
      input: 'SELECT 1;',
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://user:password@127.0.0.1:${port}/ppr_db?schema=public`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
}

async function ensureInfrastructure() {
  const postgresReady = await isPostgresReady();
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

      if (postgresUp && redisUp && (await isPostgresReady())) {
        log('Docker infrastructure is ready.');
        return;
      }

      warn('Docker Compose started but services are not ready yet.');
    }
  }

  if (!(await isPostgresReady())) {
    if (await isPortOpen(POSTGRES_PORT)) {
      warn(`Port ${POSTGRES_PORT} looks occupied but PostgreSQL is unreachable. Restarting embedded Postgres...`);
      freePort(POSTGRES_PORT);
      removeStalePostmasterPid(path.join(ROOT_DIR, '.data', `postgres-${POSTGRES_PORT}`));
    }

    await startEmbeddedPostgres();
    if (!(await waitForPort(POSTGRES_PORT))) {
      fail(`PostgreSQL did not become available on port ${POSTGRES_PORT}.`);
    }

    // Give embedded Postgres a moment after TCP is open.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await isPostgresReady()) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!(await isPostgresReady())) {
      fail(`PostgreSQL is listening on ${POSTGRES_PORT} but queries fail. Check .data/postgres-${POSTGRES_PORT}.`);
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
  const tsBuildInfo = path.join(ROOT_DIR, 'dist', 'tsconfig.build.tsbuildinfo');

  ensureBlankDocxTemplate();

  if (existsSync(tsBuildInfo)) {
    unlinkSync(tsBuildInfo);
  }

  log('Generating Prisma client...');
  if (!tryExec('npm run prisma:generate')) {
    if (existsSync(prismaClient)) {
      warn('Prisma generate skipped (client already exists, likely server is running).');
    } else {
      fail('Prisma client generation failed. Close other Node processes and retry.');
    }
  }

  log('Applying database migrations...');
  if (!tryExec('npx prisma migrate deploy', { logError: true })) {
    warn('Migration deploy failed.');
  }

  log('Syncing database schema for local development...');
  if (!tryExec('npx prisma db push', { logError: true })) {
    warn('Schema sync skipped or failed. Run: npx prisma migrate deploy');
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

  return Number.parseInt(process.env.PORT ?? '8000', 10);
}

async function main() {
  ensureEnvFile();
  loadEnvFile();

  if (!existsSync(path.join(ROOT_DIR, 'node_modules', '@nestjs', 'cli'))) {
    fail(missingPackageMessage('@nestjs/cli'));
  }

  await ensureInfrastructure();
  startInfrastructureWatchdog();
  await prepareDatabase();
  await ensurePortAvailable(getApiPort());
  startNestWatch();
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
