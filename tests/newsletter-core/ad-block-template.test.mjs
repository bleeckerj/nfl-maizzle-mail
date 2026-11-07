import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import { renderNewsletterComponent } from './helpers/render-newsletter-component.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AD_BLOCK_TEMPLATE = path.join(
  REPO_ROOT,
  'templates',
  'near-future-lab-daily-headlines',
  'components',
  'AdBlock.html',
);

function renderAdBlock(section) {
  return renderNewsletterComponent(AD_BLOCK_TEMPLATE, { adSection: section, darkModePolicy: null });
}

test('AdBlock renders label, image, and sponsor for a normal hydrated ad card', async () => {
  const html = await renderAdBlock({
    title: "Tomorrow's Ads Today",
    items: [
      {
        label: 'HEINZ ICELANDIC CHILI SAUCE',
        image: 'https://imagedelivery.net/example/normal-ad/public',
        imageAlt: 'Heinz Icelandic Chili Sauce',
        sponsor: 'Heinz',
        readMoreLink: '/shop',
        readMoreText: 'Learn more',
      },
    ],
  });

  assert.match(html, /HEINZ ICELANDIC CHILI SAUCE/);
  assert.match(html, /https:\/\/imagedelivery\.net\/example\/normal-ad\/public/);
  assert.match(html, />Heinz</);
  assert.match(html, /Learn more/);
});

test('AdBlock suppresses label and sponsor when renderMode is snapshot', async () => {
  const html = await renderAdBlock({
    items: [
      {
        label: 'HEINZ ICELANDIC CHILI SAUCE',
        image: 'https://imagedelivery.net/example/snapshot/public',
        imageAlt: 'Heinz Icelandic Chili Sauce',
        sponsor: 'Heinz',
        renderMode: 'snapshot',
      },
    ],
  });

  // The snapshot image is already a fully composed card, so the label and
  // sponsor chrome must not be re-rendered around it.
  assert.doesNotMatch(html, /HEINZ ICELANDIC CHILI SAUCE/);
  assert.doesNotMatch(html, />Heinz</);
  // The composed snapshot image itself still renders.
  assert.match(html, /https:\/\/imagedelivery\.net\/example\/snapshot\/public/);
  const card = new JSDOM(html).window.document.querySelector('[data-ad-card]');
  assert.equal(card.style.borderWidth, '0px');
  assert.equal(card.querySelector('td').style.padding, '0px');
  assert.equal(card.style.boxShadow, '');
});

test('every ad renderer encloses the Kessler label and full image in the preview frame', async () => {
  const item = {
    adId: 'interstitial-nfl-news-kesller-ablation-all-of-tomorrows-news',
    label: "TOMORROW'S NEWS WITH WALTER™ ALWAYS",
    image: 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/e933cde4-5afa-4390-08ff-dc877c6ec900/full?format=webp',
    imageAlt: 'NFL News anchor beside Earth and satellites.',
  };
  const section = { type: 'ad-block', placement: 'inline', items: [item], containerStyles: {}, contentStyles: {}, descriptionStyles: {} };
  const renderers = [
    ['near-future-lab-daily-headlines', 'AdBlock.html'],
    ['dense-discovery', 'AdBlock.html'],
    ['brain-dead-template', 'ContentSections.html'],
    ['adjacency-recruiting', 'Sponsor.html'],
    ['gdm-special-projects', 'Lists.html'],
  ];
  for (const [template, component] of renderers) {
    const html = await renderNewsletterComponent(path.join(REPO_ROOT, 'templates', template, 'components', component), {
      section, adSection: section, sections: [section], darkModePolicy: null,
    });
    const document = new JSDOM(html).window.document;
    const cards = document.querySelectorAll('[data-ad-card]');
    assert.equal(cards.length, 1, template);
    const card = cards[0];
    assert.equal(card.style.border, '0.5px solid rgb(160, 160, 160)', template);
    assert.equal(card.style.boxShadow, '1px 1px 0 #2c2c2c', template);
    assert.equal(card.querySelector('td').style.padding, template === 'near-future-lab-daily-headlines' ? '8px' : '12px', template);
    const label = card.querySelector('[data-ad-card-label]');
    assert.equal(label.textContent, item.label, template);
    assert.match(label.style.fontFamily, /monospace/, template);
    assert.equal(label.style.getPropertyPriority('font-size'), 'important', template);
    const image = card.querySelector('img');
    assert.equal(image.src, item.image, template);
    assert.equal(image.style.height, 'auto', template);
    assert.equal(image.style.maxWidth, '100%', template);
    assert.equal(image.style.objectFit, '', template);
  }
});

test('an intro ad retains the frame and original text at its nested section index', async () => {
  const label = "TOMORROW'S NEWS WITH WALTER™ ALWAYS";
  const sections = [{ type: 'intro_statement', body_blocks: [
    { type: 'text', rendered_html: '<p>Before the ad.</p>' },
    { type: 'ad-block', items: [{ label, image: 'https://example.com/full.png' }] },
    { type: 'text', rendered_html: '<p>After the ad.</p>' },
  ] }];
  const html = await renderNewsletterComponent(path.join(REPO_ROOT, 'templates/near-future-lab-daily-headlines/components/IntroBody.html'), {
    introSectionIndex: 0, introSection: sections[0], sections, darkModePolicy: null,
  });
  const document = new JSDOM(html).window.document;
  const card = document.querySelector('[data-ad-card]');
  assert.equal(card?.querySelector('[data-ad-card-label]').textContent, label);
  assert.equal(card.style.borderWidth, '0.5px');
  assert.equal(document.querySelectorAll('[data-ad-card]').length, 1);
  assert.match(document.body.textContent, /Before the ad\.[\s\S]*TOMORROW'S NEWS[\s\S]*After the ad\./);
});

test('repeated recruiting ads preserve each placement label without JSON escaping', async () => {
  for (const template of ['adjacency-recruiting', 'gdm-special-projects']) {
    const sections = ['First advertiser\'s label', 'Second advertiser\'s label'].map(label => ({
      type: 'ad-block', placement: 'inline', containerStyles: {}, contentStyles: {}, descriptionStyles: {},
      items: [{ adId: 'repeated-ad', label, image: 'https://example.com/full.png' }],
    }));
    const html = await renderNewsletterComponent(path.join(REPO_ROOT, 'templates', template, 'components/Lists.html'), { sections });
    const document = new JSDOM(html).window.document;
    assert.deepEqual([...document.querySelectorAll('[data-ad-card-label]')].map(label => label.textContent),
      sections.map(section => section.items[0].label), template);
  }
});

test('shared cards retain linked images, captions, and live commerce placeholders', async () => {
  const html = await renderAdBlock({ items: [{
    adId: 'commerce-fixture', label: 'Shop', sponsor: 'Sponsor', commerce: {},
    image: { src: 'https://example.com/full.png', alt: 'Full source image', link: 'https://example.com/product', caption: 'Source caption' },
    readMoreLink: 'https://example.com/details', readMoreText: 'Details',
  }] });
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelector('img').closest('a').href, 'https://example.com/product');
  assert.equal(document.querySelector('[data-commerce-band-id]').getAttribute('data-commerce-band-id'), 'commerce-fixture');
  assert.match(document.body.textContent, /Source caption/);
  assert.equal(document.querySelector('a[href="https://example.com/details"]').textContent, 'Details');
});
