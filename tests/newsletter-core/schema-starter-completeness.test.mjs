import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'templates', 'dense-discovery', 'newsletter.schema.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'scripts', 'generate-skeleton-from-schema.mjs');
const CANONICAL_HEADER_LOGOS = {
  logoTop: 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/80a173f3-1366-4052-5889-5dbcf8f25200/w=200?format=webp',
  logoLink: 'https://nearfuturelaboratory.com',
  logoBottom: 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/5240f451-4c17-47c9-6c5a-50e50d22c500/w=200?format=webp',
};

function generateStarter() {
  // Public starters intentionally omit optional sections. This completeness
  // check requests every declared section instead of relying on those defaults.
  const sectionTypes = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')).properties.sections.items.properties.type.enum;
  return execFileSync(
    process.execPath,
    [GENERATOR_PATH, '--schema', SCHEMA_PATH, '--all-section-fields', '--items-per-section', '1', '--sections', ...sectionTypes],
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
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(payload), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(Object.prototype.hasOwnProperty.call(payload, '$schema'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(schema.properties, '$schema'), false);

  for (const propertyName of Object.keys(schema.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload, propertyName),
      `starter is missing schema property ${propertyName}`,
    );
  }

  assert.equal(payload.socialCard.titleFont, 'nfl-title-untitled');
  assert.equal(payload.socialCard.subtitleFont, 'nfl-subtitle');
  assert.equal(payload.socialCard.kickerFont, 'nfl-kicker');
  assert.equal(payload.socialCard.titleFontScale, 0.7);
  assert.equal(payload.socialCard.subtitleFontScale, 0.9);
  assert.equal(payload.socialCard.kickerFontScale, 1);

  const socialCardSchema = schema.properties.socialCard;
  for (const propertyName of Object.keys(socialCardSchema.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload.socialCard, propertyName),
      `starter is missing socialCard.${propertyName}`,
    );
  }

  assert.deepEqual(
    {
      logoTop: payload.header.logoTop,
      logoLink: payload.header.logoLink,
      logoBottom: payload.header.logoBottom,
    },
    CANONICAL_HEADER_LOGOS,
  );
  for (const propertyName of Object.keys(socialCardSchema.properties.animation.properties)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload.socialCard.animation, propertyName),
      `starter is missing socialCard.animation.${propertyName}`,
    );
  }

  const singleColumn = payload.sections.find(({ type }) => type === 'single-column');
  assert.ok(singleColumn?.items?.[0]?.image?.src?.startsWith('https://fpoimg.com/'));

  assert.equal(payload.intro.imageAlt, 'Image description for accessibility');
  assert.equal(payload.intro.images[0].alt, 'Image description for accessibility');

  const foodForThought = payload.sections.find(({ type }) => type === 'food-for-thought');
  assert.equal(foodForThought.items.length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(foodForThought.items[0], 'description'));

  const classifieds = payload.sections.find(({ type }) => type === 'classifieds');
  assert.ok(Object.prototype.hasOwnProperty.call(classifieds, 'containerStyles'));
});

test('schema starters omit generated HTML from editable job-list objects', () => {
  // Exercise the canonical nested list contract with an actual list entry.
  // The full template starter currently emits an empty optional lists array.
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const jobRule = schema.properties.sections.items.allOf.find(
    rule => rule.if?.properties?.type?.const === 'adjacency-job-posting',
  );
  const fixture = {
    type: 'object',
    properties: {
      template: { const: 'dense-discovery' },
      jobLists: jobRule.then.properties.lists,
    },
    required: ['template', 'jobLists'],
  };
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'jobs-list-starter-'));
  try {
    const fixturePath = path.join(temporaryRoot, 'schema.json');
    writeFileSync(fixturePath, JSON.stringify(fixture));
    const markdown = execFileSync(process.execPath, [
      GENERATOR_PATH, '--schema', fixturePath, '--template-name', 'dense-discovery',
      '--all-section-fields', '--items-per-section', '1',
    ], { cwd: REPO_ROOT, encoding: 'utf8' });
    const payload = parseFrontmatter(markdown);
    const validate = new Ajv({ strict: false }).compile(fixture);
    assert.equal(validate(payload), true, JSON.stringify(validate.errors));
    assert.ok(Array.isArray(payload.jobLists[0].items));
    assert.equal(Object.hasOwn(payload.jobLists[0], 'itemsHtml'), false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('dense-discovery item image fields are mutually exclusive', () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const itemSectionTypes = [
    'books-accessories',
    'classifieds',
    'feature',
    'food-for-thought',
    'indie-mag-single-column',
    'single-column',
    'sponsor',
  ];

  for (const sectionType of itemSectionTypes) {
    const sectionRule = schema.properties.sections.items.allOf.find(
      (rule) => rule.if?.properties?.type?.const === sectionType,
    );
    const itemSchema = sectionRule?.then?.properties?.items?.items;
    assert.deepEqual(
      itemSchema?.not?.required,
      ['image', 'images'],
      `${sectionType} should reject items containing both image and images`,
    );
  }

  const classifiedsRule = schema.properties.sections.items.allOf.find(
    (rule) => rule.if?.properties?.type?.const === 'classifieds',
  );
  assert.equal(
    classifiedsRule.then.properties.items.items.properties.images.type,
    'array',
  );

  const payload = parseFrontmatter(generateStarter());
  for (const sectionType of itemSectionTypes.filter((type) => type !== 'sponsor')) {
    const item = payload.sections.find(({ type }) => type === sectionType)?.items?.[0];
    assert.ok(item, `${sectionType} starter should include an item`);
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'image'), true);
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'images'), false);
  }
});
