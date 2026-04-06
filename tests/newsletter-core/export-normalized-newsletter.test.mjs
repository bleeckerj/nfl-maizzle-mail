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
