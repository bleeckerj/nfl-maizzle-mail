import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCorrespondenceEmailData } from '../../lib/correspondence-email/index.mjs';
import { renderCorrespondencePlainText } from '../../lib/correspondence-email/plain-text.mjs';

test('text export keeps paragraphs, decoded text, full URLs, and the five-line signature', () => {
  const urls = ['https://nearfuturelaboratory.com', 'https://shop.nearfuturelaboratory.com',
    'https://julianbleecker.com', 'https://omata.com'];
  const name = 'Julian Bleecker, BSEE, MSEng, Ph.D.';
  const data = normalizeCorrespondenceEmailData({ subject: 'Hidden subject', preheader: 'Hidden preview',
    bodyMarkdown: 'Hi Alex,\n\nCreative **R&D** with the [brief](https://example.com/?a=1&b=2).',
    signature: { name, lines: urls.map(url => `[${url}](${url})`) } });
  const text = renderCorrespondencePlainText(data);
  assert.equal(text, `Hi Alex,\n\nCreative R&D with the brief (https://example.com/?a=1&b=2).\n\n${name}\n${urls.join('\n')}\n`);
  assert.doesNotMatch(text, /Hidden subject|Hidden preview|&amp;|&#8203;/);
});

test('text export retains register numbers, shared references, and personal footer links', () => {
  const data = normalizeCorrespondenceEmailData({ subject: 'References',
    bodyMarkdown: '8. Eight\n9. [Nine](https://example.com/nine)\n\n- First again',
    sharedItems: { heading: 'References', items: [
      { title: 'One', href: 'https://example.com/one', description: 'Notes & details.' },
      { title: 'Two', href: 'https://example.com/two' },
    ] }, footerNote: '[Unsubscribe]([unsubscribe])',
    footerLinks: [{ label: 'Contact', href: 'mailto:hello@example.com' }] });
  const text = renderCorrespondencePlainText(data);
  assert.match(text, /08\. Eight\n09\. Nine \(https:\/\/example.com\/nine\)/);
  assert.match(text, /01\. First again/);
  assert.match(text, /References\n\nOne \(https:\/\/example.com\/one\)\nNotes & details\./);
  assert.match(text, /Two \(https:\/\/example.com\/two\)/);
  assert.match(text, /Unsubscribe \(\[unsubscribe\]\)/);
  assert.match(text, /Contact \(mailto:hello@example.com\)/);
});

test('explicit HTML and visible header options export readable text without hidden content', () => {
  const data = normalizeCorrespondenceEmailData({ subject: 'Visible subject', showSubject: true,
    showFromHeader: true, from: { name: 'Julian', organization: 'Near Future Laboratory' },
    bodyHtml: '<p>Hello<br>Again &amp; welcome.</p><ol start="4"><li>Fourth</li></ol><div hidden>Hidden</div><script>Ignored</script>' });
  const text = renderCorrespondencePlainText(data);
  assert.match(text, /^Visible subject\n\nJulian\nNear Future Laboratory\n\nHello\nAgain & welcome\./);
  assert.match(text, /4\. Fourth/);
  assert.doesNotMatch(text, /Hidden|Ignored|<p>/);
});
