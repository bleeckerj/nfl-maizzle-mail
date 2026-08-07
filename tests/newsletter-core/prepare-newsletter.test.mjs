import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  loadNewsletterSource,
  normalizeNewsletterLinkTracking,
  prepareNewsletterData,
} from '../../lib/newsletter-core/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKOFFICE_ROOT = path.resolve(REPO_ROOT, '..', 'nfl-backoffice');

function withTempRoots(fn) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-core-'));
  const repoRoot = path.join(tempRoot, 'nfl-maizzle-mail');
  const backofficeRoot = path.join(tempRoot, 'nfl-backoffice');
  const editorialRoot = path.join(tempRoot, 'nfl-editorial');
  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(backofficeRoot, { recursive: true });
  mkdirSync(path.join(editorialRoot, 'src', 'content'), { recursive: true });

  const adsPath = path.join(editorialRoot, 'src', 'content', 'ads.json');
  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'comedy-ad-01',
        label: 'SPONSORED',
        title: 'A Better Fake Ad',
        sponsor: 'Near Future Laboratory',
        copy: 'The future needs stranger ads.',
        link: { url: 'https://example.com/fake-ad', label: 'See the fake ad' },
        media: {
          src: 'https://imagedelivery.net/example/fake-ad/public',
          altText: 'Satirical ad image',
        },
      },
    ]),
    'utf8',
  );

  const originalAdsPath = process.env.NFL_EDITORIAL_ADS_PATH;
  process.env.NFL_EDITORIAL_ADS_PATH = adsPath;

  try {
    fn({ repoRoot, backofficeRoot, editorialRoot });
  } finally {
    if (originalAdsPath) {
      process.env.NFL_EDITORIAL_ADS_PATH = originalAdsPath;
    } else {
      delete process.env.NFL_EDITORIAL_ADS_PATH;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function writeIssue(backofficeRoot, issueId, content) {
  const year = issueId.endsWith('-y26') ? '2026' : '2025';
  const issuePath = path.join(backofficeRoot, 'public', 'outbox', 'data', year, `${issueId}.md`);
  mkdirSync(path.dirname(issuePath), { recursive: true });
  writeFileSync(issuePath, content, 'utf8');
  return issuePath;
}

test('prepareNewsletterData hydrates ad-block sections and preserves editorial content semantics', () => {
  withTempRoots(({ repoRoot }) => {
    const prepared = prepareNewsletterData(
      {
        template: 'dense-discovery',
        title: 'Test Issue',
        sections: [
          {
            type: 'sponsor',
            title: 'Workshop',
            items: [{ title: 'Pitch Picture Prototype', description: '<p>Editorial workshop section.</p>' }],
          },
          {
            type: 'ad-block',
            title: 'This Week\'s Partner',
            description: '<p>Context for why this ad appears here.</p>',
            items: [{ adId: 'comedy-ad-01' }],
          },
        ],
      },
      { repoRoot, templateName: 'dense-discovery', logger: { log() {} } },
    );

    assert.equal(prepared.sections[0].type, 'sponsor');
    assert.equal(prepared.sections[0].items[0].title, 'Pitch Picture Prototype');
    assert.equal(prepared.sections[1].title, "This Week's Partner");
    assert.match(prepared.sections[1].description, /Context for why this ad appears here/);
    assert.equal(prepared.sections[1].items[0].label, 'SPONSORED');
    assert.equal(prepared.sections[1].items[0].title, 'A Better Fake Ad');
    assert.match(prepared.sections[1].items[0].description, /The future needs stranger ads\./);
    assert.deepEqual(prepared.sections[1].items[0].readMoreLink, {
      href: 'https://example.com/fake-ad',
      label: 'comedy-ad-01',
      category: 'ad-block',
    });

    const linkTracking = normalizeNewsletterLinkTracking(prepared);
    const adBlockLink = linkTracking.manifest.get('https://example.com/fake-ad');
    assert.equal(adBlockLink.label, 'comedy-ad-01');
    assert.equal(adBlockLink.category, 'ad-block');
  });
});

test('prepareNewsletterData accepts ad-block source items under strict schema validation', () => {
  withTempRoots(() => {
    const prepared = prepareNewsletterData(
      {
        template: 'dense-discovery',
        title: 'Strict Schema Ad Block Test',
        sections: [
          {
            type: 'ad-block',
            title: 'Partner Signal',
            items: [
              {
                adId: 'comedy-ad-01',
                link: {
                  href: 'https://example.com/issue-ad',
                  label: 'issue | ad-block | primary',
                  category: 'ad-block',
                },
                readMoreLink: {
                  href: 'https://example.com/issue-ad',
                  label: 'issue | ad-block | primary',
                  category: 'ad-block',
                },
              },
            ],
          },
        ],
      },
      { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
    );

    assert.equal(prepared.sections[0].title, 'Partner Signal');
    assert.equal(prepared.sections[0].items[0].label, 'SPONSORED');
    assert.equal(prepared.sections[0].items[0].title, 'A Better Fake Ad');
    assert.deepEqual(prepared.sections[0].items[0].link, {
      href: 'https://example.com/issue-ad',
      label: 'issue | ad-block | primary',
      category: 'ad-block',
    });
  });
});

test('prepareNewsletterData accepts an unlinked daily-headlines article under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'near-future-lab-daily-headlines',
      title: 'Unlinked Daily Headlines Article',
      sections: [
        {
          type: 'section_article_group',
          section_label: 'Working Note',
          articles: [
            {
              headline: 'An article without a destination',
              image_src: 'https://imagedelivery.net/example/unlinked-article/full',
              image_alt: 'An article that has no destination link',
              lede: 'The full card remains visible without an anchor.',
              cta_label: 'Read the note',
            },
          ],
        },
      ],
    },
    {
      repoRoot: REPO_ROOT,
      templateName: 'near-future-lab-daily-headlines',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.sections[0].articles[0].link, undefined);
  assert.equal(prepared.sections[0].articles[0].href, undefined);
});

test('prepareNewsletterData accepts sponsor platformLinks under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Strict Schema Platform Links Test',
      sections: [
        {
          type: 'sponsor',
          title: 'Podcast',
          items: [
            {
              title: 'Episode 104',
              link: 'https://example.com/episode',
              description: '<p>Episode description.</p>',
              platformLinks: [
                {
                  platform: 'spotify',
                  label: 'Spotify',
                  url: 'https://example.com/spotify',
                  category: 'podcast',
                  intent: 'listen',
                  interests: ['audio'],
                },
                {
                  platform: 'youtube',
                  label: 'YouTube',
                  url: 'https://example.com/youtube',
                  category: 'podcast',
                  intent: 'watch',
                  interests: ['video'],
                },
                {
                  platform: 'apple-podcasts',
                  label: 'Apple Podcasts',
                  url: 'https://example.com/apple',
                  category: 'podcast',
                  intent: 'listen',
                  interests: ['audio'],
                },
              ],
              readMoreText: 'Listen and read',
              readMoreLink: 'https://example.com/read-more',
            },
          ],
        },
      ],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
  );

  assert.equal(prepared.sections[0].items[0].platformLinks.length, 3);
  assert.equal(prepared.sections[0].items[0].platformLinks[0].platform, 'spotify');
  assert.equal(prepared.sections[0].items[0].platformLinks[1].intent, 'watch');
});

