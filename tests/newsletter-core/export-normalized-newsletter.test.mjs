import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadNewsletterSource } from '../../lib/newsletter-core/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI_PATH = path.join(REPO_ROOT, 'scripts', 'export-normalized-newsletter.mjs');

test('normalized-export CLI matches loadNewsletterSource output', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-export-cli-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const backofficeRoot = path.join(tempRoot, 'nfl-backoffice');
  const editorialRoot = path.join(tempRoot, 'nfl-editorial');

  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(path.join(backofficeRoot, 'public', 'outbox', 'data', '2026'), { recursive: true });
  mkdirSync(path.join(editorialRoot, 'src', 'content'), { recursive: true });

  writeFileSync(
    path.join(editorialRoot, 'src', 'content', 'ads.json'),
    JSON.stringify([
      {
        id: 'comedy-ad-01',
        label: 'SPONSORED',
        title: 'CLI Fake Ad',
        copy: 'CLI hydrated ad copy.',
        link: { url: 'https://example.com/cli-ad', label: 'View the bit' },
        media: { src: 'https://imagedelivery.net/example/cli/public', altText: 'CLI art' },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    path.join(backofficeRoot, 'public', 'outbox', 'data', '2026', 'w13-y26.md'),
    [
      '---',
      'template: dense-discovery',
      'title: CLI Issue',
      'sections:',
      '  - type: ad-block',
      '    items:',
      '      - adId: comedy-ad-01',
      '---',
    ].join('\n'),
    'utf8',
  );

  const env = {
    ...process.env,
    NFL_EDITORIAL_ADS_PATH: path.join(editorialRoot, 'src', 'content', 'ads.json'),
  };

  try {
    const cliRaw = execFileSync(
      process.execPath,
      [
        CLI_PATH,
        '--issue-id',
        'w13-y26',
        '--repo-root',
        repoRoot,
        '--backoffice-root',
        backofficeRoot,
      ],
      { encoding: 'utf8', env },
    );

    const cliPayload = JSON.parse(cliRaw);
    const directPayload = loadNewsletterSource({
      repoRoot,
      backofficeRoot,
      issueId: 'w13-y26',
      logger: { log() {} },
    });

    assert.equal(cliPayload.issueId, directPayload.issueId);
    assert.equal(cliPayload.template, directPayload.templateName);
    assert.deepEqual(cliPayload.newsletter, directPayload.newsletterData);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('normalized-export CLI leaves commerce ad-blocks as normal hydrated ads', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-export-cli-commerce-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const backofficeRoot = path.join(tempRoot, 'nfl-backoffice');
  const editorialRoot = path.join(tempRoot, 'nfl-editorial');

  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(path.join(backofficeRoot, 'public', 'outbox', 'data', '2026'), { recursive: true });
  mkdirSync(path.join(editorialRoot, 'src', 'content'), { recursive: true });

  writeFileSync(
    path.join(editorialRoot, 'src', 'content', 'ads.json'),
    JSON.stringify([
      {
        id: 'commerce-ad-01',
        label: 'SPONSORED',
        title: 'Commerce Ad Title',
        copy: 'Commerce copy should stay visible.',
        link: { url: 'https://example.com/shop', label: 'Shop now' },
        media: { src: 'https://imagedelivery.net/example/source/public', altText: 'Snapshot alt text' },
        commerce: { rating: 4.2, reviewCount: 320, priceText: '$189.99' },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    path.join(backofficeRoot, 'public', 'outbox', 'data', '2026', 'w13-y26.md'),
    [
      '---',
      'template: dense-discovery',
      'title: CLI Commerce Issue',
      'sections:',
      '  - type: ad-block',
      '    items:',
      '      - adId: commerce-ad-01',
      'footer:',
      '  newsletterSubscribeLink: https://nearfuturelaboratory.com/newsletter/',
      '---',
    ].join('\n'),
    'utf8',
  );

  const env = {
    ...process.env,
    NFL_EDITORIAL_ROOT: editorialRoot,
    NFL_EDITORIAL_ADS_PATH: path.join(editorialRoot, 'src', 'content', 'ads.json'),
    IMAGE_MIGRATION_ENDPOINT: 'http://127.0.0.1:9/should-not-upload',
  };

  try {
    const cliRaw = execFileSync(
      process.execPath,
      [
        CLI_PATH,
        '--issue-id',
        'w13-y26',
        '--repo-root',
        repoRoot,
        '--backoffice-root',
        backofficeRoot,
      ],
      { encoding: 'utf8', env },
    );

    const cliPayload = JSON.parse(cliRaw);
    const item = cliPayload.newsletter.sections[0].items[0];
    assert.equal(item.label, 'SPONSORED');
    assert.equal(item.renderMode, undefined);
    assert.equal(item.title, 'Commerce Ad Title');
    assert.equal(item.description, '<p>Commerce copy should stay visible.</p>');
    assert.equal(item.image, 'https://imagedelivery.net/example/source/public');
    assert.equal(item.imageAlt, 'Snapshot alt text');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
