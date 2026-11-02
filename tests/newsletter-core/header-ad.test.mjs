import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hydrateHeaderAd } from '../../lib/newsletter-core/hydrate-header-ad.mjs';
import { pruneBuildInjectedFields } from '../../lib/newsletter-core/normalize.mjs';
import { validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';

// A temporary sibling catalog exercises the real inventory resolver without
// modifying Editorial or depending on whichever ads are currently in production.
function withCatalog(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'header-ad-'));
  const content = path.join(root, 'nfl-editorial/src/content');
  fs.mkdirSync(content, { recursive: true });
  fs.writeFileSync(path.join(content, 'ads.json'), JSON.stringify([
    { id: 'banner', media: { src: 'https://example.com/banner.png', altText: 'A complete DataShed advertisement' }, link: { url: 'https://example.com/article' } },
    { id: 'no-image', media: {} },
  ]));
  try { run(path.join(root, 'nfl-maizzle-mail')); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('header ad uses catalog media and advertisement tracking without changing source fields', () => {
  withCatalog((repoRoot) => {
    const data = { header: { adId: 'banner', featuredImage: 'existing.png' } };
    hydrateHeaderAd(data, repoRoot, { logger: { log() {} } });
    assert.equal(data.header.ad.image, 'https://example.com/banner.png');
    assert.equal(data.header.ad.imageAlt, 'A complete DataShed advertisement');
    assert.equal(data.header.ad.link.href, 'https://example.com/article');
    assert.equal(data.header.ad.link.role, 'advertisement');
    assert.equal(data.header.featuredImage, 'existing.png');
    pruneBuildInjectedFields(data);
    assert.deepEqual(data.header, { adId: 'banner', featuredImage: 'existing.png' });
  });
});

test('unknown or imageless header ads fail rather than leave an empty header', () => {
  withCatalog((repoRoot) => {
    assert.throws(() => hydrateHeaderAd({ header: { adId: 'missing' } }, repoRoot, { logger: { log() {} } }), /unknown adId/);
    assert.throws(() => hydrateHeaderAd({ header: { adId: 'no-image' } }, repoRoot, { logger: { log() {} } }), /has no image/);
  });
});

test('ordinary headers keep their existing content when no ad is selected', () => {
  const data = { header: { featuredImage: 'existing.png', quote: 'Existing quote' } };
  hydrateHeaderAd(data, '/unused');
  assert.deepEqual(data, { header: { featuredImage: 'existing.png', quote: 'Existing quote' } });
});

test('a failed header image URL is reported by newsletter image validation', async () => {
  const result = await validateNewsletterImages({ header: { ad: { image: 'https://example.com/missing.png' } } }, {
    checkImageUrl: async () => ({ valid: false, status: 404 }),
    logger: { log() {} },
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /header\.ad\.image/);
});