test('prepareNewsletterData rejects raw ad-block image fields under strict schema validation', () => {
  assert.throws(
    () =>
      prepareNewsletterData(
        {
          template: 'dense-discovery',
          title: 'Strict Schema Ad Image Test',
          sections: [
            {
              type: 'ad-block',
              title: 'Partner Signal',
              items: [
                {
                  adId: 'comedy-ad-01',
                  image: 'https://example.com/raw-ad-image.webp',
                },
              ],
            },
          ],
        },
        { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
      ),
    /strict mode/,
  );
});

test('prepareNewsletterData accepts standalone image sections under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Strict Schema Image Section Test',
      sections: [
        {
          type: 'image',
          title: 'Visual Note',
          items: [
            {
              image: {
                src: 'https://example.com/standalone.webp',
                alt: 'Standalone visual',
                caption: 'A standalone image.',
              },
              link: 'https://example.com/standalone',
            },
          ],
        },
      ],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
  );

  assert.equal(prepared.sections[0].type, 'image');
  assert.equal(prepared.sections[0].items[0].link, 'https://example.com/standalone');
  assert.equal(prepared.sections[0].items[0].image.src, 'https://example.com/standalone.webp');
});

test('prepareNewsletterData promotes ad-block inventory titles to section headers by default', () => {
  withTempRoots(({ repoRoot }) => {
    const prepared = prepareNewsletterData(
      {
        template: 'dense-discovery',
        title: 'Ad Header Test',
        sections: [
          {
            type: 'ad-block',
            items: [{ adId: 'comedy-ad-01' }],
          },
        ],
      },
      { repoRoot, templateName: 'dense-discovery', logger: { log() {} } },
    );

    assert.equal(prepared.sections[0].title, 'A Better Fake Ad');
    assert.equal(prepared.sections[0].items[0].title, '');
  });
});

