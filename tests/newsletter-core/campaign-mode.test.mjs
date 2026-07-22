import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

const shortTakes = [
  {
    id: 'campaign-short-take',
    headline: 'A campaign Short Take',
    image: {
      url: 'https://imagedelivery.net/example/campaign-short-take/public',
      altText: 'Campaign Short Take image',
    },
    caption: 'A campaign Short Take caption.',
    url: 'https://example.com/short-take',
  },
];

const ads = [
  {
    id: 'campaign-ad',
    label: 'SPONSORED',
    title: 'A campaign ad',
    sponsor: 'Near Future Laboratory',
    copy: 'A campaign ad description.',
    link: { url: 'https://example.com/campaign-ad', label: 'Learn more' },
    media: {
      src: 'https://imagedelivery.net/example/campaign-ad/public',
      altText: 'Campaign ad image',
    },
  },
];

function writeHttpMock(tempRoot) {
  const mockPath = path.join(tempRoot, 'http-mock.mjs');
  writeFileSync(
    mockPath,
    [
      "import http from 'node:http';",
      "import https from 'node:https';",
      "import { EventEmitter } from 'node:events';",
      'function request(_url, _options, callback) {',
      '  const req = new EventEmitter();',
      '  req.destroy = () => {};',
      '  req.end = () => queueMicrotask(() => callback({ statusCode: 200, resume() {} }));',
      '  return req;',
      '}',
      'http.request = request;',
      'https.request = request;',
    ].join('\n'),
    'utf8',
  );
  return mockPath;
}

function campaignSource() {
  return [
    '---',
    'publicationMode: campaign',
    'template: brain-dead-template',
    'title: Campaign email fixture',
    'preheader: Campaign fixture preheader',
    'hero:',
    '  headline: Campaign fixture',
    '  subhead: Two registry-backed sections.',
    'sections:',
    '  - type: ad-slot',
    '  - type: short-take-slot',
    '  - type: short-take',
    '    items:',
    '      - shortTakeId: campaign-short-take',
    '  - type: ad-block',
    '    items:',
    '      - adId: campaign-ad',
    'footer:',
    '  footerCta:',
    '    enabled: false',
    '  unsubscribeLink: "[unsubscribe]"',
    '---',
    '',
  ].join('\n');
}

