import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import posthtml from 'posthtml';
import expressions from 'posthtml-expressions';
import { JSDOM } from 'jsdom';
import { hydrateAdBlockSections } from '../../lib/newsletter-core/hydrate-ad-blocks.mjs';
import { validateNewsletterDataAgainstSchema } from '../../lib/newsletter-core/schema.mjs';

// Exercise the source schema, registry hydration, and actual ad component together.
// Temporary JSON fixtures isolate inventory changes; no media is downloaded or sent.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE_ROOT = path.join(REPO_ROOT, 'templates', 'dense-discovery');
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'ad-block-title-'));
const fixtureRepo = path.join(tempRoot, 'nfl-maizzle-mail');
const inventoryDir = path.join(tempRoot, 'nfl-editorial', 'src', 'content');
mkdirSync(inventoryDir, { recursive: true });
const ad = {
  id: 'ad-heading-fixture', label: 'Advertisement', title: 'Inventory headline',
  copy: 'Inventory copy.', sponsor: 'Sponsor',
  media: { src: 'https://imagedelivery.net/example/fixture/full', altText: 'Complete ad image' },
};
writeFileSync(path.join(inventoryDir, 'ads.json'), JSON.stringify([ad]));
after(() => rmSync(tempRoot, { recursive: true, force: true }));

function hydrateAndRender(item = {}) {
  const data = { template: 'dense-discovery', sections: [{
    type: 'ad-block', title: "Today's Sponsor", items: [{ adId: ad.id, ...item }],
  }] };
  validateNewsletterDataAgainstSchema(data, 'dense-discovery', { repoRoot: REPO_ROOT, logger: { log() {} } });
  hydrateAdBlockSections(data, fixtureRepo, { logger: { log() {} } });
  const section = { ...data.sections[0], containerStyles: {}, contentStyles: {}, descriptionStyles: {} };
  const template = readFileSync(path.join(TEMPLATE_ROOT, 'components', 'AdBlock.html'), 'utf8')
    .replace(/<script props>[\s\S]*?<\/script>/, '');
  const html = posthtml([expressions({ locals: { section }, strictMode: false })])
    .process(`<table><tbody>${template}</tbody></table>`, { sync: true }).html;
  return { section, document: new JSDOM(html).window.document };
}

test('authored ad title replaces the label above the image and preserves inventory content', () => {
  const { section, document } = hydrateAndRender({ title: 'Hello', label: 'Other label' });
  const heading = document.querySelector('div.mob-meta');
  const image = document.querySelector('img');
  assert.equal(heading?.textContent, 'Hello');
  assert.ok(heading.compareDocumentPosition(image) & 4);
  assert.equal(document.querySelector('h1')?.textContent.trim(), "Today's Sponsor");
  assert.equal(image.getAttribute('src'), ad.media.src);
  assert.equal(section.items[0].title, ad.title);
  assert.equal(section.items[0].sponsor, ad.sponsor);
  assert.match(document.body.textContent, /Inventory headline/);
  assert.match(document.body.textContent, /Inventory copy/);
  assert.doesNotMatch(document.body.textContent, /Advertisement/);
});

test('missing or null ad titles retain authored labels and registry defaults', () => {
  for (const [item, expected] of [[{}, 'Advertisement'], [{ title: null }, 'Advertisement'],
    [{ label: 'Placement label' }, 'Placement label'], [{ title: null, label: 'Placement label' }, 'Placement label']]) {
    assert.equal(hydrateAndRender(item).document.querySelector('div.mob-meta')?.textContent, expected);
  }
});

test('blank ad titles omit the heading above the image', () => {
  for (const title of ['', '   ']) {
    const { document } = hydrateAndRender({ title });
    assert.equal(document.querySelector('div.mob-meta'), null);
    assert.ok(document.querySelector('img'));
  }
});

test('ad titles render as escaped plain text', () => {
  const title = '<strong>Hello & partners</strong>';
  const { document } = hydrateAndRender({ title });
  const heading = document.querySelector('div.mob-meta');
  assert.equal(heading?.textContent, title);
  assert.equal(heading.querySelector('strong'), null);
});

test('schema discovery retains the canonical ad title authoring contract', () => {
  const output = path.join(tempRoot, 'newsletter.schema.discovered.json');
  execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'generate-template-schema.mjs'),
    '--entry', path.join(TEMPLATE_ROOT, 'newsletter.html'), '--output', output, '--root', REPO_ROOT],
  { cwd: REPO_ROOT, encoding: 'utf8' });
  const field = (schema) => schema.properties.sections.items.allOf
    .find(branch => branch.if.properties.type.const === 'ad-block').then.properties.items.items.properties.title;
  assert.deepEqual(field(JSON.parse(readFileSync(output, 'utf8'))),
    field(JSON.parse(readFileSync(path.join(TEMPLATE_ROOT, 'newsletter.schema.json'), 'utf8'))));
});