test('prepareNewsletterData accepts food-for-thought items with additional readMoreLinks under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Food for Thought CTA Test',
      sections: [
        {
          type: 'food-for-thought',
          title: 'Food For Thought',
          items: [
            {
              title: 'Primary article',
              link: 'https://example.com/article',
              description: '<p>An article with multiple CTA rows.</p>',
              readMoreText: 'Read more →',
              readMoreLink: 'https://example.com/article',
              readMoreLinks: [
                { text: 'Listen to podcast →', link: 'https://example.com/podcast' },
                { text: 'View references →', link: 'https://example.com/references', paywall: true },
              ],
            },
          ],
        },
      ],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
  );

  assert.equal(prepared.sections[0].items[0].readMoreLinks.length, 2);
  assert.equal(prepared.sections[0].items[0].readMoreLinks[0].text, 'Listen to podcast →');
  assert.equal(prepared.sections[0].items[0].readMoreLinks[1].paywall, true);
});

test('prepareNewsletterData injects the default newsletter footer CTA when frontmatter omits it', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Footer CTA Default Test',
      footer: {
        newsletterSubscribeLink: 'https://nearfuturelaboratory.com/newsletter/',
      },
      sections: [],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', outputName: 'w24-y26', logger: { log() {} } },
  );

  assert.equal(prepared.footer.footerCta.variant, 'default');
  assert.equal(prepared.footer.footerCta.eyebrow, 'Commissions, Collaborations, Integrated Roles');
  assert.equal(
    prepared.footer.footerCta.text,
    "Organizations get really good at reproducing the world they already understand. Near Future Laboratory helps teams surface their unspoken inherited assumptions and explore alternative possibilities through artifacts from possible futures. If you're looking to get out of that loop, let's talk.",
  );
  assert.equal(prepared.footer.footerCta.primaryAction.label, 'Let’s Talk');
  assert.deepEqual(prepared.footer.footerCta.primaryAction.url, {
    href: 'https://nearfuturelaboratory.com/contact',
    label: 'w24-y26 | footer CTA | contact | Near Future Laboratory',
    category: 'services',
  });
  assert.equal(prepared.footer.footerCta.secondaryAction.label, 'See How I Work');
  assert.deepEqual(prepared.footer.footerCta.secondaryAction.url, {
    href: 'https://nearfuturelaboratory.com/services',
    label: 'w24-y26 | footer CTA | services | Near Future Laboratory',
    category: 'services',
  });

  const linkTracking = normalizeNewsletterLinkTracking(prepared);
  assert.equal(
    linkTracking.manifest.get('https://nearfuturelaboratory.com/contact').label,
    'w24-y26 | footer CTA | contact | Near Future Laboratory',
  );
  assert.equal(
    linkTracking.manifest.get('https://nearfuturelaboratory.com/services').category,
    'services',
  );
  assert.equal(
    linkTracking.defaultWarnings.some((warning) => warning.pathLabel.includes('footerCta')),
    false,
  );
});

