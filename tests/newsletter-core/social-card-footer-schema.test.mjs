// Exercise the source schema, regeneration, and starter paths together so
// footer fields accepted by the exporter stay available to newsletter authors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import Ajv from 'ajv';
import { validateNewsletterDataAgainstSchema } from '../../lib/newsletter-core/schema.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = JSON.parse(readFileSync(path.join(repoRoot, 'templates/dense-discovery/newsletter.schema.json'), 'utf8'));
const footerFields = ['footerCopy', 'footerFont', 'footerFontScale'];
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema.properties.socialCard);

test('Dense Discovery accepts optional footer copy and font controls, and rejects invalid inputs', () => {
  for (const value of [{}, { footerCopy: '', footerFont: null, footerFontScale: 1 }, { footerCopy: null }, { footerCopy: '<p>Near Future Laboratory</p>', footerFont: 'untitled-sans-light', footerFontScale: 0.8 }]) {
    assert.equal(validate(value), true, JSON.stringify(validate.errors));
  }
  for (const value of [{ footerCopy: 42 }, { footerFont: true }, { footerFontScale: '1' }, { footerText: 'Unknown field' }]) {
    assert.equal(validate(value), false, JSON.stringify(value));
  }
});

test('schema regeneration preserves the canonical footer contract', () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'social-card-footer-schema-'));
  try {
    const outputPath = path.join(temporaryRoot, 'schema.json');
    execFileSync(process.execPath, ['scripts/generate-template-schema.mjs', '--entry', 'templates/dense-discovery/newsletter.html', '--output', outputPath], { cwd: repoRoot });
    const generated = JSON.parse(readFileSync(outputPath, 'utf8'));
    for (const field of footerFields) {
      assert.deepEqual(generated.properties.socialCard.properties[field], schema.properties.socialCard.properties[field], field);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('schema starters keep footer copy disabled and allow authored footer settings through canonical validation', () => {
  const markdown = execFileSync(process.execPath, ['scripts/generate-skeleton-from-schema.mjs', '--template', 'dense-discovery', '--minimal'], { cwd: repoRoot, encoding: 'utf8' });
  const newsletter = matter(markdown).data;
  assert.equal(newsletter.socialCard.footerCopy, '');
  assert.equal(newsletter.socialCard.footerFont, null);
  assert.equal(newsletter.socialCard.footerFontScale, 1);
  newsletter.socialCard.footerCopy = 'Near Future Laboratory';
  newsletter.socialCard.footerFont = 'untitled-sans-light';
  newsletter.socialCard.footerFontScale = 0.8;
  assert.doesNotThrow(() => validateNewsletterDataAgainstSchema(newsletter, 'dense-discovery', { repoRoot, logger: { log() {} } }));
});
