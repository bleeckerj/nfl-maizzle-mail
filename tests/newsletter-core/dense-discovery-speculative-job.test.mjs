import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
    "      contentPadding: '0 16px'",
    '    items:',
    '      - jobRef: openai/principal-applied-speculation',
    '        kicker: OpenAI',
    '        headline: Principal, Applied Speculation',
    '        lede: A founding individual contributor role.',
    '        cta_label: Would you like to know more?',
    '        link: /jobs/openai/principal-applied-speculation',
    '        cardStyles:',
    "          backgroundColor: '#dff7f3'",
    "          padding: '24px 28px'",
  ], 'dense-discovery-speculative-job');

  try {
    assert.equal(fixture.result.status, 0, `${fixture.result.stdout}\n${fixture.result.stderr}`);
    assert.doesNotMatch(`${fixture.result.stdout}\n${fixture.result.stderr}`, /Schema validation found/);
    const html = readFileSync(fixture.outputPath, 'utf8');
    assert.match(html, /data-section="speculative-job"/);
    assert.match(html, /Tomorrow(?:&#0*39;|')s Jobs Today/);
    assert.match(html, /Principal, Applied Speculation/);
    assert.match(html, /background-color:#7fe8d0/);
    assert.match(html, /background-color:#dff7f3/);
    assert.match(html, /padding:24px 28px/);
    assert.match(html, /href="\/jobs\/openai\/principal-applied-speculation"/);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('build reports section types that the selected template cannot render', () => {
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
    assert.equal(fixture.result.status, 0, `${fixture.result.stdout}\n${fixture.result.stderr}`);
    const output = `${fixture.result.stdout}\n${fixture.result.stderr}`;
    assert.equal(output.match(/Schema validation found \d+ issue/g)?.length, 1);
    assert.match(output, /Schema validation found \d+ issue/);
    assert.match(output, /sections\[0\] \(definitely-unsupported \/ "Unsupported Section"\)/);
    assert.match(output, /must be equal to one of the allowed values/);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
