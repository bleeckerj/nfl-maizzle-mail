import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectHtmlLinkCandidates,
  collectLinkCandidates,
  validateRenderedHtmlLinks,
  validateLinks,
} from '../../lib/newsletter-core/index.mjs';

test('collects href fields from section article groups and nested more links', () => {
  const newsletterData = {
    sections: [
      {
        type: 'section_article_group',
        section_label: 'Podcast',
        articles: [
          {
            headline: 'Actual article',
            href: 'https://example.com/podcast/actual-episode/',
          },
        ],
        more_link: {
          label: 'See more podcasts',
          href: 'https://example.com/podcast/',
        },
      },
    ],
  };

  assert.deepEqual(
    collectLinkCandidates(newsletterData).map((entry) => ({
      path: entry.path,
      url: entry.url,
    })),
    [
      {
        path: ['sections', 0, 'articles', 0, 'href'],
        url: 'https://example.com/podcast/actual-episode/',
      },
      {
        path: ['sections', 0, 'more_link', 'href'],
        url: 'https://example.com/podcast/',
      },
    ],
  );
});

test('validateLinks fails the build path on broken article hrefs', async () => {
  const newsletterData = {
    sections: [
      {
        type: 'section_article_group',
        articles: [
          {
            headline: 'Broken article',
            href: 'https://example.com/missing-episode/',
          },
        ],
      },
    ],
  };

  await assert.rejects(
    () => validateLinks(newsletterData, {
      checkHttpUrl: async () => ({ valid: false, status: 404 }),
      logger: { log() {} },
    }),
    /Link validation failed with 1 error/,
  );
});

test('validateLinks warns instead of failing on method-blocked links', async () => {
  const newsletterData = {
    sections: [
      {
        type: 'section_article_group',
        articles: [
          {
            headline: 'Method blocked article',
            href: 'https://example.com/method-blocked/',
          },
        ],
      },
    ],
  };
  const messages = [];

  const result = await validateLinks(newsletterData, {
    checkHttpUrl: async () => ({ valid: false, status: 405 }),
    logger: { log(message = '') { messages.push(message); } },
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /HTTP 405/);
  assert.ok(messages.some((message) => message.includes('Link Validation Results')));
});

test('validateLinks warns instead of failing on rate-limited links', async () => {
  const newsletterData = {
    sections: [
      {
        type: 'food-for-thought',
        items: [
          {
            title: 'Rate limited article',
            link: 'https://example.com/rate-limited/',
          },
        ],
      },
    ],
  };
  const messages = [];

  const result = await validateLinks(newsletterData, {
    checkHttpUrl: async () => ({ valid: false, status: 429 }),
    logger: { log(message = '') { messages.push(message); } },
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /HTTP 429/);
  assert.ok(messages.some((message) => message.includes('Link Validation Results')));
});

test('validateLinks warns instead of failing on transient request timeouts', async () => {
  const newsletterData = {
    footer: {
      socialLinks: {
        github: [
          {
            text: 'GitHub',
            url: 'https://github.com/example',
          },
        ],
      },
    },
  };
  const messages = [];

  const result = await validateLinks(newsletterData, {
    checkHttpUrl: async () => ({ valid: false, error: 'Request timeout' }),
    logger: { log(message = '') { messages.push(message); } },
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Request timeout/);
  assert.ok(messages.some((message) => message.includes('Link Validation Results')));
});

test('validateLinks warns instead of failing on build-owned newsletter archive URLs before publication', async () => {
  const newsletterData = {
    sections: [
      {
        type: 'newsletter_masthead',
        viewOnlineLink: 'https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w23-y26',
      },
    ],
  };

  const result = await validateLinks(newsletterData, {
    checkHttpUrl: async () => ({ valid: false, status: 404 }),
    logger: { log() {} },
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /HTTP 404/);
});

test('validateRenderedHtmlLinks fails send preflight on broken rendered anchors', async () => {
  const html = [
    '<!doctype html>',
    '<html><body>',
    '<a href="https://example.com/ok">Ok</a>',
    '<a href="https://example.com/missing">Missing</a>',
    '</body></html>',
  ].join('');

  assert.deepEqual(
    collectHtmlLinkCandidates(html).map((entry) => entry.url),
    ['https://example.com/ok', 'https://example.com/missing'],
  );

  await assert.rejects(
    () => validateRenderedHtmlLinks(html, {
      checkHttpUrl: async (url) => (
        url.endsWith('/missing')
          ? { valid: false, status: 404 }
          : { valid: true, status: 200 }
      ),
      logger: { log() {} },
    }),
    /Link validation failed with 1 error/,
  );
});
