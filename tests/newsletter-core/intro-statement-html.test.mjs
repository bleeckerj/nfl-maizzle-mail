import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sanitizeIntroStatementHtml } from '../../lib/newsletter-core/intro-statement-html.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

test('sanitizeIntroStatementHtml preserves only simple statement markup', () => {
  const sanitized = sanitizeIntroStatementHtml(
    [
      '<p class="lead">Hello <em>near</em> <strong>future</strong> ',
      '<a href="https://example.com/story" onclick="bad()">story</a>',
      '<span style="color:red"> now</span>.</p>',
      '<script>alert("no")</script>',
      '<p><a href="javascript:alert(1)">bad link</a></p>',
    ].join(''),
  );

  assert.equal(
    sanitized,
    '<p>Hello <em>near</em> <strong>future</strong> <a href="https://example.com/story">story</a> now.</p><p>bad link</p>',
  );
});

test('daily-headlines intro statement accepts simple HTML in statement', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'intro-statement-html-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'intro-statement-html';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: near-future-lab-daily-headlines',
      'title: Intro Statement HTML',
      'preheader: Verify intro statement rich text',
      'sectionStylesFile: templates/near-future-lab-daily-headlines/section-styles.json',
      'sections:',
      '  - type: newsletter_masthead',
      '    logo_src: https://example.com/logo.png',
      '    logo_alt: Near Future Laboratory',
      '    logo_width: 300',
      '    title_src: https://example.com/title.png',
      '    title_alt: Tomorrow News Today',
      '    title_width: 300',
      '    dateline: "June 10, 2026, 6:00 a.m. Pacific time"',
      '  - type: intro_statement',
      '    label: From the Editor',
      '    statement: |',
      '      <p>This issue has <em>emphasis</em>, <strong>weight</strong>, and a <a href="https://example.com/intro" onclick="bad()">tracked link</a>.</p>',
      '      <p><img src="https://example.com/nope.png">Image tags disappear.</p>',
      'footer:',
      '  footerCta:',
      '    variant: default',
      '    eyebrow: Footer',
      '    text: Footer copy.',
      '    primaryAction:',
      '      label: Contact',
      '      url:',
      '        href: /contact',
      '        label: intro statement test | contact',
      '        category: operations',
      '    secondaryAction:',
      '      label: Services',
      '      url:',
      '        href: /services',
      '        label: intro statement test | services',
      '        category: operations',
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
    const manifest = JSON.parse(
      readFileSync(path.join(outputDir, `${outputName}.link-tracking-manifest.json`), 'utf8'),
    );

    assert.match(html, /<em>emphasis<\/em>/);
    assert.match(html, /<strong>weight<\/strong>/);
    assert.match(html, /<a href="https:\/\/example\.com\/intro"[^>]*>tracked link<\/a>/);
    assert.match(html, /data-link-label="tracked link"/);
    assert.match(html, /data-link-category="intro-statement"/);
    assert.doesNotMatch(html, /onclick=/);
    assert.doesNotMatch(html, /nope\.png/);
    assert.doesNotMatch(html, /&lt;em&gt;emphasis&lt;\/em&gt;/);
    assert.deepEqual(
      manifest.links.find((link) => link.url === 'https://example.com/intro')?.label,
      'tracked link',
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
