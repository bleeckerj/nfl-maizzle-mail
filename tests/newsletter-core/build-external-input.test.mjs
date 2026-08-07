import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { adjacencyMailThemeTokens } from '../../lib/adjacency-mail/adjacency-mail-theme-tokens.mjs';
import { resolveAdjacencyJobsMailVariantTokens } from '../../lib/adjacency-mail/adjacency-jobs-mail-theme-tokens.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fontFamilyPattern(value) {
  return String(value)
    .split(',')
    .map((part) => escapeRegExp(part.trim()))
    .join('\\s*,\\s*');
}

const POPUP_JOBS_RENDERERS = [
  'appleish',
  'atlassian',
  'ableton',
  'anthropic',
  'comfyui',
  'ey',
  'gartner',
  'googledeepmindish',
  'kohler',
  'mcdonalds',
  'netflix',
  'openai',
  'thenewyorkerish',
  'x',
];

test('popup-jobs-mail exposes explicit renderer partials for every supported jobs brand', () => {
  POPUP_JOBS_RENDERERS.forEach((rendererKey) => {
    const rendererPath = path.join(
      REPO_ROOT,
      'templates',
      'popup-jobs-mail',
      'components',
      'renderers',
      `${rendererKey}.html`,
    );
    assert.ok(existsSync(rendererPath), `Missing popup-jobs-mail renderer partial for ${rendererKey}`);
  });
});

