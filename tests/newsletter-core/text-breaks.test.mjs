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
