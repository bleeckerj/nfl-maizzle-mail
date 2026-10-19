// Verify the authoring contract and shared build behavior for one mixed-content intro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import matter from 'gray-matter';
import { hydrateAdBlockSections, normalizeIntroStatementSections, normalizeNewsletterLinkTracking, pruneBuildInjectedFields } from '../../lib/newsletter-core/index.mjs';
import { getNewsletterSectionEntries } from '../../lib/newsletter-core/section-entries.mjs';
import { collectNewsletterImageDeclarations, validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';

const root = new URL('../../templates/near-future-lab-daily-headlines/', import.meta.url);
const schema = JSON.parse(readFileSync(new URL('newsletter.schema.json', root), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const image = { type: 'image', src: 'https://example.com/field.jpg', alt: 'A field monitoring station.', caption: 'Field trials.' };
const ad = () => ({ type: 'ad-block', show_top_rule: false, show_bottom_rule: false, items: [{ adId: 'field-sponsor', adRenderMode: 'snapshot', adSnapshotPreset: 'native' }] });
const blocks = () => [{ type: 'text', html: '<p>Before.</p>' }, { ...image }, ad(), { type: 'text', html: '<p>After.</p>' }];
const issue = (intro = {}) => ({ template: 'near-future-lab-daily-headlines', title: 'Intro body test', sections: [{ type: 'intro_statement', ...intro }] });

function withInventory(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'intro-ad-inventory-'));
  const inventory = path.join(directory, 'ads.json');
  writeFileSync(inventory, JSON.stringify([{ id: 'field-sponsor', label: 'SPONSORED', media: { src: 'https://example.com/sponsor.jpg', altText: 'Irrigation monitoring machine.' }, link: { href: 'https://example.com/farms', label: 'Farm equipment', category: 'commerce' } }]));
  const previous = process.env.NFL_EDITORIAL_ADS_PATH;
  process.env.NFL_EDITORIAL_ADS_PATH = inventory;
  try { return run(); }
  finally {
    if (previous === undefined) delete process.env.NFL_EDITORIAL_ADS_PATH;
    else process.env.NFL_EDITORIAL_ADS_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
}

test('one intro accepts ordered text, image, and the existing ad-block shape; legacy intros still validate', () => {
  assert.equal(validate(issue({ body_blocks: blocks() })), true, JSON.stringify(validate.errors));
  assert.equal(validate(issue({ statement: '<p>Legacy introduction.</p>' })), true);
  assert.equal(validate(issue({ statement: '<p>Opening.</p>', body_blocks: blocks() })), true);
});

test('intro blocks reject missing image accessibility, invalid ads, and images embedded in text', () => {
  for (const block of [
    { type: 'image', src: image.src }, { ...image, alt: '   ' }, { ...image, crop: true },
    { type: 'ad-block', items: [{}] }, { type: 'video', src: image.src },
    { type: 'text', html: '<p>Before<img src="https://example.com/a.jpg"></p>' },
  ]) assert.equal(validate(issue({ body_blocks: [block] })), false, JSON.stringify(block));
});

test('block HTML is sanitized while authored HTML remains intact and legacy text still works', () => {
  const html = '<p>Before <strong>the image</strong><script>alert(1)</script><a href="javascript:alert(1)">unsafe</a></p>';
  const data = issue({ statement: '<p>Legacy.</p>', body_blocks: [{ type: 'text', html }, image] });
  normalizeIntroStatementSections(data);
  assert.equal(data.sections[0].body_blocks[0].html, html);
  assert.match(data.sections[0].body_blocks[0].rendered_html, /<strong>the image<\/strong>/);
  assert.doesNotMatch(data.sections[0].body_blocks[0].rendered_html, /script|javascript:|alert\(/);
  assert.equal(data.sections[0].statement_rendered_html, '<p>Legacy.</p>');
});

test('inline ads hydrate from the inventory through the standard ad path without copying or flattening', () => withInventory(() => {
  const data = issue({ body_blocks: blocks() });
  const inline = data.sections[0].body_blocks[2];
  const entries = getNewsletterSectionEntries(data);
  assert.equal(entries[1].section, inline);
  assert.equal(entries[1].path, 'sections[0].body_blocks[2]');
  hydrateAdBlockSections(data, '/unused-repo', { logger: { log() {} } });
  assert.equal(data.sections.length, 1);
  assert.equal(inline.items[0].image, 'https://example.com/sponsor.jpg');
  assert.equal(inline.items[0].imageAlt, 'Irrigation monitoring machine.');
  assert.equal(inline.items[0].adRenderMode, 'snapshot');
  assert.equal(inline.items[0].link.href, 'https://example.com/farms');
}));

test('intro photographs and hydrated ad images both participate in image validation', async () => {
  const data = issue({ body_blocks: blocks() });
  data.sections[0].body_blocks[2].items[0].image = 'https://example.com/sponsor.jpg';
  const declarations = collectNewsletterImageDeclarations(data);
  assert.deepEqual(declarations.map(d => d.path), ['sections[0].body_blocks[1]', 'sections[0].body_blocks[2].items[0].image']);
  const result = await validateNewsletterImages(data, { logger: { log() {} }, checkImageUrl: async () => ({ valid: false, status: 404 }) });
  assert.equal(result.errors.length, 2);
});

test('authored link metadata in block HTML is retained for rendered link enrichment', () => {
  const data = issue({ body_blocks: [{ type: 'text', html: '<p><a href="https://example.com/summit" data-link-label="Summit report" data-link-category="civic-futures">Read the report</a></p>' }] });
  normalizeIntroStatementSections(data);
  const result = normalizeNewsletterLinkTracking(data);
  const record = result.records.find(r => r.url === 'https://example.com/summit');
  assert.ok(record);
  assert.equal(record.label, 'Summit report');
  assert.equal(record.category, 'civic-futures');
  assert.equal(record.defaultedCategory, false);
});

test('source cleanup removes rendered fields from body text and nested ad items', () => {
  const data = issue({ body_blocks: blocks() });
  data.sections[0].body_blocks[0].rendered_html = '<p>Old output.</p>';
  data.sections[0].body_blocks[2].items[0].renderMode = 'snapshot';
  pruneBuildInjectedFields(data);
  assert.equal(data.sections[0].body_blocks[0].rendered_html, undefined);
  assert.equal(data.sections[0].body_blocks[0].html, '<p>Before.</p>');
  assert.equal(data.sections[0].body_blocks[2].items[0].renderMode, undefined);
  assert.equal(data.sections[0].body_blocks[2].items[0].adRenderMode, 'snapshot');
});

test('schema examples and authoring samples demonstrate all block types in one intro', () => {
  for (const sample of [JSON.parse(readFileSync(new URL('sample-data.json', root), 'utf8')), matter(readFileSync(new URL('public-issue-starter.md', root), 'utf8')).data]) {
    const intro = sample.sections.find(s => s.type === 'intro_statement');
    assert.deepEqual(intro.body_blocks.map(b => b.type), ['text', 'image', 'ad-block', 'text']);
    assert.equal(validate(issue(intro)), true, JSON.stringify(validate.errors));
    assert.ok(intro.image_src);
  }
});