test('build-newsletter accepts an absolute external issue path with adjacency-feature content', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'adjacency-mail-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'adjacency-feature-external';
  const adsPath = path.join(tempRoot, 'ads.json');
  const overridesPath = path.join(tempRoot, 'adjacency-mail-overrides.json');

  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'comedy-ad-01',
        label: 'SPONSORED',
        title: 'A Better Fake Ad',
        sponsor: 'Near Future Laboratory',
        copy: 'The future needs stranger ads.',
        link: { url: '/fake-ad', label: 'See the fake ad' },
        media: {
          src: 'cid:fake-ad-image',
          altText: 'Satirical ad image',
        },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    overridesPath,
    JSON.stringify({
      featureSection: {
        container: {
          headerPadding: '12px 16px 8px 16px',
          bodyPadding: '10px 16px 0 16px',
          ctaPadding: '4px 16px 14px 16px',
        },
      },
      ad: {
        sectionContainer: {
          copyPadding: '6px 14px 12px 14px',
          ctaPadding: '0 14px 12px 14px',
        },
      },
    }),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: External Adjacency Issue',
      'preheader: External issue build validation',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'header:',
      "  quote: Tomorrow’s News Today.",
      '  author: The Adjacency',
      '  logoTop: cid:header-logo-top',
      '  logoBottom: cid:header-logo-bottom',
      '  logoLink: /',
      'intro:',
      '  title: Extended Dispatch',
      '  viewOnlineLink: /issue/02/features/external-adjacency-issue',
      "  content: <p>This issue validates external-path builds for the new adjacency feature format.</p>",
      'sections:',
      '  - type: adjacency-feature',
      '    rubric: Features',
      '    title: External Adjacency Issue',
      '    dek: A dense-discovery build using an external hidden issue path.',
      '    author: Mesh Bureau',
      '    dateLabel: Today',
      '    tags:',
      '      - interfaces',
      '      - export',
      '    canonicalUrl: /issue/02/features/external-adjacency-issue',
      '    heroImage:',
      '      src: cid:external-hero-image',
      '      alt: External hero image',
      "    bodyHtml: |",
      "      <p style=\"margin: 0 0 18px 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; line-height: 1.72; color: #1d1d1d;\">This body comes from an external issue path and should survive the build intact.</p>",
      "      <div style=\"margin: 24px 0; padding: 18px; background: #f5f4f0; border: 1px solid #c9cfdb;\">",
      "        <p style=\"margin: 0; padding: 0; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; line-height: 1.5; color: #293247;\">Inline article callouts should render in the built output.</p>",
      '      </div>',
      '    ctaText: Read on The Adjacency',
      '    ctaLink: /issue/02/features/external-adjacency-issue',
      '  - type: ad-block',
      '    title: This Week\'s Partner',
      '    description: <p>Context for why this ad appears in this issue.</p>',
      '    items:',
      '      - adId: comedy-ad-01',
      'footer:',
      '  shareUrl: /issue/02/features/external-adjacency-issue',
      '  newsletterSubscribeLink: /subscribe',
      '  logo: cid:footer-logo',
      '  logoLink: /',
      '  unsubscribeLink: mailto:unsubscribe@nearfuturelaboratory.com',
      '  archiveUrl: /',
      '  address: Near Future Laboratory',
      '  colophon: Speculative reporting, adapted for inbox reading.',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        `--adjacency-mail-theme-overrides=${overridesPath}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NFL_EDITORIAL_ADS_PATH: adsPath,
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /External Adjacency Issue/);
    assert.match(html, /Read on The Adjacency/);
    assert.match(html, /This body comes from an external issue path/);
    assert.match(html, /This Week(?:&#0*39;|')s Partner/);
    assert.match(html, /Context for why this ad appears in this issue\./);
    assert.match(html, /SPONSORED/);
    assert.match(html, /A Better Fake Ad/);
    assert.match(html, /Near Future Laboratory/);
    assert.match(html, /See the fake ad/);
    assert.match(html, /padding:\s*12px 16px 8px 16px/);
    assert.match(html, /padding:\s*6px 14px 12px 14px/);
    assert.match(
      html,
      /Context for why this ad appears in this issue\.[\s\S]*?padding-top:\s*4px;background:\s*#FFFFFF/,
    );
    assert.match(
      html,
      new RegExp(
        `font-family:[^"]*${adjacencyMailThemeTokens.ad.title.fontFamily
          .split(',')
          .map((part) => part.replace(/['"]/g, '').trim())
          .join('[^"]*')}`,
      ),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter accepts an absolute external issue path with adjacency-job-posting content', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'adjacency-jobs-mail-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'adjacency-job-posting-external';
  const variant = resolveAdjacencyJobsMailVariantTokens('anthropic');

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: External Adjacency Jobs Issue',
      'preheader: External jobs issue build validation',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'intro:',
      '  title: Jobs Dispatch',
      '  viewOnlineLink: https://theadjacency.com/jobs/anthropic/expression-of-interest-team-founder-speculative-prototyping',
      '  content: <p>Read this job on The Adjacency.</p>',
      'footer:',
      '  workCtaLabel: Available for strategy collaborations',
      '  workCtaUrl: https://nearfuturelaboratory.com/connect/',
      'sections:',
      '  - type: adjacency-job-posting',
      '    brandVariant: anthropic',
      '    company: Anthropic',
      '    companyTagline: "Frontier AI for reliable systems"',
      '    title: "[Expression of Interest] Team Founder, Speculative Prototyping"',
      '    location: "San Francisco, CA | New York, NY"',
      '    applyLabel: "Apply"',
      '    applyUrl: "mailto:apply@example.com"',
      '    canonicalUrl: "https://theadjacency.com/jobs/anthropic/expression-of-interest-team-founder-speculative-prototyping"',
      "    summaryHtml: '<p>External jobs body should be styled by newsletter-core preprocessing.</p>'",
      '    lists:',
      '      - id: what-youll-do',
      "        title: What You'll Do",
      '        items:',
      '          - Define the speculative prototyping function.',
      '        itemsHtml:',
      "          - 'Define the <a href=\"https://example.com/function\">speculative prototyping function</a>.'",
      '    footerNotesHtml:',
      "      - '<p>Applicants should review the <a href=\"https://example.com/policy\">policy guidance</a>.</p>'",
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    const buildOutput = execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
      },
    );

    assert.doesNotMatch(buildOutput, /Schema validation found/);

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /Team Founder, Speculative Prototyping/);
    assert.match(html, /What You(?:&#0*39;|')ll Do/);
    assert.match(html, /speculative prototyping function/);
    assert.match(
      html,
      new RegExp(
        `font-family:[^"]*${variant.title.fontFamily
          .split(',')
          .map((part) => part.replace(/['"]/g, '').trim())
          .join('[^"]*')}`,
      ),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter accepts an absolute external issue path with popup-jobs-mail content', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'popup-jobs-mail-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'popup-jobs-mail-external';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: popup-jobs-mail',
      'title: Standards LM Orchestrator — The New Yorker',
      'preheader: Popup jobs email build validation',
      'jobPopupMail:',
      '  rendererKey: thenewyorkerish',
      '  targetUrl: http://127.0.0.1:4411',
      '  targetKind: local-popup',
      '  canonicalUrl: https://theadjacency.com/jobs/the-new-yorker/standards-lm-orchestrator',
      '  originalSourceUrl: https://www.newyorker.com/careers',
      '  company: The New Yorker',
      '  companyTagline: Condé Nast',
      '  title: Standards LM Orchestrator',
      '  metaLine: New York, NY (Hybrid) · Editorial Workflow Standards · Posted Imminent · Req TNY-260404-SLM001',
      '  primaryAction:',
      '    kind: subscribe',
      '    label: Subscribe',
      '    url: https://patreon.com/nearfuturelaboratory',
      '  secondaryAction:',
      '    kind: signal-source',
      '    label: Signal Source',
      '    url: https://www.newyorker.com/careers',
      "  explainerHtml: '<p>This popup is a speculative Near Future Laboratory artifact rather than a live recruiting funnel.</p>'",
      '  suppressApplyLinks: true',
      '  brand:',
      '    rendererKey: thenewyorkerish',
      '    companyLabel: The New Yorker',
      '    kicker: The New Yorker Careers',
      '    masthead:',
      '      mode: image',
      '      imageUrl: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/5788718d-42cc-43b2-0a92-b89209333600/full?format=webp',
      '      altText: The New Yorker',
      '      backgroundColor: "#ffffff"',
      '      align: center',
      '      padding: 18px 24px 14px',
      '      imageWidth: 330',
      '    labels:',
      '      summary: Summary',
      '      description: Description',
      '      payRange: Compensation',
      '      body: Additional information',
      '      footerNotes: Notices',
      '    metaFields:',
      '      - location',
      '      - team',
      '      - posted',
      '      - roleNumber',
      '    theme:',
      '      pageBackgroundColor: "#f6f2ea"',
      '      surfaceColor: "#ffffff"',
      '      surfaceAltColor: "#faf7f1"',
      '      borderColor: "#d8d0c4"',
      '      textColor: "#1d1d1d"',
      '      mutedColor: "#6a655d"',
      '      accentColor: "#d02a26"',
      '      titleFontFamily: "Georgia, Times New Roman, serif"',
      '      bodyFontFamily: "Georgia, Times New Roman, serif"',
      '      metaFontFamily: "Share Tech Mono, Courier New, monospace"',
      '      ctaPrimaryBackground: "#1d1d1d"',
      '      ctaPrimaryText: "#ffffff"',
      '      ctaPrimaryBorder: "#1d1d1d"',
      '      ctaSecondaryBackground: "#ffffff"',
      '      ctaSecondaryText: "#1d1d1d"',
      '      ctaSecondaryBorder: "#d8d0c4"',
      '  sections:',
      '    - kind: html',
      '      id: summary',
      '      title: Summary',
      "      html: '<p>The New Yorker is seeking a Standards LM Orchestrator for longform editorial systems.</p>'",
      '    - kind: html',
      '      id: description',
      '      title: Description',
      "      html: '<p>You will work across editorial, fact-checking, copy, legal, and product.</p>'",
      '    - kind: list',
      '      id: responsibilities',
      '      title: What You Will Do',
      '      itemsHtml:',
      "        - 'Design and maintain machine-language facilities for serious publishing.'",
      "        - 'Convert notes, transcripts, and archive material into legible drafts.'",
      '    - kind: html',
      '      id: notices',
      '      title: Notices',
      "      html: '<p>Condé Nast provides equal opportunity employment.</p>'",
      '      tone: muted',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
      },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /Standards LM Orchestrator/);
    assert.match(html, /The New Yorker Careers/);
    assert.match(html, /5788718d-42cc-43b2-0a92-b89209333600/);
    assert.match(html, /This popup is a speculative Near Future Laboratory artifact/);
    assert.match(html, /https:\/\/patreon\.com\/nearfuturelaboratory/);
    assert.match(html, /http:\/\/127\.0\.0\.1:4411/);
    assert.doesNotMatch(html, /jobs\.greenhouse\.io|example\.com\/apply/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter renders commerce ad-blocks as email HTML without uploading snapshots', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-commerce-ad-block-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'commerce-ad-block-external';
  const editorialRoot = path.join(tempRoot, 'nfl-editorial');
  const adsPath = path.join(editorialRoot, 'src', 'content', 'ads.json');

  mkdirSync(path.dirname(adsPath), { recursive: true });
  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'commerce-ad-01',
        label: 'SPONSORED',
        title: 'Commerce Ad Title',
        sponsor: 'Speculative Contrivance',
        copy: 'Commerce ad copy should render as HTML.',
        link: { url: '/shop', label: 'Shop now' },
        media: {
          src: 'https://imagedelivery.net/example/source/public',
          altText: 'Snapshot alt text',
        },
        commerce: {
          rating: 4.7,
          reviewCount: 128,
          priceText: '$189.99',
          icon: {
            src: 'https://imagedelivery.net/example/commerce-icon/public',
            altText: 'Commerce badge',
          },
        },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Commerce Snapshot Issue',
      'sections:',
      '  - type: ad-block',
      '    items:',
      '      - adId: commerce-ad-01',
      'footer:',
      '  newsletterSubscribeLink: https://nearfuturelaboratory.com/newsletter/',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NFL_EDITORIAL_ROOT: editorialRoot,
          NFL_EDITORIAL_ADS_PATH: adsPath,
          IMAGE_MIGRATION_ENDPOINT: 'http://127.0.0.1:9/should-not-upload',
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /SPONSORED/);
    assert.match(html, /Speculative Contrivance/);
    assert.match(html, /https:\/\/imagedelivery\.net\/example\/source\/public/);
    assert.match(html, /https:\/\/imagedelivery\.net\/example\/commerce-icon\/public/);
    assert.match(html, /Commerce Ad Title/);
    assert.match(html, /Commerce ad copy should render as HTML\./);
    assert.match(html, /\$189\.99/);
    assert.match(html, /Rating 4\.7/);
    assert.match(html, /\(128\)/);
    assert.match(html, /Shop now/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('daily-headlines ad-block description styling comes from template section styles', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-ad-copy-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'daily-headlines-ad-copy-external';
  const adsPath = path.join(tempRoot, 'ads.json');
  const sectionStylesPath = path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'section-styles.json');
  const sectionStyles = JSON.parse(readFileSync(sectionStylesPath, 'utf8'));
  const adBlockStyles = sectionStyles.sectionStyles['ad-block'];
  const desktopAdCopyStyles = adBlockStyles.contentStyles;
  const mobileAdCopyStyles = adBlockStyles.mobileDescriptionStyles;

  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'daily-ad-01',
        label: 'SPONSORED',
        title: 'Hydrated Daily Ad',
        copy: 'Hydrated inventory ad copy should use the template-owned ad-copy styles.',
        media: {
          src: 'cid:daily-ad-image',
          altText: 'Daily ad image',
        },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: near-future-lab-daily-headlines',
      'title: Daily Headlines Ad Copy Issue',
      'sectionStylesFile: templates/near-future-lab-daily-headlines/section-styles.json',
      'sections:',
      '  - type: ad-block',
      '    title: "Tomorrow\'s Ads Today"',
      '    description: |',
      '      Daily ad description should use the template-owned ad-copy styles.',
      '    items:',
      '      - adId: daily-ad-01',
      'footer:',
      '  footerCta:',
      '    variant: default',
      '    eyebrow: "Footer"',
      '    text: "Footer copy."',
      '    primaryAction:',
      '      label: "Contact"',
      '      url:',
      '        href: /contact',
      '        label: "daily test | footer | contact"',
      '        category: operations',
      '    secondaryAction:',
      '      label: "Services"',
      '      url:',
      '        href: /services',
      '        label: "daily test | footer | services"',
      '        category: operations',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NFL_EDITORIAL_ADS_PATH: adsPath,
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /https:\/\/fonts\.googleapis\.com\/css2\?family=Share\+Tech\+Mono&display=swap/);
    assert.match(
      html,
      new RegExp(
        `p\\.mob-ad-copy,\\s*p\\.mob-ad-copy a,\\s*p\\.mob-ad-copy span,[\\s\\S]*p\\.mob-ad-copy strong\\s*\\{\\s*font-size:\\s*${escapeRegExp(mobileAdCopyStyles.fontSize)}\\s*!important;\\s*line-height:\\s*${escapeRegExp(mobileAdCopyStyles.lineHeight)}\\s*!important;\\s*font-weight:\\s*${escapeRegExp(mobileAdCopyStyles.fontWeight)}\\s*!important;\\s*font-family:\\s*${fontFamilyPattern(mobileAdCopyStyles.fontFamily)}\\s*!important;`
      ),
    );
    const adCopyParagraph = html.match(/<p class="mob-ad-copy" style="([^"]*)"[^>]*>Daily ad description should use the template-owned ad-copy styles\.<\/p>/);
    assert.ok(adCopyParagraph);
    const inlineAdCopyStyle = adCopyParagraph[1];
    assert.match(inlineAdCopyStyle, new RegExp(`font-size:\\s*${escapeRegExp(desktopAdCopyStyles.fontSize)}`));
    assert.match(inlineAdCopyStyle, new RegExp(`line-height:\\s*${escapeRegExp(desktopAdCopyStyles.lineHeight)}`));
    assert.match(inlineAdCopyStyle, new RegExp(`font-weight:\\s*${escapeRegExp(desktopAdCopyStyles.fontWeight)}`));
    const primaryDesktopAdCopyFont = desktopAdCopyStyles.fontFamily.split(',')[0].trim();
    assert.match(inlineAdCopyStyle, new RegExp(`font-family:\\s*${escapeRegExp(primaryDesktopAdCopyFont)}`));
    assert.match(html, /<div style="margin:0"><p class="mob-ad-copy"/);
    assert.doesNotMatch(html, /<p class="[^"]*mob-text[^"]*"[^>]*>Daily ad description should use the template-owned ad-copy styles\.<\/p>/);
    const hydratedAdCopyParagraph = html.match(/<p class="mob-ad-copy" style="([^"]*)"[^>]*>Hydrated inventory ad copy should use the template-owned ad-copy styles\.<\/p>/);
    assert.ok(hydratedAdCopyParagraph);
    assert.doesNotMatch(html, /<p class="[^"]*mob-text[^"]*"[^>]*>Hydrated inventory ad copy should use the template-owned ad-copy styles\.<\/p>/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('daily-headlines article CTA pill renders inside existing article link only when configured', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'daily-headlines-article-cta-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'daily-headlines-article-cta-external';
  const sectionStylesPath = path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines', 'section-styles.json');
  const sectionStyles = JSON.parse(readFileSync(sectionStylesPath, 'utf8'));
  const ctaStyles = sectionStyles.sectionStyles.section_article_group.ctaStyles;

  writeFileSync(
    issuePath,
    [
      '---',
      'template: near-future-lab-daily-headlines',
      'title: Daily Headlines Article CTA Issue',
      'sectionStylesFile: templates/near-future-lab-daily-headlines/section-styles.json',
      'sections:',
      '  - type: section_article_group',
      '    section_label: "Tomorrow\'s News Today: Headlines"',
      '    articles:',
      '      - link:',
      '          href: mailto:cta-story@example.com',
      '          label: "daily test | headlines | cta story"',
      '          category: editorial',
      '        image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/dc57ddc1-f8b9-4662-f63e-1c62c3d79900/full?format=webp',
      '        image_alt: "CTA story image"',
      '        kicker: "Labor"',
      '        headline: "CTA story headline"',
      '        lede: "CTA story lede."',
      '        cta_label: "Do you want to know more?"',
      '      - link:',
      '          href: mailto:no-cta-story@example.com',
      '          label: "daily test | headlines | no cta story"',
      '          category: editorial',
      '        headline: "No CTA story headline"',
      '        lede: "No CTA story lede."',
      '      - link:',
      '          href: mailto:feature-story@example.com',
      '          label: "daily test | headlines | feature story"',
      '          category: editorial',
      '        image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/dc57ddc1-f8b9-4662-f63e-1c62c3d79900/full?format=webp',
      '        image_alt: "Feature story image"',
      '        article_layout: feature',
      '        headline: "Feature story headline"',
      '        lede: "Feature story lede."',
      'footer:',
      '  footerCta:',
      '    variant: default',
      '    eyebrow: "Footer"',
      '    text: "Footer copy."',
      '    primaryAction:',
      '      label: "Contact"',
      '      url:',
      '        href: /contact',
      '        label: "daily test | footer | contact"',
      '        category: operations',
      '    secondaryAction:',
      '      label: "Services"',
      '      url:',
      '        href: /services',
      '        label: "daily test | footer | services"',
      '        category: operations',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      { encoding: 'utf8' },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    const ctaPillMatch = html.match(/<span class="article-cta-pill" style="([^"]*)">Do you want to know more\?<\/span>/);
    assert.ok(ctaPillMatch);
    const ctaInlineStyle = ctaPillMatch[1];
    assert.match(ctaInlineStyle, new RegExp(`display:\\s*${escapeRegExp(ctaStyles.display)}`));
    assert.match(ctaInlineStyle, new RegExp(`margin-top:\\s*${escapeRegExp(ctaStyles.marginTop)}`));
    assert.match(ctaInlineStyle, new RegExp(`border-radius:\\s*${escapeRegExp(ctaStyles.borderRadius)}`));
    assert.match(ctaInlineStyle, new RegExp(`font-weight:\\s*${escapeRegExp(ctaStyles.fontWeight)}`));
    assert.match(html, /<a href="mailto:cta-story@example\.com"[^>]*>[\s\S]*<span class="article-cta-pill"[^>]*>Do you want to know more\?<\/span>[\s\S]*<\/a>/);
    assert.doesNotMatch(html, /<a[^>]*>\s*Do you want to know more\?\s*<\/a>/);
    assert.doesNotMatch(html, /No CTA story lede\.[\s\S]*article-cta-pill/);
    assert.match(html, /<div class="article-cta-mobile"[^>]*>[\s\S]*href="mailto:cta-story@example\.com"[\s\S]*<span class="article-cta-pill"[^>]*>Do you want to know more\?<\/span>/);
    assert.equal((html.match(/href="mailto:cta-story@example\.com"/g) || []).length, 3);
    assert.match(html, /class="article-image article-feature-image css-1oqy46o" width="600"/);
    assert.match(html, /<a href="mailto:feature-story@example\.com"[^>]*>[\s\S]*Feature story headline/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter omits empty ad-block wrapper and footer rows when optional fields are missing', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-sparse-ad-block-build-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'sparse-ad-block-external';
  const adsPath = path.join(tempRoot, 'ads.json');

  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'sparse-ad-01',
        media: {
          src: 'https://imagedelivery.net/example/sparse/public',
          altText: 'Sparse ad image',
        },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Sparse Ad Issue',
      'sections:',
      '  - type: ad-block',
      '    items:',
      '      - adId: sparse-ad-01',
      'footer:',
      '  newsletterSubscribeLink: https://nearfuturelaboratory.com/newsletter/',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NFL_EDITORIAL_ADS_PATH: adsPath,
        },
      },
    );

    const builtHtmlPath = path.join(outputDir, `${outputName}.html`);
    assert.ok(existsSync(builtHtmlPath));

    const html = readFileSync(builtHtmlPath, 'utf8');
    assert.match(html, /https:\/\/imagedelivery\.net\/example\/sparse\/public/);
    assert.doesNotMatch(html, /border-top:\s*1px solid #c9cfdb/);
    assert.doesNotMatch(html, /border-bottom:\s*1px solid #c9cfdb/);
    assert.doesNotMatch(html, /SPONSORED|Speculative Contrivance|See the fake ad/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter aligns dense-discovery ad-block footer CTA to the image rail', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-ad-block-footer-align-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'ad-block-footer-align-external';
  const adsPath = path.join(tempRoot, 'ads.json');

  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'footer-align-ad-01',
        sponsor: 'Bowman-Poole Ltd',
        media: {
          src: 'https://imagedelivery.net/example/footer-align/public',
          altText: 'Bowman-Poole service ad',
        },
        link: 'https://nearfuturelaboratory.com/contact',
        linkText: 'Request Dispatch',
      },
    ]),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Ad Block Footer Alignment Issue',
      'sections:',
      '  - type: ad-block',
      '    items:',
      '      - adId: footer-align-ad-01',
      'footer:',
      '  newsletterSubscribeLink: https://nearfuturelaboratory.com/newsletter/',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [
        BUILD_SCRIPT,
        issuePath,
        outputName,
        `--repo-root=${REPO_ROOT}`,
        `--output-dir=${outputDir}`,
        '--no-open',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NFL_EDITORIAL_ADS_PATH: adsPath,
        },
      },
    );

    const html = readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
    assert.match(html, /padding:\s*0 12px 14px 12px/);
    assert.match(html, /table-layout:\s*fixed/);
    assert.match(html, /align="left"[^>]*width="50%"[^>]*width:\s*50%/);
    assert.match(html, /align="right"[^>]*width="50%"[^>]*text-align:\s*right/);
    assert.match(html, /<p class="mob-readmore" align="right"[^>]*display:\s*inline-block/);
    assert.match(html, /<p class="mob-readmore"[^>]*font-size:11px;line-height:14px/);
    assert.match(html, /<a href="https:\/\/nearfuturelaboratory\.com\/contact"[^>]*font-size:11px;line-height:14px/);
    assert.match(html, /<a href="https:\/\/nearfuturelaboratory\.com\/contact"[^>]*display:\s*inline-block[^>]*>/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('build-newsletter renders commerceLockup opt-in as the composited lockup image with live label and sponsor', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'newsletter-commerce-lockup-optin-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'commerce-lockup-optin-external';
  const adsPath = path.join(tempRoot, 'ads.json');

  writeFileSync(
    adsPath,
    JSON.stringify([
      {
        id: 'commerce-lockup-ad-01',
        label: 'SPONSORED',
        sponsor: 'NearFutureTestCo',
        media: { src: 'https://imagedelivery.net/example/plain-media/public', altText: 'Plain product image' },
        commerce: {
          presentation: 'overlay-lockup',
          priceText: '$12.34',
          icon: { src: 'https://imagedelivery.net/example/icon/public', altText: 'Badge' },
          lockup: {
            aspectRatio: '4x3',
            snapshotSrc: 'https://imagedelivery.net/example/composited-lockup/public',
            snapshotAltText: 'Composited lockup image',
          },
        },
      },
    ]),
    'utf8',
  );

  writeFileSync(
    issuePath,
    [
      '---',
      'template: near-future-lab-daily-headlines',
      'title: Commerce Lockup Optin Issue',
      'sectionStylesFile: templates/near-future-lab-daily-headlines/section-styles.json',
      'sections:',
      '  - type: ad-block',
      '    title: "Tomorrow\'s Ads Today"',
      '    items:',
      '      - adId: commerce-lockup-ad-01',
      '        commerceLockup: true',
      'footer:',
      '  footerCta:',
      '    variant: default',
      '    eyebrow: "Footer"',
      '    text: "Footer copy."',
      '    primaryAction:',
      '      label: "Contact"',
      '      url:',
      '        href: /contact',
      '        label: "lockup test | footer | contact"',
      '        category: operations',
      '    secondaryAction:',
      '      label: "Services"',
      '      url:',
      '        href: /services',
      '        label: "lockup test | footer | services"',
      '        category: operations',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [BUILD_SCRIPT, issuePath, outputName, `--repo-root=${REPO_ROOT}`, `--output-dir=${outputDir}`, '--no-open'],
      { encoding: 'utf8', env: { ...process.env, NFL_EDITORIAL_ADS_PATH: adsPath } },
    );

    const html = readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
    // Image is the composited lockup snapshot, not the plain product image.
    assert.match(html, /https:\/\/imagedelivery\.net\/example\/composited-lockup\/public/);
    assert.doesNotMatch(html, /https:\/\/imagedelivery\.net\/example\/plain-media\/public/);
    // Label and sponsor remain as live HTML text (not suppressed).
    assert.match(html, /SPONSORED/);
    assert.match(html, /NearFutureTestCo/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
