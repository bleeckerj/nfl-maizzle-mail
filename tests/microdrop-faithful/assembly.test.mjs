import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import matter from 'gray-matter';

const REPO_ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const ASSEMBLER = path.join(REPO_ROOT, 'scripts', 'assemble-microdrop-email.mjs');
const delivery = (id) => `https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/${id}/full`;

function tensorPacket() {
  return {
    packetType: 'microdrop-source-packet',
    packetVersion: 1,
    template: 'microdrop-faithful',
    archetype: 'product-detail',
    entry: {
      id: 'tensor-dosimeter',
      slug: 'tensor-dosimeter',
      title: 'Tensor Dosimeter',
      brand: 'InfraMaximal',
      summary: 'A compact μIEM dosimeter with a connected 816 gNIT display.',
      canonicalUrl: 'https://theadjacency.com/microdrop/tensor-dosimeter/',
      sourcePath: 'src/content/microdrop/tensor-dosimeter/tensor-dosimeter.mdx',
    },
    renderer: { id: 'tensor-dosimeter', mode: 'generated-template', family: 'product-detail' },
    page: {
      brand: 'InfraMaximal',
      productName: 'Tensor Dosimeter',
      theme: { accentColor: '#f4511e', backgroundColor: '#f5f3ef', textColor: '#1d1d1f', surfaceColor: '#ffffff' },
      navigation: { local: ['Overview', 'Readout', 'Terms'] },
      productStage: {
        eyebrow: 'InfraMaximal / personal exposure instruments',
        headline: 'Carry the number lightly.',
        dek: 'A compact μIEM monitor.',
        configuration: [['Form', 'Compact / clip-on'], ['Connected display', '816 gNIT']],
        regionalContainment: 'United States.',
        panelNote: 'The display carries the object beyond the originating screen.',
      },
      productStageViews: [
        { src: delivery('hero'), alt: 'Hero', label: 'Hero', detail: 'μIEM readout' },
        { src: delivery('reverse'), alt: 'Reverse', label: 'Reverse', detail: 'Reverse surface' },
        { src: delivery('alternate'), alt: 'Alternate', label: 'Display mode', detail: 'Alternate μIEM display' },
        { src: delivery('connected'), alt: 'Connected', label: 'Connected display', detail: 'Connected 816 gNIT display' },
      ],
      exposure: {
        eyebrow: 'μIEM readout / 01',
        heading: 'One number, held lightly.',
        body: 'The estimate stays close to the object.',
        metrics: [{ label: 'Current reading', value: '124 μIEM', body: 'Estimated total exposure.' }],
        ledgerHeading: 'Model identification',
        ledger: [{ label: 'Model identification', value: 'N/A supported' }],
      },
      worn: { eyebrow: 'Broche & Lapel Edition / 02', heading: 'For the Dosimeter Dandy.', body: 'Clip it to a lapel.', image: { src: delivery('carry'), alt: 'Clipped Dosimeter' }, definitions: [] },
      connectedDisplay: { eyebrow: 'Connected display / 816 gNIT', heading: 'The number can make room for other views.', body: 'The display cycles through augmented modes.', modes: ['Wayfinding', 'Family photos', 'Self-aware explanatory representations'] },
      compatibility: { eyebrow: 'Compatibility and service / 04', heading: 'Designed for the systems around an inference session.', body: 'The device sits beside a model-aware ledger.', items: [{ label: 'Connected display', value: '816 gNIT', body: 'Augmented modes.' }] },
      legal: { eyebrow: 'A smaller instrument / 03', heading: 'The readout stays provisional.', body: 'μIEM is estimated.', items: [{ heading: 'No medical threshold', body: 'No biomedical limits.' }], fineprint: 'Provisional product language.' },
      about: { eyebrow: 'About', heading: 'Tensor Dosimeter', columns: ['Tensor Dosimeter is a compact object for carrying an estimate of inference exposure.'] },
    },
    blocks: [
      { id: 'navigation', kind: 'artifact-navigation', inWorld: true, content: {} },
      { id: 'product-stage', kind: 'product-stage', inWorld: true, content: {} },
      { id: 'product-stage-views', kind: 'product-view-sequence', inWorld: true, content: {} },
      { id: 'exposure-profile', kind: 'exposure-profile', inWorld: true, content: {} },
      { id: 'worn-context', kind: 'worn-context', inWorld: true, content: {} },
      { id: 'connected-display', kind: 'connected-display-modes', inWorld: true, content: {} },
      { id: 'compatibility-service', kind: 'compatibility-service', inWorld: true, content: {} },
      { id: 'legal-disclosures', kind: 'legal-disclosures', inWorld: true, content: {} },
      { id: 'about-in-world', kind: 'in-world-about', inWorld: true, content: {} },
    ],
    excludedMetadata: ['editorialNote', 'aboutPanel', 'grounding', 'researchLinks', 'provenance'],
  };
}