test('prepareNewsletterData preserves newsletter footer CTA variant selection and explicit overrides', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Footer CTA Override Test',
      footer: {
        footerCta: {
          variant: 'workshop',
          text: 'Custom workshop positioning for this issue.',
          primaryAction: {
            label: 'Book Julian',
          },
          secondaryAction: {
            enabled: false,
          },
        },
      },
      sections: [],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', logger: { log() {} } },
  );

  assert.equal(prepared.footer.footerCta.variant, 'workshop');
  assert.equal(prepared.footer.footerCta.eyebrow, 'Workshops, Talks, Sessions');
  assert.equal(prepared.footer.footerCta.text, 'Custom workshop positioning for this issue.');
  assert.equal(prepared.footer.footerCta.primaryAction.label, 'Book Julian');
  assert.deepEqual(prepared.footer.footerCta.primaryAction.url, {
    href: 'https://nearfuturelaboratory.com/services',
    label: 'footer CTA | services | Near Future Laboratory',
    category: 'services',
  });
  assert.equal('secondaryAction' in prepared.footer.footerCta, false);
});

test('prepareNewsletterData preserves object-valued newsletter footer CTA URLs for link tracking', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Footer CTA Link Metadata Test',
      footer: {
        footerCta: {
          variant: 'default',
          primaryAction: {
            label: 'Let’s Talk',
            url: {
              href: 'https://nearfuturelaboratory.com/contact',
              label: 'w23-y26 | footer CTA | contact',
              category: 'site-nav',
            },
          },
          secondaryAction: {
            label: 'See How I Work',
            url: {
              href: 'https://nearfuturelaboratory.com/services',
              label: 'w23-y26 | footer CTA | services',
              category: 'site-nav',
            },
          },
        },
      },
      sections: [],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', logger: { log() {} } },
  );

  assert.deepEqual(prepared.footer.footerCta.primaryAction.url, {
    href: 'https://nearfuturelaboratory.com/contact',
    label: 'w23-y26 | footer CTA | contact',
    category: 'site-nav',
  });
  assert.deepEqual(prepared.footer.footerCta.secondaryAction.url, {
    href: 'https://nearfuturelaboratory.com/services',
    label: 'w23-y26 | footer CTA | services',
    category: 'site-nav',
  });
});

test('prepareNewsletterData respects disabled newsletter footer CTA blocks', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Footer CTA Disabled Test',
      footer: {
        footerCta: {
          enabled: false,
        },
      },
      sections: [],
    },
    { repoRoot: REPO_ROOT, templateName: 'dense-discovery', logger: { log() {} } },
  );

  assert.equal(prepared.footer.footerCta.enabled, false);
});

