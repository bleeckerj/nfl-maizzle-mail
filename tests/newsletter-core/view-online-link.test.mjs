import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDailyHeadlinesShareEmailHref,
  buildViewOnlineTrackedLink,
  buildViewOnlineUrl,
  injectDailyHeadlinesShareEmailHrefs,
  injectViewOnlineLink,
  warnIfMissingViewOnlineLink,
} from '../../lib/newsletter-core/view-online-link.mjs';

test('buildViewOnlineUrl derives deterministic public newsletter URL from issue id', () => {
  assert.equal(
    buildViewOnlineUrl('nfl-dh-w23-y26'),
    'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w23-y26',
  );
});

test('buildViewOnlineTrackedLink includes label and issue navigation tracking', () => {
  assert.deepEqual(buildViewOnlineTrackedLink('w23-y26'), {
    href: 'https://nearfuturelaboratory.com/newsletters/2026/w23-y26',
    label: 'w23-y26 | view online',
    category: 'issue-nav',
    intent: 'read-related',
  });
});

test('buildDailyHeadlinesShareEmailHref percent-encodes the subject and complete issue URL', () => {
  assert.equal(
    buildDailyHeadlinesShareEmailHref('https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w32-y26'),
    'mailto:?subject=Near%20Future%20Laboratory%20Daily%20Headlines&body=Thought%20you%27d%20like%20this%3A%20https%3A%2F%2Fnearfuturelaboratory.com%2Fnewsletters%2F2026%2Fnfl-dh-w32-y26',
  );
  assert.equal(buildDailyHeadlinesShareEmailHref(''), '');
});

test('injectDailyHeadlinesShareEmailHrefs supplies the default and preserves an authored override', () => {
  const newsletterData = {
    template: 'near-future-lab-daily-headlines',
    sections: [
      {
        type: 'share_this',
        online_url: 'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w33-y26',
      },
      {
        type: 'share_this',
        online_url: 'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w34-y26',
        email_href: 'mailto:?subject=Custom',
      },
    ],
  };

  assert.equal(injectDailyHeadlinesShareEmailHrefs(newsletterData), 1);
  assert.equal(
    newsletterData.sections[0].email_href,
    'mailto:?subject=Near%20Future%20Laboratory%20Daily%20Headlines&body=Thought%20you%27d%20like%20this%3A%20https%3A%2F%2Fnearfuturelaboratory.com%2Fnewsletters%2F2026%2Fnfl-dh-w33-y26',
  );
  assert.equal(newsletterData.sections[1].email_href, 'mailto:?subject=Custom');
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
  assert.equal(newsletterData.intro.viewOnlineLink.category, 'issue-nav');
  assert.equal(newsletterData.intro.viewOnlineLink.intent, 'read-related');
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

test('warnIfMissingViewOnlineLink reports a missing public dense-discovery source link', () => {
  const warnings = [];
  const result = warnIfMissingViewOnlineLink(
    { template: 'dense-discovery', intro: { title: 'Intro' } },
    { logger: { warn(message) { warnings.push(message); } } },
  );

  assert.equal(result.field, 'intro.viewOnlineLink');
  assert.match(warnings[0], /missing or placeholder/);
  assert.match(warnings[0], /intro\.viewOnlineLink/);
});

test('warnIfMissingViewOnlineLink ignores campaign sources and usable links', () => {
  const warnings = [];
  assert.equal(
    warnIfMissingViewOnlineLink(
      { template: 'dense-discovery', publicationMode: 'campaign', intro: {} },
      { logger: { warn(message) { warnings.push(message); } } },
    ),
    null,
  );
  assert.equal(
    warnIfMissingViewOnlineLink(
      {
        template: 'dense-discovery',
        intro: { viewOnlineLink: { href: 'https://example.com/newsletters/2026/w23-y26' } },
      },
      { logger: { warn(message) { warnings.push(message); } } },
    ),
    null,
  );
  assert.deepEqual(warnings, []);
});
