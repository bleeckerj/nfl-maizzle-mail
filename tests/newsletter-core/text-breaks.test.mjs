import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAuthorHtmlBreaks,
  normalizeNewsletterTextBreaks,
} from '../../lib/newsletter-core/text-breaks.mjs';

test('normalizeAuthorHtmlBreaks treats authored blank-line paragraphs like br tags', () => {
  assert.equal(
    normalizeAuthorHtmlBreaks('First paragraph.\n\nSecond paragraph with <em>inline</em> HTML.'),
    'First paragraph.\n<br/>\nSecond paragraph with <em>inline</em> HTML.',
  );
});

test('normalizeAuthorHtmlBreaks leaves explicit br tags as the break marker', () => {
  assert.equal(
    normalizeAuthorHtmlBreaks('First paragraph.\n<br/>\n\nSecond paragraph.'),
    'First paragraph.\n<br/>\nSecond paragraph.',
  );
});

test('normalizeNewsletterTextBreaks updates section article ledes in normalized newsletter data', () => {
  const newsletterData = {
    sections: [
      {
        type: 'section_article_group',
        articles: [
          {
            lede: 'First paragraph.\n\nSecond paragraph with <em>inline</em> HTML.',
          },
        ],
      },
    ],
  };

  assert.equal(normalizeNewsletterTextBreaks(newsletterData), 1);
  assert.equal(
    newsletterData.sections[0].articles[0].lede,
    'First paragraph.\n<br/>\nSecond paragraph with <em>inline</em> HTML.',
  );
});

test('normalizeNewsletterTextBreaks updates hero and section item rich-text fields', () => {
  const newsletterData = {
    hero: {
      body: 'Hero paragraph.\n\nSecond hero paragraph.',
    },
    sections: [
      {
        type: 'single-column',
        items: [
          {
            body: 'Item paragraph.\n\nSecond item paragraph.',
            description: 'Description paragraph.\n\nSecond description paragraph.',
            caption: 'Caption paragraph.\n\nSecond caption paragraph.',
          },
        ],
      },
    ],
  };

  assert.equal(normalizeNewsletterTextBreaks(newsletterData), 4);
  assert.equal(newsletterData.hero.body, 'Hero paragraph.\n<br/>\nSecond hero paragraph.');
  assert.equal(newsletterData.sections[0].items[0].body, 'Item paragraph.\n<br/>\nSecond item paragraph.');
  assert.equal(newsletterData.sections[0].items[0].description, 'Description paragraph.\n<br/>\nSecond description paragraph.');
  assert.equal(newsletterData.sections[0].items[0].caption, 'Caption paragraph.\n<br/>\nSecond caption paragraph.');
});