test('prepareNewsletterData rejects malformed food-for-thought readMoreLinks items under strict schema validation', () => {
  assert.throws(
    () =>
      prepareNewsletterData(
        {
          template: 'dense-discovery',
          title: 'Food for Thought CTA Invalid Test',
          sections: [
            {
              type: 'food-for-thought',
              title: 'Food For Thought',
              items: [
                {
                  title: 'Broken CTA article',
                  readMoreLinks: [{ link: 'https://example.com/missing-text' }],
                },
              ],
            },
          ],
        },
        { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
      ),
    /strict mode/,
  );
});

test('loadNewsletterSource resolves outbox issues by issue id and returns normalized issue metadata', () => {
  withTempRoots(({ repoRoot, backofficeRoot }) => {
    writeIssue(
      backofficeRoot,
      'w13-y26',
      [
        '---',
        'template: dense-discovery',
        'title: Test Export Issue',
        'preheader: Preview line',
        'sections:',
        '  - type: sponsor',
        '    title: Sponsor-ish editorial section',
        '    items:',
        '      - title: Workshop item',
        '        description: "<p>Hello <a href=\\"https://example.com\\">world</a>.</p>"',
        '  - type: ad-block',
        '    items:',
        '      - adId: comedy-ad-01',
        '---',
      ].join('\n'),
    );

    const loaded = loadNewsletterSource({
      repoRoot,
      backofficeRoot,
      issueId: 'w13-y26',
      logger: { log() {} },
    });

    assert.equal(loaded.issueId, 'w13-y26');
    assert.equal(loaded.templateName, 'dense-discovery');
    assert.equal(loaded.newsletterData.sections.length, 2);
    assert.equal(loaded.newsletterData.sections[1].title, 'A Better Fake Ad');
    assert.equal(loaded.newsletterData.sections[1].items[0].label, 'SPONSORED');
    assert.equal(loaded.newsletterData.sections[1].items[0].title, '');
  });
});

test('loadNewsletterSource fails on malformed outbox issue frontmatter', () => {
  withTempRoots(({ repoRoot, backofficeRoot }) => {
    writeIssue(
      backofficeRoot,
      'w13-y26',
      [
        '---',
        'template: dense-discovery',
        'title: First Title',
        'title: Duplicate Title',
        'sections: []',
        '---',
      ].join('\n'),
    );

    assert.throws(
      () =>
        loadNewsletterSource({
          repoRoot,
          backofficeRoot,
          issueId: 'w13-y26',
          logger: { log() {} },
        }),
      /duplicated mapping key/i,
    );

    writeIssue(
      backofficeRoot,
      'w14-y26',
      [
        '---',
        'template: dense-discovery',
        'title: Broken Flow Collection',
        'sections: [',
        '---',
      ].join('\n'),
    );

    assert.throws(
      () =>
        loadNewsletterSource({
          repoRoot,
          backofficeRoot,
          issueId: 'w14-y26',
          logger: { log() {} },
        }),
      /end of the stream|document separator/i,
    );
  });
});

test('prepareNewsletterData preserves adjacency-feature sections and optional fallback ad blocks', () => {
  withTempRoots(({ repoRoot }) => {
    const prepared = prepareNewsletterData(
      {
        template: 'dense-discovery',
        title: 'Adjacency Feature Test',
        sections: [
          {
            type: 'adjacency-feature',
            rubric: 'Features',
            title: 'Quietly, a New Interface Appears',
            dek: 'An extended editorial section for inbox reading.',
            author: 'Mesh Bureau',
            dateLabel: 'Today',
            tags: ['interfaces', 'culture'],
            canonicalUrl: 'https://theadjacency.com/issue/02/features/quietly-a-new-interface-appears',
            heroImage: {
              src: 'https://imagedelivery.net/example/hero/public',
              alt: 'Hero image alt',
            },
            bodyHtml: '<p style="margin:0 0 18px 0;">Extended article body.</p>',
            ctaText: 'Read on The Adjacency',
            ctaLink: 'https://theadjacency.com/issue/02/features/quietly-a-new-interface-appears',
          },
          {
            type: 'ad-block',
            items: [{ adId: 'comedy-ad-01' }],
          },
        ],
      },
      { repoRoot, templateName: 'dense-discovery', logger: { log() {} } },
    );

    assert.equal(prepared.sections[0].type, 'adjacency-feature');
    assert.match(prepared.sections[0].bodyHtml, /Extended article body/);
    assert.equal(prepared.sections[0].heroImage.src, 'https://imagedelivery.net/example/hero/public');
    assert.equal(prepared.sections[1].title, 'A Better Fake Ad');
    assert.equal(prepared.sections[1].items[0].label, 'SPONSORED');
    assert.equal(prepared.sections[1].items[0].title, '');
  });
});

test('prepareNewsletterData styles adjacency-job-posting sections through the jobs mail theme module', () => {
  withTempRoots(({ repoRoot }) => {
    const prepared = prepareNewsletterData(
      {
        template: 'dense-discovery',
        title: 'Adjacency Jobs Test',
        sections: [
          {
            type: 'adjacency-job-posting',
            brandVariant: 'openai',
            company: 'OpenAI',
            title: 'Applied Speculative Design, Generative Experiences, Consumer Products',
            location: 'Santa Cruz, CA & San Francisco, CA',
            applyLabel: 'Apply now',
            applyUrl: 'https://example.com/apply',
            canonicalUrl: 'https://theadjacency.com/jobs/openai/applied-speculative-design-generative-experiences-consumer-products',
            summaryHtml: '<p>Summary paragraph with a <a href="https://example.com">source link</a>.</p>',
            lists: [
              {
                id: 'key-responsibilities',
                title: 'In this role you will',
                items: ['Prototype product futures.'],
                itemsHtml: ['Prototype <a href="https://example.com/futures">product futures</a>.'],
              },
            ],
            footerNotesHtml: ['<p>Legal notice with a <a href="https://example.com/privacy">privacy link</a>.</p>'],
          },
        ],
      },
      { repoRoot, templateName: 'dense-discovery', logger: { log() {} } },
    );

    assert.equal(prepared.sections[0].type, 'adjacency-job-posting');
    assert.equal(prepared.sections[0].brandVariant, 'openai');
    assert.equal(prepared.sections[0].jobPresentation.metaPresentation, 'chips');
    assert.match(prepared.sections[0].summaryHtml, /font-family:/);
    assert.match(prepared.sections[0].summaryHtml, /https:\/\/example.com/);
    assert.match(prepared.sections[0].lists[0].itemsHtml[0], /style=/);
    assert.match(prepared.sections[0].jobStyles.title, /font-family/);
  });
});

test('prepareNewsletterData accepts indie-mag-single-column item subtitles under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Strict Schema Subtitle Test',
      sections: [
        {
          type: 'indie-mag-single-column',
          title: 'Office Hours Recap',
          items: [
            {
              subtitle: 'Episode N°303 of our Weekly Session',
              description: '<p>Recap body.</p>',
            },
          ],
        },
      ],
    },
    {
      repoRoot: REPO_ROOT,
      templateName: 'dense-discovery',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.sections[0].items[0].subtitle, 'Episode N°303 of our Weekly Session');
});

