// Exercise lock ownership with real subprocesses, including forced termination
// and competing builders, without using Maizzle's real shared build directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  withBuildProductionLock,
  withBuildProductionLockAsync,
} from '../../lib/newsletter-core/build-directory-lock.mjs';

const moduleUrl = new URL('../../lib/newsletter-core/build-directory-lock.mjs', import.meta.url).href;

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'maizzle-lock-test-'));
  // The root supplies a unique lock namespace; the lock never opens the repo.
  const repoRoot = path.join(path.parse(directory).root, randomUUID(), 'mail');
  const key = Buffer.from(path.resolve(repoRoot)).toString('hex').slice(0, 32);
  const lockPath = path.join(os.tmpdir(), `nfl-maizzle-mail-build-${key}.lock`);
  const workers = [];
  t.after(async () => {
    for (const worker of workers) {
      if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill('SIGKILL');
    }
    await Promise.all(workers.map((worker) => worker.exited));
    fs.rmSync(lockPath, { recursive: true, force: true });
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, repoRoot, lockPath, workers };
}

async function waitFor(condition, message) {
  const deadline = Date.now() + 5000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(message);
    await sleep(10);
  }
}

function startWorker(context, action = 'hold') {
  const id = randomUUID();
  const ready = path.join(context.directory, `${id}.ready`);
  const release = path.join(context.directory, `${id}.release`);
  const program = `
    import fs from 'node:fs';
    import { setTimeout as sleep } from 'node:timers/promises';
    import { withBuildProductionLockAsync } from ${JSON.stringify(moduleUrl)};
    const [repoRoot, ready, release, action] = process.argv.slice(1);
    if (action === 'timeout') {
      const realNow = Date.now;
      let calls = 0;
      Date.now = () => realNow() + (calls++ > 0 ? 5 * 60 * 1000 : 0);
    }
    const build = withBuildProductionLockAsync(repoRoot, async () => {
      fs.writeFileSync(ready, 'acquired');
      if (action === 'exit') process.exit(0);
      if (action === 'hold') while (!fs.existsSync(release)) await sleep(10);
    });
    if (action === 'timeout') await build.catch(() => { process.exitCode = 1; });
    else await build;
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', program, context.repoRoot, ready, release, action], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const worker = { child, ready, release, stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => { worker.stdout += chunk; });
  child.stderr.on('data', (chunk) => { worker.stderr += chunk; });
  worker.exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  context.workers.push(worker);
  return worker;
}

test('sync and async builds return values and release locks after failures', async (t) => {
  const { repoRoot, lockPath } = setup(t);
  assert.equal(withBuildProductionLock(repoRoot, () => 42), 42);
  assert.equal(fs.existsSync(lockPath), false);
  assert.throws(() => withBuildProductionLock(repoRoot, () => { throw new Error('sync failure'); }), /sync failure/);
  assert.equal(fs.existsSync(lockPath), false);
  assert.equal(await withBuildProductionLockAsync(repoRoot, async () => 43), 43);
  await assert.rejects(withBuildProductionLockAsync(repoRoot, async () => { throw new Error('async failure'); }), /async failure/);
  assert.equal(fs.existsSync(lockPath), false);
});

test('a forced termination is recovered without waiting five minutes', async (t) => {
  const context = setup(t);
  const owner = startWorker(context);
  await waitFor(() => fs.existsSync(owner.ready), 'owner never acquired the lock');
  owner.child.kill('SIGKILL');
  await owner.exited;
  assert.equal(fs.existsSync(context.lockPath), true);
  const next = startWorker(context, 'build');
  await waitFor(() => fs.existsSync(next.ready), 'abandoned lock was not recovered promptly');
  assert.equal((await next.exited).code, 0);
  assert.match(next.stdout, /recovered abandoned build lock from PID/);
  assert.equal(fs.existsSync(context.lockPath), false);
});

for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  test(`${signal} releases ownership immediately`, async (t) => {
    const context = setup(t);
    const owner = startWorker(context);
    await waitFor(() => fs.existsSync(owner.ready), 'owner never acquired the lock');
    owner.child.kill(signal);
    assert.equal((await owner.exited).code, code);
    assert.equal(fs.existsSync(context.lockPath), false);
  });
}

test('explicit process exit releases ownership', async (t) => {
  const context = setup(t);
  const owner = startWorker(context, 'exit');
  assert.equal((await owner.exited).code, 0);
  assert.equal(fs.existsSync(context.lockPath), false);
});

test('an old live lock is preserved and reports its owner while waiting', async (t) => {
  const context = setup(t);
  const owner = startWorker(context);
  await waitFor(() => fs.existsSync(owner.ready), 'owner never acquired the lock');
  const old = new Date(Date.now() - 10 * 60 * 1000);
  fs.utimesSync(context.lockPath, old, old);
  const next = startWorker(context, 'build');
  await waitFor(() => next.stdout.includes(`PID ${owner.child.pid}`), 'waiting build did not report the owner');
  assert.equal(fs.existsSync(next.ready), false);
  assert.equal(fs.existsSync(context.lockPath), true);
  fs.writeFileSync(owner.release, 'release');
  assert.equal((await owner.exited).code, 0);
  await waitFor(() => fs.existsSync(next.ready), 'waiting build never acquired the released lock');
  assert.equal((await next.exited).code, 0);
});

test('multiple waiters recover a dead owner and enter one at a time', async (t) => {
  const context = setup(t);
  const owner = startWorker(context);
  await waitFor(() => fs.existsSync(owner.ready), 'owner never acquired the lock');
  owner.child.kill('SIGKILL');
  await owner.exited;
  const waiters = Array.from({ length: 4 }, () => startWorker(context));
  const completed = new Set();
  for (let index = 0; index < waiters.length; index += 1) {
    await waitFor(() => waiters.some((worker) => !completed.has(worker) && fs.existsSync(worker.ready)), 'no waiter acquired the lock');
    const active = waiters.filter((worker) => !completed.has(worker) && fs.existsSync(worker.ready));
    assert.equal(active.length, 1, 'competing builders entered the shared directory together');
    await sleep(150);
    assert.equal(waiters.filter((worker) => !completed.has(worker) && fs.existsSync(worker.ready)).length, 1);
    fs.writeFileSync(active[0].release, 'release');
    assert.equal((await active[0].exited).code, 0);
    completed.add(active[0]);
  }
  assert.equal(fs.existsSync(context.lockPath), false);
});

test('a bounded wait prints its diagnostic even when the CLI catch suppresses errors', async (t) => {
  const context = setup(t);
  const owner = startWorker(context);
  await waitFor(() => fs.existsSync(owner.ready), 'owner never acquired the lock');
  const next = startWorker(context, 'timeout');
  assert.equal((await next.exited).code, 1);
  assert.match(next.stderr, new RegExp(`Timed out waiting for the Maizzle build lock held by PID ${owner.child.pid}`));
  assert.match(next.stderr, /inspect that build before retrying/);
  assert.equal(fs.existsSync(next.ready), false);
  assert.equal(fs.existsSync(context.lockPath), true);
});

test('an abandoned empty legacy lock remains recoverable', (t) => {
  const context = setup(t);
  fs.mkdirSync(context.lockPath);
  const old = new Date(Date.now() - 10 * 60 * 1000);
  fs.utimesSync(context.lockPath, old, old);
  assert.equal(withBuildProductionLock(context.repoRoot, () => 'recovered'), 'recovered');
  assert.equal(fs.existsSync(context.lockPath), false);
});

test('cleanup does not remove a replacement owner record', (t) => {
  const context = setup(t);
  const replacement = `${process.pid}-${randomUUID()}.owner.json`;
  withBuildProductionLock(context.repoRoot, () => {
    fs.rmSync(context.lockPath, { recursive: true });
    fs.mkdirSync(context.lockPath);
    fs.writeFileSync(path.join(context.lockPath, replacement), '{}');
  });
  assert.equal(fs.existsSync(path.join(context.lockPath, replacement)), true);
});
