import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { build } from '@maizzle/framework';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import matter from 'gray-matter';

import { normalizeNewsletterLinkTracking } from '../../lib/newsletter-core/link-tracking-metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');

function assertSchemaValid(templateName, newsletter) {
  const schema = JSON.parse(readFileSync(path.join(REPO_ROOT, 'templates', templateName, 'newsletter.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(newsletter), true, JSON.stringify(validate.errors));
}

async function renderTemplate(templateName, newsletter, outputDir) {
  await build('production', {
    build: {
      templates: {
        source: path.join(REPO_ROOT, 'templates', templateName),
        destination: { path: outputDir },
      },
      components: {
        source: path.join(REPO_ROOT, 'templates', templateName, 'components'),
      },
    },
    inlineCSS: false,
    locals: newsletter,
  });
  return readFileSync(path.join(outputDir, 'newsletter.html'), 'utf8');
}

test('inline_cta renders its styling, actions, and position before email_footer', async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-inline-cta-'));
  const outputDir = path.join(tempRoot, 'build');
  const newsletter = {
    template: 'near-future-lab-daily-headlines',
    title: 'Inline CTA Issue',
    sections: [
      {
        type: 'inline_cta',
        renderFor: 'public',
        eyebrow: 'Public preview',
        statement: 'You are reading the <strong>public preview</strong>.',
        font_family: 'mono',
        background: '#f5f4f0',
        text_color: '#333333',
        eyebrow_color: '#555555',
        border_radius: 12,
        border_color: '#222222',
        primaryAction: { label: 'Subscribe', url: 'mailto:subscribe@example.com' },
        secondaryAction: { label: 'Read online', url: 'mailto:online@example.com' },
      },
      {
        type: 'email_footer',
        paragraphs: ['Footer copy.'],
        address: 'Near Future Laboratory',
        unsubscribe_label: 'Unsubscribe',
      },
    ],
    footer: { footerCta: { enabled: false } },
    darkModePolicy: { flatten: true },
  };

  try {
    await renderTemplate('near-future-lab-daily-headlines', newsletter, outputDir);

    const outputPath = path.join(outputDir, 'newsletter.html');
    assert.ok(existsSync(outputPath));
    const html = readFileSync(outputPath, 'utf8');
    const ctaIndex = html.indexOf('data-content-slot="inline_cta"');
    const footerIndex = html.indexOf('class="mob-text mob-footer');
    assert.ok(ctaIndex >= 0);
    assert.ok(footerIndex > ctaIndex);
    assert.match(html, /Public preview/);
    assert.match(html, /You are reading the <strong>public preview<\/strong>\./);
    assert.match(html, /background:#f5f4f0/);
    assert.match(html, /border:1px solid #222222/);
    assert.match(html, /border-radius:12px/);
    assert.match(html, /color:#333333/);
    assert.match(html, /font:16px\/22px monospace/);
    assert.match(html, /href="mailto:subscribe@example\.com"/);
    assert.match(html, /href="mailto:online@example\.com"/);
    assert.match(html, /dm-surface dm-text/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('dense-discovery and brain-dead-template render the shared inline_cta contract', async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-inline-cta-templates-'));
  const denseOutputDir = path.join(tempRoot, 'dense');
  const brainOutputDir = path.join(tempRoot, 'brain');
  const denseNewsletter = {
    template: 'dense-discovery',
    title: 'Dense Inline CTA',
    sections: [{
      type: 'inline_cta',
      renderFor: 'public',
      eyebrow: 'Public preview',
      statement: 'Dense CTA copy.',
      font_family: 'mono',
      border_radius: '12px',
      primaryAction: { label: 'Subscribe', url: 'mailto:dense@example.com' },
    }],
  };
  const brainNewsletter = {
    template: 'brain-dead-template',
    title: 'Brain Dead Inline CTA',
    sections: [{
      type: 'inline_cta',
      renderFor: 'full',
      eyebrow: 'Full edition',
      statement: 'Brain Dead CTA copy.',
      font_family: 'mono',
      border_radius: 12,
      primaryAction: { label: 'Continue', url: 'mailto:brain@example.com' },
    }],
    footer: { footerCta: { enabled: false } },
  };

  try {
    assertSchemaValid('dense-discovery', denseNewsletter);
    assertSchemaValid('brain-dead-template', brainNewsletter);
    const denseHtml = await renderTemplate('dense-discovery', denseNewsletter, denseOutputDir);
    const brainHtml = await renderTemplate('brain-dead-template', brainNewsletter, brainOutputDir);
    assert.match(denseHtml, /data-content-slot="inline_cta"/);
    assert.match(denseHtml, /Dense\s+CTA copy\./);
    assert.match(denseHtml, /href="mailto:dense@example\.com"/);
    assert.match(denseHtml, /Share Tech Mono/);
    assert.match(denseHtml, /border:\s*1px solid #000000/);
    assert.match(denseHtml, /border-radius:\s*12px/);
    assert.match(brainHtml, /data-content-slot="inline_cta"/);
    assert.match(brainHtml, /Brain Dead CTA copy\./);
    assert.match(brainHtml, /href="mailto:brain@example\.com"/);
    assert.match(brainHtml, /Courier New/);
    assert.match(brainHtml, /border:2px solid #000000/);
    assert.match(brainHtml, /border-radius:12px/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('inline_cta tracked action URLs use the existing metadata contract', () => {
  const newsletter = {
    sections: [{
      type: 'inline_cta',
      primaryAction: {
        label: 'Subscribe',
        url: {
          href: 'https://example.com/subscribe',
          label: 'Daily Headlines subscribe',
          category: 'subscribe',
          intent: 'subscribe',
        },
      },
    }],
  };

  const tracking = normalizeNewsletterLinkTracking(newsletter);
  assert.equal(newsletter.sections[0].primaryAction.url, 'https://example.com/subscribe');
  assert.equal(tracking.manifest.get('https://example.com/subscribe').category, 'subscribe');
  assert.equal(tracking.manifest.get('https://example.com/subscribe').intent, 'subscribe');
});

// Exercise authored values through Maizzle and a CSS parser, so malformed units
// cannot pass merely because the expected number appears somewhere in the HTML.
test('dense-discovery CTA honours arbitrary pixel lengths, zero, fonts, and paragraph breaks', async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'dense-cta-spacing-'));
  const cases = [
    { value: undefined, expected: '28px', border: '1px', radius: '0px', font: 'mono' },
    { value: 0, expected: '0px', border: '0px', radius: '0px', font: 'sans' },
    { value: '0px', expected: '0px', border: '0px', radius: '0px', font: 'Arial, Helvetica, sans-serif' },
    { value: 7.5, expected: '7.5px', border: '7.5px', radius: '7.5px', font: 'mono' },
    { value: '13.25px', expected: '13.25px', border: '13.25px', radius: '13.25px', font: 'sans' },
    { value: '47', expected: '47px', border: '47px', radius: '47px', font: 'Arial, Helvetica, sans-serif' },
    { value: '32px', expected: '32px', border: '32px', radius: '32px', font: 'sans' },
  ];
  const sections = cases.map(({ value, font }, index) => ({
    type: 'inline_cta',
    eyebrow: `CTA ${index}`,
    statement: `Paragraph ${index}.\n\nAnother <strong>paragraph</strong>.`,
    font_family: font,
    ...(value === undefined ? {} : {
      space_top: value, space_bottom: value, border_width: value, border_radius: value,
    }),
    primaryAction: { label: 'Read more', url: `mailto:cta${index}@example.com` },
    secondaryAction: { label: 'Contact', url: `mailto:contact${index}@example.com` },
  }));
  sections.push({
    type: 'inline_cta',
    statement: '<p>Authored paragraph.</p>\n\n<p>Another paragraph.</p>',
    space_top: 3, space_bottom: '19px', border_width: '1px', border_radius: '8px',
  });
  // Preceding item loops must not change the section index passed to the CTA.
  const newsletter = { template: 'dense-discovery', title: 'CTA spacing regression', sections: [
    { type: 'single-column', title: 'Before CTA', items: [{ description: 'First item.' }, { description: 'Second item.' }] },
    ...sections,
  ] };
  try {
    assertSchemaValid('dense-discovery', newsletter);
    const html = await renderTemplate('dense-discovery', newsletter, path.join(tempRoot, 'build'));
    assert.doesNotMatch(html, /pxpx|NaNpx/);
    const document = new JSDOM(html).window.document;
    const cards = [...document.querySelectorAll('[data-content-slot="inline_cta"]')];
    assert.equal(cards.length, sections.length);
    cases.forEach(({ expected, border, radius, font }, index) => {
      const card = cards[index];
      const before = card.parentElement.previousElementSibling?.firstElementChild;
      const after = card.parentElement.nextElementSibling?.firstElementChild;
      if (expected === '0px') {
        assert.notEqual(before?.dataset.inlineCtaSpace, 'top');
        assert.notEqual(after?.dataset.inlineCtaSpace, 'bottom');
      } else {
        assert.equal(before.dataset.inlineCtaSpace, 'top');
        assert.equal(after.dataset.inlineCtaSpace, 'bottom');
        assert.equal(before.style.paddingTop, expected);
        assert.equal(after.style.paddingTop, expected);
      }
      assert.equal(card.style.borderTopWidth, border);
      assert.equal(card.style.borderRadius, radius);
      assert.match(card.textContent, new RegExp(`CTA ${index}`));
      assert.equal(card.querySelector('.inline-cta-copy').querySelectorAll('br').length, 2);
      for (const element of card.querySelectorAll('.inline-cta-copy, .inline-cta-eyebrow, .inline-cta-button')) {
        assert.match(element.style.fontFamily, font === 'mono' ? /Share Tech Mono/ : /Arial, Helvetica, sans-serif/);
      }
      assert.equal(card.querySelector('a').getAttribute('href'), `mailto:cta${index}@example.com`);
    });
    const authoredCard = cards.at(-1);
    assert.equal(authoredCard.parentElement.previousElementSibling.firstElementChild.style.paddingTop, '3px');
    assert.equal(authoredCard.parentElement.nextElementSibling.firstElementChild.style.paddingTop, '19px');
    assert.equal(authoredCard.style.borderTopWidth, '1px');
    assert.equal(authoredCard.style.borderRadius, '8px');
    assert.equal(authoredCard.querySelectorAll('.inline-cta-copy p').length, 2);
    assert.equal(authoredCard.querySelectorAll('.inline-cta-copy br').length, 0);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

// Starters should expose controls the section actually renders, while legacy
// build fields remain accepted by the schema for existing authored drafts.
test('dense-discovery CTA starters omit inert fields and validate against the template schema', () => {
  const template = 'dense-discovery';
  const output = execFileSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/generate-skeleton-from-schema.mjs'),
    '--template', template, '--sections', 'inline_cta', '--all-section-fields',
  ], { cwd: REPO_ROOT, encoding: 'utf8' });
  const newsletter = matter(output).data;
  assertSchemaValid(template, newsletter);
  const cta = newsletter.sections.find(section => section.type === 'inline_cta');
  assert.ok(cta.statement);
  assert.ok(cta.primaryAction);
  for (const field of ['items', 'headingStylesInline', 'linkStylesInline', 'containerStyles', 'contentStyles', 'headingStyles', 'linkStyles']) {
    assert.equal(Object.hasOwn(cta, field), false, `${template}: ${field}`);
  }
});