test('prepareNewsletterData accepts canonical single-column string and object images under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Strict Schema Single Column Image Test',
      sections: [
        {
          type: 'single-column',
          title: 'Long Reads',
          items: [
            {
              title: 'String image list',
              images: ['https://example.com/cover.webp'],
            },
            {
              title: 'Object fallback image',
              image: {
                src: 'https://example.com/fallback.webp',
                alt: 'Fallback image',
              },
            },
          ],
        },
      ],
    },
    {
      repoRoot: REPO_ROOT,
      templateName: 'dense-discovery',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.sections[0].type, 'single-column');
  assert.equal(prepared.sections[0].items[0].images[0], 'https://example.com/cover.webp');
  assert.equal(prepared.sections[0].items[1].image.src, 'https://example.com/fallback.webp');
});

test('prepareNewsletterData rejects indie-mag-single-column items that set both image and images under strict schema validation', () => {
  assert.throws(
    () =>
      prepareNewsletterData(
        {
          template: 'dense-discovery',
          title: 'Strict Schema Image Conflict Test',
          sections: [
            {
              type: 'indie-mag-single-column',
              title: 'Zines Zone',
              items: [
                {
                  title: 'Conflicting image fields',
                  image: 'https://example.com/single.webp',
                  images: [{ src: 'https://example.com/multi.webp' }],
                },
              ],
            },
          ],
        },
        { repoRoot: REPO_ROOT, templateName: 'dense-discovery', strictSchema: true, logger: { log() {} } },
      ),
    /strict mode/,
  );
});

test('prepareNewsletterData accepts source-model root metadata fields under strict schema validation', () => {
  const prepared = prepareNewsletterData(
    {
      template: 'dense-discovery',
      title: 'Strict Schema Root Metadata Test',
      ogImage: 'https://imagedelivery.net/example/cover/public',
      ogImageAltText: 'Cover image alt text for downstream exports.',
      pubDate: '2025-12-21T09:00:00-08:00',
      sections: [],
    },
    {
      repoRoot: REPO_ROOT,
      templateName: 'dense-discovery',
      strictSchema: true,
      logger: { log() {} },
    },
  );

  assert.equal(prepared.ogImageAltText, 'Cover image alt text for downstream exports.');
  assert.equal(prepared.pubDate, '2025-12-21T09:00:00-08:00');
});
