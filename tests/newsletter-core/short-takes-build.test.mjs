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

  const unlinkedCard = cards[0];
  const outerCell = unlinkedCard.parentElement;
  assert.ok(outerCell);
  const outerPadding = templateName === 'dense-discovery' ? /padding:8px 0 22px/i : /padding:0/i;
  assert.match(outerCell.getAttribute('style'), outerPadding);
  assert.equal(unlinkedCard.querySelectorAll('a').length, 0);
  const shortTakeImages = [...unlinkedCard.querySelectorAll('img')];
  const shortTakeImage = shortTakeImages.at(-1);
  assert.ok(shortTakeImage);
  assert.equal(shortTakeImage.getAttribute('alt'), 'A complete unlinked Short Take image');
  assert.match(shortTakeImage.getAttribute('style'), /width:\s*100%/i);
  assert.match(shortTakeImage.getAttribute('style'), /height:\s*auto/i);
  const imagePadding = /padding:0/i;
  assert.match(shortTakeImage.closest('td').getAttribute('style'), imagePadding);
  assert.equal(unlinkedCard.querySelector('[data-short-take-brand-rail]'), null);
  assert.equal(unlinkedCard.querySelector('[data-short-take-label]'), null);
  assert.equal(unlinkedCard.querySelector('img[alt="Near Future Laboratory white wordmark"]'), null);
  assert.equal(unlinkedCard.querySelectorAll('p').length, 2);
  assert.equal(unlinkedCard.querySelectorAll('p')[0].textContent.trim(), 'Unlinked Short Take caption.');
  assert.equal(unlinkedCard.querySelectorAll('p')[1].textContent.trim(), 'Second caption sentence.');
  const shortTakeHeadline = unlinkedCard.querySelector('h2');
  const shortTakeCaption = shortTakeHeadline?.nextElementSibling;
  assert.ok(shortTakeHeadline);
  assert.ok(shortTakeCaption);
  const expectedType = templateName === 'dense-discovery'
    ? { headlineSize: '24px', headlineLineHeight: '26px', captionSize: '14px', captionLineHeight: '18px' }
    : { headlineSize: '22px', headlineLineHeight: '24px', captionSize: '13px', captionLineHeight: '16px' };
  assert.match(shortTakeHeadline.getAttribute('style') || '', new RegExp(`font-size:\\s*${expectedType.headlineSize}`, 'i'));
  assert.match(shortTakeHeadline.getAttribute('style') || '', new RegExp(`line-height:\\s*${expectedType.headlineLineHeight}`, 'i'));
  assert.match(shortTakeHeadline.getAttribute('style') || '', /font-weight:\s*700/i);
  assert.match(shortTakeCaption.getAttribute('style') || '', new RegExp(`font-size:\\s*${expectedType.captionSize}`, 'i'));
  assert.match(shortTakeCaption.getAttribute('style') || '', new RegExp(`line-height:\\s*${expectedType.captionLineHeight}`, 'i'));
  assert.match(shortTakeCaption.getAttribute('style') || '', /font-weight:\s*400/i);

  if (templateName === 'dense-discovery') {
    assert.match(shortTakeCaption.getAttribute('class') || '', /\bmob-card-copy\b/);
    const calloutCopy = [...document.querySelectorAll('.mob-compact-copy')]
      .find((element) => element.textContent.includes('DENSE MIDDLE SENTINEL'));
    assert.ok(calloutCopy, 'Dense Discovery callout copy must use the shared compact-copy role');
    assert.match(calloutCopy.querySelector('p')?.getAttribute('class') || '', /\bmob-text\b/);
    assert.match(calloutCopy.getAttribute('style') || '', /font-size:\s*16px/i);
    assert.match(calloutCopy.getAttribute('style') || '', /line-height:\s*1\.1/i);
  }

  const linkedCard = cards[1];
  const brandRail = linkedCard.querySelector('[data-short-take-brand-rail]');
  const label = brandRail?.querySelector('[data-short-take-label]');
  assert.ok(brandRail, 'Default branding must render the complete rail');
  assert.ok(brandRail.querySelector('img[alt="Near Future Laboratory white wordmark"]'));
  assert.match(brandRail.getAttribute('style'), /background:#141414/i);
  assert.equal(linkedCard.querySelectorAll('[data-short-take-label]').length, 1);
  assert.equal(label?.textContent.trim(), 'SHORT TAKES');
  const labelStyle = label.getAttribute('style');
  assert.match(labelStyle, /font-family:[^;]*Geist[^;]*Arial/i);
  assert.match(labelStyle, /font-weight:700/i);
  assert.match(labelStyle, /letter-spacing:0\.035em/i);
  assert.match(labelStyle, /text-align:right/i);
  assert.match(labelStyle, /white-space:nowrap/i);
  assert.match(labelStyle, new RegExp(`font-size:${templateName === 'dense-discovery' ? '21\\.333' : '20'}`));
  assert.match(html, /fonts\.googleapis\.com\/css2\?[^"<>]*Geist/);
  const anchors = [...linkedCard.querySelectorAll('a[href="https://example.com/short-take"]')];
  assert.equal(anchors.length, linkedAnchorCount);
  anchors.forEach((anchor) => {
    assert.equal(anchor.getAttribute('data-link-label'), 'short-take-linked');
    assert.equal(anchor.getAttribute('data-link-category'), 'short-take');
  });
  assert.equal(linkedCard.querySelectorAll('a a').length, 0);
  const footerCta = anchors.find((anchor) => anchor.textContent.trim() === 'DO YOU WANT TO KNOW MORE?');
  assert.ok(footerCta, 'The footer CTA itself must be a hyperlink to the record destination');
  assert.equal(footerCta.getAttribute('href'), 'https://example.com/short-take');
  assert.equal(footerCta.getAttribute('data-link-category'), 'short-take');
  assert.equal(linkedCard.querySelector('a[href="https://example.com/inside"]'), null);
  assert.match(linkedCard.textContent, /inline source/);
  assert.match(linkedCard.textContent, /Linked Short Take Headline/);
  assert.match(linkedCard.textContent, /SHORT TAKES FROM AN ADJACENT NOW/);
  assert.match(linkedCard.textContent, /DO YOU WANT TO KNOW MORE\?/);
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
