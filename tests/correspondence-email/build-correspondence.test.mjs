import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-correspondence.mjs');
const PROTOTYPE_IMAGE_SRC = 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E';
const SESSION_IMAGE_SRC = 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E';

test('build-correspondence renders local correspondence HTML with optional shared items', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'correspondence-email-build-'));
  const inputPath = path.join(tempRoot, 'client-note.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(
    inputPath,
    [
      '---',
      'subject: "Client note"',
      'preheader: "A direct note."',
      'signature:',
      '  name: "Julian"',
      '  lines:',
      '    - "[Near Future Laboratory](https://nearfuturelaboratory.com)"',
      '    - "[hello@nearfuturelaboratory.com](mailto:hello@nearfuturelaboratory.com)"',
      'sharedItems:',
      '  heading: "Shared items"',
      '  items:',
      '    - title: "Prototype Review Notes"',
      '      href: "https://example.com/prototype-review"',
      '      label: "Reference"',
      '      image:',
      `        src: "${PROTOTYPE_IMAGE_SRC}"`,
      '        alt: "Prototype review materials"',
      '      description: "Notes for the review."',
      '    - title: "Session Outline"',
      '      href: "https://example.com/session-outline"',
      '      label: "Brief"',
      `      imageSrc: "${SESSION_IMAGE_SRC}"`,
      '      imageAlt: "Session outline preview"',
      '      description: "The current outline."',
      '---',
      '',
      'Hi Alex,',
      '',
      'Here is the [brief](https://example.com/brief).',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        inputPath,
        'client-note',
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
      ],
      { encoding: 'utf8' },
    );

    const builtHtmlPath = path.join(outputDir, 'client-note.html');
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /Client note/);
    assert.match(html, /Hi Alex/);
    assert.match(html, /https:\/\/example\.com\/brief/);
    assert.match(html, /Julian/);
    assert.doesNotMatch(html, /correspondence-brand/);
    assert.doesNotMatch(html, /<strong>Julian<\/strong>/);
    assert.match(html, /JetBrainsMono Nerd Font/);
    assert.match(html, /href="https:\/\/nearfuturelaboratory\.com"/);
    assert.match(html, /href="mailto:hello@nearfuturelaboratory\.com"/);
    assert.match(html, /margin:24px 0 0 0/);
    assert.match(html, /Shared items/);
    assert.match(html, /data-correspondence-grid="shared-items"/);
    assert.match(html, /<img src="data:image\/svg\+xml,%3Csvg%3E%3C%2Fsvg%3E"/);
    assert.match(html, /alt="Prototype review materials"/);
    assert.match(html, /height:auto/);
    assert.match(html, /Prototype Review Notes/);
    assert.match(html, /Session Outline/);
    assert.doesNotMatch(html, /unsubscribe/i);
    assert.doesNotMatch(html, /view online/i);
    assert.doesNotMatch(html, /link-tracking-manifest/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
