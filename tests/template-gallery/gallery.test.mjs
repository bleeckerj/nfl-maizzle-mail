import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverTemplates, sourcePath, validateDocument } from '../../lib/template-gallery/catalog.mjs';
import { createGalleryServer } from '../../lib/template-gallery/server.mjs';
import { inspectPreview } from '../../lib/template-gallery/inspect.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('preview inspection flags visible rendering defects without mistaking scripts for email copy', () => {
  assert.deepEqual(inspectPreview('<body><p>Hello</p><script>let x = undefined;</script></body>'), []);
  assert.equal(inspectPreview('<body><h1>undefined</h1></body>').length, 1);
  assert.equal(inspectPreview('<body><component src="Header.html"></component></body>').length, 2);
  assert.deepEqual(inspectPreview('<body><img src="https://example.com/image.png"></body>'), []);
});

test('catalog discovers every template directory and validates its manifest shape', () => {
  const records = discoverTemplates(root);
  const directories = fs.readdirSync(path.join(root, 'templates'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  assert.deepEqual(records.map(record => record.name).sort(), directories.sort());
  validateDocument(root, 'manifest.schema.json', { generatedAt: new Date().toISOString(), templates: records });
  assert.equal(records.find(record => record.name === 'palm-report').sample, null);
});

test('new template directories appear without a registry entry', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-discovery-'));
  try {
    fs.mkdirSync(path.join(temp, 'gallery')); fs.mkdirSync(path.join(temp, 'templates/future-email'), { recursive: true });
    fs.copyFileSync(path.join(root, 'gallery/config.schema.json'), path.join(temp, 'gallery/config.schema.json'));
    fs.writeFileSync(path.join(temp, 'gallery/config.json'), '{"templates":{}}');
    fs.writeFileSync(path.join(temp, 'templates/future-email/sample-data.json'), '{}');
    const [record] = discoverTemplates(temp);
    assert.equal(record.name, 'future-email');
    assert.equal(record.sample, 'templates/future-email/sample-data.json');
    assert.equal(record.stage, 'prototype');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('source paths reject traversal and outside symlinks', () => {
  assert.throws(() => sourcePath(root, '../outside.json'), /inside the repository/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-path-'));
  try {
    fs.symlinkSync(path.join(root, 'package.json'), path.join(temp, 'outside.json'));
    assert.throws(() => sourcePath(temp, 'outside.json'), /symlinks/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('server exposes only gallery assets and sandboxed HTML previews', async () => {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-server-'));
  fs.mkdirSync(path.join(cache, 'example'));
  const original = '<html><body><img src="https://example.com/full-image.png" width="900"><script>alert(1)</script></body></html>';
  fs.writeFileSync(path.join(cache, 'example/reference.html'), original);
  fs.writeFileSync(path.join(cache, 'example/input.json'), '{"private":"data"}');
  const server = createGalleryServer(root, cache);
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const preview = await fetch(`${base}/previews/example/reference.html`);
    assert.equal(preview.status, 200);
    assert.equal(await preview.text(), original, 'preserve original HTML and image geometry');
    assert.match(preview.headers.get('content-security-policy'), /^sandbox;/);
    assert.equal(preview.headers.get('referrer-policy'), 'no-referrer');
    for (const route of ['/package.json', '/.env', '/previews/example/input.json', '/previews/example/build.log', '/previews/%2e%2e/package.json']) {
      assert.equal((await fetch(`${base}${route}`)).status, 404, route);
    }
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.equal((await fetch(base)).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(cache, { recursive: true, force: true });
  }
});

test('editorial sources are restricted to the sibling email corpus', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-editorial-'));
  const mail = path.join(workspace, 'nfl-maizzle-mail');
  const editorial = path.join(workspace, 'nfl-editorial/emails');
  fs.mkdirSync(mail); fs.mkdirSync(path.join(editorial, 'jobs/example'), {recursive:true});
  const source = path.join(editorial, 'jobs/example/example.email.md');
  fs.writeFileSync(source, '---\ntemplate: example\n---\n');
  try {
    assert.equal(sourcePath(mail, 'editorial:jobs/example/example.email.md'), source);
    assert.throws(() => sourcePath(mail, 'editorial:../private.md'), /inside/);
    fs.writeFileSync(path.join(workspace, 'private.md'), 'private');
    fs.symlinkSync(path.join(workspace, 'private.md'), path.join(editorial, 'escape.md'));
    assert.throws(() => sourcePath(mail, 'editorial:escape.md'), /symlinks/);
  } finally { fs.rmSync(workspace, {recursive:true, force:true}); }
});
