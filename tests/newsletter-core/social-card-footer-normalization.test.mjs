// Exercise the loader and the exact normalization CLI used by Backoffice.
// Footer aliases must preserve copy, styling, email-footer data and source bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNewsletterSource } from '../../lib/newsletter-core/load-newsletter-source.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('footer aliases normalize once while preserving text, style controls and source', () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'social-card-footer-normalization-'));
  const inputPath = path.join(temporaryRoot, 'w42-y26.json');
  const cases = [
    [{ footer: '<p>Card <strong>footer</strong>.</p>' }, '<p>Card <strong>footer</strong>.</p>'],
    [{ footerCopy: 'Existing footer copy' }, 'Existing footer copy'],
    [{ footer: 'Authored footer', footerCopy: 'Older copy' }, 'Authored footer'],
    [{ footer: '', footerCopy: 'Older copy' }, ''],
    [{ footer: null, footerCopy: 'Older copy' }, null],
    [{}, undefined],
  ];
  try {
    for (const [fields, expected] of cases) {
      const source = JSON.stringify({
        template: 'dense-discovery', title: 'Card footer', sections: [],
        socialCard: { ...fields, footerFont: 'untitled-sans-light', footerFontScale: 1.4 },
        footer: { address: 'Email footer address', footerCta: { enabled: false } },
      });
      writeFileSync(inputPath, source);
      const { newsletterData } = loadNewsletterSource({ repoRoot, inputPath, logger: { log() {} } });
      assert.equal(newsletterData.socialCard.footerCopy, expected);
      assert.equal(Object.hasOwn(newsletterData.socialCard, 'footer'), false);
      assert.equal(newsletterData.socialCard.footerFont, 'untitled-sans-light');
      assert.equal(newsletterData.socialCard.footerFontScale, 1.4);
      assert.equal(newsletterData.footer.address, 'Email footer address');
      assert.equal(readFileSync(inputPath, 'utf8'), source);
    }
    writeFileSync(inputPath, JSON.stringify({ template: 'dense-discovery', title: 'Invalid footer', socialCard: { footer: 42 }, sections: [] }));
    assert.throws(() => loadNewsletterSource({ repoRoot, inputPath, logger: { log() {} } }), /socialCard.footer: must be string,null/);
  } finally { rmSync(temporaryRoot, { recursive: true, force: true }); }
});

test('normalized-export CLI accepts footer with footerFontScale from an issue draft', () => {
  const backofficeRoot = mkdtempSync(path.join(os.tmpdir(), 'social-card-footer-cli-'));
  const directory = path.join(backofficeRoot, 'public/outbox/data/2026');
  mkdirSync(directory, { recursive: true });
  const inputPath = path.join(directory, 'w42-y26.md');
  const source = [
    '---', 'template: dense-discovery', 'title: Card footer CLI', 'sections: []',
    'socialCard:', '  footer: "<p>Footer <strong>copy</strong>.</p>"',
    '  footerFont: untitled-sans-light', '  footerFontScale: 1.4',
    'footer:', '  address: Email footer address', '  footerCta: { enabled: false }', '---', '',
  ].join('\n');
  writeFileSync(inputPath, source);
  try {
    const output = execFileSync(process.execPath, [
      path.join(repoRoot, 'scripts/export-normalized-newsletter.mjs'),
      '--issue-id', 'w42-y26', '--repo-root', repoRoot, '--backoffice-root', backofficeRoot,
    ], { cwd: repoRoot, encoding: 'utf8' });
    const normalized = JSON.parse(output).newsletter;
    assert.equal(normalized.socialCard.footerCopy, '<p>Footer <strong>copy</strong>.</p>');
    assert.equal(normalized.socialCard.footerFontScale, 1.4);
    assert.equal(Object.hasOwn(normalized.socialCard, 'footer'), false);
    assert.equal(normalized.footer.address, 'Email footer address');
    assert.equal(readFileSync(inputPath, 'utf8'), source);
  } finally { rmSync(backofficeRoot, { recursive: true, force: true }); }
});
