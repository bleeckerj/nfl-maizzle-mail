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

test('renderInlineMarkdown restores links after italic parsing', () => {
  const html = renderInlineMarkdown([
    'Calendly: <a href="https://calendly.com/julian">pick a time</a>',
    '_Julian_',
    '[Near Future Laboratory](https://nearfuturelaboratory.com)',
  ].join('\n'));

  assert.match(html, /<a href="https:\/\/calendly\.com\/julian" class="correspondence-link">pick a time<\/a>/);
  assert.match(html, /<em>Julian<\/em>/);
  assert.match(html, /<a href="https:\/\/nearfuturelaboratory\.com" class="correspondence-link">Near Future Laboratory<\/a>/);
  assert.doesNotMatch(html, /CORRESPONDENCEHTMLTOKEN/);
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
          image: {
            src: 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E',
            alt: 'Prototype review materials',
          },
          description: 'Notes for the review.',
        },
        {
          title: 'Session Outline',
          href: 'https://example.com/session-outline',
          label: 'Brief',
          imageSrc: 'cid:session-outline-image',
          imageAlt: 'Session outline preview',
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
  assert.match(data.correspondence.signatureHtml, /<div class="correspondence-signature-lines">/);
  assert.doesNotMatch(data.correspondence.signatureHtml, /<strong>Julian<\/strong>/);
  assert.equal(data.correspondence.sharedItems.length, 2);
  assert.equal(data.correspondence.sharedItemRows.length, 1);
  assert.deepEqual(data.correspondence.sharedItems[0].image, {
    src: 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E',
    alt: 'Prototype review materials',
  });
  assert.deepEqual(data.correspondence.sharedItems[1].image, {
    src: 'cid:session-outline-image',
    alt: 'Session outline preview',
  });
  assert.equal(data.correspondence.footerLinks.length, 1);
  assert.match(data.correspondence.theme.fontFamily, /JetBrainsMono Nerd Font/);
  assert.equal(data.correspondence.theme.backgroundColor, '#ffffff');
  assert.equal(data.correspondence.theme.surfaceColor, '#ffffff');
  assert.equal(data.correspondence.theme.borderColor, '#e5e5e5');
});

test('normalizeCorrespondenceEmailData renders signature lines as links after the signature name', () => {
  const data = normalizeCorrespondenceEmailData({
    subject: 'Signature links',
    bodyMarkdown: 'Hi.',
    signature: {
      name: 'Julian',
      lines: [
        '[Near Future Laboratory](https://nearfuturelaboratory.com)',
        '[hello@nearfuturelaboratory.com](mailto:hello@nearfuturelaboratory.com)',
      ],
    },
  });

  assert.match(data.correspondence.signatureHtml, /correspondence-signature-name">Julian/);
  assert.match(data.correspondence.signatureHtml, /correspondence-signature-lines/);
  assert.match(data.correspondence.signatureHtml, /href="https:\/\/nearfuturelaboratory\.com"/);
  assert.match(data.correspondence.signatureHtml, /href="mailto:hello@nearfuturelaboratory\.com"/);
});

test('normalizeCorrespondenceEmailData drops unsafe shared item image sources', () => {
  const data = normalizeCorrespondenceEmailData({
    subject: 'Unsafe image',
    bodyMarkdown: 'Hi.',
    sharedItems: [
      {
        title: 'One',
        href: 'https://example.com/one',
        image: 'file:///tmp/one.jpg',
      },
      {
        title: 'Two',
        href: 'https://example.com/two',
      },
    ],
  });

  assert.equal(data.correspondence.sharedItems[0].image, null);
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
