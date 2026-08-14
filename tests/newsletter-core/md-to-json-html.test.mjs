import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONVERTER = path.join(REPO_ROOT, 'scripts', 'md_to_json.mjs');

test('md_to_json preserves authored block HTML instead of nesting paragraphs', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'md-to-json-html-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputPath = path.join(tempRoot, 'newsletter.json');

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: HTML Input',
      'intro:',
      '  content: |',
      '    <p>Opening paragraph.</p>',
      '',
      '    <img src="https://example.com/figure.webp" alt="A figure." />',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(process.execPath, [CONVERTER, issuePath, outputPath, '--template=dense-discovery'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    const newsletter = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(
      newsletter.intro.content,
      '<p>Opening paragraph.</p>\n\n<img src="https://example.com/figure.webp" alt="A figure." />\n',
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
