import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JSDOM } from 'jsdom';
import { hydrateSpeculativeJobReferences } from '../../lib/newsletter-core/hydrate-speculative-jobs.mjs';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';
import { loadNewsletterSourceAsync } from '../../lib/newsletter-core/load-newsletter-source.mjs';
import { assertRenderedSpeculativeJobs } from '../../lib/newsletter-core/speculative-job-validation.mjs';
import { sendSesTestEmail } from '../../lib/email-send/ses-test-mailer.mjs';

// Exercise reference-only authoring, active publication lookup, finished HTML,
// and the test-send rejection path without sending email or modifying real issues.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backofficeRoot = path.resolve(repoRoot, '../nfl-backoffice');
const quiet = { log() {} };
const jobRef = 'fdaa/platform-counter-inference-analyst';
const title = 'Platform Counter Inference Analyst';
const publicUrl = 'https://theadjacency.com/jobs/fdaa/platform-counter-inference-analyst--fixture-id';
const source = () => ({
  template: 'near-future-lab-daily-headlines', title: 'Reference-only job regression',
  sections: [{ type: 'speculative-job', title: "Tomorrow's Jobs Today", items: [{ jobRef }] }],
});

async function fixture(t, { isDraft = false, status = 'active' } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'newsletter-job-references-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const editorialRoot = path.join(root, 'nfl-editorial');
  const jobPath = path.join(editorialRoot, 'src/content/jobs', `${jobRef}.mdx`);
  await mkdir(path.dirname(jobPath), { recursive: true });
  const job = { title, company: 'FDAA', isDraft, newsletterCard: { lede: 'Review inference behavior.', media: { src: 'https://images.example.com/job.jpg', altText: 'The FDAA workplace.' } }, companyLogo: { url: 'https://images.example.com/logo.png', altText: 'FDAA' } };
  await writeFile(jobPath, `---\n${Object.entries(job).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n`);
  const registryPath = path.join(root, 'registry.json');
  await writeFile(registryPath, JSON.stringify([{ popupId: 'role--fixture-id', sourceRef: jobRef, publicUrl, status, accessVariant: 'full' }]));
  return { root, editorialRoot, registryPath, options: { repoRoot, backofficeRoot, editorialRoot, registryPath, logger: quiet } };
}

test('bare references resolve canonical copy, media, and exact active publication URL without changing source', async (t) => {
  const { options } = await fixture(t);
  const input = source();
  const before = structuredClone(input);
  const resolved = await hydrateSpeculativeJobReferences(input, options);
  const card = resolved.sections[0].items[0];
  assert.deepEqual(input, before);
  assert.equal(card.headline, title);
  assert.equal(card.link.href, publicUrl);
  assert.equal(card.link.sourceRef, undefined);
  assert.equal(card.companyLogo.altText, 'FDAA');
  assert.equal(card.media.altText, 'The FDAA workplace.');
  const prepared = prepareNewsletterData(resolved, { repoRoot, templateName: input.template, logger: quiet });
  assert.equal(prepared.sections[0].items[0].headline, title);
});

test('Markdown and JSON source loaders produce the same complete job', async (t) => {
  const { root, options } = await fixture(t);
  const jsonPath = path.join(root, 'issue.json');
  const markdownPath = path.join(root, 'issue.md');
  await writeFile(jsonPath, JSON.stringify(source()));
  await writeFile(markdownPath, `---\ntemplate: near-future-lab-daily-headlines\ntitle: Reference-only job regression\nsections:\n- type: speculative-job\n  title: Tomorrow's Jobs Today\n  items:\n  - jobRef: ${jobRef}\n---\n`);
  const json = await loadNewsletterSourceAsync({ ...options, inputPath: jsonPath });
  const markdown = await loadNewsletterSourceAsync({ ...options, inputPath: markdownPath });
  assert.deepEqual(json.newsletterData.sections, markdown.newsletterData.sections);
  assert.equal(json.newsletterData.sections[0].items[0].link.href, publicUrl);
});

