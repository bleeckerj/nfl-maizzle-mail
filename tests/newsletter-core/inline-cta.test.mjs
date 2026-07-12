import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { build } from '@maizzle/framework';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { normalizeNewsletterLinkTracking } from '../../lib/newsletter-core/link-tracking-metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');

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
    await build('production', {
      build: {
        templates: {
          source: path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines'),
          destination: { path: outputDir },
        },
        components: {
          source: path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'components'),
        },
      },
      inlineCSS: false,
      locals: newsletter,
    });

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
