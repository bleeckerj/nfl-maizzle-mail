import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import {
  checkHttpUrl,
  collectHtmlLinkCandidates,
  collectLinkCandidates,
  validateRenderedHtmlLinks,
  validateLinks,
} from '../../lib/newsletter-core/index.mjs';

async function withLocalServer(handler, callback) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
    });
    handler(req, res);
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    return await callback(`http://127.0.0.1:${port}`, requests);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

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

test('checkHttpUrl accepts links when HEAD 404 falls back to GET 200', async () => {
  await withLocalServer((req, res) => {
    if (req.method === 'HEAD') {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end('ok');
  }, async (origin, requests) => {
    const result = await checkHttpUrl(`${origin}/head-404-get-200.pdf`);

    assert.deepEqual(result, { valid: true, status: 200 });
    assert.deepEqual(requests.map((request) => request.method), ['HEAD', 'GET']);
    assert.equal(requests[1].headers.range, 'bytes=0-0');
    assert.match(requests[1].headers['user-agent'], /Newsletter Link Validator/);
  });
});

test('checkHttpUrl accepts links when HEAD 405 falls back to GET 200', async () => {
  await withLocalServer((req, res) => {
    res.writeHead(req.method === 'HEAD' ? 405 : 200);
    res.end();
  }, async (origin, requests) => {
    const result = await checkHttpUrl(`${origin}/head-405-get-200`);

    assert.deepEqual(result, { valid: true, status: 200 });
    assert.deepEqual(requests.map((request) => request.method), ['HEAD', 'GET']);
  });
});

test('checkHttpUrl accepts links when HEAD 403 falls back to GET 200', async () => {
  await withLocalServer((req, res) => {
    res.writeHead(req.method === 'HEAD' ? 403 : 200);
    res.end();
  }, async (origin, requests) => {
    const result = await checkHttpUrl(`${origin}/head-403-get-200`);

    assert.deepEqual(result, { valid: true, status: 200 });
    assert.deepEqual(requests.map((request) => request.method), ['HEAD', 'GET']);
  });
});

test('checkHttpUrl keeps HEAD 404 when GET fallback also returns 404', async () => {
  await withLocalServer((_req, res) => {
    res.writeHead(404);
    res.end();
  }, async (origin, requests) => {
    const result = await checkHttpUrl(`${origin}/missing`);

    assert.deepEqual(result, { valid: false, status: 404 });
    assert.deepEqual(requests.map((request) => request.method), ['HEAD', 'GET']);
  });
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
    footer: {
      shareUrl: 'https://nearfuturelaboratory.com/newsletters/2026/w27-y26/',
    },
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
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0], /HTTP 404/);
  assert.match(result.warnings[1], /HTTP 404/);
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