function runBuild({ sourcePath, outputDir, isolatedRepo, outputName = 'campaign-fixture', templateName = 'brain-dead-template' }) {
  const tempRoot = path.dirname(path.dirname(sourcePath));
  const httpMockPath = writeHttpMock(tempRoot);
  return execFileSync(
    process.execPath,
    [
      BUILD_SCRIPT,
      sourcePath,
      outputName,
      `--template=${templateName}`,
      '--publication-mode=campaign',
      `--repo-root=${isolatedRepo}`,
      `--output-dir=${outputDir}`,
      '--strict-schema',
      '--no-open',
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        NFL_EDITORIAL_ADS_PATH: path.join(tempRoot, 'ads.json'),
        NFL_EDITORIAL_SHORT_TAKES_PATH: path.join(tempRoot, 'shortTakes.json'),
        NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${httpMockPath}`].filter(Boolean).join(' '),
      },
    },
  );
}

function setup() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'campaign-email-build-'));
  const isolatedRepo = path.join(tempRoot, 'nfl-maizzle-mail');
  const outputDir = path.join(tempRoot, 'output', 'email-campaigns', 'campaign-fixture');
  const sourcePath = path.join(tempRoot, 'email-campaigns', 'campaign-fixture.md');
  mkdirSync(path.join(isolatedRepo, 'data'), { recursive: true });
  mkdirSync(path.dirname(sourcePath), { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(path.join(REPO_ROOT, 'scripts'), path.join(isolatedRepo, 'scripts'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'config.production.cjs'), path.join(isolatedRepo, 'config.production.cjs'));
  cpSync(path.join(REPO_ROOT, 'package.json'), path.join(isolatedRepo, 'package.json'));
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(isolatedRepo, 'node_modules'), 'dir');
  cpSync(
    path.join(REPO_ROOT, 'templates', 'brain-dead-template'),
    path.join(isolatedRepo, 'templates', 'brain-dead-template'),
    { recursive: true },
  );
  cpSync(
    path.join(REPO_ROOT, 'templates', 'dense-discovery'),
    path.join(isolatedRepo, 'templates', 'dense-discovery'),
    { recursive: true },
  );
  writeFileSync(sourcePath, campaignSource(), 'utf8');
  writeFileSync(path.join(tempRoot, 'ads.json'), JSON.stringify(ads), 'utf8');
  writeFileSync(path.join(tempRoot, 'shortTakes.json'), JSON.stringify(shortTakes), 'utf8');
  return { tempRoot, isolatedRepo, outputDir, sourcePath };
}

function denseCampaignSource() {
  return [
    '---',
    'publicationMode: campaign',
    'template: dense-discovery',
    'title: Dense campaign fixture',
    'preheader: Dense campaign fixture preheader',
    'sectionStylesFile: templates/dense-discovery/section-styles.json',
    'intro:',
    '  title: Dense campaign',
    'sections:',
    '  - type: short-take',
    '    items:',
    '      - shortTakeId: campaign-short-take',
    '  - type: ad-block',
    '    title: Partner',
    '    items:',
    '      - adId: campaign-ad',
    'footer:',
    '  footerCta:',
    '    enabled: false',
    '  unsubscribeLink: "[unsubscribe]"',
    '---',
    '',
  ].join('\n');
}

test('campaign brain-dead builds are source-preserving and omit public issue navigation', () => {
  const fixture = setup();
  try {
    const sourceBefore = readFileSync(fixture.sourcePath, 'utf8');
    runBuild(fixture);
    const htmlPath = path.join(fixture.outputDir, 'campaign-fixture.html');
    const linkManifestPath = path.join(fixture.outputDir, 'campaign-fixture.link-tracking-manifest.json');
    const contentSlotManifestPath = path.join(fixture.outputDir, 'campaign-fixture.content-slots.json');
    assert.ok(existsSync(htmlPath));
    assert.ok(existsSync(linkManifestPath));
    assert.ok(existsSync(contentSlotManifestPath));
    const first = {
      html: readFileSync(htmlPath, 'utf8'),
      links: readFileSync(linkManifestPath, 'utf8'),
      slots: readFileSync(contentSlotManifestPath, 'utf8'),
    };
    assert.match(first.html, /A campaign Short Take/);
    assert.match(first.html, /A campaign ad/);
    assert.match(first.html, /data-content-slot="ad_slot"/);
    assert.match(first.html, /data-content-slot="short_take"/);
    const contentSlotManifest = JSON.parse(first.slots);
    assert.deepEqual(
      contentSlotManifest.slots.map((slot) => slot.slotKey),
      ['ad_slot', 'short_take'],
    );
    assert.deepEqual(
      contentSlotManifest.slots.map((slot) => slot.textMarker),
      ['[[content-slot:ad_slot]]', '[[content-slot:short_take]]'],
    );
    assert.match(first.html, /\[unsubscribe\]/);
    assert.doesNotMatch(first.html, /View\/share online/);
    assert.doesNotMatch(first.html, /View this issue online/);
    assert.doesNotMatch(first.html, /Share this issue/);
    assert.doesNotMatch(first.html, /Browse older issues/);
    assert.equal(readFileSync(fixture.sourcePath, 'utf8'), sourceBefore);

    runBuild(fixture);
    assert.deepEqual(
      {
        html: readFileSync(htmlPath, 'utf8'),
        links: readFileSync(linkManifestPath, 'utf8'),
        slots: readFileSync(contentSlotManifestPath, 'utf8'),
      },
      first,
    );
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('campaign builds fail before output when a registry id is invalid', () => {
  const fixture = setup();
  try {
    writeFileSync(fixture.sourcePath, campaignSource().replace('campaign-ad', 'missing-ad'), 'utf8');
    assert.throws(
      () => runBuild(fixture),
      /unknown adId "missing-ad"/,
    );
    assert.equal(existsSync(path.join(fixture.outputDir, 'campaign-fixture.html')), false);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('dense-discovery campaign builds omit the full public footer block', () => {
  const fixture = setup();
  const outputName = 'dense-campaign-fixture';
  try {
    writeFileSync(fixture.sourcePath, denseCampaignSource(), 'utf8');
    runBuild({ ...fixture, outputName, templateName: 'dense-discovery' });
    const html = readFileSync(path.join(fixture.outputDir, `${outputName}.html`), 'utf8');
    assert.match(html, /Dense campaign/);
    assert.match(html, /A campaign Short Take/);
    assert.match(html, /A campaign ad/);
    assert.match(html, /\[unsubscribe\]/);
    assert.doesNotMatch(html, /View\/share online/);
    assert.doesNotMatch(html, /View this issue online/);
    assert.doesNotMatch(html, /Share this issue/);
    assert.doesNotMatch(html, /Browse older issues/);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
