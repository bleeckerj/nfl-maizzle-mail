import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { compactTrackingProvenanceAttributes } from '../../lib/newsletter-core/tracking-html.mjs';

// Protect the metadata read by the sending platform and the rendered document
// while shrinking quote entities that consume Gmail's HTML clipping budget.
test('compact provenance preserves parsed HTML, tracking JSON, and Outlook comments', () => {
  const html = `<!doctype html><html><body><!--[if mso]><table><tr><td><![endif]--><p>Read the <a href="https://example.com/story?a=1&amp;b=2" data-link-category="research" data-content-provenance="{&quot;contentLabel&quot;:{&quot;source&quot;:&quot;authored&quot;,&quot;confidence&quot;:&quot;high&quot;}}">story</a>.</p><!--[if mso]></td></tr></table><![endif]--></body></html>`;
  const compact = compactTrackingProvenanceAttributes(html);
  const originalDom = new JSDOM(html);
  const compactDom = new JSDOM(compact);
  try {
    assert.ok(Buffer.byteLength(compact) < Buffer.byteLength(html));
    assert.equal(compactDom.serialize(), originalDom.serialize());
    assert.deepEqual(JSON.parse(compactDom.window.document.querySelector('a').getAttribute('data-content-provenance')), {
      contentLabel: { source: 'authored', confidence: 'high' },
    });
    assert.ok(compact.includes('<!--[if mso]><table><tr><td><![endif]-->'));
    assert.equal(compactTrackingProvenanceAttributes(compact), compact);
  } finally {
    originalDom.window.close();
    compactDom.window.close();
  }
});

test('single quotes and existing entities retain their original decoded values', () => {
  const html = `<a title="Keep &quot;this&quot; unchanged" data-content-provenance="{&quot;source&quot;:&quot;author's &amp; helper&quot;}">Read</a>`;
  const compact = compactTrackingProvenanceAttributes(html);
  const dom = new JSDOM(compact);
  try {
    assert.deepEqual(JSON.parse(dom.window.document.querySelector('a').getAttribute('data-content-provenance')), { source: "author's & helper" });
    assert.ok(compact.includes('title="Keep &quot;this&quot; unchanged"'));
  } finally { dom.window.close(); }
  assert.equal(compactTrackingProvenanceAttributes('<p>Unchanged.</p>'), '<p>Unchanged.</p>');
});
