import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLinkTrackingMetadataManifest,
  enrichHtmlWithLinkTrackingMetadata,
  normalizeNewsletterLinkTracking,
  prepareNewsletterData,
  reportLinkTrackingMetadataNotices,
} from '../../lib/newsletter-core/index.mjs';

test('normalizes string and object links while preserving template-compatible URLs', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        title: 'Food For Thought',
        items: [
          {
            title: 'Mythology Of Conscious AI',
            category: 'Predictive Brains',
            link: {
              href: 'https://example.com/conscious-ai',
              label: 'Friendly AI story',
              category: 'ai-consciousness',
            },
            readMoreText: 'Read more',
            readMoreLink: 'https://example.com/conscious-ai/more',
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData, {
    sourcePath: '/tmp/w18-y26.md',
    sourceText: [
      'sections:',
      '- type: food-for-thought',
      '  title: Food For Thought',
      '  items:',
      '  - title: Mythology Of Conscious AI',
      '    link:',
      '      href: https://example.com/conscious-ai',
      '      label: Friendly AI story',
      '      category: ai-consciousness',
      '    readMoreText: Read more',
      '    readMoreLink: https://example.com/conscious-ai/more',
    ].join('\n'),
  });

  assert.equal(newsletterData.sections[0].items[0].link, 'https://example.com/conscious-ai');
  assert.equal(result.manifest.get('https://example.com/conscious-ai').label, 'Friendly AI story');
  assert.equal(result.manifest.get('https://example.com/conscious-ai').category, 'ai-consciousness');
  assert.equal(result.manifest.get('https://example.com/conscious-ai').line, 7);

  const readMore = result.manifest.get('https://example.com/conscious-ai/more');
  assert.equal(readMore.label, 'Mythology Of Conscious AI');
  assert.equal(readMore.category, 'predictive-brains');
  assert.equal(readMore.line, 11);
  assert.equal(result.defaultWarnings.length, 1);
});

test('infers fallback label from section type when section and item titles are unavailable', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'dispatch',
        items: [{ link: 'https://example.com/dispatch' }],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData);
  const record = result.manifest.get('https://example.com/dispatch');

  assert.equal(record.label, 'dispatch section 1 link');
  assert.equal(record.category, 'dispatch');
  assert.equal(result.defaultWarnings[0].pathLabel, 'sections[0].items[0].link');
});

test('defaults only the missing tracking metadata field', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'sponsor',
        title: 'Partner Signal',
        items: [
          {
            link: {
              href: 'https://example.com/partner',
              label: 'Partner landing page',
            },
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData);
  const record = result.manifest.get('https://example.com/partner');

  assert.equal(record.label, 'Partner landing page');
  assert.equal(record.category, 'sponsor');
  assert.equal(record.defaultedLabel, false);
  assert.equal(record.defaultedCategory, true);
});

test('rejects tracked link objects that provide metadata without href or url', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        items: [{ link: { label: 'Missing href', category: 'research' } }],
      },
    ],
  };

  assert.throws(
    () => normalizeNewsletterLinkTracking(newsletterData),
    /sections\[0\]\.items\[0\]\.link must include href/,
  );
});

test('uses the first explicit metadata entry when duplicate URLs conflict', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        items: [
          {
            link: {
              href: 'https://example.com/story',
              label: 'First label',
              category: 'research',
            },
            readMoreLink: {
              href: 'https://example.com/story',
              label: 'Second label',
              category: 'product',
            },
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData);

  assert.equal(result.manifest.get('https://example.com/story').label, 'First label');
  assert.equal(result.manifest.get('https://example.com/story').category, 'research');
  assert.equal(result.conflictWarnings.length, 1);
  assert.match(result.conflictWarnings[0], /ignored sections\[0\]\.items\[0\]\.readMoreLink/);
});

test('enriches rendered anchors with manifest label and category', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        title: 'Food For Thought',
        items: [{ title: 'Story', link: 'https://example.com/story' }],
      },
    ],
  };
  const { manifest } = normalizeNewsletterLinkTracking(newsletterData);

  const html = enrichHtmlWithLinkTrackingMetadata(
    '<!doctype html><html><body><a href="https://example.com/story">Story</a></body></html>',
    manifest,
  );

  assert.match(html, /data-link-label="Story"/);
  assert.match(html, /data-link-category="food-for-thought"/);
});

