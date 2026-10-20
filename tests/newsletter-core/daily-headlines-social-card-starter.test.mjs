// Check Daily Headlines against the shared card controls through both authoring paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import { projectAuthoringSchema } from '../../lib/newsletter-core/authoring-contract.mjs';
import { generateSkeleton, validateStarter } from '../../scripts/generate-skeleton-from-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = name => JSON.parse(readFileSync(path.join(root, 'templates', name, 'newsletter.schema.json'), 'utf8'));
const schema = load('near-future-lab-daily-headlines');
const reference = projectAuthoringSchema(load('dense-discovery')).properties.socialCard;

function checkControls(value, fields, location = 'socialCard', schemaMode = false) {
  if (schemaMode) value = value?.properties;
  assert.ok(value && typeof value === 'object', location);
  for (const [key, field] of Object.entries(fields.properties)) {
    assert.ok(Object.hasOwn(value, key), `${location}.${key} is missing`);
    if (field.properties) checkControls(value[key], field, `${location}.${key}`, schemaMode);
  }
}

test('Daily Headlines schema declares every editable shared social-card control', () => {
  checkControls(schema.properties.socialCard, reference, 'socialCard', true);
});

test('CLI and contract bridge both generate a complete, schema-valid Daily Headlines card', () => {
  const markdown = execFileSync(process.execPath, ['scripts/generate-skeleton-from-schema.mjs', '--template', 'near-future-lab-daily-headlines'], { cwd: root, encoding: 'utf8' });
  const direct = validateStarter(markdown, schema);
  const contract = JSON.parse(execFileSync(process.execPath, ['scripts/newsletter-contract.mjs', '--template', 'near-future-lab-daily-headlines'], { cwd: root, encoding: 'utf8' }));
  for (const payload of [direct, contract.examples]) {
    checkControls(payload.socialCard, reference);
    assert.equal(payload.socialCard.titleFont, 'nfl-title-untitled');
    assert.equal(payload.socialCard.subtitleFont, 'nfl-subtitle');
    assert.equal(payload.socialCard.kickerFont, 'nfl-kicker');
    assert.equal(payload.socialCard.backgroundImage, null);
    assert.equal(Object.hasOwn(payload.socialCard, 'footerCopy'), false);
  }
  const authored = matter(markdown).data;
  authored.socialCard.titleFontScale = '20%';
  authored.socialCard.kickerFontScale = '60%';
  authored.socialCard.logoPosition.side = 'top-left';
  assert.doesNotThrow(() => validateStarter(matter.stringify('', authored), schema));
});

test('generator refuses missing card schemas and missing shared nested controls', () => {
  const absent = structuredClone(schema);
  delete absent.properties.socialCard;
  assert.throws(() => generateSkeleton(absent, { templateName: 'near-future-lab-daily-headlines' }), /socialCard contract/);
  const partial = structuredClone(schema);
  delete partial.properties.socialCard.properties.animation.properties.formats;
  assert.throws(() => generateSkeleton(partial, { templateName: 'near-future-lab-daily-headlines' }), /socialCard.animation.formats/);
});

test('the documented complete issue includes every editable social-card control', () => {
  const guide = readFileSync(path.join(root, 'templates/near-future-lab-daily-headlines/AUTHORING.md'), 'utf8');
  const section = guide.split('## Small complete issue')[1].split('## Intro with')[0];
  const example = section.match(/```yaml\n([\s\S]*?)```/)[1];
  const payload = matter(example).data;
  checkControls(payload.socialCard, projectAuthoringSchema(schema).properties.socialCard);
});

test('starter validation rejects null and partial card defaults even when ordinary schema validation allows them', () => {
  for (const value of [null, { backgroundImage: 'https://images.example.org/full.webp' }]) {
    const candidate = structuredClone(schema);
    candidate.properties.socialCard.default = value;
    const markdown = generateSkeleton(projectAuthoringSchema(candidate), { templateName: 'near-future-lab-daily-headlines', allSectionFields: true, itemsPerSection: 1 });
    assert.throws(() => validateStarter(markdown, candidate), /socialCard/);
  }
});
