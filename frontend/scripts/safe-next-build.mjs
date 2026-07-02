import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const lockPath = path.join(cwd, '.next-build.lock');

async function acquireLock() {
  try {
    const handle = await fs.open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o644);
    await handle.writeFile(`${process.pid}\n`);
    await handle.close();
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      console.error('Another frontend build is already running. Wait for it to finish, then retry.');
      process.exit(1);
    }
    throw error;
  }
}

async function releaseLock() {
  try {
    await fs.unlink(lockPath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      console.warn(`Warning: failed to remove build lock: ${error?.message ?? String(error)}`);
    }
  }
}

async function runBuild() {
  await acquireLock();

  const cleanup = async () => {
    await releaseLock();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(143);
  });

  const nextBin = process.platform === 'win32'
    ? path.join(cwd, 'node_modules', '.bin', 'next.cmd')
    : path.join(cwd, 'node_modules', '.bin', 'next');

  const child = spawn(nextBin, ['build'], {
    stdio: 'inherit',
    cwd,
    env: process.env,
  });

  child.on('exit', async (code, signal) => {
    await cleanup();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on('error', async (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    await cleanup();
    process.exit(1);
  });
}

runBuild().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await releaseLock();
  process.exit(1);
});
