// Regression coverage for inline color priorities that blocked dark recap text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { releaseDarkModeTextColors } from '../../lib/newsletter-core/dark-mode-text-colors.mjs';

test('releases managed wrapper and list colors without changing typography, media, or other surfaces', () => {
  const html = `<html><head><style>@media (prefers-color-scheme: dark) {.dm-bg li {color:white!important}}</style></head><body><div style="color:red!important">Outside</div><table class="dm-bg"><tr><td><div style="font-family:Arial!important;font-size:19px;line-height:1.4;color:#111111!important;text-align:left!important"><ol><li style='COLOR: black !IMPORTANT; background-color: white!important'>Ordered<ul><li>Nested</li></ul></li></ol><a style="color:blue!important" href="https://example.org/">Link</a><img src="https://example.org/chart.png" width="600" height="600"></div><!--[if mso]><p>Outlook fallback</p><![endif]--></td></tr></table></body></html>`;
  const output = releaseDarkModeTextColors(html, { flatten: true });
  assert.equal(output, html
    .replace('color:#111111!important', 'color:#111111')
    .replace('COLOR: black !IMPORTANT', 'COLOR: black')
    .replace('color:blue!important', 'color:blue'));
  const document = new JSDOM(output).window.document;
  const wrapper = document.querySelector('.dm-bg div');
  assert.equal(wrapper.style.getPropertyValue('color'), 'rgb(17, 17, 17)');
  assert.equal(wrapper.style.getPropertyPriority('color'), '');
  assert.equal(wrapper.style.getPropertyPriority('font-family'), 'important');
  assert.equal(document.querySelector('li').style.getPropertyPriority('background-color'), 'important');
  assert.equal(releaseDarkModeTextColors(output, { flatten: true }), output);
});

test('disabled or absent policy preserves the complete authored HTML', () => {
  const html = '<div class="dm-bg" style="color:black!important">Text</div>';
  assert.equal(releaseDarkModeTextColors(html, { flatten: false }), html);
  assert.equal(releaseDarkModeTextColors(html), html);
});