test('enriches rendered anchors with semantic interest and intent', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'events',
        title: 'Seminars',
        items: [
          {
            title: 'Futuring 2.0',
            link: {
              href: 'https://example.com/seminar',
              label: 'seminar | Futuring 2.0',
              category: 'events',
              interest: 'speculative-practice',
              intent: 'attend-event',
            },
          },
        ],
      },
    ],
  };
  const { manifest } = normalizeNewsletterLinkTracking(newsletterData);

  const html = enrichHtmlWithLinkTrackingMetadata(
    '<!doctype html><html><body><a href="https://example.com/seminar">RSVP</a></body></html>',
    manifest,
  );

  assert.match(html, /data-link-label="seminar \| Futuring 2\.0"/);
  assert.match(html, /data-link-category="events"/);
  assert.match(html, /data-link-interest="speculative-practice"/);
  assert.match(html, /data-link-intent="attend-event"/);
});

test('collects inline anchors from item description prose', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'indie-mag-single-column',
        title: 'Office Hours N°312',
        items: [
          {
            title: 'Office Hours N°312',
            description: [
              '<p>Resources: <a href="https://example.com/vision">Vision and Art</a></p>',
              '<p><a href="https://example.com/time">Broken Time</a></p>',
            ].join('\n'),
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData, {
    sourcePath: '/tmp/w25-y26.md',
    sourceText: [
      'sections:',
      '- type: indie-mag-single-column',
      '  title: Office Hours N°312',
      '  items:',
      '  - title: Office Hours N°312',
      '    description: |-',
      '      <p>Resources: <a href="https://example.com/vision">Vision and Art</a></p>',
      '      <p><a href="https://example.com/time">Broken Time</a></p>',
    ].join('\n'),
  });

  const vision = result.manifest.get('https://example.com/vision');
  const time = result.manifest.get('https://example.com/time');

  assert.equal(vision.label, 'Vision and Art');
  assert.equal(vision.category, 'indie-mag-single-column');
  assert.equal(vision.pathLabel, 'sections[0].items[0].description.a[0]');
  assert.equal(vision.line, 7);
  assert.equal(vision.metadataSource, undefined);
  assert.equal(vision.defaultedLabel, false);
  assert.equal(vision.defaultedCategory, true);
  assert.equal(time.label, 'Broken Time');
  assert.equal(time.pathLabel, 'sections[0].items[0].description.a[1]');
  assert.equal(result.defaultWarnings.length, 2);
});

test('collects markdown links from converted item description prose', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'indie-mag-single-column',
        title: 'Office Hours N°312',
        items: [
          {
            title: 'Office Hours N°312',
            description: '<p>* [Vision and Art](https://example.com/vision) * [Broken Time](https://example.com/time)</p>',
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData);
  const vision = result.manifest.get('https://example.com/vision');
  const time = result.manifest.get('https://example.com/time');

  assert.equal(vision.label, 'Vision and Art');
  assert.equal(vision.category, 'indie-mag-single-column');
  assert.equal(vision.pathLabel, 'sections[0].items[0].description.a[0]');
  assert.equal(vision.defaultedCategory, true);
  assert.equal(time.label, 'Broken Time');
  assert.equal(time.pathLabel, 'sections[0].items[0].description.a[1]');
  assert.equal(result.defaultWarnings.length, 2);
  assert.equal(
    newsletterData.sections[0].items[0].description,
    '<p>* <a href="https://example.com/vision">Vision and Art</a> * <a href="https://example.com/time">Broken Time</a></p>',
  );
});

test('uses explicit data-link metadata from inline prose anchors', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        items: [
          {
            title: 'Signals',
            description: [
              '<p><a href="https://example.com/signal"',
              ' data-link-label="Signal source"',
              ' data-link-category="external-reference"',
              ' data-link-interest="speculative-practice, design-research"',
              ' data-link-intent="read-related">read the source</a></p>',
            ].join(''),
          },
        ],
      },
    ],
  };

  const result = normalizeNewsletterLinkTracking(newsletterData);
  const record = result.manifest.get('https://example.com/signal');

  assert.equal(record.label, 'Signal source');
  assert.equal(record.category, 'external-reference');
  assert.deepEqual(record.interests, ['speculative-practice', 'design-research']);
  assert.equal(record.intent, 'read-related');
  assert.equal(record.explicitLabel, true);
  assert.equal(record.explicitCategory, true);
  assert.equal(record.defaultedLabel, false);
  assert.equal(record.defaultedCategory, false);
  assert.equal(result.defaultWarnings.length, 0);
});

