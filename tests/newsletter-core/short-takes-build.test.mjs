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
      { type: 'callout', items: [{ calloutText: 'DENSE MIDDLE SENTINEL' }] },
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

function assertRenderedShortTakes(html, templateName, middleSentinel, endSentinel, { linkedAnchorCount = 2 } = {}) {
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

  const unlinkedCard = cards[0];
  const outerCell = unlinkedCard.parentElement;
  assert.ok(outerCell);
  const outerPadding = templateName === 'dense-discovery' ? /padding:20px 12px 25px/i : /padding:0/i;
  assert.match(outerCell.getAttribute('style'), outerPadding);
  assert.equal(unlinkedCard.querySelectorAll('a').length, 0);
  assert.equal(unlinkedCard.querySelector('img').getAttribute('alt'), 'A complete unlinked Short Take image');
  assert.match(unlinkedCard.querySelector('img').getAttribute('style'), /width:\s*100%/i);
  assert.match(unlinkedCard.querySelector('img').getAttribute('style'), /height:\s*auto/i);
  const imagePadding = templateName === 'dense-discovery' ? /padding:0 12px 15px/i : /padding:0 18px 15px/i;
  assert.match(unlinkedCard.querySelector('img').closest('td').getAttribute('style'), imagePadding);
  assert.equal(unlinkedCard.querySelectorAll('p').length, 2);
  assert.equal(unlinkedCard.querySelectorAll('p')[0].textContent.trim(), 'Unlinked Short Take caption.');
  assert.equal(unlinkedCard.querySelectorAll('p')[1].textContent.trim(), 'Second caption sentence.');

  const linkedCard = cards[1];
  const anchors = [...linkedCard.querySelectorAll('a[href="https://example.com/short-take"]')];
  assert.equal(anchors.length, linkedAnchorCount);
  anchors.forEach((anchor) => {
    assert.equal(anchor.getAttribute('data-link-label'), 'short-take-linked');
    assert.equal(anchor.getAttribute('data-link-category'), 'short-take');
  });
  assert.equal(linkedCard.querySelectorAll('a a').length, 0);
  assert.equal(linkedCard.querySelector('a[href="https://example.com/inside"]'), null);
  assert.match(linkedCard.textContent, /inline source/);
  assert.match(linkedCard.textContent, /Linked Short Take Headline/);
  assert.match(linkedCard.textContent, /SHORT TAKES FROM AN ADJACENT NOW/);
  assert.match(linkedCard.textContent, /NFL/);

  if (templateName === 'dense-discovery') {
    assert.equal(cardRow(unlinkedCard).previousElementSibling?.querySelector('.spacer'), null);
  } else {
    const wrapper = unlinkedCard.parentElement?.parentElement?.parentElement?.parentElement;
    assert.ok(wrapper);
    assert.equal(wrapper.tBodies[0].rows.length, 1);
    assert.equal(wrapper.tBodies[0].rows[0].querySelector('table[data-short-take-id]'), unlinkedCard);
  }
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
    { linkedAnchorCount: 4 },
  );
});