function runAssembler(sourcePacketPath, outputDir, ...args) {
  return spawnSync(process.execPath, [ASSEMBLER, '--source-packet', sourcePacketPath, '--output-dir', outputDir, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env },
  });
}

function fixtureBundle() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'microdrop-faithful-test-'));
  const sourcePacketPath = path.join(root, 'source-packet.json');
  const outputDir = path.join(root, 'bundle');
  fs.writeFileSync(sourcePacketPath, `${JSON.stringify(tensorPacket(), null, 2)}\n`);
  return { root, sourcePacketPath, outputDir };
}

test('fallback assembly creates a supported, operator-owned Tensor draft', () => {
  const fixture = fixtureBundle();
  const result = runAssembler(fixture.sourcePacketPath, fixture.outputDir, '--fallback-only', '--draft-only');
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const agentMarkdown = fs.readFileSync(path.join(fixture.outputDir, 'email.agent.md'), 'utf8');
  const workingMarkdown = fs.readFileSync(path.join(fixture.outputDir, 'email.md'), 'utf8');
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.outputDir, 'assembly-plan.json'), 'utf8'));
  const parsed = matter(agentMarkdown).data;

  assert.equal(agentMarkdown, workingMarkdown);
  assert.equal(plan.usedFallback, true);
  assert.deepEqual(parsed.sections.map((section) => section.type), [
    'infra-product',
    'infra-exposure',
    'infra-definition',
    'infra-copy',
    'infra-compatibility',
    'infra-legal',
    'infra-about',
  ]);
  assert.deepEqual(parsed.sections[0].views.map((view) => view.label), ['Hero', 'Reverse', 'Display mode', 'Connected display']);
  assert.match(agentMarkdown, /816 gNIT/);
  assert.doesNotMatch(agentMarkdown, /Editorial Note|grounding|provenance/i);
});

test('build-from-draft and regenerate preserve the operator Markdown boundary', () => {
  const fixture = fixtureBundle();
  const first = runAssembler(fixture.sourcePacketPath, fixture.outputDir, '--fallback-only', '--draft-only');
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const workingPath = path.join(fixture.outputDir, 'email.md');
  const agentPath = path.join(fixture.outputDir, 'email.agent.md');
  const operatorEdit = `${fs.readFileSync(workingPath, 'utf8')}\n`;
  fs.writeFileSync(workingPath, operatorEdit);

  const buildFromDraft = runAssembler(fixture.sourcePacketPath, fixture.outputDir, '--build-from-draft');
  assert.equal(buildFromDraft.status, 0, buildFromDraft.stderr || buildFromDraft.stdout);
  assert.equal(fs.readFileSync(workingPath, 'utf8'), operatorEdit);

  const regenerate = runAssembler(fixture.sourcePacketPath, fixture.outputDir, '--regenerate', '--fallback-only', '--draft-only');
  assert.equal(regenerate.status, 0, regenerate.stderr || regenerate.stdout);
  assert.equal(fs.readFileSync(workingPath, 'utf8'), operatorEdit);
  assert.ok(fs.readFileSync(agentPath, 'utf8').length > 0);
});

test('live provider smoke test proves non-fallback assembly when explicitly enabled', { skip: process.env.RUN_MICRODROP_LIVE_SMOKE !== '1' || !process.env.ANTHROPIC_API_KEY }, () => {
  const fixture = fixtureBundle();
  const result = runAssembler(fixture.sourcePacketPath, fixture.outputDir, '--regenerate', '--draft-only', '--no-fallback', '--provider', 'anthropic');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.outputDir, 'assembly-plan.json'), 'utf8'));
  assert.equal(plan.usedFallback, false);
});
