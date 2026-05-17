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

test('build-newsletter renders inline HTML inside signals-adjacent-now list items', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'signals-adjacent-inline-html-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'signals-adjacent-inline-html';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Signals Inline HTML',
      'preheader: Verify inline HTML in signal lists',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: signals-adjacent-now',
      '    title: Signals from an Adjacent Now',
      '    items:',
      '      - title: HTML-bearing signal',
      '        description: "<p>Signal body.</p>"',
      '        storySeeds:',
      `          - '<strong>Token quotas?</strong> What if jobs require a minimum amount of tokens?'`,
      `          - 'Visit <a href="https://example.com/seeds">the seeds archive</a>.'`,
      '        strategyQuestions:',
      `          - '<strong>What changes first?</strong> Which team notices this earliest?'`,
      `          - 'Should we <a href="https://example.com/plan">plan for this now</a>?'`,
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
    assert.match(html, /•\s*<strong>Token quotas\?<\/strong>/);
    assert.doesNotMatch(html, /&lt;strong&gt;Token quotas\?&lt;\/strong&gt;/);
    assert.match(html, /<a href="https:\/\/example\.com\/seeds"[^>]*>the seeds\s+archive<\/a>/);
    assert.match(html, /•\s*<strong>What changes first\?<\/strong>/);
    assert.match(html, /<a href="https:\/\/example\.com\/plan"[^>]*>plan for this now<\/a>/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
