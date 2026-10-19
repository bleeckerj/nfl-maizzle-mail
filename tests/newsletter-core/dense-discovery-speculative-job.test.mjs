import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

function buildFixture(lines, outputName) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'dense-discovery-speculative-job-'));
  const inputPath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  writeFileSync(inputPath, [...lines, '---', ''].join('\n'), 'utf8');
  const result = spawnSync(process.execPath, [
    BUILD_SCRIPT,
    inputPath,
    outputName,
    `--repo-root=${REPO_ROOT}`,
    `--output-dir=${outputDir}`,
    '--preview',
    '--no-open',
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return {
    tempRoot,
    outputPath: path.join(outputDir, `${outputName}.html`),
    result,
  };
}

test('dense-discovery renders hydrated speculative-job sections', () => {
  const fixture = buildFixture([
    '---',
    'template: dense-discovery',
    'issueId: w38-y26',
    'title: Jobs Issue',
    'preheader: A rendered speculative job.',
    'sections:',
    '  - type: speculative-job',
    "    title: Tomorrow's Jobs Today",
    '    containerStyles:',
    "      backgroundColor: '#7fe8d0'",
    "      border: '1px solid #111111'",
    "      borderRadius: '8px'",
    "      contentPadding: '0 16px'",
    '    items:',
    '      - jobRef: openai/principal-applied-speculation',
    '        kicker: OpenAI',
    '        headline: Principal, Applied Speculation',
    '        lede: A founding individual contributor role.',
    '        cta_label: Would you like to know more?',
    '        link: /jobs/openai/principal-applied-speculation',
    '        companyLogo:',
    '          url: https://images.example.com/openai-logo.png',
    '          altText: OpenAI logo',
    '        cardStyles:',
    "          backgroundColor: '#dff7f3'",
    "          padding: '24px 28px'",
  ], 'dense-discovery-speculative-job');

  try {
    assert.equal(fixture.result.status, 0, `${fixture.result.stdout}\n${fixture.result.stderr}`);
    assert.doesNotMatch(`${fixture.result.stdout}\n${fixture.result.stderr}`, /Schema validation found/);
    const html = readFileSync(fixture.outputPath, 'utf8');
    const document = new JSDOM(html).window.document;
    const headingCell = document.querySelector('[data-section-header="speculative-job"]');
    const heading = headingCell?.querySelector('h2');
    const jobsSurface = document.querySelector('[data-section="speculative-job"]');
    assert.match(html, /data-section="speculative-job"/);
    assert.match(html, /Tomorrow(?:&#0*39;|')s Jobs Today/);
    assert.match(html, /Principal, Applied Speculation/);
    assert.match(html, /background-color:#7fe8d0/);
    assert.match(html, /background-color:#dff7f3/);
    assert.match(html, /padding:24px 28px/);
    assert.match(html, /href="\/jobs\/openai\/principal-applied-speculation"/);
    assert.match(html, /<img[^>]+src="https:\/\/images\.example\.com\/openai-logo\.png"[^>]+alt="OpenAI logo"[^>]+height="40"/);
    assert.doesNotMatch(html, /src="https:\/\/images\.example\.com\/openai-logo\.png"[^>]+width="638"/);
    assert.ok(headingCell, 'expected a speculative-job heading cell');
    assert.match(headingCell.getAttribute('style') || '', /background(?:-color)?:#7fe8d0/);
    assert.match(headingCell.getAttribute('style') || '', /border-bottom:2px solid #(?:FFFFFF|ffffff)/);
    assert.ok(heading, 'expected a speculative-job heading');
    assert.match(heading.getAttribute('style') || '', /font-size:21px/);
    assert.match(heading.getAttribute('style') || '', /font-family:'?Ubuntu'?,sans-serif/);
    assert.ok(jobsSurface, 'expected a speculative-job jobs surface');
    assert.ok(!jobsSurface.contains(headingCell), 'the heading must remain separate from the bordered jobs area');
    assert.match(headingCell.getAttribute('style') || '', /border-radius:8px 8px 0 0/);
    assert.match(jobsSurface.getAttribute('style') || '', /border:1px solid #111111/);
    assert.match(jobsSurface.getAttribute('style') || '', /border-radius:0 0 8px 8px/);
    assert.match(jobsSurface.getAttribute('style') || '', /border-collapse:separate/);
    assert.match(jobsSurface.getAttribute('style') || '', /background-color:#7fe8d0/);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('Daily Headlines aligns speculative-job copy with full-width media by default', () => {
  const template = readFileSync(
    path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'newsletter.html'),
    'utf8',
  );

  assert.match(template, /item\.media && item\.media\.src[\s\S]*?<tr><td style="padding:0;line-height:0;font-size:0;text-align:center">/);
  assert.match(template, /speculativeJobCardPaddingStyleInline[\s\S]*?\|\| 'padding:24px 0'/);
  assert.doesNotMatch(template, /speculativeJobCardPaddingStyleInline[\s\S]*?\|\| 'padding:24px 28px'/);
});

test('Daily Headlines preserves speculative-job company logo sizing on mobile', () => {
  const template = readFileSync(
    path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'newsletter.html'),
    'utf8',
  );
  const layout = readFileSync(
    path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'layouts', 'main.html'),
    'utf8',
  );

  assert.match(template, /class="speculative-job-company-logo"[^>]+height="40"/);
  assert.match(layout, /\.speculative-job-company-logo\s*\{\s*width:\s*auto !important;[\s\S]*?max-width:\s*280px !important;[\s\S]*?height:\s*40px !important;/);
  assert.match(layout, /img:not\(\.masthead-logo\):not\(\.newsletter-title-logo\):not\(\.article-image\):not\(\.speculative-job-company-logo\)/);
});

test('build rejects section types that the selected template cannot render', () => {
  const fixture = buildFixture([
    '---',
    'template: dense-discovery',
    'title: Unsupported Section Issue',
    'preheader: Unsupported sections must be visible during builds.',
    'sections:',
    '  - type: definitely-unsupported',
    '    title: Unsupported Section',
    '    items:',
    '      - description: This content must not disappear silently.',
  ], 'dense-discovery-unsupported-section');

  try {
    assert.equal(fixture.result.status, 1, `${fixture.result.stdout}\n${fixture.result.stderr}`);
    const output = `${fixture.result.stdout}\n${fixture.result.stderr}`;
    assert.match(output, /Schema validation failed/);
    assert.match(output, /sections\[0\] \(definitely-unsupported \/ "Unsupported Section"\)/);
    assert.match(output, /must be equal to one of the allowed values/);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