test('enriches rendered inline prose anchors with collected tracking metadata', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        items: [
          {
            title: 'Signals',
            category: 'External Reference',
            description: '<p><a href="https://example.com/source">Source</a></p>',
          },
        ],
      },
    ],
  };
  const { manifest } = normalizeNewsletterLinkTracking(newsletterData);

  const html = enrichHtmlWithLinkTrackingMetadata(
    '<!doctype html><html><body><p><a href="https://example.com/source">Source</a></p></body></html>',
    manifest,
  );

  assert.match(html, /data-link-label="Source"/);
  assert.match(html, /data-link-category="external-reference"/);
});

test('builds a serializable link tracking metadata manifest', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'food-for-thought',
        title: 'Food For Thought',
        items: [
          {
            title: 'Story',
            category: 'Research',
            link: {
              href: 'https://example.com/story',
              label: 'Explicit story label',
              category: 'explicit-research',
            },
            readMoreLink: 'https://example.com/story/more',
          },
        ],
      },
    ],
  };
  const linkTracking = normalizeNewsletterLinkTracking(newsletterData, {
    sourcePath: '/tmp/issue.md',
    sourceText: [
      'sections:',
      '  - type: food-for-thought',
      '    items:',
      '      - title: Story',
      '        link:',
      '          href: https://example.com/story',
      '          label: Explicit story label',
      '          category: explicit-research',
      '        readMoreLink: https://example.com/story/more',
    ].join('\n'),
  });

  const manifest = buildLinkTrackingMetadataManifest(linkTracking, {
    generatedAt: '2026-05-13T18:00:00.000Z',
    sourcePath: '/tmp/issue.md',
    outputHtmlPath: '/tmp/output/issue.html',
    templateName: 'dense-discovery',
    outputName: 'issue',
  });

  assert.equal(manifest.version, 1);
  assert.equal(manifest.template, 'dense-discovery');
  assert.equal(manifest.outputHtmlPath, '/tmp/output/issue.html');
  assert.deepEqual(manifest.totals, {
    links: 2,
    explicit: 1,
    partial: 0,
    defaulted: 1,
    conflicts: 0,
  });
  assert.deepEqual(
    manifest.links.map((link) => ({
      url: link.url,
      label: link.label,
      category: link.category,
      metadataSource: link.metadataSource,
    })),
    [
      {
        url: 'https://example.com/story',
        label: 'Explicit story label',
        category: 'explicit-research',
        metadataSource: 'explicit',
      },
      {
        url: 'https://example.com/story/more',
        label: 'Story',
        category: 'research',
        metadataSource: 'defaulted',
      },
    ],
  );
  assert.equal(manifest.warnings.defaulted.length, 1);
  assert.match(manifest.warnings.defaulted[0], /readMoreLink missing label, category/);
});

test('serializes semantic interest and intent into the link tracking manifest', () => {
  const newsletterData = {
    title: 'Tracking Test',
    sections: [
      {
        type: 'events',
        items: [
          {
            title: 'Futuring 2.0',
            link: {
              href: 'https://example.com/seminar',
              label: 'seminar | Futuring 2.0',
              category: 'events',
              interests: ['speculative-practice', 'worldbuilding'],
              intent: 'attend-event',
            },
          },
        ],
      },
    ],
  };
  const manifest = buildLinkTrackingMetadataManifest(normalizeNewsletterLinkTracking(newsletterData));
  const link = manifest.links[0];

  assert.deepEqual(link.interests, ['speculative-practice', 'worldbuilding']);
  assert.equal(link.interest, 'speculative-practice,worldbuilding');
  assert.equal(link.intent, 'attend-event');
  assert.equal(link.explicit.interest, true);
  assert.equal(link.explicit.intent, true);
});

