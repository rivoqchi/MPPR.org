import net from 'node:net';
import { execSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

export function log(message) {
  console.log(`\x1b[36m[dev]\x1b[0m ${message}`);
}

export function warn(message) {
  console.warn(`\x1b[33m[dev]\x1b[0m ${message}`);
}

export function fail(message) {
  console.error(`\x1b[31m[dev]\x1b[0m ${message}`);
  process.exit(1);
}

export function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function waitForPort(port, { timeoutMs = 60_000, host = '127.0.0.1' } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port, host)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

export function tryExec(command, options = {}) {
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      shell: true,
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

export function getListeningPid(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING')) {
          continue;
        }

        const pid = Number.parseInt(line.trim().split(/\s+/).at(-1) ?? '', 10);
        if (pid > 0) {
          return pid;
        }
      }

      return null;
    }

    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const pid = Number.parseInt(output.trim().split('\n')[0] ?? '', 10);
    return pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function freePort(port) {
  const pid = getListeningPid(port);
  if (!pid) {
    return false;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
    }
    return true;
  } catch {
    return false;
  }
}

export async function ensurePortAvailable(port) {
  if (!(await isPortOpen(port))) {
    return;
  }

  warn(`Port ${port} is already in use. Stopping previous process...`);

  if (!freePort(port)) {
    fail(
      `Port ${port} is busy. Stop it manually:\n` +
        (process.platform === 'win32'
          ? `  netstat -ano | findstr :${port}\n  taskkill /PID <pid> /F`
          : `  lsof -ti :${port} | xargs kill -9`),
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!(await isPortOpen(port))) {
      log(`Port ${port} is free.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  fail(`Port ${port} is still in use after cleanup.`);
}

export function isPostgresDataDirInitialised(dataDir) {
  return existsSync(path.join(dataDir, 'PG_VERSION'));
}

export function removeStalePostmasterPid(dataDir) {
  const pidFile = path.join(dataDir, 'postmaster.pid');
  if (!existsSync(pidFile)) {
    return;
  }

  try {
    const pid = Number.parseInt(readFileSync(pidFile, 'utf8').split('\n')[0] ?? '', 10);
    if (!Number.isFinite(pid)) {
      unlinkSync(pidFile);
      return;
    }

    try {
      process.kill(pid, 0);
    } catch {
      unlinkSync(pidFile);
    }
  } catch {
    // Ignore cleanup errors; postgres start will surface real issues.
  }
}

export function ensureEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  const examplePath = path.join(ROOT_DIR, '.env.example');

  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    log('Created .env from .env.example');
  }

  if (!existsSync(envPath)) {
    fail('.env file not found. Copy .env.example to .env and configure it.');
  }
}
