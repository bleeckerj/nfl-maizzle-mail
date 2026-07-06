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
      'eyebrow: "Near Future Laboratory"',
      'signature:',
      '  name: "Julian"',
      '  lines:',
      '    - "Near Future Laboratory"',
      'sharedItems:',
      '  heading: "Shared items"',
      '  items:',
      '    - title: "Prototype Review Notes"',
      '      href: "https://example.com/prototype-review"',
      '      label: "Reference"',
      '      image:',
      '        src: "https://example.com/prototype-review.jpg"',
      '        alt: "Prototype review materials"',
      '      description: "Notes for the review."',
      '    - title: "Session Outline"',
      '      href: "https://example.com/session-outline"',
      '      label: "Brief"',
      '      imageSrc: "cid:session-outline-image"',
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
    assert.match(html, /Shared items/);
    assert.match(html, /data-correspondence-grid="shared-items"/);
    assert.match(html, /<img src="https:\/\/example\.com\/prototype-review\.jpg"/);
    assert.match(html, /alt="Prototype review materials"/);
    assert.match(html, /<img src="cid:session-outline-image"/);
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
