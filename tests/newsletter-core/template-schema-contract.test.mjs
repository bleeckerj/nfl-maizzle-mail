import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = 'near-future-lab-daily-headlines';
const TEMPLATE_ROOT = path.join(REPO_ROOT, 'templates', TEMPLATE);
const GENERATOR = path.join(REPO_ROOT, 'scripts', 'generate-skeleton-from-schema.mjs');

const sectionTypes = [
  'masthead_ad_bar',
  'newsletter_masthead',
  'intro_statement',
  'ad-block',
  'short-take',
  'calendar_event',
  'section_article_group',
  'section_more_link',
  'inline_ad_block',
  'tracking_pixel_row',
  'share_this',
  'inline_cta',
  'email_footer',
];

function validateNewsletter(newsletter) {
  const schema = JSON.parse(readFileSync(path.join(TEMPLATE_ROOT, 'newsletter.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(newsletter), true, JSON.stringify(validate.errors));
}

test('Daily Headlines schema exposes every section variant to the skeleton generator', () => {
  const output = execFileSync(process.execPath, [GENERATOR, '--template', TEMPLATE, '--list-sections'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const discovered = [...output.matchAll(/^  - (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(discovered, [...sectionTypes].sort());
});

test('schema-derived Daily Headlines starter validates as Markdown frontmatter', () => {
  const output = execFileSync(
    process.execPath,
    [
      GENERATOR,
      '--template',
      TEMPLATE,
      '--minimal',
      '--sections',
      'newsletter_masthead',
      'intro_statement',
      'ad-block',
      'short-take',
      'section_article_group',
      'share_this',
      'inline_cta',
      'email_footer',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  validateNewsletter(matter(output).data);
  assert.equal(matter(output).data.ogImage, 'https://fpoimg.com/800x600?text=Og%20image&bg_color=e6e6e6&text_color=4FAAAA');
  assert.equal(matter(output).data.ogImageAltText, 'Open graph preview image for this newsletter');
  validateNewsletter(matter(readFileSync(path.join(TEMPLATE_ROOT, 'public-issue-starter.md'), 'utf8')).data);
});

test('schema-derived starters emit every non-structural root property declared by the schema', () => {
  const output = execFileSync(process.execPath, [GENERATOR, '--template', TEMPLATE, '--minimal'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const generated = matter(output).data;
  const schema = JSON.parse(readFileSync(path.join(TEMPLATE_ROOT, 'newsletter.schema.json'), 'utf8'));
  const structural = new Set(['template', 'sections', 'header', 'intro', 'footer']);

  for (const property of Object.keys(schema.properties)) {
    if (!structural.has(property)) assert.ok(Object.hasOwn(generated, property), property);
  }
});
