import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'templates', 'dense-discovery', 'newsletter.schema.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'scripts', 'generate-skeleton-from-schema.mjs');

function generateStarter() {
  return execFileSync(
    process.execPath,
    [GENERATOR_PATH, '--schema', SCHEMA_PATH, '--all-section-fields', '--items-per-section', '1'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(match, 'starter should contain YAML frontmatter');
  return yaml.load(match[1]);
}

test('dense-discovery starters materialize the complete current schema', () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const payload = parseFrontmatter(generateStarter());
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(payload), true, JSON.stringify(validate.errors, null, 2));

  for (const propertyName of Object.keys(schema.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload, propertyName),
      `starter is missing schema property ${propertyName}`,
    );
  }

  const socialCardSchema = schema.properties.socialCard;
  for (const propertyName of Object.keys(socialCardSchema.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload.socialCard, propertyName),
      `starter is missing socialCard.${propertyName}`,
    );
  }
  for (const propertyName of Object.keys(socialCardSchema.properties.animation.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload.socialCard.animation, propertyName),
      `starter is missing socialCard.animation.${propertyName}`,
    );
  }

  const singleColumn = payload.sections.find(({ type }) => type === 'single-column');
  assert.ok(singleColumn?.items?.[0]?.image?.src?.startsWith('https://fpoimg.com/'));

  const foodForThought = payload.sections.find(({ type }) => type === 'food-for-thought');
  assert.equal(foodForThought.items.length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(foodForThought.items[0], 'description'));

  const classifieds = payload.sections.find(({ type }) => type === 'classifieds');
  assert.ok(Object.prototype.hasOwnProperty.call(classifieds, 'containerStyles'));
});
