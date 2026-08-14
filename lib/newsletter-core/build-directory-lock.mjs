import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOCK_MAX_AGE_MS = 5 * 60 * 1000;
const POLL_MS = 100;

function lockPathForRepo(repoRoot) {
  const key = Buffer.from(path.resolve(repoRoot)).toString('hex').slice(0, 32);
  return path.join(os.tmpdir(), `nfl-maizzle-mail-build-${key}.lock`);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeStaleLock(lockPath) {
  try {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs > LOCK_MAX_AGE_MS) {
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function acquireLock(repoRoot) {
  const lockPath = lockPathForRepo(repoRoot);
  while (true) {
    try {
      fs.mkdirSync(lockPath);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      removeStaleLock(lockPath);
      sleepSync(POLL_MS);
    }
  }

  return lockPath;
}

function releaseLock(lockPath) {
  fs.rmSync(lockPath, { recursive: true, force: true });
}

/** Runs a synchronous build step while holding the shared Maizzle output lock. */
export function withBuildProductionLock(repoRoot, fn) {
  const lockPath = acquireLock(repoRoot);

  try {
    return fn();
  } finally {
    releaseLock(lockPath);
  }
}

/** Runs an entire asynchronous newsletter build while holding the shared state lock. */
export async function withBuildProductionLockAsync(repoRoot, fn) {
  const lockPath = acquireLock(repoRoot);

  try {
    return await fn();
  } finally {
    releaseLock(lockPath);
  }
}
