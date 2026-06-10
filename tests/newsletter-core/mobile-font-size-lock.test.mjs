import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decorateAdjacencyProductReviewBodyHtml } from '../../lib/newsletter-core/prepare-adjacency-product-review.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DENSE_DISCOVERY_LAYOUT = path.join(REPO_ROOT, 'templates', 'dense-discovery', 'layouts', 'main.html');
const DENSE_DISCOVERY_TEMPLATE = path.join(REPO_ROOT, 'templates', 'dense-discovery', 'newsletter.html');
const DENSE_DISCOVERY_SECTION_STYLES = path.join(
  REPO_ROOT,
  'templates',
  'dense-discovery',
  'section-styles.json',
);
const ADJACENCY_PRODUCT_REVIEW_ROOT = path.join(REPO_ROOT, 'templates', 'adjacency-product-review');
const ADJACENCY_PRODUCT_REVIEW_LAYOUT = path.join(
  ADJACENCY_PRODUCT_REVIEW_ROOT,
  'layouts',
  'main.html',
);
const ADJACENCY_PRODUCT_REVIEW_FEATURED = path.join(
  ADJACENCY_PRODUCT_REVIEW_ROOT,
  'components',
  'FeaturedReview.html',
);
const ADJACENCY_PRODUCT_REVIEW_PICKS = path.join(
  ADJACENCY_PRODUCT_REVIEW_ROOT,
  'components',
  'ReviewPicks.html',
);
const ADJACENCY_PRODUCT_REVIEW_BODY = path.join(
  ADJACENCY_PRODUCT_REVIEW_ROOT,
  'components',
  'Body.html',
);
const ADJACENCY_PRODUCT_REVIEW_README = path.join(ADJACENCY_PRODUCT_REVIEW_ROOT, 'README.md');
const WIRECUTTER_V2_LAYOUT = path.join(REPO_ROOT, 'templates', 'wirecutter-v2', 'layouts', 'main.html');
const DAILY_HEADLINES_ROOT = path.join(REPO_ROOT, 'templates', 'near-future-lab-daily-headlines');
const DAILY_HEADLINES_LAYOUT = path.join(DAILY_HEADLINES_ROOT, 'layouts', 'main.html');
const DAILY_HEADLINES_TEMPLATE = path.join(DAILY_HEADLINES_ROOT, 'newsletter.html');
const DAILY_HEADLINES_ARTICLE_GROUP = path.join(
  DAILY_HEADLINES_ROOT,
  'components',
  'SectionArticleGroup.html',
);
const DAILY_HEADLINES_AD_BLOCK = path.join(DAILY_HEADLINES_ROOT, 'components', 'AdBlock.html');
const DAILY_HEADLINES_FOOTER_CTA = path.join(DAILY_HEADLINES_ROOT, 'components', 'FooterCta.html');
const DAILY_HEADLINES_EMAIL_FOOTER = path.join(DAILY_HEADLINES_ROOT, 'components', 'EmailFooter.html');
const BUILD_NEWSLETTER_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

function extractMobileMediaBlock(layout, mediaQuery = '@media screen and (max-width:599px)') {
  const mediaStart = layout.indexOf(mediaQuery);
  assert.notEqual(mediaStart, -1, 'template output must include the locked mobile media query');

  const nextMediaStart = layout.indexOf('@media', mediaStart + 1);
  return nextMediaStart === -1 ? layout.slice(mediaStart) : layout.slice(mediaStart, nextMediaStart);
}

test('dense-discovery source labels the mobile font-size rule as an intentional lock', () => {
  const layout = readFileSync(DENSE_DISCOVERY_LAYOUT, 'utf8');

  assert.match(layout, /MOBILE FONT SIZE LOCK/);
  assert.match(layout, /Do not remove, lower, or\s+narrow these selectors/);
  assert.match(layout, /mobile-font-size-lock\.test\.mjs/);
});

