import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCampaignEmail, buildNewsletter, listTemplates } from '../../lib/mcp/tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function writeHttpMock(tempRoot) {
  const mockPath = path.join(tempRoot, 'http-mock.mjs');
  writeFileSync(
    mockPath,
    [
      "import http from 'node:http';",
      "import https from 'node:https';",
      "import { EventEmitter } from 'node:events';",
      'function request(_url, _options, callback) {',
      '  const req = new EventEmitter();',
      '  req.destroy = () => {};',
      '  req.end = () => queueMicrotask(() => callback({ statusCode: 200, resume() {} }));',
      '  return req;',
      '}',
      'http.request = request;',
      'https.request = request;',
    ].join('\n'),
    'utf8',
  );
  return mockPath;
}

function campaignSource() {
  return [
    '---',
    'publicationMode: campaign',
    'template: brain-dead-template',
    'title: MCP campaign fixture',
    'preheader: MCP campaign fixture preheader',
    'sections:',
    '  - type: single-column',
    '    title: Content',
    '    items:',
    '      - title: MCP fixture content',
    '        body: <p>Source-preserving MCP build.</p>',
    'footer:',
    '  footerCta:',
    '    enabled: false',
    '  unsubscribeLink: "[unsubscribe]"',
    '---',
    '',
  ].join('\n');
}

function setup() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'campaign-email-mcp-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const sourcePath = path.join(tempRoot, 'email-campaigns', 'mcp-fixture.md');
  mkdirSync(path.dirname(sourcePath), { recursive: true });
  mkdirSync(path.join(repoRoot, 'data'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'lib'), path.join(repoRoot, 'lib'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'scripts'), path.join(repoRoot, 'scripts'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'config.production.cjs'), path.join(repoRoot, 'config.production.cjs'));
  cpSync(path.join(REPO_ROOT, 'package.json'), path.join(repoRoot, 'package.json'));
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(repoRoot, 'node_modules'), 'dir');
  cpSync(
    path.join(REPO_ROOT, 'templates', 'brain-dead-template'),
    path.join(repoRoot, 'templates', 'brain-dead-template'),
    { recursive: true },
  );
  writeFileSync(sourcePath, campaignSource(), 'utf8');
  const adsPath = path.join(tempRoot, 'ads.json');
  const shortTakesPath = path.join(tempRoot, 'shortTakes.json');
  writeFileSync(adsPath, '[]', 'utf8');
  writeFileSync(shortTakesPath, '[]', 'utf8');
  return { tempRoot, repoRoot, sourcePath, adsPath, shortTakesPath };
}

function decode(result) {
  return JSON.parse(result.content[0].text);
}

test('campaign MCP build exposes capabilities, preserves source, and rejects the regular operation', async () => {
  const fixture = setup();
  const httpMockPath = writeHttpMock(fixture.tempRoot);
  const priorNodeOptions = process.env.NODE_OPTIONS;
  const priorAdsPath = process.env.NFL_EDITORIAL_ADS_PATH;
  const priorShortTakesPath = process.env.NFL_EDITORIAL_SHORT_TAKES_PATH;
  process.env.NODE_OPTIONS = [priorNodeOptions, `--import=${httpMockPath}`].filter(Boolean).join(' ');
  process.env.NFL_EDITORIAL_ADS_PATH = fixture.adsPath;
  process.env.NFL_EDITORIAL_SHORT_TAKES_PATH = fixture.shortTakesPath;
  try {
    const templates = decode(await listTemplates({ repoRoot: fixture.repoRoot }).handler({}));
    const brainDead = templates.templates.find(({ name }) => name === 'brain-dead-template');
    assert.deepEqual(brainDead.capability.supportedPublicationModes, ['public-issue', 'campaign']);
    assert.equal(brainDead.capability.starterMarkdown.campaign, 'campaign-starter.md');

    const sourceBefore = readFileSync(fixture.sourcePath, 'utf8');
    const result = decode(
      await buildCampaignEmail({ repoRoot: fixture.repoRoot }).handler({
        content_md_path: fixture.sourcePath,
      }),
    );
    assert.equal(result.success, true);
    assert.equal(result.sourceUnchanged, true);
    assert.equal(readFileSync(fixture.sourcePath, 'utf8'), sourceBefore);
    assert.match(result.outputDir, /output\/email-campaigns\/mcp-fixture$/);
    assert.equal(result.outputDir.includes(`${path.sep}public${path.sep}`), false);
    assert.ok(existsSync(result.artifacts.html));
    assert.ok(existsSync(result.artifacts.linkManifest));
    assert.ok(existsSync(result.artifacts.contentSlotManifest));

    await assert.rejects(
      () => buildNewsletter({ repoRoot: fixture.repoRoot }).handler({ content_md_path: fixture.sourcePath }),
      /Campaign sources must use build_campaign_email/,
    );
  } finally {
    if (priorNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = priorNodeOptions;
    if (priorAdsPath === undefined) delete process.env.NFL_EDITORIAL_ADS_PATH;
    else process.env.NFL_EDITORIAL_ADS_PATH = priorAdsPath;
    if (priorShortTakesPath === undefined) delete process.env.NFL_EDITORIAL_SHORT_TAKES_PATH;
    else process.env.NFL_EDITORIAL_SHORT_TAKES_PATH = priorShortTakesPath;
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
