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
      '  - type: feature',
      '    title: UPCOMING',
      '    featureLink: https://nearfuturelaboratory.com',
      '    featureLabel: CALENDAR',
      '    containerStyles:',
      "      backgroundColor: '#560d0f'",
      '    contentStyles:',
      "      color: '#f0f0f0'",
      '    items:',
      '      - title: Inherited Title Color',
      '        link: https://nearfuturelaboratory.com/newsletters/2026/style-inheritance-test',
      '        subtitle: Inherited Subtitle Color',
      '        description: "<p>Inherited body color.</p>"',
      '        readMoreText: Read more',
      '        readMoreLink: https://nearfuturelaboratory.com/newsletters/2026/style-inheritance-read-more',
      '---',
      '',
    ],
    'section-style-inheritance',
  );

  try {
    assert.match(html, /<h1[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>\s*UPCOMING/);
    assert.match(
      html,
      /<a class="h1byline mob-meta" href="https:\/\/nearfuturelaboratory\.com"[^>]*>CALENDAR<\/a>/,
    );
    assert.match(
      html,
      /<a href="https:\/\/nearfuturelaboratory\.com\/newsletters\/2026\/style-inheritance-test"[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Inherited Title Color<\/a>/,
    );
    assert.match(
      html,
      /<a href="https:\/\/nearfuturelaboratory\.com\/newsletters\/2026\/style-inheritance-read-more"[^>]*style="[^"]*text-decoration:\s*underline[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Read more<\/a>/,
    );
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*color:\s*#f0f0f0[^"]*"[^>]*>Inherited Subtitle Color<\/p>/,
    );
  } finally {
    cleanup();
  }
});

test('feature subtitleColor overrides inherited contentStyles color', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Feature Subtitle Override',
      'preheader: Verify feature subtitle override',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: feature',
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

test('legacy sponsor subtitle preserves gray fallback when no section color override is set', () => {
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
    assert.match(html, />\s*Legacy Subtitle Title\s*<\/p>/);
  } finally {
    cleanup();
  }
});

test('indie-mag-single-column subtitle inherits explicit content color and radius override', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Indie Mag Subtitle Inheritance',
      'preheader: Verify indie-mag subtitle inheritance',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: indie-mag-single-column',
      '    title: From The Tape Archives',
      '    containerStyles:',
      "      backgroundColor: '#41a67a'",
      '      borderRadius: 18px',
      '    contentStyles:',
      "      color: '#f5f2eb'",
      '    items:',
      '      - title: Podcast Archive',
      '        subtitle: Near Future Laboratory Podcast',
      '        description: "<p>Archive note.</p>"',
      '---',
      '',
    ],
    'indie-mag-subtitle-inheritance',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*18px 18px 0 0[^"]*"/,
    );
    assert.match(html, /<td[^>]*style="[^"]*border-radius:\s*0 0 18px 18px[^"]*"/);
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*color:\s*#f5f2eb[^"]*"[^>]*>Near Future Laboratory Podcast<\/p>/,
    );
  } finally {
    cleanup();
  }
});

test('indie-mag-single-column subtitle preserves legacy gray and default radius', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Indie Mag Subtitle Fallback',
      'preheader: Verify indie-mag subtitle fallback',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: indie-mag-single-column',
      '    title: From The Tape Archives',
      '    items:',
      '      - title: Podcast Archive',
      '        subtitle: Legacy Subtitle Gray',
      '        description: "<p>Archive note.</p>"',
      '---',
      '',
    ],
    'indie-mag-subtitle-fallback',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*10px 10px 0 0[^"]*"/,
    );
    assert.match(html, /<td[^>]*style="[^"]*border-radius:\s*0 0 10px 10px[^"]*"/);
    assert.match(
      html,
      /<p class="mob-text mob-subtitle"[^>]*style="[^"]*color:\s*#707070[^"]*"[^>]*>Legacy Subtitle Gray<\/p>/,
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
      '  - type: feature',
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
      '        link: https://nearfuturelaboratory.com/newsletters/2026/style-explicit-link',
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
      /<a href="https:\/\/nearfuturelaboratory\.com\/newsletters\/2026\/style-explicit-link"[^>]*style="[^"]*color:\s*#ffd6d6[^"]*"[^>]*>Explicit Link Color<\/a>/,
    );
  } finally {
    cleanup();
  }
});

test('inline link style cleanup preserves non-overridden background and box styles', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Inline Link Style Preservation',
      'preheader: Verify inline link background style survives preprocessing',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: indie-mag-single-column',
      '    title: Office Hours',
      '    linkStyles:',
      "      color: '#111111'",
      '      textDecoration: underline',
      '    items:',
      '      - title: Office Hours N°312',
      '        description: |-',
      '          <p><a style="text-decoration: none; background-color: #eeeeee; padding: 0 6px; border-radius: 4%;" href="https://www.visionandartproject.org/">The Artist’s Eyes</a></p>',
      '---',
      '',
    ],
    'inline-link-style-preservation',
  );

  try {
    const anchorMatch = html.match(/<a[^>]+href="https:\/\/www\.visionandartproject\.org\/"[^>]*>The Artist’s Eyes<\/a>/);
    assert.ok(anchorMatch, 'expected rendered inline link');
    const anchor = anchorMatch[0];
    assert.match(anchor, /style="[^"]*background-color:\s*#eeeeee[^"]*"/);
    assert.match(anchor, /style="[^"]*padding:\s*0 6px[^"]*"/);
    assert.match(anchor, /style="[^"]*border-radius:\s*4%[^"]*"/);
    assert.match(anchor, /style="[^"]*text-decoration:\s*underline[^"]*"/);
    assert.match(anchor, /style="[^"]*color:\s*#111111[^"]*"/);
    assert.doesNotMatch(anchor, /background-padding/);
  } finally {
    cleanup();
  }
});

test('adjacency feature title renders larger than dek while preserving typography', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Adjacency Feature Header Sizes',
      'preheader: Verify title and dek hierarchy',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: adjacency-feature',
      '    rubric: Features',
      '    title: Example Feature Title',
      '    dek: Example feature dek.',
      '    bodyHtml: <p>Body copy.</p>',
      '    ctaText: Read More',
      '    ctaLink: https://nearfuturelaboratory.com/newsletters/2026/adjacency-feature-read',
      '---',
      '',
    ],
    'adjacency-feature-header-sizes',
  );

  try {
    assert.match(
      html,
      /<h1 class="mob-text mob-title"[^>]*style="(?=[^"]*font-family:\s*Georgia)(?=[^"]*font-size:\s*21px)[^"]*"[^>]*>\s*Example Feature Title\s*<\/h1>/,
    );
    assert.match(
      html,
      /<p style="[^"]*font-family:\s*Georgia[^"]*font-size:\s*18px[^"]*font-style:\s*italic[^"]*"[^>]*>Example feature dek\.<\/p>/,
    );
  } finally {
    cleanup();
  }
});
