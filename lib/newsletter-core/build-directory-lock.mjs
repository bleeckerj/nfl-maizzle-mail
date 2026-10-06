// Serialize builds that share Maizzle's input JSON and output directory.
// Each lock records its process; dead owners are recovered without an age delay.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const LEGACY_LOCK_MAX_AGE_MS = 5 * 60 * 1000;
const WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 5000;
const POLL_MS = 100;

function lockPathForRepo(repoRoot) {
  const key = Buffer.from(path.resolve(repoRoot)).toString('hex').slice(0, 32);
  return path.join(os.tmpdir(), `nfl-maizzle-mail-build-${key}.lock`);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    if (error.code === 'EPERM') return true;
    throw error;
  }
}

function removeEmptyDirectory(lockPath) {
  try {
    fs.rmdirSync(lockPath);
    return true;
  } catch (error) {
    if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) return false;
    throw error;
  }
}

// A unique owner filename prevents another waiter from removing a new owner's
// record after the abandoned lock has already been replaced.
function removeOwnedLock({ lockPath, ownerFile }) {
  try {
    fs.unlinkSync(path.join(lockPath, ownerFile));
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  return removeEmptyDirectory(lockPath);
}

function inspectExistingLock(lockPath) {
  try {
    const files = fs.readdirSync(lockPath);
    const ownerFile = files.find((file) => /^\d+-[\da-f-]+\.owner\.json$/.test(file));
    if (ownerFile) {
      const pid = Number(ownerFile.split('-')[0]);
      if (!processIsAlive(pid) && removeOwnedLock({ lockPath, ownerFile })) {
        console.log(`[newsletter build] recovered abandoned build lock from PID ${pid}`);
        return { recovered: true };
      }
      return { ownerPid: pid };
    }

    // Old builds created an empty directory without ownership metadata. Retain
    // their age grace period, and only remove an empty legacy directory.
    if (files.length === 0 && Date.now() - fs.statSync(lockPath).mtimeMs > LEGACY_LOCK_MAX_AGE_MS) {
      if (removeEmptyDirectory(lockPath)) {
        console.log('[newsletter build] recovered abandoned legacy build lock');
        return { recovered: true };
      }
    }
    return { ownerPid: null };
  } catch (error) {
    if (error.code === 'ENOENT') return { recovered: true };
    throw error;
  }
}

function tryAcquireLock(lockPath) {
  try {
    fs.mkdirSync(lockPath);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return inspectExistingLock(lockPath);
  }

  const ownerFile = `${process.pid}-${randomUUID()}.owner.json`;
  try {
    fs.writeFileSync(path.join(lockPath, ownerFile), JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }), { flag: 'wx' });
  } catch (error) {
    removeEmptyDirectory(lockPath);
    throw error;
  }
  return { lock: { lockPath, ownerFile } };
}

function reportWait(startedAt, lastReportAt, ownerPid) {
  const now = Date.now();
  const owner = ownerPid ? `PID ${ownerPid}` : 'a legacy build with no owner record';
  if (now - startedAt >= WAIT_TIMEOUT_MS) {
    const message = `Timed out waiting for the Maizzle build lock held by ${owner}; inspect that build before retrying.`;
    // The CLI's final catch sets an exit code without printing acquisition errors.
    console.error(`[newsletter build] ${message}`);
    throw new Error(message);
  }
  if (lastReportAt === null || now - lastReportAt >= HEARTBEAT_MS) {
    console.log(`[newsletter build] waiting for Maizzle build lock held by ${owner} (${Math.round((now - startedAt) / 1000)}s); active locks are preserved`);
    return now;
  }
  return lastReportAt;
}

function acquireLock(repoRoot) {
  const lockPath = lockPathForRepo(repoRoot);
  const startedAt = Date.now();
  let lastReportAt = null;
  while (true) {
    const attempt = tryAcquireLock(lockPath);
    if (attempt.lock) return attempt.lock;
    if (attempt.recovered) continue;
    lastReportAt = reportWait(startedAt, lastReportAt, attempt.ownerPid);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, POLL_MS);
  }
}

async function acquireLockAsync(repoRoot) {
  const lockPath = lockPathForRepo(repoRoot);
  const startedAt = Date.now();
  let lastReportAt = null;
  while (true) {
    const attempt = tryAcquireLock(lockPath);
    if (attempt.lock) return attempt.lock;
    if (attempt.recovered) continue;
    lastReportAt = reportWait(startedAt, lastReportAt, attempt.ownerPid);
    // Yield while waiting so interruption and other async work remain responsive.
    await sleep(POLL_MS);
  }
}

function registerExitCleanup(lock) {
  const onExit = () => removeOwnedLock(lock);
  const signalHandlers = [];
  process.once('exit', onExit);
  for (const [signal, exitCode] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    if (process.listenerCount(signal) === 0) {
      const handler = () => process.exit(exitCode);
      process.once(signal, handler);
      signalHandlers.push([signal, handler]);
    }
  }
  return () => {
    process.removeListener('exit', onExit);
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
  };
}

/** Run a synchronous build, releasing only its own lock on success or failure. */
export function withBuildProductionLock(repoRoot, fn) {
  const lock = acquireLock(repoRoot);
  const unregister = registerExitCleanup(lock);
  try {
    return fn();
  } finally {
    unregister();
    removeOwnedLock(lock);
  }
}

/** Run an asynchronous build with the same ownership and interruption cleanup. */
export async function withBuildProductionLockAsync(repoRoot, fn) {
  const lock = await acquireLockAsync(repoRoot);
  const unregister = registerExitCleanup(lock);
  try {
    return await fn();
  } finally {
    unregister();
    removeOwnedLock(lock);
  }
}
