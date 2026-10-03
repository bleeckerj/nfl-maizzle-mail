import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import posthtml from 'posthtml';
import expressions from 'posthtml-expressions';
import { JSDOM } from 'jsdom';

import { validateNewsletterDataAgainstSchema } from '../../lib/newsletter-core/schema.mjs';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';
import { normalizeNewsletterLinkTracking } from '../../lib/newsletter-core/link-tracking-metadata.mjs';

// Check the exported jobs-mail contract across schema validation, regeneration,
// and rendered output. These tests do not publish artifacts or send email.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE_ROOT = path.join(REPO_ROOT, 'templates', 'dense-discovery');
const SOURCE_PATH = path.resolve(REPO_ROOT, '..', 'nfl-editorial', 'emails', 'jobs',
  'principal-design-technologist-organizational-imagination',
  'principal-design-technologist-organizational-imagination.email.md');

function validate(sections) {
  validateNewsletterDataAgainstSchema({ template: 'dense-discovery', sections }, 'dense-discovery', {
    repoRoot: REPO_ROOT, strict: true, logger: { log() {} },
  });
}

function render(template, section) {
  const html = posthtml([expressions({ locals: { section }, strictMode: false })])
    .process(`<table><tbody>${template}</tbody></table>`, { sync: true }).html;
  return new JSDOM(html).window.document;
}

test('the authored Atlassian jobs email passes strict Dense Discovery validation', () => {
  const source = matter(readFileSync(SOURCE_PATH, 'utf8')).data;
  const messages = [];
  validateNewsletterDataAgainstSchema(source, 'dense-discovery', {
    repoRoot: REPO_ROOT, strict: true, logger: { log(message) { messages.push(message); } },
  });
  assert.ok(messages.some((message) => message.includes('Schema validation passed')));
});

test('the authored jobs email hydrates without tracking defaults or conflicts', () => {
  const source = matter(readFileSync(SOURCE_PATH, 'utf8')).data;
  const prepared = prepareNewsletterData(source, {
    repoRoot: REPO_ROOT, templateName: 'dense-discovery', sourcePath: SOURCE_PATH,
    strictSchema: true, logger: { log() {} },
  });
  const tracking = normalizeNewsletterLinkTracking(prepared, { sourcePath: SOURCE_PATH });
  assert.deepEqual(tracking.defaultWarnings, []);
  assert.deepEqual(tracking.conflictWarnings, []);
});

test('repeated content URLs retain distinct placement roles without conflicts', () => {
  const link = { href: 'https://theadjacency.com/jobs/registered-role', label: 'Registered role', category: 'jobs' };
  const data = {
    intro: { viewOnlineLink: { ...link, role: 'navigation' } },
    footer: { shareUrl: { ...link, role: 'share' } },
  };
  const tracking = normalizeNewsletterLinkTracking(data);
  assert.deepEqual(tracking.conflictWarnings, []);
  assert.deepEqual(tracking.records.map(({ linkRole }) => linkRole), ['navigation', 'share']);
});

test('the source linter accepts the schema-supported scalar job section', () => {
  const output = execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'lint-template.mjs'), SOURCE_PATH,
    '--template=dense-discovery'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.match(output, /No issues detected/);
});

test('schema diagnostics count field errors without duplicate branch failures', () => {
  const messages = [];
  validateNewsletterDataAgainstSchema({ sections: [
    { type: 'adjacency-job-posting', unexpected: true },
    { type: 'ad-block', unexpected: true },
  ] }, 'dense-discovery', { repoRoot: REPO_ROOT, logger: { log(message) { messages.push(message); } } });
  assert.ok(messages.some((message) => message.includes('found 2 issue(s)')));
  assert.equal(messages.filter((message) => message.includes('Unknown key')).length, 2);
});

test('job logos and ad rules have strict field contracts', () => {
  const job = {
    type: 'adjacency-job-posting',
    companyLogo: { src: 'https://imagedelivery.net/example/logo/public', alt: 'Company' },
  };
  const ad = { type: 'ad-block', show_bottom_rule: false, items: [{ adId: 'registered-ad' }] };
  validate([job, ad]);
  assert.throws(() => validate([{ ...job, companyLogo: { ...job.companyLogo, crop: true } }]), /Schema validation failed/);
  assert.throws(() => validate([{ ...ad, show_bottom_rule: 'false' }]), /Schema validation failed/);
});

test('schema regeneration retains the full logo and bottom-rule contracts', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'jobs-mail-schema-'));
  const outputPath = path.join(tempRoot, 'newsletter.schema.json');
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'generate-template-schema.mjs'),
      '--entry', path.join(TEMPLATE_ROOT, 'newsletter.html'), '--output', outputPath, '--root', REPO_ROOT],
    { cwd: REPO_ROOT, encoding: 'utf8' });
    const generated = JSON.parse(readFileSync(outputPath, 'utf8'));
    const canonical = JSON.parse(readFileSync(path.join(TEMPLATE_ROOT, 'newsletter.schema.json'), 'utf8'));
    for (const [type, field] of [['adjacency-job-posting', 'companyLogo'], ['ad-block', 'show_bottom_rule']]) {
      const fieldSchema = (schema) => schema.properties.sections.items.allOf
        .find((branch) => branch.if.properties.type.const === type).then.properties[field];
      assert.deepEqual(fieldSchema(generated), fieldSchema(canonical));
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('the job header renders the complete company logo with a square-icon fallback', () => {
  const template = readFileSync(path.join(TEMPLATE_ROOT, 'newsletter.html'), 'utf8')
    .split('<!-- ADJACENCY JOB POSTING Start -->')[1].split('<!-- ADJACENCY JOB POSTING End -->')[0];
  const section = {
    company: 'Company', title: 'Principal Design Technologist', jobStyles: {}, jobPresentation: {}, lists: [],
    companyLogo: { src: 'https://imagedelivery.net/example/full-logo/public', alt: 'Complete company logo' },
    companyIcon: { src: 'https://imagedelivery.net/example/icon/public', alt: 'Company icon' },
  };
  const document = render(template, section);
  const logo = document.querySelector('img.adjacency-company-logo');
  assert.equal(logo?.getAttribute('src'), section.companyLogo.src);
  assert.equal(logo?.getAttribute('alt'), section.companyLogo.alt);
  assert.match(logo?.getAttribute('style') || '', /height:\s*auto/);
  assert.equal(document.querySelector(`img[src="${section.companyIcon.src}"]`), null);
  const fallback = render(template, { ...section, companyLogo: undefined });
  assert.equal(fallback.querySelector('img')?.getAttribute('src'), section.companyIcon.src);
});

test('Dense Discovery ad dividers default on and respect explicit suppression', () => {
  const template = readFileSync(path.join(TEMPLATE_ROOT, 'components', 'AdBlock.html'), 'utf8')
    .replace(/<script props>[\s\S]*?<\/script>/, '');
  const section = { containerStyles: {}, items: [] };
  for (const show_bottom_rule of [undefined, true, false]) {
    const document = render(template, { ...section, show_bottom_rule });
    assert.equal(document.querySelectorAll('.ad-bottom-rule').length, show_bottom_rule === false ? 0 : 1);
  }
});
