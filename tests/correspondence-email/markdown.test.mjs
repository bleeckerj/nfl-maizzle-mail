import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCorrespondenceEmailData,
  renderInlineMarkdown,
  renderMarkdownToEmailHtml,
  slugifyOutputName,
} from '../../lib/correspondence-email/index.mjs';

test('renderMarkdownToEmailHtml converts correspondence Markdown into email-safe HTML', () => {
  const html = renderMarkdownToEmailHtml([
    '## Hello',
    '',
    'This is **important** and [linked](https://example.com).',
    '',
    '- One',
    '- Two',
    '',
    '> Quoted note',
  ].join('\n'));

  assert.match(html, /<h3 class="correspondence-heading correspondence-heading-3">Hello<\/h3>/);
  assert.match(html, /<strong>important<\/strong>/);
  assert.match(html, /<a href="https:\/\/example\.com" class="correspondence-link">linked<\/a>/);
  assert.match(html, /<ul class="correspondence-list">/);
  assert.match(html, /<blockquote class="correspondence-quote">/);
});

test('renderInlineMarkdown strips unsafe hrefs and escapes raw HTML', () => {
  const html = renderInlineMarkdown('[bad](javascript:alert(1)) <script>alert(1)</script>');

  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /bad/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('normalizeCorrespondenceEmailData builds correspondence locals with shared items below the signature', () => {
  const data = normalizeCorrespondenceEmailData({
    subject: 'Follow up',
    bodyMarkdown: 'Hi there.',
    signature: {
      name: 'Julian',
      lines: ['Near Future Laboratory'],
    },
    sharedItems: {
      heading: 'Shared items',
      items: [
        {
          title: 'Prototype Review Notes',
          href: 'https://example.com/prototype-review',
          label: 'Reference',
          description: 'Notes for the review.',
        },
        {
          title: 'Session Outline',
          href: 'https://example.com/session-outline',
          label: 'Brief',
          description: 'The current outline.',
        },
      ],
    },
    footerLinks: [
      { label: 'Contact', href: 'mailto:hello@example.com' },
      { label: 'Unsafe', href: 'javascript:alert(1)' },
    ],
  });

  assert.equal(data.template, 'standard-correspondence');
  assert.equal(data.subject, 'Follow up');
  assert.match(data.correspondence.bodyHtml, /Hi there\./);
  assert.match(data.correspondence.signatureHtml, /Julian/);
  assert.equal(data.correspondence.sharedItems.length, 2);
  assert.equal(data.correspondence.sharedItemRows.length, 1);
  assert.equal(data.correspondence.footerLinks.length, 1);
});

test('normalizeCorrespondenceEmailData rejects shared item counts other than two or four', () => {
  assert.throws(
    () => normalizeCorrespondenceEmailData({
      subject: 'Bad shared items',
      bodyMarkdown: 'Hi.',
      sharedItems: [
        { title: 'One', href: 'https://example.com/one' },
        { title: 'Two', href: 'https://example.com/two' },
        { title: 'Three', href: 'https://example.com/three' },
      ],
    }),
    /either 2 or 4/,
  );
});

test('slugifyOutputName creates stable local output names', () => {
  assert.equal(slugifyOutputName('Follow-up: Workshop Brief!'), 'follow-up-workshop-brief');
});
