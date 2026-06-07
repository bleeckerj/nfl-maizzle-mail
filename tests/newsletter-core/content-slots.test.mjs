import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContentSlotManifest } from '../../lib/newsletter-core/index.mjs';

test('buildContentSlotManifest lists unique content slots from final HTML', () => {
  const manifest = buildContentSlotManifest(
    [
      '<table data-content-slot="footer_cta"><tr><td>One</td></tr></table>',
      '<table data-content-slot="footer_cta"><tr><td>Duplicate</td></tr></table>',
      '<section data-content-slot="intro-note"></section>',
    ].join(''),
    {
      outputHtmlPath: '/tmp/newsletter.html',
      outputName: 'newsletter',
      sourcePath: '/tmp/issue.md',
      templateName: 'dense-discovery',
    },
  );

  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.slots.map((slot) => slot.slotKey), ['footer_cta', 'intro-note']);
  assert.deepEqual(manifest.slots[0], {
    slotKey: 'footer_cta',
    displayName: 'Footer Cta',
    kind: 'cta',
    htmlSelector: '[data-content-slot="footer_cta"]',
    textMarker: '[[content-slot:footer_cta]]',
    schemaKey: 'footer_cta',
  });
  assert.equal(manifest.slots[1].kind, 'content');
});
