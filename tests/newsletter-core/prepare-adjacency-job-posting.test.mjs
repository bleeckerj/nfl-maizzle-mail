import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareAdjacencyJobPostingSection } from '../../lib/newsletter-core/prepare-adjacency-job-posting.mjs';

// Verify authored lists become template-ready HTML without persisting derived
// fields or publishing, building, or sending an email.
function sectionWithList(list) {
  return {
    type: 'adjacency-job-posting',
    brandVariant: 'atlassian',
    lists: [{ id: 'responsibilities', title: "What you'll do", ...list }],
  };
}

test('converts the single editable Markdown list and leaves the source untouched', () => {
  const source = sectionWithList({ items: [
    'Build **working prototypes** with *colleagues* and `tools`.',
    'Read the [investigation](https://example.com/investigation).',
  ] });
  const original = structuredClone(source);
  const [first, second] = prepareAdjacencyJobPostingSection(source).lists[0].itemsHtml;
  assert.match(first, /<strong>working prototypes<\/strong>/);
  assert.match(first, /<em>colleagues<\/em>/);
  assert.match(first, /<code>tools<\/code>/);
  assert.match(second, /<a href="https:\/\/example.com\/investigation" style="/);
  assert.deepEqual(source, original);
  assert.equal(Object.hasOwn(source.lists[0], 'itemsHtml'), false);
});

test('edits to items replace a stale HTML copy in older sources', () => {
  const source = sectionWithList({ items: ['Original entry.'], itemsHtml: ['Stale entry.'] });
  source.lists[0].items[0] = 'Updated **entry**.';
  const prepared = prepareAdjacencyJobPostingSection(source);
  assert.deepEqual(prepared.lists[0].itemsHtml, ['Updated <strong>entry</strong>.']);
});

test('an intentionally empty editable list does not restore stale HTML bullets', () => {
  const prepared = prepareAdjacencyJobPostingSection(sectionWithList({
    items: [], itemsHtml: ['Removed entry.'],
  }));
  assert.deepEqual(prepared.lists[0].itemsHtml, []);
});

test('legacy HTML-only lists retain markup and receive email link styling', () => {
  const prepared = prepareAdjacencyJobPostingSection(sectionWithList({
    itemsHtml: ['Read <a href="https://example.com/investigation">the <strong>investigation</strong></a>.'],
  }));
  assert.match(prepared.lists[0].itemsHtml[0], /<strong>investigation<\/strong>/);
  assert.match(prepared.lists[0].itemsHtml[0], /href="https:\/\/example.com\/investigation" style="/);
});

test('a list without authored entries prepares as an empty list', () => {
  const prepared = prepareAdjacencyJobPostingSection(sectionWithList({}));
  assert.deepEqual(prepared.lists[0].itemsHtml, []);
});
