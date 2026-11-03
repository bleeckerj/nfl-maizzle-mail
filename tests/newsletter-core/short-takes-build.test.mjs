import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

const inventory = [
  {
    id: 'short-take-unlinked',
    headline: 'Unlinked Short Take Headline',
    image: {
      url: 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/b3786ce1-69f3-4bc5-b55a-6b3f5e77f800/public',
      altText: 'A complete unlinked Short Take image',
    },
    caption: '<p>Unlinked Short Take caption.</p><p>Second caption sentence.</p>',
    maxWidth: '95%',
    lockup: { brandRail: false, mediaSizing: 'copy-first', imageAlignment: 'top' },
    topLeft: 'AUTONOMOUS NEWS',
    bottomLeft: 'WOULD YOU LIKE TO KNOW MORE?',
  },
  {
    id: 'short-take-linked',
    headline: 'Linked Short Take Headline',
    image: {
      url: 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/f27bdc06-e6fa-4b81-9ac9-a15480f68500/public',
      altText: 'A complete linked Short Take image',
    },
    caption: 'Linked caption with <a href="https://example.com/inside">inline source</a>.',
    url: 'https://example.com/short-take',
    maxWidth: { base: '90%', md: '44rem' },
    topRight: 'SHORT TAKES FROM AN ADJACENT NOW',
    bottomRight: 'NFL',
  },
];

function shortTake(id) {
  return { type: 'short-take', items: [{ shortTakeId: id }] };
}

function denseFixture() {
  return {
    template: 'dense-discovery',
    title: 'Dense Discovery Short Takes',
    preheader: 'Short Takes build fixture',
    sectionStylesFile: 'templates/dense-discovery/section-styles.json',
    header: {},
    intro: { title: 'Short Takes', content: '<p>Dense fixture intro.</p>' },
    sections: [
      shortTake('short-take-unlinked'),
      { type: 'callout', items: [{ calloutText: '<p>DENSE MIDDLE SENTINEL</p>' }] },
      shortTake('short-take-linked'),
      shortTake('short-take-unlinked'),
      { type: 'quote', items: [{ quote: 'DENSE END SENTINEL' }] },
      shortTake('short-take-linked'),
    ],
    footer: {
      emailShare: 'mailto:?subject=Short%20Takes',
      newsletterSubscribeLink: 'https://nearfuturelaboratory.com/newsletter/',
      footerCta: { enabled: false },
      logoLink: 'https://nearfuturelaboratory.com',
      unsubscribeLink: '[unsubscribe]',
      shareUrl: 'https://nearfuturelaboratory.com/newsletters/2026/short-takes',
      archiveUrl: 'https://nearfuturelaboratory.com/newsletters',
      address: 'Near Future Laboratory',
      colophon: 'Short Takes fixture.',
    },
  };
}

function dailyFixture() {
  return {
    template: 'near-future-lab-daily-headlines',
    title: 'Daily Headlines Short Takes',
    preheader: 'Short Takes build fixture',
    sectionStylesFile: 'templates/near-future-lab-daily-headlines/section-styles.json',
    sections: [
      shortTake('short-take-unlinked'),
      { type: 'intro_statement', statement: 'DAILY MIDDLE SENTINEL' },
      shortTake('short-take-linked'),
      shortTake('short-take-unlinked'),
      { type: 'section_article_group', section_label: 'DAILY END SENTINEL', articles: [] },
      shortTake('short-take-linked'),
    ],
  };
}

