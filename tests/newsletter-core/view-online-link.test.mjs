import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildViewOnlineTrackedLink,
  buildViewOnlineUrl,
  injectViewOnlineLink,
} from '../../lib/newsletter-core/view-online-link.mjs';

test('buildViewOnlineUrl derives deterministic public newsletter URL from issue id', () => {
  assert.equal(
    buildViewOnlineUrl('nfl-dh-w23-y26'),
    'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w23-y26',
  );
});

test('buildViewOnlineTrackedLink includes label and operations category', () => {
  assert.deepEqual(buildViewOnlineTrackedLink('w23-y26'), {
    href: 'https://nearfuturelaboratory.com/newsletters/2026/w23-y26',
    label: 'w23-y26 | view online',
    category: 'operations',
  });
});

test('injectViewOnlineLink fills dense-discovery intro link from output name', () => {
  const newsletterData = {
    template: 'dense-discovery',
    intro: {
      title: 'Intro',
      viewOnlineLink: 'https://example.com/typed-wrong',
    },
    sections: [],
  };

  injectViewOnlineLink(newsletterData, {
    templateName: 'dense-discovery',
    outputName: 'w23-y26',
    logger: { log() {} },
  });

  assert.equal(
    newsletterData.intro.viewOnlineLink.href,
    'https://nearfuturelaboratory.com/newsletters/2026/w23-y26',
  );
  assert.equal(newsletterData.intro.viewOnlineLink.category, 'operations');
});

test('injectViewOnlineLink fills daily-headlines masthead link from issue id', () => {
  const newsletterData = {
    template: 'near-future-lab-daily-headlines',
    issueId: 'nfl-dh-w23-y26',
    sections: [
      {
        type: 'newsletter_masthead',
        logo_src: 'https://example.com/logo.png',
      },
    ],
  };

  injectViewOnlineLink(newsletterData, {
    templateName: 'near-future-lab-daily-headlines',
    logger: { log() {} },
  });

  assert.equal(
    newsletterData.sections[0].viewOnlineLink.href,
    'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w23-y26',
  );
  assert.equal(newsletterData.sections[0].viewOnlineLink.label, 'nfl-dh-w23-y26 | view online');
});