test('missing, draft, and inactive jobs block resolution with actionable errors', async (t) => {
  const missing = await fixture(t);
  const input = source();
  input.sections[0].items[0].jobRef = 'missing/role';
  await assert.rejects(hydrateSpeculativeJobReferences(input, missing.options), /Could not read canonical job missing\/role/);
  const draft = await fixture(t, { isDraft: true });
  await assert.rejects(hydrateSpeculativeJobReferences(source(), draft.options), /is a draft/);
  const inactive = await fixture(t, { status: 'inactive' });
  await assert.rejects(hydrateSpeculativeJobReferences(source(), inactive.options), /Unknown popup reference/);
});

test('already edition-resolved cards retain their content and destination without registry access', async () => {
  const input = source();
  input.sections[0].items[0] = { jobRef, headline: title, link: { href: '/jobs/approved-preview', label: 'Keep this edition' }, lede: 'Existing resolved copy.' };
  assert.deepEqual(await hydrateSpeculativeJobReferences(input, { repoRoot: '/unavailable' }), input);
});

test('synchronous preparation rejects unresolved cards before template interpolation', () => {
  assert.throws(() => prepareNewsletterData(source(), { repoRoot, templateName: source().template, logger: quiet }), /Unresolved speculative-job.*platform-counter-inference-analyst/);
});

const brokenHtml = '<table data-section="speculative-job"><tr><td><a href="undefined"><h3>undefined</h3></a></td></tr></table>';
test('the received broken-card shape is blocked by HTML validation and the test sender', async (t) => {
  const { root } = await fixture(t);
  assert.throws(() => assertRenderedSpeculativeJobs(brokenHtml), /empty or undefined/);
  const htmlPath = path.join(root, 'broken.html');
  await writeFile(htmlPath, brokenHtml);
  await assert.rejects(sendSesTestEmail({ htmlPath, dryRun: true, validateLinks: false, logger: quiet }), /empty or undefined/);
});

test('rendered job checks require every expected title and destination', () => {
  const expected = source();
  expected.sections[0].items[0] = { jobRef, headline: title, link: { href: publicUrl } };
  const html = `<table data-section="speculative-job"><tr><td><a href="${publicUrl}"><h3>${title}</h3></a></td></tr></table>`;
  assert.doesNotThrow(() => assertRenderedSpeculativeJobs(html, expected));
  assert.throws(() => assertRenderedSpeculativeJobs(html.replace(title, 'Different role'), expected), /differs from/);
  assert.throws(() => assertRenderedSpeculativeJobs('', expected), /section count/);
});

test('direct JSON and Markdown renderer builds expand the real reference-only FDAA card', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'newsletter-job-render-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const exec = promisify(execFile);
  for (const extension of ['json', 'md']) {
    const inputPath = path.join(root, `issue.${extension}`);
    await writeFile(inputPath, extension === 'json' ? JSON.stringify(source()) : `---\ntemplate: near-future-lab-daily-headlines\ntitle: Reference-only job regression\nsections:\n- type: speculative-job\n  title: Tomorrow's Jobs Today\n  items:\n  - jobRef: ${jobRef}\n---\n`);
    await exec(process.execPath, [path.join(repoRoot, 'scripts/build-newsletter.mjs'), inputPath, `job-${extension}`, `--output-dir=${root}`, '--preview', '--no-open'], { cwd: repoRoot, maxBuffer: 2_000_000 });
    const html = await readFile(path.join(root, `job-${extension}.html`), 'utf8');
    const dom = new JSDOM(html);
    try {
      const section = dom.window.document.querySelector('[data-section="speculative-job"]');
      assert.equal(section.querySelector('h3').textContent.trim(), title);
      assert.match(section.querySelector('h3').closest('a').href, /platform-counter-inference-analyst--025130ba5abaa370920b6b49$/);
      assert.ok(section.querySelectorAll('img').length >= 2, 'job media and company logo must render');
      assert.doesNotThrow(() => assertRenderedSpeculativeJobs(html));
      assert.doesNotMatch(section.innerHTML, /(?:>|href=")undefined/);
    } finally { dom.window.close(); }
  }
});
