import test from 'node:test';
import assert from 'node:assert/strict';

import { hardenEmailHtmlForMobile } from '../../lib/newsletter-core/email-html-hardening.mjs';

test('hardenEmailHtmlForMobile only changes visible text and preserves href/src attributes', () => {
  const inputHtml = [
    '<!doctype html>',
    '<html><head>',
    '<style>.foo{background:url(https://example.com/asset.png)}</style>',
    '</head><body>',
    '<span style="display:none;max-height:0;overflow:hidden;">https://hidden.example.com/secret-path</span>',
    '<h1>Share this issue:</h1>',
    '<p><a href="https://example.com/newsletters/2026/w16-y26">https://example.com/newsletters/2026/w16-y26</a></p>',
    '<img src="https://example.com/static/image.png" alt="Example">',
    '</body></html>',
  ].join('');

  const result = hardenEmailHtmlForMobile(inputHtml, { longTokenThreshold: 35 });

  assert.match(
    result.html,
    /href="https:\/\/example\.com\/newsletters\/2026\/w16-y26"/,
  );
  assert.match(
    result.html,
    /src="https:\/\/example\.com\/static\/image\.png"/,
  );
  assert.match(
    result.html,
    /https:\/&#8203;\/&#8203;example\.&#8203;com\/&#8203;newsletters\/&#8203;2026\/&#8203;w16-&#8203;y26/,
  );
  assert.doesNotMatch(result.html, /https:\/\/&#8203;\/&#8203;hidden\.example/);
  assert.equal(result.breakInsertions > 0, true);
  assert.deepEqual(
    result.warnings.map((warning) => warning.type),
    ['raw-url'],
  );
  assert.equal(result.warnings[0].context, 'Share this issue:');
});

test('hardenEmailHtmlForMobile warns on long visible tokens without mutating attributes', () => {
  const inputHtml = '<html><body><p>token-with-many-many-many-many-many-segments</p></body></html>';
  const result = hardenEmailHtmlForMobile(inputHtml, { longTokenThreshold: 35 });

  assert.match(result.html, /many-&#8203;many-&#8203;many-&#8203;many-&#8203;many-&#8203;segments/);
  assert.deepEqual(
    result.warnings.map((warning) => warning.type),
    ['long-token'],
  );
});
