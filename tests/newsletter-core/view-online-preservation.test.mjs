import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';
import { pruneBuildInjectedFields } from '../../lib/newsletter-core/normalize.mjs';
import { injectViewOnlineLink } from '../../lib/newsletter-core/view-online-link.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const href = 'https://theadjacency.com/p/the-touring-test--example';
const tracked = { href, label: 'Touring Test online', category: 'issue-nav', intent: 'read-related' };
const logger = { log() {}, warn() {} };

for (const template of ['dense-discovery', 'near-future-lab-daily-headlines']) {
  for (const link of [href, tracked]) {
    test(`${template} preserves authored ${typeof link} links through cleanup and URL injection`, () => {
      const data = {
        template,
        intro: { viewOnlineLink: structuredClone(link) },
        sections: [{ type: 'newsletter_masthead', viewOnlineLink: structuredClone(link) }],
      };
      pruneBuildInjectedFields(data);
      injectViewOnlineLink(data, { outputName: 'w23-y26', logger });
      assert.deepEqual(data.intro.viewOnlineLink, link);
      assert.deepEqual(data.sections[0].viewOnlineLink, link);
    });
  }
}

for (const placeholder of [undefined, '', '   ', '#', 'https://example.com/wXX-yYY', { href: '#' }]) {
  test(`public build fills missing or placeholder link ${JSON.stringify(placeholder)}`, () => {
    const data = { template: 'dense-discovery', intro: { viewOnlineLink: placeholder } };
    injectViewOnlineLink(data, { outputName: 'w23-y26', logger });
    assert.equal(data.intro.viewOnlineLink.href, 'https://nearfuturelaboratory.com/newsletters/2026/w23-y26');
  });
}

for (const link of [href, tracked]) {
  test(`article email preparation preserves an authored ${typeof link} link without a weekly issue id`, () => {
    const source = {
      template: 'dense-discovery', title: 'The Touring Test',
      intro: { title: 'When homebrew meets autonomous driving', viewOnlineLink: structuredClone(link) },
      sections: [],
    };
    const original = structuredClone(source);
    const options = { repoRoot, templateName: 'dense-discovery', outputName: 'the-touring-test-adjacency-mail', strictSchema: true, logger };
    const prepared = prepareNewsletterData(source, options);
    assert.deepEqual(prepared.intro.viewOnlineLink, link);
    assert.deepEqual(prepareNewsletterData(prepared, options).intro.viewOnlineLink, link);
    assert.deepEqual(source, original);
  });
}

test('campaigns preserve authored links without generating public issue URLs', () => {
  const data = { template: 'dense-discovery', publicationMode: 'campaign', intro: { viewOnlineLink: tracked } };
  pruneBuildInjectedFields(data);
  injectViewOnlineLink(data, { outputName: 'w23-y26', logger });
  assert.deepEqual(data.intro.viewOnlineLink, tracked);
  const missing = { template: 'dense-discovery', publicationMode: 'campaign', intro: {} };
  injectViewOnlineLink(missing, { outputName: 'w23-y26', logger });
  assert.equal(missing.intro.viewOnlineLink, undefined);
});
