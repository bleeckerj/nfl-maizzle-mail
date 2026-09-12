import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '@maizzle/framework';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function renderHeaderFixture() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'dense-discovery-header-'));
  const outputDir = path.join(tempRoot, 'build');
  try {
    await build('production', {
      build: {
        templates: {
          source: path.join(REPO_ROOT, 'templates', 'dense-discovery'),
          destination: { path: outputDir },
        },
        components: {
          source: path.join(REPO_ROOT, 'templates', 'dense-discovery', 'components'),
        },
      },
      inlineCSS: false,
      locals: {
        template: 'dense-discovery',
        title: 'Header fixture',
        preheader: 'Header fixture',
        themeColors: { header: '#ffffff', linkAccent: '#000000' },
        header: {
          featuredImage: 'https://images.example/featured.png',
          caption: 'A compact image caption.',
          quote: 'A descriptive header note.',
          contentStyles: {
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '16px',
            lineHeight: '21px',
            color: '#333333',
            artistFontSize: '16px',
          },
        },
        sections: [],
        footer: {},
      },
    });
    const outputPath = path.join(outputDir, 'newsletter.html');
    assert.ok(existsSync(outputPath));
    return readFileSync(outputPath, 'utf8');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('dense-discovery featured header renders image before caption and description', async () => {
  const html = await renderHeaderFixture();
  const imageIndex = html.indexOf('https://images.example/featured.png');
  const captionIndex = html.indexOf('A compact image caption.');
  const quoteIndex = html.indexOf('A descriptive header note.');

  assert.ok(imageIndex >= 0);
  assert.ok(captionIndex > imageIndex);
  assert.ok(quoteIndex > captionIndex);
  assert.match(html, /mob-caption[^>]*font-size:12px;line-height:15px/);
  assert.match(html, /font-size:14px;line-height:18px[^>]*font-weight:400[^>]*color:#333333[^>]*padding:0[^>]*margin:0;margin-bottom:3px/);
});
