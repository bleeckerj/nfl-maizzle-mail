// Build a small issue through the canonical renderer and inspect the parsed HTML.
// Paragraph ownership catches font fallbacks that a template-string check misses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('primary prose retains shared typography and its paragraphs across article layouts', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-typography-'));
  const buildRoot = path.join(tempRoot, 'mail');
  const outputDir = path.join(tempRoot, 'output');
  mkdirSync(buildRoot);
  // Isolate the build input and outputs from the operator's active newsletter.
  for (const directory of ['data', 'lib', 'scripts', 'templates']) {
    cpSync(path.join(repoRoot, directory), path.join(buildRoot, directory), { recursive: true });
  }
  for (const filename of ['config.cjs', 'config.production.cjs']) {
    cpSync(path.join(repoRoot, filename), path.join(buildRoot, filename));
  }
  symlinkSync(path.join(repoRoot, 'node_modules'), path.join(buildRoot, 'node_modules'));
  symlinkSync(path.resolve(repoRoot, '..', 'nfl-editorial'), path.join(tempRoot, 'nfl-editorial'));

  const paragraphs = '<p>Opening paragraph.</p><p>Second paragraph with <em>emphasis</em>.</p>';
  const articles = [
    { headline: 'Plain text', lede: 'A plain-text excerpt.' },
    { headline: 'Unlinked paragraphs', lede: paragraphs },
    { headline: 'Linked paragraphs', link: 'mailto:editor@example.com', lede: paragraphs },
    ...['row', 'feature'].map((article_layout) => ({
      headline: `${article_layout} paragraphs`, article_layout,
      image_src: 'https://images.example.test/cover.png', image_alt: 'Complete cover.',
      lede: paragraphs, body_blocks: [{ type: 'text', html: '<p>Paragraph after an image.</p>' }],
    })),
    {
      headline: 'Explicit override', lede: paragraphs,
      articleContentStyles: { fontFamily: 'Arial, sans-serif', fontSize: '20px', lineHeight: '30px' },
    },
  ];
  const issuePath = path.join(tempRoot, 'typography.md');
  writeFileSync(issuePath, matter.stringify('', {
    template: 'near-future-lab-daily-headlines', title: 'Editorial typography check',
    sections: [
      { type: 'intro_statement', statement_html: paragraphs },
      { type: 'section_article_group', section_label: 'Articles', articles },
    ],
  }));

  try {
    execFileSync(process.execPath, [
      path.join(repoRoot, 'scripts/build-newsletter.mjs'), issuePath, 'typography',
      `--repo-root=${buildRoot}`, `--output-dir=${outputDir}`, '--preview', '--no-open',
    ], { cwd: tempRoot, encoding: 'utf8', stdio: 'pipe' });
    const { document } = new JSDOM(readFileSync(path.join(outputDir, 'typography.html'), 'utf8')).window;
    // Email optimization can discard redundant class names after CSS inlining.
    // Find the actual copy by its visible position and paragraph content.
    const intro = [...document.querySelectorAll('p')].find((p) => p.textContent === 'Opening paragraph.').parentElement;
    const ledes = [...document.querySelectorAll('h3.article-title')].map((heading) => heading.nextElementSibling);
    const bodyCopies = [...document.querySelectorAll('p')].filter((p) => p.textContent === 'Paragraph after an image.').map((p) => p.parentElement);
    assert.equal(ledes.length, articles.length);
    assert.equal(bodyCopies.length, 2);
    for (const prose of [intro, ...ledes.slice(0, -1), ...bodyCopies]) {
      assert.equal(prose.style.fontFamily, 'georgia, serif');
      assert.equal(prose.style.fontSize, '18px');
      assert.equal(prose.style.lineHeight, '26px');
      assert.notEqual(prose.tagName, 'P', 'Rich prose must retain its paragraph children');
    }
    for (const lede of ledes.slice(1)) assert.equal(lede.querySelectorAll('p').length, 2);
    assert.equal(ledes[0].textContent, 'A plain-text excerpt.');
    assert.equal(ledes.at(-1).style.fontFamily, 'Arial, sans-serif');
    assert.equal(ledes.at(-1).style.fontSize, '20px');
    assert.equal(ledes.at(-1).style.lineHeight, '30px');
    for (const prose of bodyCopies) assert.equal(prose.querySelectorAll('p').length, 1);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
