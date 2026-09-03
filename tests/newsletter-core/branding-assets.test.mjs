import test from 'node:test';
import assert from 'node:assert/strict';

import { validateNewsletterImages } from '../../lib/newsletter-core/image-validation.mjs';

test('dense-discovery image validation rejects non-canonical header branding', async () => {
  const result = await validateNewsletterImages(
    {
      template: 'dense-discovery',
      header: {
        logoTop: 'https://fpoimg.com/200x50?text=Logo',
        logoLink: 'https://fpoimg.com/600x400?text=Logo%20link',
        logoBottom: 'https://fpoimg.com/200x50?text=Logo',
      },
    },
    {
      checkImageUrl: async () => ({ valid: true }),
      logger: { log() {} },
    },
  );

  assert.equal(result.validImages, 2);
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors.every((error) => error.includes('canonical dense-discovery branding asset')));
});
