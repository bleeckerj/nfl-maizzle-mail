import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

function buildNewsletter(markdownLines, outputName, ads) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), `${outputName}-`));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');

  writeFileSync(issuePath, markdownLines.join('\n'), 'utf8');
  // A local registry keeps ad rendering regressions independent of editorial inventory.
  const adsPath = path.join(tempRoot, 'ads.json');
  if (ads) writeFileSync(adsPath, JSON.stringify(ads), 'utf8');

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
        env: ads ? { ...process.env, NFL_EDITORIAL_ADS_PATH: adsPath } : process.env,
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

function extractFoodForThoughtItemRadii(html) {
  return [...html.matchAll(
    /<td[^>]*class="padt20 padr20 padl20"[^>]*style="[^"]*border-bottom-left-radius:\s*([^;"]+);border-bottom-right-radius:\s*([^;"]+)/g,
  )].map(([, leftRadius, rightRadius]) => `${leftRadius}/${rightRadius}`);
}

test('ad-block heading fallback font and text survive template rendering and CSS inlining', () => {
  // Exercise the component locals boundary with punctuation and literal markup.
  const heading = `Tomorrow's Ads Today & "Next" <em>literal</em> &#039;`;
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Ad Heading Regression',
      'footer:',
      '  footerCta:',
      '    enabled: false',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: ad-block',
      `    title: ${JSON.stringify(heading)}`,
      `    description: ${JSON.stringify('<p>Reader\'s <em>notes & details</em></p>')}`,
      '    items:',
      '      - adId: font-regression-fixture',
      '  - type: ad-block',
      '    title: Second placement',
      '    items:',
      '      - adId: font-regression-fixture',
      '---',
      '',
    ],
    'ad-heading-font-regression',
    [{ id: 'font-regression-fixture', title: 'Test advertisement', copy: 'Renderer test content.' }],
  );

  try {
    assert.match(html, /<h1[^>]*style="[^"]*font-family:\s*Ubuntu,\s*sans-serif[^"]*"[^>]*>\s*Tomorrow/);
    assert.doesNotMatch(html, /&#0?39;Ubuntu/);
    const document = new JSDOM(html).window.document;
    const renderedHeading = [...document.querySelectorAll('h1')].find(node => node.textContent.includes('Tomorrow'));
    assert.equal(renderedHeading?.textContent.replace(/\u200b/g, '').replace(/\s+/g, ' ').trim(), heading);
    assert.equal(renderedHeading.querySelector('em'), null, 'heading markup must remain text');
    assert.equal([...document.querySelectorAll('h1')].filter(node => node.textContent.trim() === 'Second placement').length, 1, 'each component must resolve its own section index');
    assert.ok([...document.querySelectorAll('p')].some(node => node.textContent === "Reader's notes & details" && node.querySelector('em')), 'rich descriptions must retain their authored markup');
  } finally {
    cleanup();
  }
});

function extractSingleColumnItemRadii(html) {
  return [...html.matchAll(
    /<td[^>]*class="padt20 padr20 padl20"[^>]*style="[^"]*border-radius:\s*0 0 ([^ ]+) ([^;"]+)[;"]/g,
  )].map(([, leftRadius, rightRadius]) => `${leftRadius}/${rightRadius}`);
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

test('indie-mag-single-column uses normalized style buckets for text and links', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Indie Mag Bucket Overrides',
      'preheader: Verify indie-mag text and link buckets',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: indie-mag-single-column',
      '    title: Boston ICA',
      '    containerStyles:',
      "      backgroundColor: '#ff9567'",
      '      padding: 12px 14px',
      '      borderRadius: 6px',
      '    contentStyles:',
      "      color: '#fafafa'",
      '    headingStyles:',
      "      color: '#fffdf5'",
      '    linkStyles:',
      "      color: '#ffe8dc'",
      '    items:',
      '      - title: AIGA Boston / ICA Boston Present Rick Griffith',
      '        link: https://superquietkeystrokes.com/Boston_ICA_Talk/',
      '        description: "<p>A hosted video page.</p>"',
      '        details: "<p>RISD conversation details.</p>"',
      '        note: "Video archive note."',
      '        readMoreText: Watch the talk',
      '        readMoreLink: https://superquietkeystrokes.com/Boston_ICA_Talk/',
      '---',
      '',
    ],
    'indie-mag-bucket-overrides',
  );

  try {
    assert.match(html, /<h1 class="mob-text mob-title"[^>]*style="[^"]*color:\s*#fffdf5[^"]*"[^>]*>Boston ICA<\/h1>/);
    assert.match(
      html,
      /<a href="https:\/\/superquietkeystrokes\.com\/Boston_ICA_Talk\/"[^>]*style="[^"]*color:\s*#ffe8dc[^"]*"[^>]*>AIGA Boston \/ ICA Boston Present Rick Griffith<\/a>/,
    );
    assert.match(
      html,
      /<p class="mob-text"[^>]*style="[^"]*color:\s*#fafafa[^"]*"[^>]*>A hosted video page\.<\/p>/,
    );
    assert.match(
      html,
      /<div class="item-details"[^>]*style="[^"]*color:\s*#fafafa[^"]*"[^>]*>\s*<p[^>]*>RISD conversation details\.<\/p>/,
    );
    assert.match(
      html,
      /<div[^>]*style="[^"]*color:\s*#fafafa[^"]*"[^>]*>Video archive note\.<\/div>/,
    );
    assert.match(
      html,
      /<a href="https:\/\/superquietkeystrokes\.com\/Boston_ICA_Talk\/"[^>]*style="[^"]*color:\s*#ffe8dc[^"]*"[^>]*>Watch the talk<\/a>/,
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

