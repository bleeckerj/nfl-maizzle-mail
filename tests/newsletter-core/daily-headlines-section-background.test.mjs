import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

test('Daily Headlines sections render a solid fallback and optional gradient without wrappers', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-section-background-'));
  const buildRoot = path.join(tempRoot, 'mail');
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  mkdirSync(buildRoot);
  cpSync(path.join(REPO_ROOT, 'data'), path.join(buildRoot, 'data'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'lib'), path.join(buildRoot, 'lib'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'scripts'), path.join(buildRoot, 'scripts'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'templates'), path.join(buildRoot, 'templates'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'config.cjs'), path.join(buildRoot, 'config.cjs'));
  cpSync(path.join(REPO_ROOT, 'config.production.cjs'), path.join(buildRoot, 'config.production.cjs'));
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(buildRoot, 'node_modules'));
  symlinkSync(path.resolve(REPO_ROOT, '..', 'nfl-editorial'), path.join(tempRoot, 'nfl-editorial'));

  writeFileSync(issuePath, [
    '---',
    'template: near-future-lab-daily-headlines',
    'title: Section Background Test',
    'preheader: Rendered description for a Daily Headlines issue.',
    'ogImage: https://images.example.test/daily-headlines-card.png',
    'ogImageAltText: Daily Headlines test card.',
    'sections:',
    '  - type: section_article_group',
    '    section_label: Field Notes',
    '    containerStyles:',
    "      backgroundColor: '#eff4ed'",
    "      backgroundGradient: 'linear-gradient(135deg, #eff4ed 0%, #d7e7f3 100%)'",
    '    articles:',
    '      - headline: Background treatment remains on the existing section table',
    '  - type: ad-block',
    '    title: Divider sits outside the colored surface',
    '    containerStyles:',
    "      backgroundColor: '#eff4ed'",
    '    items:',
    '      - adId: walmart-futures-job-01',
    '  - type: ad-block',
    '    title: Default ad remains uncolored',
    '    show_top_rule: false',
    '    items:',
    '      - adId: walmart-futures-job-01',
    '---',
    '',
  ].join('\n'), 'utf8');

  try {
    execFileSync(process.execPath, [
      BUILD_SCRIPT,
      issuePath,
      'daily-headlines-section-background',
      `--repo-root=${buildRoot}`,
      `--output-dir=${outputDir}`,
      '--preview',
      '--no-open',
    ], { encoding: 'utf8', cwd: tempRoot });

    const html = readFileSync(path.join(outputDir, 'daily-headlines-section-background.html'), 'utf8');
    assert.match(html, /<title>Section Background Test<\/title>/);
    assert.match(html, /<meta name="description" content="Rendered description for a Daily Headlines issue\."/);
    assert.match(html, /<meta property="og:image" content="https:\/\/images\.example\.test\/daily-headlines-card\.png"/);
    assert.match(html, /<meta property="og:image:alt" content="Daily Headlines test card\."/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/images\.example\.test\/daily-headlines-card\.png"/);
    assert.match(html, /background-color:\s*#eff4ed/);
    assert.match(html, /background-image:\s*linear-gradient\(135deg,\s*#eff4ed 0%,\s*#d7e7f3 100%\)/);
    assert.match(html, /<table[^>]*style="[^"]*background-color:\s*#eff4ed[^"]*background-image:[^"]*"[^>]*>\s*<tbody>\s*<tr><td height="30"/);
    assert.match(html, /padding:12px 0 13px 0;padding-left:20px;padding-right:20px;border-top:9px solid #000/);
    assert.match(html, /<table[^>]*style="width:100%"[^>]*>\s*<tbody>\s*<tr><td height="10"[^>]*>\s*<\/td><\/tr>\s*<tr><td style="border-top:1px solid #dcdcdc">\s*<\/td><\/tr><\/tbody><\/table>\s*<table[^>]*style="[^"]*background-color:#eff4ed[^"]*"[^>]*>\s*<tbody>\s*<tr><td style="padding-top:15px">\s*<\/td><\/tr>/);
    assert.match(html, /border-bottom:1px solid #dcdcdc">\s*<\/td><\/tr><\/tbody><\/table>\s*<table[^>]*style="width:100%"[^>]*>\s*<tbody>\s*<tr><td height="15">\s*<\/td><\/tr>/);
    assert.match(html, /<table[^>]*style="width:100%"[^>]*>\s*<tbody>\s*<tr><td style="padding-top:15px">\s*<\/td><\/tr>\s*<tr><td style="padding:0 0 10px;">[^<]*<h2[^>]*>Default ad remains uncolored<\/h2>/);
    assert.doesNotMatch(html, /background-color:#f5f4f0/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('Daily Headlines schema requires a solid fallback for gradients', () => {
  const schema = JSON.parse(readFileSync(
    path.join(REPO_ROOT, 'templates/near-future-lab-daily-headlines/newsletter.schema.json'),
    'utf8',
  ));
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate({
    template: 'near-future-lab-daily-headlines',
    sections: [{
      type: 'section_article_group',
      containerStyles: {
        backgroundGradient: 'linear-gradient(135deg, #eff4ed 0%, #d7e7f3 100%)',
      },
      section_label: 'Field Notes',
      articles: [{ headline: 'Fallback required' }],
    }],
  });

  assert.equal(valid, false);
  assert.ok(validate.errors?.some(error => error.keyword === 'required' && error.params.missingProperty === 'backgroundColor'));
});

test('Daily Headlines article groups support distinct card surfaces and typography', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-article-styles-'));
  const buildRoot = path.join(tempRoot, 'mail');
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  mkdirSync(buildRoot);
  cpSync(path.join(REPO_ROOT, 'data'), path.join(buildRoot, 'data'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'lib'), path.join(buildRoot, 'lib'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'scripts'), path.join(buildRoot, 'scripts'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'templates'), path.join(buildRoot, 'templates'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'config.cjs'), path.join(buildRoot, 'config.cjs'));
  cpSync(path.join(REPO_ROOT, 'config.production.cjs'), path.join(buildRoot, 'config.production.cjs'));
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(buildRoot, 'node_modules'));
  symlinkSync(path.resolve(REPO_ROOT, '..', 'nfl-editorial'), path.join(tempRoot, 'nfl-editorial'));

  writeFileSync(issuePath, [
    '---',
    'template: near-future-lab-daily-headlines',
    'title: Article Styles Test',
    'preheader: Distinct article card styles.',
    'ogImage: https://images.example.test/article-styles.png',
    'ogImageAltText: Article styles test card.',
    'sections:',
    '  - type: section_article_group',
    '    section_label: Tomorrow\'s Jobs Today',
    '    containerStyles:',
    "      backgroundColor: '#7fe8d0'",
    '      contentPadding: 0 16px',
    '    articleContainerStyles:',
    "      backgroundColor: '#dff7f3'",
    '      padding: 24px 28px',
    '    articleContentStyles:',
    '      fontFamily: "\'Share Tech Mono\', \'Courier New\', Courier, monospace"',
    "      color: '#111111'",
    '      fontSize: 16px',
    '      lineHeight: 1.35',
    '    articles:',
    '      - headline: Principal, Applied Speculation',
    '        kicker: OpenAI',
    '        lede: A founding individual contributor role.',
    '        articleContainerStyles:',
    "          backgroundColor: '#e8fff9'",
    '---',
    '',
  ].join('\n'), 'utf8');

  try {
    execFileSync(process.execPath, [
      BUILD_SCRIPT,
      issuePath,
      'daily-headlines-article-styles',
      `--repo-root=${buildRoot}`,
      `--output-dir=${outputDir}`,
      '--preview',
      '--no-open',
    ], { encoding: 'utf8', cwd: tempRoot });

    const html = readFileSync(path.join(outputDir, 'daily-headlines-article-styles.html'), 'utf8');
    assert.match(html, /background-color:#7fe8d0/);
    assert.match(html, /padding-left:16px;padding-right:16px/);
    assert.match(html, /background-color:#e8fff9!important;padding:24px 28px!important/);
    assert.match(html, /<h3 class="article-title"[^>]*font-family:Share Tech Mono,Courier New,Courier,monospace!important/);
    assert.match(html, /<p class="article-lede"[^>]*color:#111111!important/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
