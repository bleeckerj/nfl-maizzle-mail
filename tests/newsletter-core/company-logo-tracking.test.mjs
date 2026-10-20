import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNewsletterLinkTracking } from '../../lib/newsletter-core/link-tracking-metadata.mjs';

// A hydrated job carries both an image resource and a tracked destination.
// Keep image URLs intact without introducing false missing-category notices.
test('job logo resources stay outside click tracking while the job link stays tracked', () => {
  const logoUrl = 'https://imagedelivery.net/example/company-logo/full?format=webp';
  const jobUrl = 'https://example.com/jobs/analyst';
  const newsletter = { sections: [{ type: 'speculative-job', items: [{
    companyLogo: { url: logoUrl, altText: 'Company logo' },
    link: { href: jobUrl, label: 'Analyst', category: 'jobs' },
  }] }] };

  const result = normalizeNewsletterLinkTracking(newsletter);

  assert.equal(newsletter.sections[0].items[0].companyLogo.url, logoUrl);
  assert.equal(newsletter.sections[0].items[0].link, jobUrl);
  assert.equal(result.manifest.has(logoUrl), false);
  assert.equal(result.manifest.get(jobUrl).category, 'jobs');
  assert.equal(result.records.length, 1);
  assert.equal(result.defaultWarnings.length, 0);
});