test('food-for-thought preserves square corners when no radius is configured', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Food For Thought Default Radius',
      'preheader: Verify food for thought default radius',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: food-for-thought',
      '    title: Food For Thought',
      '    items:',
      '      - title: Default Radius Item',
      '        description: "<p>Default radius content.</p>"',
      '---',
      '',
    ],
    'food-for-thought-default-radius',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*0px 0px 0 0[^\"]*"[^>]*>/,
    );
    assert.deepEqual(extractFoodForThoughtItemRadii(html), ['0px/0px']);
  } finally {
    cleanup();
  }
});

test('food-for-thought applies configured radius to a single item', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Food For Thought Single Radius',
      'preheader: Verify food for thought single item radius',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: food-for-thought',
      '    title: Food For Thought',
      '    containerStyles:',
      '      borderRadius: 12px',
      '    items:',
      '      - title: Single Radius Item',
      '        description: "<p>Single radius content.</p>"',
      '---',
      '',
    ],
    'food-for-thought-single-radius',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*12px 12px 0 0[^\"]*"[^>]*>/,
    );
    assert.deepEqual(extractFoodForThoughtItemRadii(html), ['12px/12px']);
  } finally {
    cleanup();
  }
});

test('food-for-thought squares intermediate items and rounds the final item', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Food For Thought Stack Radius',
      'preheader: Verify food for thought stacked item radius',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: food-for-thought',
      '    title: Food For Thought',
      '    containerStyles:',
      '      borderRadius: 18px',
      '    items:',
      '      - title: First Stack Item',
      '        description: "<p>First stack content.</p>"',
      '      - title: Second Stack Item',
      '        description: "<p>Second stack content.</p>"',
      '      - title: Final Stack Item',
      '        description: "<p>Final stack content.</p>"',
      '---',
      '',
    ],
    'food-for-thought-stack-radius',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*18px 18px 0 0[^\"]*"[^>]*>/,
    );
    assert.deepEqual(extractFoodForThoughtItemRadii(html), [
      '0px/0px',
      '0px/0px',
      '18px/18px',
    ]);
  } finally {
    cleanup();
  }
});

test('single-column captions inherit explicit content color and preserve the legacy fallback', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Single Column Caption Inheritance',
      'preheader: Verify caption color inheritance',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: single-column',
      '    title: Archive',
      '    contentStyles:',
      "      color: '#ffffff'",
      '    items:',
      '      - title: Explicit Caption Color',
      '        image:',
      '          src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/7400a885-a077-4edb-1364-5865d47e0800/public?format=webp',
      '          alt: Caption inheritance fixture',
      '          caption: White caption',
      '  - type: single-column',
      '    title: Legacy Archive',
      '    items:',
      '      - title: Default Caption Color',
      '        image:',
      '          src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/7400a885-a077-4edb-1364-5865d47e0800/public?format=webp',
      '          alt: Caption fallback fixture',
      '          caption: Legacy gray caption',
      '---',
      '',
    ],
    'single-column-caption-inheritance',
  );

  try {
    assert.match(
      html,
      /<p class="[^"]*mob-caption[^"]*"[^>]*color:\s*#ffffff[^>]*>White caption<\/p>/,
    );
    assert.match(
      html,
      /<p class="[^"]*mob-caption[^"]*"[^>]*color:\s*#495263[^>]*>Legacy gray caption<\/p>/,
    );
  } finally {
    cleanup();
  }
});

