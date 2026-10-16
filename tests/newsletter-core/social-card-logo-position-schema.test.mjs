// Keep the maintained authoring schema and generated schema aligned with the
// logo-position shape consumed by the Backoffice social-card renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = JSON.parse(readFileSync(path.join(repoRoot, 'templates/dense-discovery/newsletter.schema.json'), 'utf8'));
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema.properties.socialCard);

test('accepts corner anchors, proportional nudges, and directional aliases', () => {
  for (const side of ['left', 'right']) {
    for (const south of [0, 0.1, 1]) {
      assert.equal(validate({ logoPosition: { side, nudge: { south } } }), true, JSON.stringify(validate.errors));
    }
  }
  for (const position of [{}, { side: 'left' }, { nudge: { x: -0.25, y: 0.5 } }, { nudge: { east: 0.2, west: 0.05, north: 0.1, south: 0.35 } }]) {
    assert.equal(validate({ logoPosition: position }), true, JSON.stringify(validate.errors));
  }
});

test('rejects invalid anchors, malformed nudges, and unknown placement fields', () => {
  for (const position of ['top-right', { side: 'center' }, { nudge: 'south' }, { nudge: { south: '0.1' } }, { nudge: { bottom: 0.1 } }, { corner: 'right' }]) {
    assert.equal(validate({ logoPosition: position }), false, JSON.stringify(position));
  }
});

test('schema discovery retains the maintained logo-position contract', () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'social-card-logo-schema-'));
  try {
    const outputPath = path.join(temporaryRoot, 'schema.json');
    execFileSync(process.execPath, ['scripts/generate-template-schema.mjs', '--entry', 'templates/dense-discovery/newsletter.html', '--output', outputPath], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    const generated = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.ok(schema.properties.socialCard.properties.logoPosition, 'maintained schema must declare logoPosition');
    assert.deepEqual(generated.properties.socialCard.properties.logoPosition, schema.properties.socialCard.properties.logoPosition);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
