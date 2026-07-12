import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { build } from '@maizzle/framework';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
    assert.match(brainHtml, /data-content-slot="inline_cta"/);
    assert.match(brainHtml, /Brain Dead CTA copy\./);
    assert.match(brainHtml, /href="mailto:brain@example\.com"/);
    assert.match(brainHtml, /Courier New/);
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