test('single-column squares intermediate items and rounds only the final item', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Single Column Stack Radius',
      'preheader: Verify single-column stacked item radius',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: single-column',
      '    title: From the Archives',
      '    containerStyles:',
      '      borderRadius: 18px',
      '    items:',
      '      - title: First Stack Item',
      '        description: "<p>First stack content.</p>"',
      '      - title: Second Stack Item',
      '        description: "<p>Second stack content.</p>"',
      '      - title: Final Stack Item',
      '        description: "<p>Final stack content.</p>"',
      '---',
      '',
    ],
    'single-column-stack-radius',
  );

  try {
    assert.match(
      html,
      /<td[^>]*class="headline"[^>]*style="[^"]*border-radius:\s*18px 18px 0 0[^"]*"[^>]*>/,
    );
    assert.deepEqual(extractSingleColumnItemRadii(html), [
      '0px/0px',
      '0px/0px',
      '18px/18px',
    ]);
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

test('sponsor platformLinks render small buttons without shrinking title or read more links', () => {
  const { html, cleanup } = buildNewsletter(
    [
      '---',
      'template: dense-discovery',
      'title: Platform Links',
      'preheader: Verify platform links render outside rich text link styling',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'sections:',
      '  - type: sponsor',
      '    title: Podcast',
      '    linkStyles:',
      "      color: '#111111'",
      '      textDecoration: none',
      "      fontFamily: '''Share Tech Mono'', ''IBM Plex Mono'', monospace'",
      '      fontSize: 19px',
      '    items:',
      '      - title: Episode 104',
      '        link: https://example.com/?episode',
      '        description: "<p>Episode description.</p>"',
      '        platformLinks:',
      '          - platform: spotify',
      '            label: Spotify',
      '            url: https://example.com/?spotify',
      '            category: podcast',
      '            intent: listen',
      '            interests:',
      '              - audio',
      '          - platform: youtube',
      '            label: YouTube',
      '            url: https://example.com/?youtube',
      '            category: podcast',
      '            intent: watch',
      '            interests:',
      '              - video',
      '          - platform: apple-podcasts',
      '            label: Apple Podcasts',
      '            url: https://example.com/?apple',
      '            category: podcast',
      '            intent: listen',
      '            interests:',
      '              - audio',
      '        readMoreText: Listen and read',
      '        readMoreLink: https://example.com/?read-more',
      '---',
      '',
    ],
    'sponsor-platform-links',
  );

  try {
    const descriptionIndex = html.indexOf('Episode description.');
    const spotifyIndex = html.indexOf('data-link-label="Spotify"');
    const readMoreIndex = html.indexOf('Listen and read');
    assert.ok(descriptionIndex >= 0, 'expected description to render');
    assert.ok(spotifyIndex > descriptionIndex, 'expected platform buttons after description');
    assert.ok(readMoreIndex > spotifyIndex, 'expected read more after platform buttons');

    const spotifyAnchor = html.match(/<a href="https:\/\/example\.com\/\?spotify"[^>]*>[\s\S]*?Spotify[\s\S]*?<\/a>/)?.[0] || '';
    assert.match(spotifyAnchor, /padding:6px 10px/);
    assert.match(spotifyAnchor, /font-size:14px/);
    assert.match(spotifyAnchor, /color:#111111/);
    assert.match(spotifyAnchor, /-webkit-text-fill-color:#111111/);
    assert.doesNotMatch(spotifyAnchor, /color:#EE3BBB/);
    assert.match(spotifyAnchor, /data-link-category="podcast"/);
    assert.match(spotifyAnchor, /data-link-intent="listen"/);
    assert.match(spotifyAnchor, /data-link-interest="audio"/);
    assert.match(spotifyAnchor, /img\.icons8\.com\/ios-glyphs\/20\/000000\/spotify\.png/);
    assert.match(spotifyAnchor, /width="20"/);
    assert.match(spotifyAnchor, /height="20"/);

    const youtubeAnchor = html.match(/<a href="https:\/\/example\.com\/\?youtube"[^>]*>[\s\S]*?YouTube[\s\S]*?<\/a>/)?.[0] || '';
    assert.match(youtubeAnchor, /data-link-label="YouTube"/);
    assert.match(youtubeAnchor, /data-link-intent="watch"/);
    assert.match(youtubeAnchor, /data-link-interest="video"/);

    const appleAnchor = html.match(/<a href="https:\/\/example\.com\/\?apple"[^>]*>[\s\S]*?Apple\s+Podcasts[\s\S]*?<\/a>/)?.[0] || '';
    assert.match(appleAnchor, /data-link-label="Apple Podcasts"/);
    assert.match(appleAnchor, /img\.icons8\.com\/\?size=20&amp;id=ZsAN3pzKcy09&amp;format=png/);

    const titleAnchor = html.match(/<a href="https:\/\/example\.com\/\?episode"[^>]*>Episode 104<\/a>/)?.[0] || '';
    assert.match(titleAnchor, /font-size:19px/);
    assert.doesNotMatch(titleAnchor, /font-size:14px/);

    const readMoreAnchor = html.match(/<a href="https:\/\/example\.com\/\?read-more"[^>]*>Listen and read<\/a>/)?.[0] || '';
    assert.match(readMoreAnchor, /font-size:19px/);
    assert.doesNotMatch(readMoreAnchor, /font-size:14px/);
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
      '    author: Near Future Laboratory',
      '    dateLabel: Always Now',
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
    assert.match(html, /<p[^>]*>\s*By Near Future Laboratory · DATE: Always Now<\/p>/);
  } finally {
    cleanup();
  }
});
