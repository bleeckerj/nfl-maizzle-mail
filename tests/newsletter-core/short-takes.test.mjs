import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  hydrateShortTakeSections,
  normalizeNewsletterLinkTracking,
  validateNewsletterDataAgainstSchema,
} from '../../lib/newsletter-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PHOTARIUM_URL = 'https://imagedelivery.net/example/short-take/public';

function withInventory(inventory, fn, { raw = false } = {}) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'short-takes-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const inventoryPath = path.join(tempRoot, 'nfl-editorial', 'src', 'content', 'shortTakes.json');
  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(path.dirname(inventoryPath), { recursive: true });
  writeFileSync(inventoryPath, raw ? inventory : JSON.stringify(inventory), 'utf8');
  try {
    return fn({ repoRoot, inventoryPath });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function record(overrides = {}) {
  return {
    id: 'short-take-one',
    headline: 'A Short Take',
    image: {
      url: PHOTARIUM_URL,
      altText: 'An uncropped Short Take image',
    },
    caption: 'Registered caption',
    ...overrides,
  };
}

function section(shortTakeId = 'short-take-one') {
  return { type: 'short-take', items: [{ shortTakeId }] };
}

test('hydrateShortTakeSections leaves newsletters without Short Takes untouched without loading inventory', () => {
  const newsletter = { sections: [{ type: 'feature', items: [] }] };
  hydrateShortTakeSections(newsletter, '/definitely/missing/repo', { logger: { log() {} } });
  assert.deepEqual(newsletter, { sections: [{ type: 'feature', items: [] }] });
});

test('hydrateShortTakeSections resolves minimal and full records in source order', () => {
  withInventory([
    record(),
    record({
      id: 'short-take-two',
      headline: 'A Linked Short Take',
      caption: 'Caption with <a href="https://example.com/inside">inline link</a>.',
      url: '/editorial/linked-short-take',
      maxWidth: { base: '95%', md: '42rem' },
      topLeft: 'EXCLUSIVE',
      topRight: 'SHORT TAKES',
      bottomLeft: 'READ MORE',
      bottomRight: 'NFL',
    }),
  ], ({ repoRoot }) => {
    const newsletter = {
      sections: [section(), { type: 'feature', items: [] }, section('short-take-two'), section()],
    };
    hydrateShortTakeSections(newsletter, repoRoot, { logger: { log() {} } });

    assert.equal(newsletter.sections[0].items[0].link, undefined);
    assert.equal(newsletter.sections[0].items[0].image, PHOTARIUM_URL);
    assert.equal(newsletter.sections[2].items[0].link.href, 'https://nearfuturelaboratory.com/editorial/linked-short-take');
    assert.equal(newsletter.sections[2].items[0].link.label, 'short-take-two');
    assert.equal(newsletter.sections[2].items[0].link.category, 'short-take');
    assert.deepEqual(newsletter.sections[2].items[0].maxWidth, { base: '95%', md: '42rem' });
    assert.match(newsletter.sections[2].items[0].caption, /<span>inline link<\/span>/);
    assert.doesNotMatch(newsletter.sections[2].items[0].caption, /<a\b/i);
    assert.equal(newsletter.sections[3].items[0].shortTakeId, 'short-take-one');

    const tracking = normalizeNewsletterLinkTracking(newsletter);
    const trackedLink = tracking.manifest.get('https://nearfuturelaboratory.com/editorial/linked-short-take');
    assert.equal(trackedLink.url, 'https://nearfuturelaboratory.com/editorial/linked-short-take');
    assert.equal(trackedLink.label, 'short-take-two');
    assert.equal(trackedLink.category, 'short-take');
    assert.equal(trackedLink.pathLabel, 'sections[2].items[0].link');
  });
});

test('hydrateShortTakeSections preserves scalar maxWidth and HTTPS destinations', () => {
  withInventory([record({ url: 'https://example.com/short-take', maxWidth: '90%' })], ({ repoRoot }) => {
    const newsletter = { sections: [section()] };
    hydrateShortTakeSections(newsletter, repoRoot, { logger: { log() {} } });
    assert.equal(newsletter.sections[0].items[0].maxWidth, '90%');
    assert.equal(newsletter.sections[0].items[0].link.href, 'https://example.com/short-take');
  });
});

test('hydrateShortTakeSections preserves caption paragraph breaks', () => {
  withInventory([record({ caption: '<p>First paragraph.</p><p>Second paragraph with <strong>inline emphasis</strong>.</p>' })], ({ repoRoot }) => {
    const newsletter = { sections: [section()] };

    hydrateShortTakeSections(newsletter, repoRoot, { logger: { log() {} } });

    assert.equal(
      newsletter.sections[0].items[0].caption,
      '<p>First paragraph.</p><p>Second paragraph with <strong>inline emphasis</strong>.</p>',
    );
  });
});

test('hydrateShortTakeSections threads tracked-link destination metadata with defaults', () => {
  withInventory([
    record({
      url: {
        href: 'https://example.com/sponsored-take',
        category: 'sponsored',
        interests: ['robotics', 'logistics'],
        intent: 'consideration',
      },
    }),
    record({ id: 'short-take-two', url: { href: '/editorial/defaulted' } }),
  ], ({ repoRoot }) => {
    const newsletter = { sections: [section(), section('short-take-two')] };
    hydrateShortTakeSections(newsletter, repoRoot, { logger: { log() {} } });

    const explicit = newsletter.sections[0].items[0].link;
    assert.equal(explicit.href, 'https://example.com/sponsored-take');
    assert.equal(explicit.label, 'short-take-one'); // label defaults to the id
    assert.equal(explicit.category, 'sponsored'); // explicit override wins
    assert.deepEqual(explicit.interests, ['robotics', 'logistics']);
    assert.equal(explicit.intent, 'consideration');

    const defaulted = newsletter.sections[1].items[0].link;
    assert.equal(defaulted.href, 'https://nearfuturelaboratory.com/editorial/defaulted');
    assert.equal(defaulted.label, 'short-take-two');
    assert.equal(defaulted.category, 'short-take'); // default category
    assert.equal(defaulted.interests, undefined);
    assert.equal(defaulted.intent, undefined);

    const tracking = normalizeNewsletterLinkTracking(newsletter);
    const tracked = tracking.manifest.get('https://example.com/sponsored-take');
    assert.equal(tracked.category, 'sponsored');
    assert.deepEqual(tracked.interests, ['robotics', 'logistics']);
    assert.equal(tracked.intent, 'consideration');
  });
});

test('hydrateShortTakeSections reports malformed source sections with section indexes', () => {
  withInventory([record()], ({ repoRoot }) => {
    for (const [source, message] of [
      [{ type: 'short-take' }, /Section 1 .* exactly one item/],
      [{ type: 'short-take', items: [] }, /Section 1 .* exactly one item/],
      [{ type: 'short-take', items: [{ shortTakeId: 'short-take-one' }, { shortTakeId: 'short-take-one' }] }, /Section 1 .* exactly one item/],
      [{ type: 'short-take', items: [{}] }, /Section 1 .* missing required/],
      [{ type: 'short-take', items: [{ shortTakeId: '   ' }] }, /Section 1 .* missing required/],
      [{ type: 'short-take', items: [{ shortTakeId: 'short-take-one', headline: 'override' }] }, /unsupported field: headline/],
      [{ type: 'short-take', title: 'override', items: [{ shortTakeId: 'short-take-one' }] }, /unsupported field: title/],
    ]) {
      assert.throws(() => hydrateShortTakeSections({ sections: [source] }, repoRoot, { logger: { log() {} } }), message);
    }
  });
});

test('hydrateShortTakeSections reports unknown ids and invalid inventories', () => {
  withInventory([record()], ({ repoRoot, inventoryPath }) => {
    assert.throws(
      () => hydrateShortTakeSections({ sections: [section('missing')] }, repoRoot, { logger: { log() {} } }),
      new RegExp(`Section 1 .* unknown shortTakeId.*${path.basename(inventoryPath)}`),
    );
  });

  const invalidCases = [
    { inventory: '{bad json', raw: true, message: /Failed to parse Short Take inventory/ },
    { inventory: {}, message: /must be a JSON array/ },
    { inventory: [record(), record()], message: /Duplicate Short Take ids/ },
    { inventory: [record({ extra: true })], message: /unsupported field: extra/ },
    { inventory: [record({ image: { url: 'https://example.com/image.jpg', altText: 'Wrong host' } })], message: /Photarium Cloudflare Image Delivery URL/ },
    { inventory: [record({ url: 'http://example.com/insecure' })], message: /HTTPS URL or a site-relative path/ },
    { inventory: [record({ url: { href: 'https://example.com/take', tag: 'nope' } })], message: /url contains unsupported field: tag/ },
    { inventory: [record({ url: { href: 'http://example.com/insecure' } })], message: /url\.href must be an HTTPS URL/ },
    { inventory: [record({ url: { href: 'https://example.com/take', category: '  ' } })], message: /url\.category must be a non-empty string/ },
    { inventory: [record({ url: { href: 'https://example.com/take', interests: [] } })], message: /url\.interests must be a non-empty array/ },
    { inventory: [record({ maxWidth: { base: '', desktop: '40rem' } })], message: /unsupported field: desktop/ },
  ];
  for (const { inventory, raw, message } of invalidCases) {
    withInventory(inventory, ({ repoRoot }) => {
      assert.throws(() => hydrateShortTakeSections({ sections: [section()] }, repoRoot, { logger: { log() {} } }), message);
    }, { raw });
  }
});

test('both production schemas accept only the compact Short Take authoring shape', () => {
  for (const templateName of ['dense-discovery', 'near-future-lab-daily-headlines']) {
    const valid = { template: templateName, title: 'Schema Test', sections: [section()] };
    assert.doesNotThrow(() => validateNewsletterDataAgainstSchema(valid, templateName, {
      repoRoot: REPO_ROOT,
      strict: true,
      logger: { log() {} },
    }));

    for (const invalidSection of [
      { type: 'short-take' },
      { type: 'short-take', items: [] },
      { type: 'short-take', items: [{ shortTakeId: 'short-take-one' }, { shortTakeId: 'short-take-one' }] },
      { type: 'short-take', items: [{}] },
      { type: 'short-take', items: [{ shortTakeId: '   ' }] },
      { type: 'short-take', items: [{ shortTakeId: 'short-take-one', caption: 'override' }] },
      { type: 'short-take', title: 'override', items: [{ shortTakeId: 'short-take-one' }] },
    ]) {
      assert.throws(() => validateNewsletterDataAgainstSchema(
        { template: templateName, title: 'Schema Test', sections: [invalidSection] },
        templateName,
        { repoRoot: REPO_ROOT, strict: true, logger: { log() {} } },
      ), /Schema validation failed/);
    }
  }
});
