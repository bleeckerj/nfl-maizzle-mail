import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { emit } from '../../lib/decompiler/emitter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');
const NEWSLETTER_JSON = path.join(REPO_ROOT, 'data', 'newsletter.json');

function buildDenseDiscoveryIssue(outputName, extraArgs = []) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), `${outputName}-`));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Dark Mode Flatten Smoke',
      'preheader: Verify dark mode flatten policy',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: UPCOMING',
      '    items:',
      '      - title: Dark Mode Test',
      '        description: "<p>Readable fallback copy.</p>"',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    const stdout = execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
        ...extraArgs,
      ],
      {
        encoding: 'utf8',
        cwd: tempRoot,
      },
    );

    return {
      stdout,
      html: readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8'),
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

test('dense-discovery build enables dark-mode flatten by default without persisting policy data', () => {
  const beforeNewsletterJson = readFileSync(NEWSLETTER_JSON, 'utf8');
  const { stdout, html, cleanup } = buildDenseDiscoveryIssue('dark-mode-flatten-default');

  try {
    assert.match(stdout, /INFO.*dark-mode flatten enabled/);
    assert.match(html, /<meta name="color-scheme" content="light dark">/);
    assert.match(html, /@media \(prefers-color-scheme:\s*dark\)/);
    assert.match(html, /dm-bg/);
    assert.match(html, /#111318/);
    assert.doesNotMatch(readFileSync(NEWSLETTER_JSON, 'utf8'), /darkModePolicy/);
    assert.equal(readFileSync(NEWSLETTER_JSON, 'utf8'), beforeNewsletterJson);
  } finally {
    cleanup();
  }
});

test('dense-discovery build omits flatten CSS and classes when disabled', () => {
  const { stdout, html, cleanup } = buildDenseDiscoveryIssue('dark-mode-flatten-disabled', [
    '--no-dark-mode-flatten',
  ]);

  try {
    assert.doesNotMatch(stdout, /dark-mode flatten enabled/);
    assert.doesNotMatch(html, /<meta name="color-scheme" content="light dark">/);
    assert.doesNotMatch(html, /@media \(prefers-color-scheme:\s*dark\)/);
    assert.doesNotMatch(html, /\bdm-bg\b/);
    assert.doesNotMatch(html, /#111318/);
  } finally {
    cleanup();
  }
});

test('decompiler emitter includes default dark-mode scaffold and can omit it', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'dark-mode-emitter-'));
  const classifier = {
    model: 'test-model',
    usage: { input_tokens: 1, output_tokens: 1 },
    result: {
      components: [
        {
          type: 'hero',
          displayName: 'Hero',
          description: 'Hero component',
          sectionIndexes: [0],
          slots: [{ name: 'title', kind: 'text', description: 'Hero title' }],
          template: '<table><tr><td>{{ title }}</td></tr></table>',
          confidence: 1,
          notes: '',
        },
      ],
      sectionAssignments: [
        {
          index: 0,
          type: 'hero',
          confidence: 1,
          notes: '',
          itemValues: { title: 'Hello' },
        },
      ],
    },
  };
  const segmentation = {
    root: { tagName: 'TABLE' },
    sections: [
      {
        index: 0,
        styles: {
          containerStyles: { backgroundColor: '#ffffff' },
          contentStyles: { color: '#111111' },
          linkStyles: {},
          headingStyles: {},
        },
      },
    ],
  };

  try {
    const withFlatten = emit({
      repoRoot: tempRoot,
      templateName: 'with-flatten',
      sourcePath: 'source.html',
      segmentation,
      classifier,
    });
    const withLayout = readFileSync(withFlatten.layoutPath, 'utf8');
    const withNewsletter = readFileSync(withFlatten.newsletterPath, 'utf8');
    const withStyles = JSON.parse(readFileSync(withFlatten.sectionStylesPath, 'utf8'));

    assert.match(withLayout, /<meta name="color-scheme" content="light dark">/);
    assert.match(withLayout, /@media \(prefers-color-scheme: dark\)/);
    assert.match(withNewsletter, /dm-surface dm-text/);
    assert.equal(withStyles.globalOverrides.darkModeFlatten.enabledByDefault, true);

    const withoutFlatten = emit({
      repoRoot: tempRoot,
      templateName: 'without-flatten',
      sourcePath: 'source.html',
      segmentation,
      classifier,
      darkModeFlatten: false,
    });
    const withoutLayout = readFileSync(withoutFlatten.layoutPath, 'utf8');
    const withoutNewsletter = readFileSync(withoutFlatten.newsletterPath, 'utf8');
    const withoutStyles = JSON.parse(readFileSync(withoutFlatten.sectionStylesPath, 'utf8'));

    assert.doesNotMatch(withoutLayout, /color-scheme/);
    assert.doesNotMatch(withoutLayout, /prefers-color-scheme/);
    assert.doesNotMatch(withoutNewsletter, /dm-surface dm-text/);
    assert.equal(withoutStyles.globalOverrides.darkModeFlatten, undefined);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
