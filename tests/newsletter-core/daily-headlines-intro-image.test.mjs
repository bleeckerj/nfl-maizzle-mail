// Check optional intro images, accessibility requirements, and the dedicated image-validation path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { collectNewsletterImageDeclarations, validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';
const root = new URL('../../templates/near-future-lab-daily-headlines/', import.meta.url);
const schema = JSON.parse(readFileSync(new URL('newsletter.schema.json', root), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const image = { image_src: 'https://example.com/intro.jpg', image_alt: 'Delegates gathered for a group photograph.' };
const issue = (fields = {}) => ({ template: 'near-future-lab-daily-headlines', title: 'Intro image test', sections: [{ type: 'intro_statement', statement: '<p>Good morning.</p>', ...fields }] });
test('intro image is optional and requires meaningful alt text when supplied', () => {
  assert.equal(validate(issue()), true, JSON.stringify(validate.errors));
  assert.equal(validate(issue(image)), true, JSON.stringify(validate.errors));
  for (const image_alt of [undefined, '', '   ']) {
    const fields = { image_src: image.image_src };
    if (image_alt !== undefined) fields.image_alt = image_alt;
    assert.equal(validate(issue(fields)), false);
  }
});
test('intro image is checked without a section items array', async () => {
  const data = issue(image);
  const images = collectNewsletterImageDeclarations(data);
  assert.equal(images.length, 1);
  assert.equal(images[0].path, 'sections[0].image_src');
  const checked = [];
  const result = await validateNewsletterImages(data, { logger: { log() {} }, checkImageUrl: async (url) => { checked.push(url); return { valid: false, status: 404 }; } });
  assert.deepEqual(checked, [image.image_src]);
  assert.equal(result.errors.length, 1);
});
