import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import posthtml from 'posthtml';
import expressions from 'posthtml-expressions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AD_BLOCK_TEMPLATE = path.join(
  REPO_ROOT,
  'templates',
  'near-future-lab-daily-headlines',
  'components',
  'AdBlock.html',
);

function renderAdBlock(section) {
  const template = readFileSync(AD_BLOCK_TEMPLATE, 'utf8');
  return posthtml([expressions({ locals: { section }, strictMode: false })])
    .process(template, { sync: true })
    .html;
}

test('AdBlock renders label, image, and sponsor for a normal hydrated ad card', () => {
  const html = renderAdBlock({
    title: "Tomorrow's Ads Today",
    items: [
      {
        label: 'HEINZ ICELANDIC CHILI SAUCE',
        image: 'https://imagedelivery.net/example/normal-ad/public',
        imageAlt: 'Heinz Icelandic Chili Sauce',
        sponsor: 'Heinz',
        readMoreLink: '/shop',
        readMoreText: 'Learn more',
      },
    ],
  });

  assert.match(html, /HEINZ ICELANDIC CHILI SAUCE/);
  assert.match(html, /https:\/\/imagedelivery\.net\/example\/normal-ad\/public/);
  assert.match(html, />Heinz</);
  assert.match(html, /Learn more/);
});

test('AdBlock suppresses label and sponsor when renderMode is snapshot', () => {
  const html = renderAdBlock({
    items: [
      {
        label: 'HEINZ ICELANDIC CHILI SAUCE',
        image: 'https://imagedelivery.net/example/snapshot/public',
        imageAlt: 'Heinz Icelandic Chili Sauce',
        sponsor: 'Heinz',
        renderMode: 'snapshot',
      },
    ],
  });

  // The snapshot image is already a fully composed card, so the label and
  // sponsor chrome must not be re-rendered around it.
  assert.doesNotMatch(html, /HEINZ ICELANDIC CHILI SAUCE/);
  assert.doesNotMatch(html, />Heinz</);
  // The composed snapshot image itself still renders.
  assert.match(html, /https:\/\/imagedelivery\.net\/example\/snapshot\/public/);
});
