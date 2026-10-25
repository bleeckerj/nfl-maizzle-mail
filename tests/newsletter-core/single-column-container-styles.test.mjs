// Validate item styles and render the production single-column block with Maizzle.
// Fixtures cover independent colors, per-field fallback, and schema regeneration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { render } from '@maizzle/framework';
import { JSDOM } from 'jsdom';
import { validateNewsletterDataAgainstSchema } from '../../lib/newsletter-core/schema.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const templateRoot = path.join(root, 'templates/dense-discovery');
const template = readFileSync(path.join(templateRoot, 'newsletter.html'), 'utf8');
const block = template.split('<!-- INDIE MAG SINGLE COLUMN Start -->')[1].split('<!-- INDIE MAG SINGLE COLUMN End -->')[0];
const variantStyles = (schema, type) => schema.properties.sections.items.allOf
  .find(branch => branch.if.properties.type.const === type).then.properties.items.items.properties.containerStyles;

for (const type of ['single-column', 'indie-mag-single-column']) {
  test(`${type} renders item colors and inherits missing styles per field`, async () => {
    const section = {
      type, title: 'Events', containerStyles: { backgroundColor: '#ffffff', padding: '22px' },
      items: [
        { title: 'Blue', containerStyles: { backgroundColor: '#e8f4ff', padding: '24px' } },
        { title: 'Inherited' },
        { title: 'Null', containerStyles: null },
        { title: 'Empty', containerStyles: { backgroundColor: '', padding: '' } },
        { title: 'Lavender', containerStyles: { backgroundColor: '#ede8ff' } },
      ],
    };
    validateNewsletterDataAgainstSchema({ template: 'dense-discovery', sections: [section] }, 'dense-discovery', { repoRoot: root, logger: { log() {} } });
    const { html } = await render(`<table><tbody>${block}</tbody></table>`, {
      maizzle: { locals: { section, themeColors: {} }, applyTransformers: false }, tailwind: { compiled: '' },
    });
    const document = new JSDOM(html).window.document;
    assert.equal(document.querySelector('h1').closest('td').style.background, 'rgb(255, 255, 255)');
    const cells = [...document.querySelectorAll('h2')].map(heading => heading.closest('td'));
    assert.deepEqual(cells.map(cell => cell.style.background), [
      'rgb(232, 244, 255)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgb(237, 232, 255)',
    ]);
    assert.deepEqual(cells.map(cell => cell.style.padding), ['24px', '22px', '22px', '22px', '22px']);
  });
}

test('item styles reject unsupported keys and invalid values', () => {
  for (const containerStyles of [{ background: '#ffffff' }, { backgroundColor: 12 }, { padding: [] }]) {
    assert.throws(() => validateNewsletterDataAgainstSchema({ template: 'dense-discovery', sections: [
      { type: 'single-column', items: [{ title: 'Invalid', containerStyles }] },
    ] }, 'dense-discovery', { repoRoot: root, logger: { log() {} } }));
  }
});

test('schema discovery preserves canonical single-column item styles', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'single-column-schema-'));
  try {
    const output = path.join(temporary, 'schema.json');
    execFileSync(process.execPath, ['scripts/generate-template-schema.mjs', '--entry', path.join(templateRoot, 'newsletter.html'), '--output', output, '--root', root], { cwd: root, encoding: 'utf8' });
    const discovered = JSON.parse(readFileSync(output, 'utf8'));
    const canonical = JSON.parse(readFileSync(path.join(templateRoot, 'newsletter.schema.json'), 'utf8'));
    for (const type of ['single-column', 'indie-mag-single-column']) assert.deepEqual(variantStyles(discovered, type), variantStyles(canonical, type));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
