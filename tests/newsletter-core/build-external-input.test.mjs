import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { adjacencyMailThemeTokens } from '../../lib/adjacency-mail/adjacency-mail-theme-tokens.mjs';
import { resolveAdjacencyJobsMailVariantTokens } from '../../lib/adjacency-mail/adjacency-jobs-mail-theme-tokens.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');
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
    assert.match(html, /A Better Fake Ad/);
    assert.match(html, /padding:\s*12px 16px 8px 16px/);
    assert.match(html, /padding:\s*6px 14px 12px 14px/);
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
      'sections:',
      '  - type: adjacency-job-posting',
      '    brandVariant: anthropic',
      '    company: Anthropic',
      '    companyTagline: "Frontier AI for reliable systems"',
      '    title: "[Expression of Interest] Team Founder, Speculative Prototyping"',
      '    location: "San Francisco, CA | New York, NY"',
      '    applyLabel: "Apply"',
      '    applyUrl: "https://example.com/apply"',
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
