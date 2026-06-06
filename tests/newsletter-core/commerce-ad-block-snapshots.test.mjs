import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { resolveCommerceAdBlockSnapshots } from '../../lib/newsletter-core/index.mjs';

function writeFakeSnapshotRuntime(editorialRoot) {
  const snapshotsDir = path.join(editorialRoot, 'scripts', 'ads');
  mkdirSync(snapshotsDir, { recursive: true });
  writeFileSync(
    path.join(snapshotsDir, 'snapshots.mjs'),
    `
      import path from 'node:path';
      import { mkdir, writeFile } from 'node:fs/promises';

      export async function editorialAdsSnapshotsRenderBatch(args) {
        await mkdir(args.outputRoot, { recursive: true });
        await writeFile(path.join(args.outputRoot, 'last-args.json'), JSON.stringify(args, null, 2));
        const preset = args.lockupPresets[0] || 'native';
        return {
          items: await Promise.all(args.ids.map(async (adId) => {
            if (adId === 'failed-commerce-ad') {
              return {
                adId,
                rendered: [],
                failed: [{ presetId: preset, reason: 'fixture render failed' }],
                warnings: [],
              };
            }

            const stillPath = path.join(args.outputRoot, adId + '-' + preset + '.png');
            const animatedPath = path.join(args.outputRoot, adId + '-' + preset + '.webp');
            await writeFile(stillPath, 'still');
            await writeFile(animatedPath, 'animated');
            const rendered = {
              presetId: preset === '4x5' ? 'social-4x5' : preset === '1x1' ? 'custom-1x1' : preset,
              sourceFingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              artifact: {
                localPath: stillPath,
                mimeType: 'image/png',
                photariumId: adId + '-still-id',
                photariumUrl: 'https://imagedelivery.net/example/' + adId + '-still/public',
                photariumParentId: adId + '-parent-id',
              },
              stillArtifact: {
                localPath: stillPath,
                mimeType: 'image/png',
                photariumId: adId + '-still-id',
                photariumUrl: 'https://imagedelivery.net/example/' + adId + '-still/public',
                photariumParentId: adId + '-parent-id',
              },
              animatedWebpArtifact: {
                localPath: animatedPath,
                mimeType: 'image/webp',
                photariumId: adId + '-animated-id',
                photariumUrl: 'https://imagedelivery.net/example/' + adId + '-animated/public',
                photariumParentId: adId + '-parent-id',
              },
              warnings: [],
            };
            return {
              adId,
              rendered: [],
              skipped: [{ presetId: rendered.presetId, reason: 'up-to-date snapshot exists', existing: rendered }],
              failed: [],
              warnings: [],
            };
          })),
        };
      }
    `,
    'utf8',
  );
}

