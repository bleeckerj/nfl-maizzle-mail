// Verify inventory ads remain inside an article and use the shared build pipeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { getNewsletterSectionEntries } from '../../lib/newsletter-core/section-entries.mjs';
import { hydrateAdBlockSections, normalizeNewsletterLinkTracking, pruneBuildInjectedFields } from '../../lib/newsletter-core/index.mjs';
import { collectNewsletterImageDeclarations } from '../../lib/newsletter-core/image-validation.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'templates/near-future-lab-daily-headlines/newsletter.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const adId = 'article-sponsor';
const source = () => ({ template: 'near-future-lab-daily-headlines', title: 'Article ad regression', sections: [{
  type: 'section_article_group', section_label: 'Opinion', articles: [{ headline: 'Nutrition labels',
    lede: '<p>Before the advertisement.</p>', body_blocks: [
      { type: 'ad-block', show_top_rule: false, show_bottom_rule: false, items: [{ adId }] },
      { type: 'text', html: '<p>After the advertisement.</p>' },
    ],
  }],
}] });
const inventory = [{ id: adId, title: 'Agricultural monitoring', copy: 'Field telemetry.', link: { url: 'https://example.com/sponsor', label: 'Visit the sponsor' }, media: { src: 'https://example.com/sponsor.jpg', altText: 'A field monitoring station.' } }];

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'article-ad-regression-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const inventoryPath = path.join(directory, 'ads.json');
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory));
  return { directory, inventoryPath };
}

test('article ads use the standalone ad contract and reject missing inventory ids', () => {
  assert.equal(validate(source()), true, JSON.stringify(validate.errors));
  const invalid = source();
  invalid.sections[0].articles[0].body_blocks[0].items = [{}];
  assert.equal(validate(invalid), false);
});

test('article ads retain their position through hydration, image checks, tracking, and pruning', (t) => {
  const { inventoryPath } = fixture(t);
  const previous = process.env.NFL_EDITORIAL_ADS_PATH;
  process.env.NFL_EDITORIAL_ADS_PATH = inventoryPath;
  try {
    const data = source();
    const article = data.sections[0].articles[0];
    const ad = article.body_blocks[0];
    const entries = getNewsletterSectionEntries(data);
    assert.equal(entries[1].path, 'sections[0].articles[0].body_blocks[0]');
    assert.equal(entries[1].section, ad);
    hydrateAdBlockSections(data, repoRoot, { logger: { log() {} } });
    assert.equal(ad.title, 'Agricultural monitoring');
    assert.equal(ad.items[0].link.href, inventory[0].link.url);
    assert.equal(collectNewsletterImageDeclarations(data)[0].path, 'sections[0].articles[0].body_blocks[0].items[0].image');
    const tracking = normalizeNewsletterLinkTracking(data);
    assert.ok(tracking.records.some(entry => entry.url === inventory[0].link.url));
    ad.items[0].renderMode = 'snapshot';
    pruneBuildInjectedFields(data);
    assert.equal(ad.items[0].renderMode, undefined);
    assert.equal(data.sections.length, 1);
    assert.equal(article.lede, '<p>Before the advertisement.</p>');
    assert.equal(article.body_blocks[1].html, '<p>After the advertisement.</p>');
  } finally {
    if (previous === undefined) delete process.env.NFL_EDITORIAL_ADS_PATH;
    else process.env.NFL_EDITORIAL_ADS_PATH = previous;
  }
});

test('the renderer places the actual ad card between article paragraphs without nested anchors', async (t) => {
  const { directory, inventoryPath } = fixture(t);
  const input = path.join(directory, 'issue.json');
  fs.writeFileSync(input, JSON.stringify(source()));
  await promisify(execFile)(process.execPath, [path.join(repoRoot, 'scripts/build-newsletter.mjs'), input, 'article-ad', `--output-dir=${directory}`, '--preview', '--no-open'], { cwd: repoRoot, env: { ...process.env, NFL_EDITORIAL_ADS_PATH: inventoryPath }, maxBuffer: 2_000_000 });
  const html = fs.readFileSync(path.join(directory, 'article-ad.html'), 'utf8');
  const before = html.indexOf('Before the advertisement.');
  const ad = html.indexOf('data-ad-card="article-sponsor"');
  const after = html.indexOf('After the advertisement.');
  assert.ok(before >= 0 && ad > before && after > ad);
  const dom = new JSDOM(html);
  try {
    const card = dom.window.document.querySelector('[data-ad-card="article-sponsor"]');
    assert.equal(card.querySelector('img').getAttribute('alt'), 'A field monitoring station.');
    assert.ok(card.querySelector('a[data-link-label]'));
    assert.equal(dom.window.document.querySelectorAll('a a').length, 0);
  } finally { dom.window.close(); }
});