test('notice output uses requested color and respects NO_COLOR option', () => {
  const lines = [];
  reportLinkTrackingMetadataNotices(
    {
      defaultWarnings: [
        {
          sourcePath: '/tmp/w18-y26.md',
          line: 149,
          pathLabel: 'sections[0].items[0].link',
          label: 'Story',
          category: 'food-for-thought',
          defaultedLabel: true,
          defaultedCategory: true,
        },
      ],
    },
    { logger: { log: (line) => lines.push(line) }, useColor: true },
  );

  assert.match(lines[0], /\x1b\[38;2;236;243;13m/);
  assert.match(lines[1], /\/tmp\/w18-y26\.md:149/);

  const plainLines = [];
  reportLinkTrackingMetadataNotices(
    {
      defaultWarnings: [
        {
          sourcePath: '/tmp/w18-y26.md',
          line: 149,
          pathLabel: 'sections[0].items[0].link',
          label: 'Story',
          category: 'food-for-thought',
          defaultedLabel: true,
          defaultedCategory: true,
        },
      ],
    },
    { logger: { log: (line) => plainLines.push(line) }, useColor: false },
  );

  assert.doesNotMatch(plainLines[0], /\x1b\[/);
});

test('dense-discovery strict schema accepts object-valued tracked links', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Tracked Link Schema Test',
      sections: [
        {
          type: 'food-for-thought',
          title: 'Food For Thought',
          items: [
            {
              title: 'Tracked Story',
              link: {
                href: 'https://example.com/story',
                label: 'Tracked Story',
                category: 'research',
                interest: 'speculative-practice',
                intent: 'read-related',
              },
              description: '<p>Story summary.</p>',
            },
          ],
        },
      ],
    },
    {
      repoRoot: new URL('../..', import.meta.url).pathname,
      templateName: 'dense-discovery',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.sections[0].items[0].link.href, 'https://example.com/story');
});

test('wirecutter-v2 strict schema accepts object-valued tracked links', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'wirecutter-v2',
      title: 'Tracked Wirecutter Link Test',
      header: {
        logoImage: 'https://example.com/logo.png',
        logoImageMobile: 'https://example.com/logo-mobile.png',
        homepageLink: {
          href: 'https://example.com/wirecutter',
          label: 'Wirecutter home',
          category: 'operations',
        },
      },
      featuredArticle: {
        headline: 'Best patio furniture',
        heroImage: 'https://example.com/patio.jpg',
        heroImageAlt: 'Patio furniture',
        description: '<p>Durable outdoor furniture.</p>',
        ctaLink: {
          href: 'https://example.com/best-patio-furniture',
          label: 'Patio furniture hero CTA',
          category: 'product-review',
        },
      },
      article: {
        title: 'Mosquito control gear',
        image: 'https://example.com/mosquito.jpg',
        imageAlt: 'Mosquito repeller',
        content: '<p>Keep mosquitoes away.</p>',
        link: {
          href: 'https://example.com/mosquito-control',
          label: 'Mosquito control article',
          category: 'product-review',
        },
      },
      productShowcase: {
        sectionTitle: 'More outdoor recs',
        sectionLink: {
          href: 'https://example.com/outdoor',
          label: 'Outdoor recommendations section',
          category: 'product-category',
        },
        items: [
          {
            title: 'Patio umbrella',
            image: 'https://example.com/umbrella.jpg',
            imageAlt: 'Patio umbrella',
            description: 'A sturdy patio umbrella.',
            link: {
              href: 'https://example.com/patio-umbrella',
              label: 'Patio umbrella product card',
              category: 'product-review',
            },
          },
        ],
      },
      footer: {
        companyLogo: 'https://example.com/footer-logo.png',
        unsubscribeText: '<p>Unsubscribe anytime.</p>',
        companyAddress: 'Example Company',
        legalLinks: [
          {
            text: 'Privacy Policy',
            url: {
              href: 'https://example.com/privacy',
              label: 'Privacy policy',
              category: 'operations',
            },
          },
        ],
      },
    },
    {
      repoRoot: new URL('../..', import.meta.url).pathname,
      templateName: 'wirecutter-v2',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.article.link.href, 'https://example.com/mosquito-control');
});
