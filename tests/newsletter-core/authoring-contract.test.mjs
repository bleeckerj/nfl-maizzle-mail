import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolveTemplateContract, projectAuthoringSchema } from '../../lib/newsletter-core/authoring-contract.mjs';
import { resolveSchemaRef, extractSectionVariants } from '../../lib/newsletter-core/schema-resolution.mjs';
import { validateNewsletterDataAgainstSchema } from '../../lib/newsletter-core/schema.mjs';
import { generatePlaceholderValue } from '../../scripts/generate-skeleton-from-schema.mjs';

test('references preserve site defaults and authoring roles', () => {
  const schema = { definitions: { size: { type: 'number', minimum: 0, default: 10 } } };
  assert.deepEqual(resolveSchemaRef(schema, { $ref: '#/definitions/size', default: 0, readOnly: true }), { type: 'number', minimum: 0, default: 0, readOnly: true });
  assert.throws(() => resolveSchemaRef(schema, { $ref: '#/missing/value' }), /Unresolved/);
  assert.deepEqual(projectAuthoringSchema({ properties: { hidden: { $ref: '#/definitions/size', readOnly: true }, visible: { $ref: '#/definitions/size', default: 7.5 } } }, schema).properties, { visible: { type: 'number', minimum: 0, default: 7.5 } });
});

test('section discovery preserves common fields and conditional requirements', () => {
  const schema = { properties: { sections: { items: { allOf: [
    { properties: { renderFor: { enum: ['all', 'public'] } } },
    { oneOf: [{ properties: { type: { const: 'cta' }, statement: { type: 'string' } }, required: ['statement'] }] },
  ] } } } };
  const [section] = extractSectionVariants(schema);
  assert.equal(section.type, 'cta');
  assert.deepEqual(section.schema.properties.renderFor.enum, ['all', 'public']);
  assert.ok(section.schema.required.includes('statement'));
});

test('missing starter examples and unknown section requests fail explicitly', () => {
  assert.throws(() => generatePlaceholderValue('space_top', { type: 'string' }), /No explicit starter example/);
  const result = spawnSync(process.execPath, ['scripts/generate-skeleton-from-schema.mjs', '--template', 'dense-discovery', '--sections', 'typo_cta'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported section.*typo_cta/);
});

test('invalid authored CTA lengths fail without an opt-in strict flag', () => {
  for (const value of ['medium', '32rem', '-1px', -1, '32pxpx']) {
    assert.throws(() => validateNewsletterDataAgainstSchema({ template: 'dense-discovery', title: 'Fixture', sections: [{ type: 'inline_cta', space_top: value }] }, 'dense-discovery', { repoRoot: process.cwd(), sourcePath: 'fixture.md', strict: false, logger: { log() {} } }), error => /fixture.md/.test(error.message) && /inline_cta/.test(error.message) && /space_top/.test(error.message) && /supplied/.test(error.message));
  }
  for (const value of [0, 7.5, '13.25px', '47', '.5px']) {
    validateNewsletterDataAgainstSchema({ template: 'dense-discovery', title: 'Fixture', sections: [{ type: 'inline_cta', space_top: value }] }, 'dense-discovery', { repoRoot: process.cwd(), logger: { log() {} } });
  }
});

test('every maintained contract omits runtime controls and has typed author properties', () => {
  for (const name of fs.readdirSync('templates')) {
    const file = `templates/${name}/newsletter.schema.json`;
    if (!fs.existsSync(file)) continue;
    const schema = JSON.parse(fs.readFileSync(file));
    const contract = resolveTemplateContract(schema);
    function inspect(fragment, location) {
      if (!fragment || typeof fragment !== 'object') return;
      for (const [key, value] of Object.entries(fragment.properties || {})) {
        assert.ok(value.type || value.$ref || value.const !== undefined || value.enum || value.anyOf || value.oneOf || value.allOf, `${name}:${location}.${key} has no type contract`);
        assert.ok(!value.readOnly && !value.deprecated, `${name}:${location}.${key} leaks an internal field`);
        inspect(value, `${location}.${key}`);
      }
      inspect(fragment.items, `${location}[]`);
      for (const branch of [...fragment.allOf || [], ...fragment.oneOf || [], ...fragment.anyOf || []]) inspect(branch, location);
      inspect(fragment.then, location);
    }
    inspect(contract.authoringSchema, '$');
  }
});

test('schema discovery cannot overwrite a maintained schema', () => {
  const file = 'templates/dense-discovery/newsletter.schema.json';
  const before = fs.readFileSync(file);
  const result = spawnSync(process.execPath, ['scripts/generate-template-schema.mjs', '--entry', 'templates/dense-discovery/newsletter.html', '--output', file], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot overwrite/);
  assert.deepEqual(fs.readFileSync(file), before);
});

test('the JSON bridge exposes the same CTA fields and examples as the maintained schema', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/newsletter-contract.mjs', '--template', 'dense-discovery'], { encoding: 'utf8' }));
  const section = result.sections.find(entry => entry.type === 'inline_cta');
  const example = result.examples.sections.find(entry => entry.type === 'inline_cta');
  assert.equal(result.schemaHash.length, 64);
  assert.ok(section.authoringSchema.properties.space_top.pattern);
  assert.ok(!section.authoringSchema.properties.items);
  assert.ok(!Object.hasOwn(example, 'headingStylesInline'));
  assert.equal(example.space_top, section.authoringSchema.properties.space_top.default);
});
