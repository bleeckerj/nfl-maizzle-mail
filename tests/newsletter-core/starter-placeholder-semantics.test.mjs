import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATES_ROOT = path.join(REPO_ROOT, 'templates');
const GENERATOR = path.join(REPO_ROOT, 'scripts', 'generate-skeleton-from-schema.mjs');
const CSS_LENGTH = /^(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|pt|ch|vw|vh))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|pt|ch|vw|vh))){0,3}$/;
const URL_VALUE = /^(?:https:\/\/|mailto:|\[unsubscribe\]$)/;

function normalized(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isAltTextField(name) {
  return name === 'alt' || name.endsWith('alt') || name.endsWith('alttext');
}

function isLinkField(name) {
  return name === 'href'
    || name === 'link'
    || name === 'url'
    || name.endsWith('href')
    || name.endsWith('link')
    || name.endsWith('url')
    || name === 'linkedinfollow';
}

function isImageSourceField(name) {
  if (name.endsWith('href') || name.endsWith('link')) return false;
  return name === 'src'
    || name.endsWith('src')
    || name.endsWith('srcdesktop')
    || name.endsWith('srcmobile')
    || name === 'image'
    || name.endsWith('image')
    || name.endsWith('images')
    || name.startsWith('logoimage')
    || name === 'logo'
    || name.endsWith('logo')
    || name.endsWith('imageurl')
    || name.endsWith('logourl');
}

function isStyleField(name) {
  return name.endsWith('color')
    || name.endsWith('background')
    || name.includes('backgroundgradient')
    || name === 'border'
    || (name.includes('border') && (name.endsWith('style') || name.endsWith('width') || name.endsWith('radius')))
    || name.endsWith('dividerwidth')
    || name.includes('padding')
    || name.startsWith('space')
    || name.endsWith('gap')
    || name.endsWith('fontfamily')
    || name.endsWith('fontsize')
    || name.endsWith('lineheight')
    || name.endsWith('fontweight')
    || name.endsWith('fontstyle')
    || name.endsWith('textalign')
    || name.endsWith('texttransform')
    || name.endsWith('letterspacing')
    || name.endsWith('stylesinline')
    || name.endsWith('positionstyle');
}

function inspectValue(value, propertyName, location) {
  const name = normalized(propertyName);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectValue(entry, propertyName, `${location}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      inspectValue(entry, key, `${location}.${key}`);
    }
    return;
  }

  if (['enabled', 'flatten', 'loop'].includes(name)) {
    assert.equal(typeof value, 'boolean', `${location} must be a boolean`);
  }
  if (typeof value === 'number' && /(?:width|height|fps|duration)/.test(name)) {
    assert.ok(value > 0, `${location} must be greater than zero`);
  }
  if (typeof value !== 'string') return;

  if (isStyleField(name)) {
    assert.doesNotMatch(value, /^Example\b/, `${location} must contain a usable CSS value`);
  }
  if (isAltTextField(name)) {
    assert.ok(value.length > 0, `${location} must contain accessibility text`);
    assert.doesNotMatch(value, /^https?:\/\//, `${location} must not contain a URL`);
  }
  if (isImageSourceField(name)) {
    assert.match(value, /^https:\/\//, `${location} must contain an image URL`);
  } else if (isLinkField(name)) {
    assert.match(value, URL_VALUE, `${location} must contain a link target`);
  }
  if (name.endsWith('html')) {
    assert.match(value, /<[^>]+>/, `${location} must contain HTML`);
  }
  if (name.endsWith('stylesinline')) {
    assert.match(value, /[a-z-]+\s*:/i, `${location} must contain CSS declarations`);
  }
  if (name.includes('padding') || name.endsWith('gap') || name.endsWith('fontsize') || name.endsWith('borderradius')) {
    assert.match(value, CSS_LENGTH, `${location} must contain CSS lengths`);
  }
  if ((name.includes('border') || name.includes('divider')) && name.endsWith('width')) {
    assert.match(value, CSS_LENGTH, `${location} must contain a CSS width`);
  }
  if (/^(?:date|pubdate|displaydate|displaytime|displayweekday|start|startsat|end|endsat)$/.test(name)) {
    assert.doesNotMatch(value, /^Example\b/, `${location} must contain a usable date or time`);
  }
}

test('full newsletter starters use semantically usable placeholder values', () => {
  const templates = readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((template) => existsSync(path.join(TEMPLATES_ROOT, template, 'newsletter.schema.json')));

  assert.ok(templates.length > 0, 'expected at least one schema-backed newsletter template');

  for (const template of templates) {
    const output = execFileSync(
      process.execPath,
      [GENERATOR, '--template', template, '--all-section-fields', '--items-per-section', '1'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    const payload = matter(output).data;
    for (const [propertyName, value] of Object.entries(payload)) {
      inspectValue(value, propertyName, `${template}.${propertyName}`);
    }
  }
});

test('registry-backed sections expose compact authoring fields in full starters', () => {
  const output = execFileSync(
    process.execPath,
    [GENERATOR, '--template', 'dense-discovery', '--all-section-fields', '--items-per-section', '1'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  const payload = matter(output).data;
  const adBlock = payload.sections.find(({ type }) => type === 'ad-block');
  const shortTake = payload.sections.find(({ type }) => type === 'short-take');

  assert.deepEqual(Object.keys(adBlock).sort(), ['description', 'items', 'show_bottom_rule', 'title', 'type']);
  assert.deepEqual(adBlock.items, [{ adId: 'example-ad-id' }]);
  assert.deepEqual(Object.keys(shortTake).sort(), ['items', 'type']);
  assert.deepEqual(shortTake.items, [{ shortTakeId: 'example-short-take-id' }]);
});
