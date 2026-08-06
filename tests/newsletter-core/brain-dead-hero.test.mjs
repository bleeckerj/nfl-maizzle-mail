import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { build } from '@maizzle/framework';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeNewsletterLinkTracking } from '../../lib/newsletter-core/link-tracking-metadata.mjs';
import { validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';
import { assertDeclaredTemplateImagesRendered } from '../../lib/newsletter-core/rendered-image-validation.mjs';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');

function baseNewsletter(overrides = {}) {
  return {
    template: 'brain-dead-template',
    title: 'Hero regression fixture',
    hero: { headline: 'A hero fixture' },
    sections: [{ type: 'single-column', items: [{ title: 'Fixture content' }] }],
    footer: { footerCta: { enabled: false } },
    ...overrides,
  };
}

function assertSchemaValid(newsletter) {
  const schema = JSON.parse(readFileSync(path.join(REPO_ROOT, 'templates', 'brain-dead-template', 'newsletter.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(newsletter), true, JSON.stringify(validate.errors));
}

async function renderNewsletter(newsletter) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'brain-dead-hero-'));
  const outputDir = path.join(tempRoot, 'build');
  try {
    await build('production', {
      build: {
        templates: {
          source: path.join(REPO_ROOT, 'templates', 'brain-dead-template'),
          destination: { path: outputDir },
        },
        components: {
          source: path.join(REPO_ROOT, 'templates', 'brain-dead-template', 'components'),
        },
      },
      inlineCSS: false,
      locals: newsletter,
    });
    const outputPath = path.join(outputDir, 'newsletter.html');
    assert.ok(existsSync(outputPath));
    return readFileSync(outputPath, 'utf8');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('brain-dead hero wraps the image with hero.ctaLink and preserves full image sizing', async () => {
  const newsletter = baseNewsletter({
    brand: { logoUrl: 'https://images.example/logo.png' },
    hero: {
      headline: 'A hero fixture',
      image: 'https://images.example/hero.png',
      imageAlt: 'A complete hero image',
      ctaLink: {
        href: 'https://example.com/hero',
        label: 'fixture | hero CTA | shop',
        category: 'commerce',
      },
    },
  });
  assertSchemaValid(newsletter);
  normalizeNewsletterLinkTracking(newsletter);
  const prepared = prepareNewsletterData(newsletter, {
    repoRoot: REPO_ROOT,
    templateName: 'brain-dead-template',
    outputName: 'hero-cta-regression',
    logger: { log() {} },
  });
  assert.equal(prepared.hero.imageLink, undefined);
  const html = await renderNewsletter(prepared);

  assert.match(html, /<a href="https:\/\/example\.com\/hero"[^>]*>\s*<img[^>]+src="https:\/\/images\.example\/hero\.png"[^>]+alt="A complete hero image"[^>]+width="576"[^>]+height:auto/);
  assert.doesNotMatch(html, /hero\.png[^>]*src=""/);
  assert.doesNotThrow(() => assertDeclaredTemplateImagesRendered({
    newsletterData: newsletter,
    templateName: 'brain-dead-template',
    renderedHtml: html,
  }));
});

test('brain-dead hero body keeps nested author paragraphs inside a black text container', async () => {
  const newsletter = baseNewsletter({
    hero: {
      headline: 'Body fixture',
      body: '<p>First hero paragraph.</p><p>Second hero paragraph.</p>',
    },
  });
  const html = await renderNewsletter(newsletter);

  assert.match(html, /<div style="[^\"]*color:#000000[^\"]*"><p>First hero paragraph\.<\/p><p>Second hero paragraph\.<\/p><\/div>/);
  assert.doesNotMatch(html, /<p[^>]*color:#000000[^>]*>\s*<p>First hero paragraph/);
});

test('brain-dead hero imageLink overrides hero.ctaLink', async () => {
  const newsletter = baseNewsletter({
    hero: {
      headline: 'Override fixture',
      image: 'https://images.example/override.png',
      ctaLink: 'https://example.com/cta',
      imageLink: {
        href: 'https://example.com/image-detail',
        label: 'fixture | hero image | detail',
        category: 'commerce',
      },
    },
  });
  normalizeNewsletterLinkTracking(newsletter);
  const html = await renderNewsletter(newsletter);
  assert.match(html, /<a href="https:\/\/example\.com\/image-detail"[^>]*>\s*<img[^>]+src="https:\/\/images\.example\/override\.png"/);
  assert.doesNotMatch(html, /href="https:\/\/example\.com\/cta"[^>]*>\s*<img[^>]+src="https:\/\/images\.example\/override\.png"/);
});

test('brain-dead hero keeps legacy shopLink behavior and supports an unlinked image', async () => {
  const linked = baseNewsletter({
    hero: { headline: 'Shop-linked hero', image: 'https://images.example/shop-hero.png' },
    shopLink: 'https://example.com/shop',
  });
  const linkedHtml = await renderNewsletter(linked);
  assert.match(linkedHtml, /<a href="https:\/\/example\.com\/shop"[^>]*>\s*<img[^>]+src="https:\/\/images\.example\/shop-hero\.png"/);

  const unlinked = baseNewsletter({
    hero: {
      headline: 'Unlinked hero',
      image: 'https://images.example/unlinked.png',
      imageAlt: 'Unlinked hero image',
      imageLink: 'none',
    },
  });
  const unlinkedHtml = await renderNewsletter(unlinked);
  assert.match(unlinkedHtml, /<img[^>]+src="https:\/\/images\.example\/unlinked\.png"[^>]+alt="Unlinked hero image"/);
  assert.doesNotMatch(unlinkedHtml, /<a[^>]+href="[^"]*"[^>]*>\s*<img[^>]+src="https:\/\/images\.example\/unlinked\.png"/);

  const defaultUnlinked = baseNewsletter({
    hero: {
      headline: 'Default unlinked hero',
      image: 'https://images.example/default-unlinked.png',
      imageAlt: 'Default unlinked hero image',
    },
  });
  const preparedDefaultUnlinked = prepareNewsletterData(defaultUnlinked, {
    repoRoot: REPO_ROOT,
    templateName: 'brain-dead-template',
    outputName: 'hero-regression',
    logger: { log() {} },
  });
  assert.equal(preparedDefaultUnlinked.hero.imageLink, 'none');
  const defaultUnlinkedHtml = await renderNewsletter(preparedDefaultUnlinked);
  assert.match(defaultUnlinkedHtml, /<img[^>]+src="https:\/\/images\.example\/default-unlinked\.png"[^>]+alt="Default unlinked hero image"/);
});

test('brain-dead hero without an image does not create an empty image row', async () => {
  const newsletter = baseNewsletter();
  const html = await renderNewsletter(newsletter);
  assert.doesNotMatch(html, /src="https:\/\/images\.example\//);
  assert.doesNotThrow(() => assertDeclaredTemplateImagesRendered({
    newsletterData: newsletter,
    templateName: 'brain-dead-template',
    renderedHtml: html,
  }));
});

test('image validation reports exact template-level frontmatter paths', async () => {
  const newsletter = {
    brand: { logoUrl: 'https://images.example/logo.png' },
    hero: { image: 'https://images.example/hero.png' },
    mainImage: 'https://images.example/main.png',
  };
  const result = await validateNewsletterImages(newsletter, {
    checkImageUrl: async (url) => ({ valid: url.endsWith('/logo.png') }),
    logger: { log() {} },
  });

  assert.equal(result.totalImages, 3);
  assert.equal(result.validImages, 1);
  assert.deepEqual(result.errors, [
    '❌ hero.image: https://images.example/hero.png (invalid image URL)',
    '❌ mainImage: https://images.example/main.png (invalid image URL)',
  ]);
});

test('render assertion fails when a declared hero image is absent from final HTML', () => {
  assert.throws(
    () => assertDeclaredTemplateImagesRendered({
      newsletterData: baseNewsletter({ hero: { headline: 'Missing image', image: 'https://images.example/missing.png' } }),
      templateName: 'brain-dead-template',
      renderedHtml: '<html><body><img src="https://images.example/logo.png"></body></html>',
    }),
    /hero\.image: https:\/\/images\.example\/missing\.png/,
  );
});
