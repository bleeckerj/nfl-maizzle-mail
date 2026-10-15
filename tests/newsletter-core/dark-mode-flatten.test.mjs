import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { emit } from '../../lib/decompiler/emitter.mjs';
import { JSDOM } from 'jsdom';
import { panelContrast, auditTextContrast } from '../../lib/newsletter-core/dark-mode-contrast.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');
const NEWSLETTER_JSON = path.join(REPO_ROOT, 'data', 'newsletter.json');

function buildDenseDiscoveryIssue(outputName, extraArgs = [], flatten) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), `${outputName}-`));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      ...(flatten === undefined ? [] : [`darkModePolicy: { flatten: ${flatten} }`]),
      'title: Dark Mode Flatten Smoke',
      'preheader: Verify dark mode flatten policy',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'intro:',
      '  content: |-',
      '    <p>White intro panel with <strong style="color:#111111!important">bold text</strong>, <em style="color:#111111!important">emphasis</em>, and <code style="color:#111111!important;background:white!important">code</code>.</p><blockquote style="color:#111111!important;background:rgba(255,255,255,0.5)!important"><p>A quotation.</p></blockquote><p><a href="mailto:example@example.com"><strong>A nested link</strong></a></p><p class="image-caption"><em>A muted caption</em></p><span title="Paywalled" style="color:#111111!important;background:white!important">A badge</span><div style="background-image:linear-gradient(white,white)!important;color:black!important">Gradient panel</div>',
      '  containerStyles: { backgroundColor: "#ffffff", padding: "16px" }',
      '  contentStyles: { color: "#111111" }',
      '  aside:',
      '    content: "<p>White aside panel with dark authored text.</p>"',
      '    containerStyles: { backgroundColor: "#ffffff" }',
      '    contentStyles: { color: "#111111" }',
      'footer:',
      '  shareUrl: mailto:share@example.com',
      '  logo: https://example.com/footer-logo.png',
      '  socialLinks:',
      ...['github', 'applepodcasts', 'spotify', 'instagram', 'linkedin', 'youtube', 'discord', 'patreon', 'substack'].flatMap((name) => [
        `    ${name}: [{ url: "mailto:${name}@example.com" }]`,
      ]),
      '  footerCta:',
      '    enabled: true',
      '    text: Footer invitation text.',
      '    primaryAction: { label: Subscribe, url: "mailto:subscribe@example.com" }',
      '    secondaryAction: { label: Read online, url: "mailto:read@example.com" }',
      'sections:',
      '  - type: inline_cta',
      '    statement: Inline invitation text.',
      '    primaryAction: { label: Primary button, url: "mailto:primary@example.com" }',
      '    secondaryAction: { label: Secondary button, url: "mailto:secondary@example.com" }',
      '  - type: single-column',
      '    title: UPCOMING',
      '    items:',
      '      - title: Dark Mode Test',
      '        description: |-',
      '          <p>Readable fallback copy.</p><ol><li>Ordered recap text<ul><li>Nested recap text</li></ul></li></ol><table><tr><th bgcolor="#ffffff" style="color:#111111!important">Table heading</th></tr><tr><td>Table data</td></tr></table>',
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
    assert.match(stdout, /Dark-mode contrast: \d+ text runs checked/);
    assert.match(html, /<meta name="color-scheme" content="light dark">/);
    assert.match(html, /@media \(prefers-color-scheme:\s*dark\)/);
    assert.match(html, /dm-bg/);
    assert.match(html, /#111318/);
    assert.match(html, /\.dm-bg \*/);
    const document = new JSDOM(html).window.document;
    const list = document.querySelector('ol');
    assert.ok(list, 'the fixture must exercise the Office Hours ordered-list path');
    assert.equal(list.closest('div').style.getPropertyPriority('color'), '', 'the list wrapper must allow the dark palette to override black');
    assert.equal(list.closest('div').style.getPropertyValue('color'), 'rgb(17, 17, 17)', 'the light palette remains unchanged');
    // Exercise the screenshot failure: pale dark-mode text on an authored white div.
    for (const selector of ['.intro-content', '.intro-aside']) {
      const light = panelContrast(html, selector, 'light');
      const dark = panelContrast(html, selector, 'dark');
      assert.equal(light.background, 'rgb(255, 255, 255)', `${selector} keeps its authored light background`);
      assert.ok(light.ratio >= 4.5, `${selector} light contrast is ${light.ratio.toFixed(2)}:1`);
      assert.ok(dark.ratio >= 4.5, `${selector} dark contrast is ${dark.ratio.toFixed(2)}:1: ${dark.color} on ${dark.background}`);
      assert.equal(dark.background, 'rgb(27, 31, 39)', `${selector} receives the shared dark surface`);
    }
    // Audit every rendered text run, not a hand-picked class allowlist.
    const darkAudit = auditTextContrast(html, 'dark');
    assert.ok(darkAudit.checked >= 25, 'intro, aside, inline markup, lists, tables, buttons and footer must all render');
    assert.deepEqual(darkAudit.failures, [], JSON.stringify(darkAudit.failures, null, 2));
    assert.deepEqual(darkAudit.artworkFailures, [], 'all footer artwork must retain its dark treatment');
    assert.deepEqual(darkAudit.unassessed, [], 'the fixture must not hide unaudited surfaces');
    const lightAudit = auditTextContrast(html, 'light');
    assert.equal(darkAudit.artwork.length, 10, 'cover the footer logo and every social icon family');
    assert.ok(darkAudit.artwork.every((asset) => asset.filter === 'brightness(0) invert(1)'));
    assert.ok(lightAudit.artwork.every((asset) => !asset.filter || asset.filter === 'none'));
    assert.deepEqual(darkAudit.artwork.map(({filter, ...asset}) => asset), lightAudit.artwork.map(({filter, ...asset}) => asset));
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

test('frontmatter false disables flattening without a CLI flag', () => {
  const beforeNewsletterJson = readFileSync(NEWSLETTER_JSON, 'utf8');
  const { stdout, html, cleanup } = buildDenseDiscoveryIssue('dark-mode-authored-false', [], false);
  try {
    assert.doesNotMatch(stdout, /dark-mode flatten enabled/);
    assert.doesNotMatch(html, /\bdm-bg\b/);
    assert.doesNotMatch(html, /@media \(prefers-color-scheme:\s*dark\)/);
    assert.equal(readFileSync(NEWSLETTER_JSON, 'utf8'), beforeNewsletterJson);
  } finally { cleanup(); }
});

test('frontmatter true enables flattening and the CLI opt-out takes precedence', () => {
  for (const extraArgs of [[], ['--no-dark-mode-flatten']]) {
    const { html, cleanup } = buildDenseDiscoveryIssue('dark-mode-authored-true', extraArgs, true);
    try {
      assert.equal(/\bdm-bg\b/.test(html), extraArgs.length === 0);
    } finally { cleanup(); }
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
