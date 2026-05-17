import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

test('build-newsletter renders animated-image sections at the standard content width', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'animated-image-width-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'animated-image-width';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Animated Image Width',
      'preheader: Verify animated image width',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: animated-image',
      "    title: Today's Office",
      '    items:',
      '      - image: https://example.com/todays-office.webp',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        cwd: tempRoot,
      },
    );

    const html = readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
    assert.match(
      html,
      /<img src="https:\/\/example\.com\/todays-office\.webp"[^>]*width="600"[^>]*max-width:\s*600px[^"]*"/,
    );
    assert.doesNotMatch(html, /max-width: 400px/);
    assert.doesNotMatch(html, /width="400"/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter links standalone image section images when item link is set', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'image-section-link-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'image-section-link';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Image Section Link',
      'preheader: Verify image section links',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: image',
      '    title: Visual Note',
      '    items:',
      '      - image:',
      '          src: https://example.com/visual-note.webp',
      '          alt: Visual note',
      '        link: https://example.com/visual-note',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        cwd: tempRoot,
      },
    );

    const html = readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
    assert.match(
      html,
      /<a href="https:\/\/example\.com\/visual-note"[^>]*>\s*<img src="https:\/\/example\.com\/visual-note\.webp"/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
