// Validate the email schema against animation settings accepted by the shared social-card exporter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../../templates/dense-discovery/newsletter.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

for (const duration of [2400, 'source']) {
  test(`accepts exporter duration ${duration} and explicit output formats`, () => {
    assert.equal(validate({ template: 'dense-discovery', socialCard: { animation: {
      mode: 'animejs', animeModule: 'deterministic-orbit', duration, formats: ['webp', 'mp4'],
    } } }), true, JSON.stringify(validate.errors));
  });
}

test('rejects unsupported duration values and animation formats', () => {
  for (const duration of [0, -1, 'automatic']) {
    assert.equal(validate({ socialCard: { animation: { duration } } }), false);
  }
  assert.equal(validate({ socialCard: { animation: { formats: ['png'] } } }), false);
});

test('introductory copy uses intro.content and is rejected in header.content', () => {
  assert.equal(validate({ header: { content: '<p>Two films.</p>' } }), false);
  assert.equal(validate({ intro: { content: '<p>Two films.</p>' } }), true, JSON.stringify(validate.errors));
});