async function withTempRoots(fn) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-commerce-snapshots-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const editorialRoot = path.join(tempRoot, 'nfl-editorial');
  mkdirSync(path.join(editorialRoot, 'src', 'content'), { recursive: true });
  mkdirSync(repoRoot, { recursive: true });
  writeFakeSnapshotRuntime(editorialRoot);

  const adsPath = path.join(editorialRoot, 'src', 'content', 'ads.json');
  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'commerce-ad',
        title: 'Commerce Ad',
        media: { src: 'https://example.com/source.png', altText: 'Commerce source' },
        exportLockup: { article: '4x5' },
        commerce: { presentation: 'overlay-lockup', priceText: '$12', lockup: { aspectRatio: '1x1' } },
      },
      {
        id: 'failed-commerce-ad',
        title: 'Failed Commerce Ad',
        media: { src: 'https://example.com/fallback.png', altText: 'Fallback source' },
        exportLockup: { article: '4x5' },
        commerce: { presentation: 'overlay-lockup', priceText: '$12' },
      },
    ]),
    'utf8',
  );

  const originalEditorialRoot = process.env.NFL_EDITORIAL_ROOT;
  const originalAdsPath = process.env.NFL_EDITORIAL_ADS_PATH;
  process.env.NFL_EDITORIAL_ROOT = editorialRoot;
  process.env.NFL_EDITORIAL_ADS_PATH = adsPath;

  try {
    return await fn({ repoRoot, editorialRoot });
  } finally {
    if (originalEditorialRoot === undefined) {
      delete process.env.NFL_EDITORIAL_ROOT;
    } else {
      process.env.NFL_EDITORIAL_ROOT = originalEditorialRoot;
    }
    if (originalAdsPath === undefined) {
      delete process.env.NFL_EDITORIAL_ADS_PATH;
    } else {
      process.env.NFL_EDITORIAL_ADS_PATH = originalAdsPath;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('resolveCommerceAdBlockSnapshots renders explicitly requested overlay commerce snapshots', async () => {
  await withTempRoots(async ({ repoRoot, editorialRoot }) => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      throw new Error('canonical renderer should provide the Photarium URL');
    };

    try {
      const logs = [];
      const newsletterData = {
        sections: [
          {
            type: 'ad-block',
            items: [{ adId: 'commerce-ad', adRenderMode: 'snapshot', image: 'https://example.com/source.png' }],
          },
        ],
      };

      await resolveCommerceAdBlockSnapshots(newsletterData, { repoRoot, logger: { log: (message) => logs.push(message) } });
      const item = newsletterData.sections[0].items[0];

      assert.equal(item.renderMode, 'snapshot', logs.join('\n'));
      assert.equal(item.image, 'https://imagedelivery.net/example/commerce-ad-still/public');
      assert.equal(item.snapshotPreset, '1x1');
      assert.equal(item.snapshotEditorialPreset, 'custom-1x1');
      assert.equal(item.snapshotArtifactKind, 'static-png');
      assert.equal(item.snapshotSourceFingerprint, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      assert.equal(item.snapshotPhotariumId, 'commerce-ad-still-id');
      assert.equal(item.snapshotPhotariumParentId, 'commerce-ad-parent-id');
      assert.equal(fetchCount, 0);
      const lastArgs = JSON.parse(readFileSync(path.join(editorialRoot, 'output', 'ads-snapshots', 'last-args.json'), 'utf8'));
      assert.deepEqual(lastArgs.lockupPresets, ['1x1']);
      assert.equal(lastArgs.lockupRenderer, 'preview-lockup');
      assert.equal(lastArgs.photariumNamespace, 'cf-speculative-ads');
      assert.equal(lastArgs.photariumFolder, 'ads-snapshots');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('resolveCommerceAdBlockSnapshots respects adRenderMode legacy', async () => {
  await withTempRoots(async ({ repoRoot }) => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      throw new Error('legacy mode should not upload');
    };

    try {
      const newsletterData = {
        sections: [
          {
            type: 'ad-block',
            items: [{ adId: 'commerce-ad', adRenderMode: 'legacy', image: 'https://example.com/source.png' }],
          },
        ],
      };

      await resolveCommerceAdBlockSnapshots(newsletterData, { repoRoot, logger: { log() {} } });
      const item = newsletterData.sections[0].items[0];

      assert.equal(item.renderMode, undefined);
      assert.equal(item.image, 'https://example.com/source.png');
      assert.equal(fetchCount, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('resolveCommerceAdBlockSnapshots leaves overlay commerce ads on the hydrated email card by default', async () => {
  await withTempRoots(async ({ repoRoot }) => {
    const newsletterData = {
      sections: [
        {
          type: 'ad-block',
          items: [{ adId: 'commerce-ad', image: 'https://example.com/source.png' }],
        },
      ],
    };
    const logs = [];

    await resolveCommerceAdBlockSnapshots(newsletterData, { repoRoot, logger: { log: (message) => logs.push(message) } });
    const item = newsletterData.sections[0].items[0];

    assert.equal(item.renderMode, undefined);
    assert.equal(item.image, 'https://example.com/source.png');
    assert.deepEqual(logs, []);
  });
});

test('resolveCommerceAdBlockSnapshots falls back to the hydrated email card on render failure', async () => {
  await withTempRoots(async ({ repoRoot }) => {
    const newsletterData = {
      sections: [
        {
          type: 'ad-block',
          items: [{ adId: 'failed-commerce-ad', adRenderMode: 'snapshot', image: 'https://example.com/fallback.png' }],
        },
      ],
    };
    const logs = [];

    await resolveCommerceAdBlockSnapshots(newsletterData, { repoRoot, logger: { log: (message) => logs.push(message) } });
    const item = newsletterData.sections[0].items[0];

    assert.equal(item.renderMode, undefined);
    assert.equal(item.image, 'https://example.com/fallback.png');
    assert.ok(logs.some((message) => message.includes('Commerce ad-block snapshot fallback')));
  });
});
