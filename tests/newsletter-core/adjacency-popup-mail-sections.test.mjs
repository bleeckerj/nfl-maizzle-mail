import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

function issue(sections) {
  return [
    '---',
    'template: dense-discovery',
    'title: Curated Popup Mail',
    'preheader: Curated popup sections',
    'sectionStylesFile: templates/dense-discovery/section-styles.json',
    'header:',
    '  quote: Tomorrow’s News Today.',
    '  author: The Adjacency',
    'intro:',
    '  title: Extended Dispatch',
    '  viewOnlineLink: https://theadjacency.com/issue/03/features/example',
    '  content: Intro content.',
    'sections:',
    ...sections.flatMap((section) => [
      `  - type: ${section.type}`,
      ...(section.eyebrow ? [`    eyebrow: ${section.eyebrow}`] : []),
      ...(section.heading ? [`    heading: ${section.heading}`] : []),
      ...(section.subheading ? [`    subheading: ${section.subheading}`] : []),
      ...(section.items
        ? [
            '    items:',
            ...section.items.flatMap((item) => [
              `      - kind: ${item.kind}`,
              `        sourceRef: ${item.sourceRef}`,
              `        title: ${item.title}`,
              `        publicUrl: ${item.publicUrl}`,
              `        lede: ${item.lede}`,
              ...(item.label ? [`        label: ${item.label}`] : []),
              ...(item.company ? [`        company: ${item.company}`] : []),
              ...(item.location ? [`        location: ${item.location}`] : []),
              ...(item.department ? [`        department: ${item.department}`] : []),
              ...(item.posted ? [`        posted: ${item.posted}`] : []),
            ]),
          ]
        : []),
    ]),
    'footer:',
    '  newsletterSubscribeLink: false',
    '---',
    '',
  ].join('\n');
}

function buildHtml(sections) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'adjacency-popup-mail-sections-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'adjacency-popup-mail-sections';
  writeFileSync(issuePath, issue(sections), 'utf8');

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--preview',
        '--no-open',
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    );
    return readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const helpWanted = {
  type: 'adjacency-help-wanted',
  eyebrow: 'Tomorrow’s Jobs Today',
  heading: 'Help Wanted',
  items: [
    {
      kind: 'job',
      sourceRef: 'jobs/anthropic/role-one',
      title: 'Founding Lead, Speculative Prototyping',
      publicUrl: 'https://theadjacency.com/jobs/anthropic/role-one',
      lede: 'A role summary.',
      company: 'ANTHROPIC',
      location: 'SAN FRANCISCO, CA',
      department: 'RESEARCH',
      posted: 'IMMEDIATE POST',
    },
    {
      kind: 'job',
      sourceRef: 'jobs/anthropic/role-two',
      title: 'Principal Design Technologist',
      publicUrl: 'https://theadjacency.com/jobs/anthropic/role-two',
      lede: 'Another role summary.',
      company: 'ANTHROPIC',
    },
  ],
};

const todaysMix = {
  type: 'adjacency-todays-mix',
  eyebrow: 'Today’s Mix',
  heading: 'Your Freshly Conjured Content Cocktail',
  subheading: "You may also enjoy these emanations from tomorrow's news",
  items: [
    {
      kind: 'article',
      sourceRef: 'features/issue/1/example-feature',
      title: 'The Example Feature',
      label: 'Report',
      publicUrl: 'https://theadjacency.com/p/example-feature--popup',
      lede: 'The feature lede.',
      author: 'Near Future Laboratory',
      contextTags: ['Autonomous Systems'],
    },
  ],
};

test('dense-discovery renders curated popup sections with popup-matched headings, links, and job metadata', () => {
  const html = buildHtml([helpWanted, todaysMix]);

  assert.match(html, /Tomorrow’s Jobs Today/);
  assert.match(html, /Help Wanted/);
  assert.match(html, /Today’s Mix/);
  assert.match(html, /Founding Lead, Speculative Prototyping/);
  assert.match(html, /ANTHROPIC/);
  assert.match(html, /https:\/\/theadjacency\.com\/jobs\/anthropic\/role-one/);
  assert.match(html, /https:\/\/theadjacency\.com\/p\/example-feature--popup/);
  assert.match(html, /#f2f0ea/);
  assert.match(html, /#fffbf7/);
  assert.ok(html.indexOf('data-section="adjacency-help-wanted"') < html.indexOf('data-section="adjacency-todays-mix"'));
});

test('dense-discovery omits curated popup sections when their arrays are empty', () => {
  const html = buildHtml([]);

  assert.doesNotMatch(html, /data-section="adjacency-help-wanted"/);
  assert.doesNotMatch(html, /data-section="adjacency-todays-mix"/);
});
