import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { styleDailyHeadlinesArticleLinks } from '../../lib/newsletter-core/daily-headlines-article-links.mjs';

test('article reference links match the dark Georgia follow-up link while retaining copy and tracking', () => {
  const article = { lede: '<p><a href="https://example.com/history" data-link-category="design-research" style="color:blue;font-size:12px">Label history</a></p>', body_blocks: [{ type: 'text', html: '<p>More <a href="https://example.com/report">research</a>.</p>' }, { type: 'image', src: 'https://example.com/field.jpg', alt: 'Field station.', caption: 'Field trials.' }] };
  const image = structuredClone(article.body_blocks[1]);
  styleDailyHeadlinesArticleLinks(article);
  for (const html of [article.lede, article.body_blocks[0].html]) {
    const link = JSDOM.fragment(html).querySelector('a');
    assert.equal(link.style.color, 'rgb(51, 51, 51)');
    assert.equal(link.style.fontFamily, 'georgia, serif');
    assert.equal(link.style.fontSize, '17px');
    assert.equal(link.style.fontWeight, 'normal');
    assert.equal(link.style.lineHeight, '25px');
    assert.equal(link.style.textDecoration, 'underline');
  }
  const reference = JSDOM.fragment(article.lede).querySelector('a');
  assert.equal(reference.textContent, 'Label history');
  assert.equal(reference.getAttribute('href'), 'https://example.com/history');
  assert.equal(reference.getAttribute('data-link-category'), 'design-research');
  assert.deepEqual(article.body_blocks[1], image);
});

test('article link overrides remain supported and plain text stays unchanged', () => {
  const article = { lede: '<p>Plain text.</p>', body_blocks: [{ type: 'text', html: '<p><a href="https://example.com/report">Report</a></p>' }] };
  styleDailyHeadlinesArticleLinks(article, { color: '#111', fontWeight: '600' });
  assert.equal(article.lede, '<p>Plain text.</p>');
  const link = JSDOM.fragment(article.body_blocks[0].html).querySelector('a');
  assert.equal(link.style.color, 'rgb(17, 17, 17)');
  assert.equal(link.style.fontWeight, '600');
});