test('dense-discovery mobile typography defaults remain locked to larger body copy', () => {
  const sectionStyles = JSON.parse(readFileSync(DENSE_DISCOVERY_SECTION_STYLES, 'utf8'));
  const mobileAdjustments = sectionStyles.globalOverrides?.mobileAdjustments;

  assert.equal(mobileAdjustments?.contentStyles?.fontSize, '23px');
  assert.equal(mobileAdjustments?.contentStyles?.lineHeight, '1.3');
  assert.equal(mobileAdjustments?.captionStyles?.fontSize, '14px');
  assert.equal(mobileAdjustments?.captionStyles?.lineHeight, '1.2');
});

test('dense-discovery layout forces larger mobile body copy with literal values', () => {
  const layout = readFileSync(DENSE_DISCOVERY_LAYOUT, 'utf8');
  const mobileBlock = extractMobileMediaBlock(layout);

  assert.match(mobileBlock, /\.mob-text,\s*\.mob-text a,\s*\.mob-text p,\s*\.mob-text li,\s*\.intro-content,\s*\.intro-content a,\s*\.intro-content p,\s*\.intro-content li,\s*\.intro-aside,\s*\.intro-aside a,\s*\.intro-aside p,\s*\.intro-aside li\s*\{\s*font-size:\s*23px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.mob-title\s*\{\s*font-size:\s*26px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.mob-subtitle\s*\{\s*font-size:\s*23px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.mob-readmore,\s*\.mob-readmore a\s*\{\s*font-size:\s*23px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.mob-caption,\s*\.mob-caption p,\s*\.mob-caption span,\s*\.mob-caption li,\s*\.mob-caption \.mob-text\s*\{\s*font-size:\s*14px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /\.mob-meta,\s*\.mob-meta span,\s*\.mob-meta a\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*1\.1\s*!important;/);
  assert.match(
    mobileBlock,
    /\.mob-title a,\s*\.mob-subtitle a,\s*\.mob-text a,\s*\.intro-content a,\s*\.intro-aside a,\s*\.mob-readmore a,\s*\.mob-caption a,\s*\.mob-caption strong,\s*\.mob-caption em\s*\{\s*font-size:\s*inherit\s*!important;\s*line-height:\s*inherit\s*!important;/,
  );
  assert.doesNotMatch(mobileBlock, /mobile(?:Text|Caption)(?:FontSize|LineHeight)/);
  assert.doesNotMatch(mobileBlock, /undefined\s*!important/);
});

test('dense-discovery semantic section and item headings opt into the mobile title lock', () => {
  const template = readFileSync(DENSE_DISCOVERY_TEMPLATE, 'utf8');

  assert.match(template, /<h1 class="mob-text mob-title"[^>]*>\{\{ section\.title \}\}<\/h1>/);
  assert.match(template, /<h2 class="mob-text mob-title"[^>]*>\s*<a href="\{\{ item\.link \}\}"[^>]*>\{\{ item\.title \}\}<\/a>\s*<\/h2>/);
  assert.match(template, /<h2 class="mob-text mob-title"[^>]*>\s*\{\{ item\.title \}\}\s*<\/h2>/);
  assert.doesNotMatch(template, /<(?:h1|h2|p)(?![^>]*class=)[^>]*\{\{\{ section\.headingStylesInline/);
  assert.doesNotMatch(template, /<h1(?![^>]*class=)[^>]*>\{\{ section\.title \}\}<\/h1>/);
});

test('dense-discovery semantic metadata labels opt into the mobile metadata lock', () => {
  const template = readFileSync(DENSE_DISCOVERY_TEMPLATE, 'utf8');

  assert.match(template, /<div class="mob-meta" style="\{\{\{ section\.labelStylesInline \|\| '' \}\}\}">\{\{ item\.label \}\}<\/div>/);
  assert.match(template, /<p class="mob-meta" style="\{\{\{ section\.labelStylesInline \|\| '' \}\}\}/);
  assert.match(template, /class="h1byline mob-meta"/);
  assert.match(template, /<p class="share-tech-mono-regular mob-meta"[^>]*>\s*<span style="color: #999">From the<\/span> \{\{ item\.channel \}\}/);
  assert.match(template, /<span class="mob-meta"[^>]*>DEPARTMENT OF \{\{ item\.category \}\}/);
  assert.match(template, /<div class="mob-meta"[^>]*>\{\{ item\.signalsLabel \|\| section\.signalsLabel \|\| 'SIGNALS' \}\}<\/div>/);
  assert.match(template, /<div class="mob-meta"[^>]*>Story Seeds<\/div>/);
  assert.match(template, /<p class="mob-meta" style="\{\{\{ section\.labelStylesInline \|\| '' \}\}\}\{\{\{ section\.labelStylesInline \? '; ' : '' \}\}\}margin: 0 0 12px 0;padding: 0;">\{\{ section\.rubric \}\}<\/p>/);
});

test('dense-discovery generated inline typography does not block the mobile font lock', () => {
  const buildScript = readFileSync(BUILD_NEWSLETTER_SCRIPT, 'utf8');

  assert.match(buildScript, /mobileLockTypographyProperties\s*=\s*new Set\(\['font-size', 'line-height'\]\)/);
  assert.match(buildScript, /section\.headingStylesInline\s*=\s*toCssString\([\s\S]*withoutImportant:\s*mobileLockTypographyProperties/);
  assert.match(buildScript, /section\.sectionHeaderHeadingStylesInline\s*=\s*toCssString\([\s\S]*withoutImportant:\s*mobileLockTypographyProperties/);
  assert.match(buildScript, /section\.linkStylesInline\s*=\s*toCssString\([\s\S]*withoutImportant:\s*mobileLockTypographyProperties/);
  assert.match(buildScript, /section\.labelStylesInline\s*=\s*toCssString\([\s\S]*withoutImportant:\s*mobileLockTypographyProperties/);
});

test('adjacency-product-review documents its purpose and mobile font lock', () => {
  const readme = readFileSync(ADJACENCY_PRODUCT_REVIEW_README, 'utf8');

  assert.match(readme, /Wirecutter-like template for the adjacency \/ nfl-editorial's speculative product reviews/);
  assert.match(readme, /Mobile Font Lock/);
  assert.match(readme, /Review body copy: `22px`/);
  assert.match(readme, /must not use `!important`/);
});

test('adjacency-product-review layout locks mobile typography to the dense-discovery role scale', () => {
  const layout = readFileSync(ADJACENCY_PRODUCT_REVIEW_LAYOUT, 'utf8');
  const mobileBlock = extractMobileMediaBlock(layout, '@media screen and (max-width: 620px)');

  assert.match(mobileBlock, /MOBILE FONT SIZE LOCK/);
  assert.match(mobileBlock, /mobile-font-size-lock\.test\.mjs/);
  assert.match(mobileBlock, /\.review-pad\s*\{\s*padding-left:\s*6px\s*!important;\s*padding-right:\s*6px\s*!important;/);
  assert.match(mobileBlock, /\.review-headline,\s*\.review-section-title,\s*\.review-pick-title\s*\{\s*font-size:\s*26px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-copy,\s*\.review-mobile-copy p,\s*\.review-mobile-copy li,\s*\.review-body,\s*\.review-body p,\s*\.review-body li\s*\{\s*font-size:\s*22px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-subtitle\s*\{\s*font-size:\s*23px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-button,\s*\.review-mobile-button a\s*\{\s*font-size:\s*23px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /\.review-footer-cta-button\s*\{[\s\S]*font-size:\s*14px\s*!important;\s*line-height:\s*16px\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-grounding-block\s*\{\s*padding-left:\s*0\s*!important;\s*padding-right:\s*0\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-context-note\s*\{\s*box-sizing:\s*border-box\s*!important;/);
  assert.match(mobileBlock, /\.review-body \.review-mobile-context-note-copy p,[\s\S]*\.review-body \.review-mobile-context-note-copy a\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*20px\s*!important;/);
  assert.match(mobileBlock, /\.review-body \.review-mobile-context-note-meta,[\s\S]*\.review-body \.review-mobile-context-note-meta a\s*\{\s*font-size:\s*12px\s*!important;\s*line-height:\s*1\.1\s*!important;/);
  assert.match(mobileBlock, /\.review-body \.review-mobile-share-cta-copy,[\s\S]*font-family:\s*'nyt-franklin', Arial, Helvetica, sans-serif\s*!important;[\s\S]*font-size:\s*17px\s*!important;[\s\S]*font-weight:\s*800\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-merchant-button,\s*\.review-mobile-merchant-button a\s*\{\s*font-size:\s*12px\s*!important;\s*line-height:\s*1\.1\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-caption\s*\{\s*font-size:\s*18px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /\.review-mobile-meta,\s*\.review-mobile-meta span,\s*\.review-mobile-meta a\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*1\.1\s*!important;/);
  assert.match(mobileBlock, /MOBILE AD FONT SIZE LOCK/);
  assert.match(mobileBlock, /\.review-mobile-ad-card\s*\{\s*padding:\s*8px\s*!important;/);
  assert.match(mobileBlock, /\.review-body \.review-mobile-ad-copy p,[\s\S]*\.review-body \.review-mobile-ad-copy a\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*19px\s*!important;/);
  assert.match(mobileBlock, /\.review-body \.review-mobile-ad-label,[\s\S]*\.review-body \.review-mobile-ad-meta a\s*\{\s*font-size:\s*12px\s*!important;\s*line-height:\s*1\s*!important;/);
});

test('adjacency-product-review keeps desktop shell gutters narrow and content width aligned', () => {
  const layout = readFileSync(ADJACENCY_PRODUCT_REVIEW_LAYOUT, 'utf8');
  const featured = readFileSync(ADJACENCY_PRODUCT_REVIEW_FEATURED, 'utf8');

  assert.match(layout, /class="review-pad"[^>]*style="width: 100%; padding: 20px 12px;"/);
  assert.match(layout, /<table role="presentation" width="576"[^>]*style="width: 576px; max-width: 576px;"/);
  assert.match(featured, /<img src="\{\{ featuredReview\.heroImage \}\}" width="576"[^>]*style="display: block; width: 576px; max-width: 100%; height: auto;">/);
});

test('adjacency-product-review semantic paths opt into mobile font locks', () => {
  const featured = readFileSync(ADJACENCY_PRODUCT_REVIEW_FEATURED, 'utf8');
  const picks = readFileSync(ADJACENCY_PRODUCT_REVIEW_PICKS, 'utf8');
  const body = readFileSync(ADJACENCY_PRODUCT_REVIEW_BODY, 'utf8');

  assert.match(featured, /<h1 class="review-headline"/);
  assert.match(featured, /<p class="review-mobile-copy"[^>]*>\{\{ featuredReview\.dek \}\}<\/p>/);
  assert.match(featured, /<p class="review-mobile-meta"[^>]*>\{\{ featuredReview\.categoryLabel \}\}<\/p>/);
  assert.match(featured, /<p class="review-mobile-meta"[^>]*>\s*<if condition="featuredReview\.author">/);
  assert.match(featured, /class="review-mobile-caption"/);
  assert.match(featured, /<p class="review-mobile-meta"[^>]*>How we tested<\/p>/);

  assert.match(picks, /<h2 class="review-section-title"/);
  assert.match(picks, /<h3 class="review-pick-title"/);
  assert.match(picks, /<p class="review-mobile-copy review-mobile-subtitle"[^>]*>\{\{ pick\.subtitle \}\}<\/p>/);
  assert.match(picks, /<p class="review-mobile-meta"[^>]*>\{\{ pick\.label \}\}/);
  assert.match(picks, /<p class="review-mobile-meta"[^>]*>\{\{ pick\.priceText \}\}<\/p>/);
  assert.match(picks, /class="review-mobile-merchant-button"/);
  assert.match(picks, /<p class="review-mobile-meta"[^>]*>What works<\/p>/);
  assert.match(picks, /<p class="review-mobile-meta"[^>]*>Tradeoffs<\/p>/);

  assert.match(body, /class="review-mobile-copy"/);
  assert.match(body, /class="review-body"/);
  assert.match(body, /<strong class="review-mobile-meta"[^>]*>Verdict<\/strong>/);
  assert.match(body, /<p class="review-mobile-meta"[^>]*>\{\{ footerCta\.eyebrow \}\}<\/p>/);
  assert.match(body, /class="review-mobile-button review-footer-cta-button"/);
});

test('adjacency-product-review body HTML ad fragments receive mobile ad classes', () => {
  const bodyHtml = [
    '<div style="margin:20px 0;padding:12px;background:#f5f4f0;border:1px solid #c9cfdb">',
    '<p style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">YOUR NEIGHBORHOOD SERVICE TECHNICIANS AVAIL 24/7</p>',
    '<h3 style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:16px;line-height:1.08">SONY 8-bit Game Boy Reflex Z80</h3>',
    '<p style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:13px;line-height:1.42">The new SONY 8-bit Game Boy Reflex Z80 Agentic Combinatorial.</p>',
    '</div>',
  ].join('');

  const decorated = decorateAdjacencyProductReviewBodyHtml(bodyHtml);

  assert.match(decorated, /<div class="review-mobile-ad-card" style="margin:20px 0;padding:12px;background:#f5f4f0;border:1px solid #c9cfdb">/);
  assert.match(decorated, /<p class="review-mobile-ad-meta"[^>]*>YOUR NEIGHBORHOOD SERVICE TECHNICIANS AVAIL 24\/7<\/p>/);
  assert.match(decorated, /<h3 class="review-mobile-ad-meta"[^>]*>SONY 8-bit Game Boy Reflex Z80<\/h3>/);
  assert.match(decorated, /<p class="review-mobile-ad-copy"[^>]*>The new SONY 8-bit Game Boy Reflex Z80 Agentic Combinatorial\.<\/p>/);
});

test('adjacency-product-review body HTML remarks and groundings collapse side padding on mobile', () => {
  const bodyHtml = [
    '<div style="margin: 48px 0 24px 0; padding: 24px; border-top: 2px dashed #d1d5db; background: #f9fafb">',
    '<h2>Editorial Remarks</h2>',
    '<div style="margin: 0; padding-top: 18px; border-top: 1px solid #d1d5db">',
    '<h3>Referenced Signals</h3>',
    '</div>',
    '</div>',
  ].join('');

  const decorated = decorateAdjacencyProductReviewBodyHtml(bodyHtml);

  assert.match(decorated, /<div class="review-mobile-grounding-block" style="margin: 48px 0 24px 0; padding: 24px; border-top: 2px dashed #d1d5db; background: #f9fafb">/);
});

test('adjacency-product-review body HTML context notes keep context note mobile classes', () => {
  const bodyHtml = [
    '<div class="review-mobile-context-note" style="width: 90%; background: #f0f0f0">',
    '<p class="review-mobile-context-note-meta" style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:11px;text-transform:uppercase">Editor Joe</p>',
    '<div class="review-mobile-context-note-copy" style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:13px;line-height:1.42">',
    '<p style="font-family:\'Share Tech Mono\',Courier,monospace;font-size:13px;line-height:1.42">Context note copy.</p>',
    '</div>',
    '</div>',
  ].join('');

  const decorated = decorateAdjacencyProductReviewBodyHtml(bodyHtml);

  assert.match(decorated, /class="review-mobile-context-note"/);
  assert.match(decorated, /class="review-mobile-context-note-meta review-mobile-ad-meta"|class="review-mobile-ad-meta review-mobile-context-note-meta"/);
  assert.match(decorated, /class="review-mobile-context-note-copy"/);
});

test('adjacency-product-review locked typography avoids inline important blockers', () => {
  const sources = [
    readFileSync(ADJACENCY_PRODUCT_REVIEW_FEATURED, 'utf8'),
    readFileSync(ADJACENCY_PRODUCT_REVIEW_PICKS, 'utf8'),
    readFileSync(ADJACENCY_PRODUCT_REVIEW_BODY, 'utf8'),
  ].join('\n');

  assert.doesNotMatch(sources, /font-size:[^;"']*!important/i);
  assert.doesNotMatch(sources, /line-height:[^;"']*!important/i);
});

test('wirecutter-v2 locks ad mobile typography separately from editorial copy', () => {
  const layout = readFileSync(WIRECUTTER_V2_LAYOUT, 'utf8');
  const mobileBlock = extractMobileMediaBlock(layout, '@media screen and (max-width:600px)');
  const editorialCopyIndex = mobileBlock.indexOf('.wirecutter-mobile-copy');
  const adCopyIndex = mobileBlock.indexOf('.wirecutter-mobile-ad-copy');

  assert.notEqual(editorialCopyIndex, -1, 'wirecutter-v2 must keep its editorial mobile copy lock');
  assert.notEqual(adCopyIndex, -1, 'wirecutter-v2 must include an ad-specific mobile copy lock');
  assert.ok(adCopyIndex > editorialCopyIndex, 'ad mobile typography must follow editorial copy so it can override it');
  assert.match(mobileBlock, /MOBILE AD FONT SIZE LOCK/);
  assert.match(mobileBlock, /\.wirecutter-mobile-copy,\s*\.wirecutter-mobile-copy p,\s*\.wirecutter-mobile-copy span,\s*\.wirecutter-mobile-copy li\s*\{\s*font-size:\s*20px\s*!important;\s*line-height:\s*29px\s*!important;/);
  assert.match(mobileBlock, /\.wirecutter-mobile-ad-copy,\s*\.wirecutter-mobile-ad-copy p,[\s\S]*\.wirecutter-mobile-copy \.mob-ad-copy a\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*22px\s*!important;/);
  assert.match(mobileBlock, /\.wirecutter-mobile-ad-label,\s*\.wirecutter-mobile-ad-label span,[\s\S]*\.wirecutter-mobile-copy \.mob-meta a\s*\{\s*font-size:\s*14px\s*!important;\s*line-height:\s*1\.1\s*!important;/);
});

test('daily-headlines article groups lock mobile article title and lede sizes separately', () => {
  const layout = readFileSync(DAILY_HEADLINES_LAYOUT, 'utf8');
  const mobileBlock = extractMobileMediaBlock(layout, '@media screen and (max-width: 599px)');

  assert.match(mobileBlock, /\.mob-text,\s*\.mob-text a,\s*\.mob-text p,[\s\S]*font-size:\s*23px\s*!important;/);
  assert.match(mobileBlock, /table\.intro-statement p\.intro-statement-label,[\s\S]*p\.intro-statement-label span\s*\{\s*font-size:\s*12px\s*!important;\s*line-height:\s*1\.3\s*!important;/);
  assert.match(mobileBlock, /table\.intro-statement \.intro-statement-copy,[\s\S]*\.intro-statement-copy strong\s*\{\s*font-size:\s*18px\s*!important;\s*line-height:\s*1\.35\s*!important;/);
  assert.match(mobileBlock, /h2\.ad-section-title,[\s\S]*h2\.ad-section-title a\s*\{\s*font-size:\s*20px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /h3\.ad-title,[\s\S]*h3\.ad-title a\s*\{\s*font-size:\s*22px\s*!important;\s*line-height:\s*1\.24\s*!important;/);
  assert.match(mobileBlock, /p\.article-kicker,[\s\S]*p\.article-kicker span\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /h3\.article-title,[\s\S]*h3\.article-title a\s*\{\s*font-size:\s*24px\s*!important;\s*line-height:\s*1\.22\s*!important;/);
  assert.match(mobileBlock, /p\.article-lede,[\s\S]*p\.article-lede strong\s*\{\s*font-size:\s*19px\s*!important;\s*line-height:\s*1\.35\s*!important;/);
  assert.match(mobileBlock, /span\.article-cta-pill,[\s\S]*\.article-cta-pill\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*1\.25\s*!important;/);
  assert.match(mobileBlock, /p\.mob-ad-copy,[\s\S]*p\.mob-ad-copy strong\s*\{\s*font-size:\s*\{\{ mobileAdCopyFontSize \|\| '16px' \}\}\s*!important;\s*line-height:\s*\{\{ mobileAdCopyLineHeight \|\| '1\.25' \}\}\s*!important;/);
  assert.match(mobileBlock, /p\.mob-ad-meta,[\s\S]*a\.mob-ad-meta span\s*\{\s*font-size:\s*\{\{ mobileAdMetaFontSize \|\| '10px' \}\}\s*!important;\s*line-height:\s*\{\{ mobileAdMetaLineHeight \|\| '1\.2' \}\}\s*!important;/);
  assert.match(mobileBlock, /table\.footer-cta p\.footer-cta-eyebrow,[\s\S]*p\.footer-cta-eyebrow span\s*\{\s*font-size:\s*15px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /table\.footer-cta p\.footer-cta-copy,[\s\S]*p\.footer-cta-copy strong\s*\{\s*font-size:\s*20px\s*!important;\s*line-height:\s*1\.35\s*!important;/);
  assert.match(mobileBlock, /table\.footer-cta a\.footer-cta-button,[\s\S]*a\.footer-cta-button span\s*\{\s*font-size:\s*16px\s*!important;\s*line-height:\s*1\.2\s*!important;/);
  assert.match(mobileBlock, /\.mob-footer,[\s\S]*\.mob-footer td\s*\{\s*font-size:\s*15px\s*!important;\s*line-height:\s*1\.35\s*!important;/);
});

test('daily-headlines article group markup opts semantic text into article mobile locks', () => {
  const sources = [
    readFileSync(DAILY_HEADLINES_TEMPLATE, 'utf8'),
    readFileSync(DAILY_HEADLINES_ARTICLE_GROUP, 'utf8'),
  ].join('\n');

  assert.match(sources, /<p class="article-kicker"[^>]*>\{\{ article\.kicker \}\}<\/p>/);
  assert.match(sources, /<h3 class="article-title"[^>]*>\{\{ article\.headline \}\}<\/h3>/);
  assert.match(sources, /<p class="article-lede"[^>]*>\{\{\{ article\.lede \}\}\}<\/p>/);
});

test('daily-headlines intro statement markup opts into proportional mobile locks', () => {
  const sources = [
    readFileSync(DAILY_HEADLINES_TEMPLATE, 'utf8'),
    readFileSync(path.join(DAILY_HEADLINES_ROOT, 'components', 'IntroStatement.html'), 'utf8'),
  ].join('\n');

  assert.match(sources, /class="mob-text intro-statement/);
  assert.match(sources, /<p class="intro-statement-label"[^>]*>\{\{ section\.label \}\}<\/p>/);
  assert.match(sources, /<div class="intro-statement-copy"[^>]*>\{\{\{ section\.statement_rendered_html \}\}\}<\/div>/);
  assert.match(sources, /<p class="intro-statement-copy"[^>]*>\{\{ section\.statement \}\}<\/p>/);
});

test('daily-headlines ad and footer markup opts into proportional mobile locks', () => {
  const sources = [
    readFileSync(DAILY_HEADLINES_TEMPLATE, 'utf8'),
    readFileSync(DAILY_HEADLINES_AD_BLOCK, 'utf8'),
    readFileSync(DAILY_HEADLINES_FOOTER_CTA, 'utf8'),
    readFileSync(DAILY_HEADLINES_EMAIL_FOOTER, 'utf8'),
  ].join('\n');

  assert.match(sources, /<h2 class="ad-section-title"[^>]*>\{\{ section\.title \}\}<\/h2>/);
  assert.match(sources, /<h3 class="ad-title"[^>]*>/);
  assert.match(sources, /class="mob-text mob-footer/);
  assert.match(sources, /class="mob-text footer-cta/);
  assert.match(sources, /<p class="footer-cta-eyebrow"[^>]*>\{\{ footer\.footerCta\.eyebrow \}\}<\/p>/);
  assert.match(sources, /<p class="footer-cta-copy"[^>]*>\{\{ footer\.footerCta\.text \}\}<\/p>/);
  assert.match(sources, /<a class="footer-cta-button"[^>]*>\{\{ footer\.footerCta\.primaryAction\.label \}\}<\/a>/);
  assert.match(sources, /<a class="footer-cta-button"[^>]*>\{\{ footer\.footerCta\.secondaryAction\.label \}\}<\/a>/);
});
