// Verify the article authoring contract and image checks independently of rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import matter from 'gray-matter';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectNewsletterImageDeclarations, validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';

const schema = JSON.parse(readFileSync(new URL('../../templates/near-future-lab-daily-headlines/newsletter.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const image = { type: 'image', src: 'https://example.com/field.jpg', alt: 'A combine harvester in a field.' };
const issue = (article) => ({ template: 'near-future-lab-daily-headlines', title: 'Article body test', sections: [{ type: 'section_article_group', articles: [{ headline: 'Farm equipment', ...article }] }] });

test('articles accept ordered text/image blocks and retain legacy ledes', () => {
  assert.equal(validate(issue({ lede: '<p>Opening.</p>', body_blocks: [{ type: 'text', html: '<p>Equipment.</p>' }, image, { type: 'text', html: '<p>The farm.</p>' }] })), true, JSON.stringify(validate.errors));
  assert.equal(validate(issue({ lede: '<p>Existing article.</p>' })), true);
});

test('article images require alt text and reject undeclared block fields', () => {
  assert.equal(validate(issue({ body_blocks: [{ type: 'image', src: image.src }] })), false);
  assert.equal(validate(issue({ body_blocks: [{ ...image, crop: true }] })), false);
  assert.equal(validate(issue({ body_blocks: [{ type: 'unknown', html: 'Text' }] })), false);
});

test('text blocks cannot bypass image fields with embedded image markup', () => {
  assert.equal(validate(issue({ body_blocks: [{ type: 'text', html: '<p>Text<img src="https://example.com/a.jpg"></p>' }] })), false);
});

test('article body images are validated even without a legacy section items array', async () => {
  const data = issue({ body_blocks: [{ type: 'text', html: '<p>Before.</p>' }, image] });
  const declarations = collectNewsletterImageDeclarations(data);
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].path, 'sections[0].articles[0].body_blocks[1]');
  const checked = [];
  const result = await validateNewsletterImages(data, { logger: { log() {} }, checkImageUrl: async (url) => { checked.push(url); return { valid: false, status: 404 }; } });
  assert.deepEqual(checked, [image.src]);
  assert.equal(result.errors.length, 1);
});

// Keep schema-derived examples and checked-in authoring samples in agreement.
test('schema, sample JSON, public starter, and generated starter show text/image/text blocks', () => {
  const findBody = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.properties?.body_blocks) return node.properties.body_blocks;
    for (const value of Object.values(node)) {
      const found = findBody(value);
      if (found) return found;
    }
    return null;
  };
  const example = findBody(schema).examples[0];
  const assertSequence = (article) => {
    assert.deepEqual(article.body_blocks.map((block) => block.type), ['text', 'image', 'text']);
    assert.equal(validate(issue(article)), true, JSON.stringify(validate.errors));
  };
  assertSequence({ body_blocks: example });
  const templateRoot = new URL('../../templates/near-future-lab-daily-headlines/', import.meta.url);
  const jsonSample = JSON.parse(readFileSync(new URL('sample-data.json', templateRoot), 'utf8'));
  const markdownSample = matter(readFileSync(new URL('public-issue-starter.md', templateRoot), 'utf8')).data;
  const generated = execFileSync(process.execPath, [
    fileURLToPath(new URL('../../scripts/generate-skeleton-from-schema.mjs', import.meta.url)),
    '--schema', fileURLToPath(new URL('newsletter.schema.json', templateRoot)),
    '--template-name', 'near-future-lab-daily-headlines', '--all-section-fields', '--items-per-section', '1',
  ], { encoding: 'utf8' });
  for (const sample of [jsonSample, markdownSample, matter(generated).data]) {
    const article = sample.sections.flatMap((section) => section.articles || []).find((entry) => entry.body_blocks?.length);
    assert.ok(article, 'Authoring sample must demonstrate body blocks');
    assert.ok(article.image_src, 'Authoring sample must retain a cover image');
    assertSequence(article);
  }
});
