// Negative controls prove the contrast audit catches unreadable output independently
// of the template's class names, including WebKit fill and inherited surfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTextContrast, assertDarkModeContrast } from '../../lib/newsletter-core/dark-mode-contrast.mjs';

test('contrast audit detects pale text on white through transparent wrappers', () => {
  const result = auditTextContrast('<div style="background:white"><p><strong style="color:#f2f4f8">Unreadable text</strong></p></div>', 'light');
  assert.equal(result.checked, 1);
  assert.equal(result.failures.length, 1);
  assert.ok(result.minimumContrast < 1.2);
});

test('contrast audit checks WebKit text fill and composites translucent paint', () => {
  const result = auditTextContrast('<div style="background:black"><p style="background:rgba(255,255,255,0.5);color:white;-webkit-text-fill-color:#111111">Filled text</p></div>', 'light');
  assert.equal(result.checked, 1);
  assert.equal(result.failures.length, 0);
  assert.ok(result.minimumContrast > 4.5);
});

test('hidden text is skipped and image backgrounds are reported as unassessed', () => {
  const result = auditTextContrast('<p style="display:none;color:white;background:white">Preheader</p><p style="background-image:linear-gradient(black,white)">Needs visual review</p>', 'dark');
  assert.equal(result.checked, 0);
  assert.equal(result.unassessed.length, 1);
});

test('production gate rejects unreadable output and respects template/policy boundaries', () => {
  const html = '<p style="color:#f2f4f8;background:white">Unreadable output</p>';
  assert.throws(() => assertDarkModeContrast({ html, templateName: 'dense-discovery', policy: { flatten: true } }), /Dark-mode contrast failed/);
  assert.equal(assertDarkModeContrast({ html, templateName: 'dense-discovery', policy: { flatten: false } }), null);
  assert.equal(assertDarkModeContrast({ html, templateName: 'another-template', policy: { flatten: true } }), null);
});

test('unpainted light-mode text uses the default canvas colors', () => {
  const audit = auditTextContrast('<p>Default text</p>', 'light');
  assert.equal(audit.checked, 1);
  assert.equal(audit.minimumContrast, 21);
});

test('complex authored gradients require review until explicitly flattened', () => {
  const gradient = 'background:radial-gradient(circle at 14% 18%,white 0,transparent 28%),linear-gradient(135deg,white,black);';
  const unassessed = auditTextContrast(`<p style="${gradient}">Complex paint</p>`, 'light');
  assert.equal(unassessed.unassessed.length, 1);
  const flattened = auditTextContrast(`<p style="${gradient}background-image:none!important;background-color:white!important;color:black">Flattened paint</p>`, 'dark');
  assert.equal(flattened.unassessed.length, 0);
  assert.equal(flattened.failures.length, 0);
});

test('invalid dark selector lists fail rather than silently skipping their colors', () => {
  assert.throws(() => auditTextContrast('<style>@media(prefers-color-scheme:dark){.caption, {color:white}}</style><p class="caption">Text</p>', 'dark'), /Invalid dark-mode CSS selector/);
});

test('production gate rejects footer artwork whose dark treatment was stripped', () => {
  const html = '<table class="footer"><tr><td><img alt="Footer Logo" src="https://example.org/logo.png"></td></tr></table>';
  assert.throws(() => assertDarkModeContrast({ html, templateName: 'dense-discovery', policy: { flatten: true } }), /Dark-mode footer artwork failed/);
});