function buildFixture(templateName, source) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), `short-take-${templateName}-`));
  const sourcePath = path.join(tempRoot, 'issue.json');
  const inventoryPath = path.join(tempRoot, 'shortTakes.json');
  const adsPath = path.join(tempRoot, 'ads.json');
  const httpMockPath = path.join(tempRoot, 'mock-http.mjs');
  const isolatedRepo = path.join(tempRoot, 'nfl-maizzle-mail');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = `${templateName}-short-takes`;
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(path.join(isolatedRepo, 'data'), { recursive: true });
  mkdirSync(path.join(isolatedRepo, 'templates'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'config.production.cjs'), path.join(isolatedRepo, 'config.production.cjs'));
  cpSync(
    path.join(REPO_ROOT, 'templates', templateName),
    path.join(isolatedRepo, 'templates', templateName),
    { recursive: true },
  );
  // The other native email templates share Dense Discovery's rail in production.
  if (templateName !== 'dense-discovery') {
    const sharedComponents = path.join(isolatedRepo, 'templates', 'dense-discovery', 'components');
    mkdirSync(sharedComponents, { recursive: true });
    cpSync(
      path.join(REPO_ROOT, 'templates', 'dense-discovery', 'components', 'ShortTakeBrandRail.html'),
      path.join(sharedComponents, 'ShortTakeBrandRail.html'),
    );
  }
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(isolatedRepo, 'node_modules'), 'dir');
  writeFileSync(sourcePath, JSON.stringify(source), 'utf8');
  writeFileSync(inventoryPath, JSON.stringify(inventory), 'utf8');
  writeFileSync(adsPath, '[]', 'utf8');
  writeFileSync(
    httpMockPath,
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

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        sourcePath,
        outputName,
        `--template=${templateName}`,
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
          NFL_EDITORIAL_ADS_PATH: adsPath,
          NFL_EDITORIAL_SHORT_TAKES_PATH: inventoryPath,
          NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${httpMockPath}`].filter(Boolean).join(' '),
        },
      },
    );
    return readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assertRenderedShortTakes(html, templateName, middleSentinel, endSentinel, { linkedAnchorCount = 4 } = {}) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const cards = [...document.querySelectorAll('[data-short-take-id]')];
  assert.ok(cards.length, [
    `Short Take cards missing from ${html.length}-character build`,
    `headline=${html.includes('Unlinked Short Take Headline')}`,
    `component-comment=${html.includes('SHORT TAKE Start')}`,
    `data-attribute=${html.includes('data-short-take-id')}`,
  ].join('; '));
  assert.deepEqual(cards.map((card) => card.getAttribute('data-short-take-id')), [
    'short-take-unlinked',
    'short-take-linked',
    'short-take-unlinked',
    'short-take-linked',
  ]);

  assert.ok(html.indexOf('short-take-unlinked') < html.indexOf(middleSentinel));
  assert.ok(html.indexOf(middleSentinel) < html.indexOf('short-take-linked'));
  assert.ok(html.indexOf(endSentinel) < html.lastIndexOf('short-take-linked'));

  for (const card of cards) {
    const rail = card.querySelector('[data-short-take-brand-rail]');
    const image = card.querySelector('img[alt^="A complete"]');
    const headline = card.querySelector('h2');
    const caption = card.querySelector('.email-short-take-body');
    assert.ok(rail && image && headline && caption, 'bar, image, headline, and caption are present');
    assert.equal(rail.querySelector('[data-short-take-label]')?.textContent.trim(), 'SHORT TAKES');
    assert.ok(rail.compareDocumentPosition(image) & 4);
    assert.ok(image.compareDocumentPosition(headline) & 4);
    assert.ok(headline.compareDocumentPosition(caption) & 4);
    assert.match(image.getAttribute('style'), /width:\s*100%/i);
    assert.match(image.getAttribute('style'), /height:\s*auto/i);
    assert.match(caption.getAttribute('style'), /font-size:\s*18px/i);
    assert.match(caption.getAttribute('style'), /line-height:\s*26px/i);
  }
  assert.equal(cards[0].querySelectorAll('a').length, 0);
  assert.equal(cards[0].querySelectorAll('.email-short-take-body p').length, 2);
  const linkedCard = cards[1];
  const destination = linkedCard.querySelector('a[href="https://example.com/short-take"]');
  assert.ok(destination);
  assert.equal(destination.getAttribute('data-link-category'), 'short-take');
  assert.ok(linkedCard.querySelector('a[href="https://example.com/inside"]'));
  assert.equal(linkedCard.querySelectorAll('a a').length, 0);
  assert.match(linkedCard.textContent, /Linked Short Take Headline/);

}

function cardRow(card) {
  return card.closest('tr');
}

test('dense-discovery builds ordered linked and unlinked Short Takes', () => {
  assertRenderedShortTakes(buildFixture('dense-discovery', denseFixture()), 'dense-discovery', 'DENSE MIDDLE SENTINEL', 'DENSE END SENTINEL');
});

test('near-future-lab-daily-headlines builds ordered linked and unlinked Short Takes', () => {
  assertRenderedShortTakes(
    buildFixture('near-future-lab-daily-headlines', dailyFixture()),
    'near-future-lab-daily-headlines',
    'DAILY MIDDLE SENTINEL',
    'DAILY END SENTINEL',
    { linkedAnchorCount: 5 },
  );
});

// The invite template is the third native Short Take consumer. Keep its rail
// and footer action connected to the same hydrated registry settings.
test('brain-dead-template shares the selected rail and links the footer CTA', () => {
  const html = buildFixture('brain-dead-template', {
    template: 'brain-dead-template',
    title: 'Short Take component checks',
    sections: [shortTake('short-take-unlinked'), shortTake('short-take-linked')],
  });
  const document = new JSDOM(html).window.document;
  const unlinked = document.querySelector('[data-short-take-id="short-take-unlinked"]');
  const linked = document.querySelector('[data-short-take-id="short-take-linked"]');
  assert.ok(unlinked);
  assert.ok(linked);
  assert.equal(unlinked.querySelector('[data-short-take-brand-rail]'), null);
  assert.equal(unlinked.querySelectorAll('a').length, 0);
  const label = linked.querySelector('[data-short-take-label]');
  assert.equal(label?.textContent.trim(), 'SHORT TAKES');
  assert.match(label.getAttribute('style'), /font-family:[^;]*Geist/i);
  assert.match(label.getAttribute('style'), /font-weight:700/i);
  const cta = [...linked.querySelectorAll('a')].find(anchor => anchor.textContent.trim() === 'DO YOU WANT TO KNOW MORE?');
  assert.equal(cta?.getAttribute('href'), 'https://example.com/short-take');
  assert.equal(cta?.getAttribute('data-link-category'), 'short-take');
  assert.match(html, /fonts\.googleapis\.com\/css2\?[^"<>]*Geist/);
});
