// Preserve attribution and raw HTML while omitting reconstructable URL copies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { omitRedundantCanonicalContentIds } from '../../lib/newsletter-core/tracking-html.mjs';

const provenance = source => JSON.stringify({ contentId: { source, confidence: 'medium' }, contentLabel: { source: 'authored', confidence: 'high' } });
const link = ({ href = 'https://example.com/story#chapter', id = 'https://example.com/story', source = 'canonical_url', extra = '' } = {}) =>
  `<a href="${href}" data-content-id="${id}" data-link-label="Story" data-content-label="Story" data-content-category="research" data-link-role="read_more" data-content-provenance='${provenance(source)}'${extra}>Story</a>`;

function deriveId(anchor) {
  const explicit = anchor.getAttribute('data-content-id');
  if (explicit) return explicit;
  const url = new URL(anchor.getAttribute('href')); url.hash = '';
  return url.toString().replace(/\/$/, '');
}

test('derived IDs are omitted while anchor order, destinations, and all other HTML stay intact', () => {
  const html = `<!doctype html><html><head><style>/* ${link()} */ .example{color:black;}</style></head><body><!--[if mso]>${link()}<![endif]--><p>${link()} ${link({ href: 'https://example.com/?a=1&amp;b=2#part', id: 'https://example.com/?a=1&amp;b=2', extra: ' title="A &gt; B"' })}</p></body></html>`;
  const compact = omitRedundantCanonicalContentIds(html);
  const before = new JSDOM(html), after = new JSDOM(compact);
  try {
    const oldLinks = [...before.window.document.querySelectorAll('a')];
    const newLinks = [...after.window.document.querySelectorAll('a')];
    assert.equal(newLinks.length, oldLinks.length);
    for (let i = 0; i < oldLinks.length; i++) {
      assert.equal(newLinks[i].getAttribute('data-content-id'), null);
      assert.equal(deriveId(newLinks[i]), oldLinks[i].getAttribute('data-content-id'));
      newLinks[i].setAttribute('data-content-id', oldLinks[i].getAttribute('data-content-id'));
      assert.deepEqual([...newLinks[i].attributes].map(a => [a.name, a.value]).sort(), [...oldLinks[i].attributes].map(a => [a.name, a.value]).sort());
    }
    assert.ok(compact.includes(`<!--[if mso]>${link()}<![endif]-->`));
    assert.equal(after.window.document.querySelector('style').textContent, before.window.document.querySelector('style').textContent);
    assert.ok(Buffer.byteLength(compact) < Buffer.byteLength(html));
    assert.equal(omitRedundantCanonicalContentIds(compact), compact);
  } finally { before.window.close(); after.window.close(); }
});

test('authored, mismatched, invalid, and uncertain IDs remain explicit', () => {
  const fixtures = [
    link({ source: 'authored' }), link({ id: 'digest-123', source: 'authored' }),
    link({ id: 'https://example.com/different' }), link({ href: 'mailto:hello@example.com' }),
    link({ href: 'https://[invalid' }), link().replace(/data-content-provenance='[^']*'/, ''),
    link().replace(provenance('canonical_url'), '{invalid'),
    link().replace(' data-content-id=', ' data-content-id="different" data-content-id='),
  ];
  for (const html of fixtures) assert.equal(omitRedundantCanonicalContentIds(html), html);
  assert.equal(omitRedundantCanonicalContentIds(null), null);
});

test('attribute-like text and quoted values are not edited', () => {
  const html = link({ extra: ` title=' data-content-id="not-an-attribute" ' aria-label="A &gt; B"` });
  const compact = omitRedundantCanonicalContentIds(html);
  assert.ok(compact.includes(`title=' data-content-id="not-an-attribute" '`));
  assert.ok(compact.includes('aria-label="A &gt; B"'));
  assert.ok(!compact.includes(' data-content-id="https://example.com/story"'));
});

const soupRoot = path.resolve(import.meta.dirname, '../../../nfl-newsletter-email-soup-to-nuts');
const readerFile = path.join(soupRoot, 'src/services/tracked-link-metadata.ts');
test('the actual sending-platform reader derives identical attribution after compaction', { skip: !existsSync(readerFile) }, async () => {
  const reader = await import(pathToFileURL(readerFile).href);
  const require = createRequire(path.join(soupRoot, 'package.json'));
  const { parse } = require('node-html-parser');
  const html = link() + link({ id: 'digest-123', source: 'authored' });
  const before = parse(html).querySelectorAll('a'), after = parse(omitRedundantCanonicalContentIds(html)).querySelectorAll('a');
  const functions = ['deriveContentId', 'deriveContentLabel', 'deriveLinkLabel', 'deriveLinkCategory', 'deriveContentTags', 'deriveLinkRole', 'deriveSectionLabel', 'deriveMetadataProvenance'];
  for (let i = 0; i < before.length; i++) for (const name of functions) assert.deepEqual(reader[name](after[i]), reader[name](before[i]), name);
});

// Table parsing can move anchors in DOM order; source-offset edits must stay ordered.
test('table parsing preserves original HTML order during multiple removals', () => {
  const html = `<table>${link()}<tr><td>${link()}</td></tr>${link()}</table>`;
  assert.equal(omitRedundantCanonicalContentIds(html), html.replaceAll(' data-content-id="https://example.com/story"', ''));
});
