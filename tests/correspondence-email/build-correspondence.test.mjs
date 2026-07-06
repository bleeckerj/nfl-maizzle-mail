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
const SEND_SCRIPT = path.join(REPO_ROOT, 'scripts', 'send-correspondence-test.mjs');
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
        '--no-open',
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
    assert.match(html, /table-layout:fixed/);
    assert.match(html, /max-width:260px;width:260px/);
    assert.match(html, /width="260"/);
    assert.match(html, /<img src="data:image\/svg\+xml,%3Csvg%3E%3C%2Fsvg%3E"/);
    assert.match(html, /alt="Prototype review materials"/);
    assert.match(html, /height:auto/);
    assert.match(html, /bgcolor="#ffffff"/);
    assert.doesNotMatch(html, /#f4f1ea/i);
    assert.doesNotMatch(html, /#d9ded6/i);
    assert.doesNotMatch(html, /border:1px solid #d9ded6/i);
    assert.match(html, /Prototype Review Notes/);
    assert.match(html, /Session Outline/);
    assert.doesNotMatch(html, /unsubscribe/i);
    assert.doesNotMatch(html, /view online/i);
    assert.doesNotMatch(html, /link-tracking-manifest/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('send-correspondence-test builds the rendered HTML before a dry-run send', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'correspondence-email-send-'));
  const inputPath = path.join(tempRoot, 'client-note.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(
    inputPath,
    [
      '---',
      'subject: "Dry-run client note"',
      'signature:',
      '  name: "Julian"',
      'sharedItems:',
      '  items:',
      '    - title: "One"',
      '      href: "https://example.com/one"',
      `      imageSrc: "${PROTOTYPE_IMAGE_SRC}"`,
      '    - title: "Two"',
      '      href: "https://example.com/two"',
      `      imageSrc: "${SESSION_IMAGE_SRC}"`,
      '---',
      '',
      'Hi Alex,',
      '',
      'Here is the note.',
    ].join('\n'),
    'utf8',
  );

  try {
    const output = execFileSync(
      process.execPath,
      [
        SEND_SCRIPT,
        inputPath,
        'client-note',
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--dry-run',
        '--skip-link-validation',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SES_FROM: 'sender@example.com',
          SES_TO: 'recipient@example.com',
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, 'client-note.html');
    assert.ok(existsSync(builtHtmlPath));
    assert.match(output, /Dry run/);
    assert.match(output, /recipient@example\.com/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-correspondence supports --send-test dry runs on the main CLI', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'correspondence-email-build-send-'));
  const inputPath = path.join(tempRoot, 'client-note.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(
    inputPath,
    [
      '---',
      'subject: "Build CLI send-test"',
      'signature:',
      '  name: "Julian"',
      '  lines:',
      '    - "<a href=\'https://nearfuturelaboratory.com\'>nearfuturelaboratory.com</a>"',
      '---',
      '',
      'Hi Alex,',
    ].join('\n'),
    'utf8',
  );

  try {
    const output = execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        inputPath,
        'client-note',
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
        '--send-test',
        '--dry-run',
        '--skip-link-validation',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SES_FROM: 'sender@example.com',
          SES_TO: 'recipient@example.com',
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, 'client-note.html');
    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(output, /Dry run/);
    assert.match(html, /href="https:\/\/nearfuturelaboratory\.com"/);
    assert.doesNotMatch(html, /&lt;a href/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
