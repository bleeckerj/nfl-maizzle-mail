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

function buildNewsletter(markdownLines, outputName) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), `${outputName}-`));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(issuePath, markdownLines.join('\n'), 'utf8');

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

    return {
      html: readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8'),
      cleanup: () => rmSync(tempRoot, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

test('section headings and links inherit contentStyles when no explicit heading or link styles are set', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Section Style Inheritance',
      'preheader: Verify heading and link inheritance',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: UPCOMING',
      '    containerStyles:',
      "      backgroundColor: '#560d0f'",
      '    contentStyles:',
      "      color: '#f0f0f0'",
      '    items:',
      '      - title: Inherited Title Color',
      '        link: https://example.com/inherited',
      '        subtitle: Inherited Subtitle Color',
      '        description: "<p>Inherited body color.</p>"',
      '        readMoreText: Read more',
      '        readMoreLink: https://example.com/read-more',
      '---',
      '',
    ],
    'section-style-inheritance',
  );

  try {
    assert.match(html, /<h1[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>\s*UPCOMING/);
    assert.match(
      html,
      /<a href="https:\/\/example\.com\/inherited"[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Inherited Title Color<\/a>/,
    );
    assert.match(
      html,
      /<a href="https:\/\/example\.com\/read-more"[^>]*style="[^"]*text-decoration:\s*underline[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Read more<\/a>/,
    );
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Inherited Subtitle Color<\/p>/,
    );
  } finally {
    cleanup();
  }
});

test('sponsor subtitleColor overrides inherited contentStyles color', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Sponsor Subtitle Override',
      'preheader: Verify sponsor subtitle override',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: UPCOMING',
      '    contentStyles:',
      "      color: '#f0f0f0'",
      "      subtitleColor: '#ffd6d6'",
      '      subtitleFontSize: 15px',
      '      subtitleLineHeight: 17px',
      "      subtitleFontWeight: '500'",
      '    items:',
      '      - title: Subtitle Override Title',
      '        subtitle: Explicit Subtitle Color',
      '        description: "<p>Body color stays inherited.</p>"',
      '---',
      '',
    ],
    'sponsor-subtitle-override',
  );

  try {
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*font-size:\s*15px[^"]*line-height:\s*17px[^"]*font-weight:\s*500[^"]*color:\s*#ffd6d6[^"]*"[^>]*>Explicit Subtitle Color<\/p>/,
    );
    assert.doesNotMatch(html, /subtitle-(?:color|font-size|line-height|font-weight|text-align)/);
  } finally {
    cleanup();
  }
});

test('sponsor subtitle preserves legacy gray when no section color override is set', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Sponsor Subtitle Legacy Fallback',
      'preheader: Verify sponsor subtitle fallback',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: UPCOMING',
      '    items:',
      '      - title: Legacy Subtitle Title',
      '        subtitle: Legacy Subtitle Gray',
      '        description: "<p>Default sponsor body color.</p>"',
      '---',
      '',
    ],
    'sponsor-subtitle-legacy-fallback',
  );

  try {
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*font-size:\s*16px[^"]*line-height:\s*18px[^"]*font-weight:\s*400[^"]*color:\s*#707070[^"]*"[^>]*>Legacy Subtitle Gray<\/p>/,
    );
  } finally {
    cleanup();
  }
});

test('explicit headingStyles and linkStyles override inherited contentStyles', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Section Style Explicit Overrides',
      'preheader: Verify explicit heading and link overrides',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: UPCOMING',
      '    contentStyles:',
      "      color: '#f0f0f0'",
      '    headingStyles:',
      "      color: '#ffffff'",
      '    linkStyles:',
      "      color: '#ffd6d6'",
      '      textDecoration: underline',
      '    items:',
      '      - title: Explicit Link Color',
      '        link: https://example.com/explicit',
      '        description: "<p>Explicit body color.</p>"',
      '---',
      '',
    ],
    'section-style-explicit-overrides',
  );

  try {
    assert.match(html, /<h1[^>]*style="[^"]*color:\s*#ffffff[^"]*"[^>]*>\s*UPCOMING/);
    assert.match(
      html,
      /<a href="https:\/\/example\.com\/explicit"[^>]*style="[^"]*color:\s*#ffd6d6[^"]*"[^>]*>Explicit Link Color<\/a>/,
    );
  } finally {
    cleanup();
  }
});
