import { hydrateAdBlockSections } from './hydrate-ad-blocks.mjs';
import { hydrateShortTakeSections } from './hydrate-short-takes.mjs';
import { prepareAdjacencyProductReviewNewsletter } from './prepare-adjacency-product-review.mjs';
import { prepareAdjacencyJobPostingSection } from './prepare-adjacency-job-posting.mjs';
import { resolveNewsletterFooterCta } from './footer-cta.mjs';
import { inferIssueId, injectViewOnlineLink } from './view-online-link.mjs';
import { normalizeNewsletterTextBreaks } from './text-breaks.mjs';
import {
  normalizeFontFamiliesDeep,
  normalizeNewsletterForSchemaValidation,
  pruneBuildInjectedFields,
} from './normalize.mjs';
import { validateNewsletterDataAgainstSchema } from './schema.mjs';

function normalizeDispatchSectionTags(section) {
  let tags = section.tags || (section.dispatch && section.dispatch.tags);
  if (!tags) return;

  if (typeof tags === 'string') {
    tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.toUpperCase());
  } else if (Array.isArray(tags)) {
    tags = tags.map((tag) => String(tag).trim()).filter(Boolean).map((tag) => tag.toUpperCase());
  } else {
    return;
  }

  section.tags = tags;
}

function normalizeCrossTemplateItemFields(newsletterData, { logger = console } = {}) {
  if (!newsletterData.sections || !Array.isArray(newsletterData.sections)) return;

  newsletterData.sections = newsletterData.sections.map((section) => {
    let normalizedSection = prepareAdjacencyJobPostingSection(section);

    if (!normalizedSection || !normalizedSection.items) return normalizedSection;

    if (normalizedSection.type === 'classifieds') {
      normalizedSection.items.forEach((item) => {
        if (!item.content && typeof item.description === 'string') item.content = item.description;
        if (!item.description && typeof item.content === 'string') item.description = item.content;
      });
    }

    if (normalizedSection.type === 'dispatch') {
      normalizeDispatchSectionTags(normalizedSection);
    }

    return normalizedSection;
  });

  logger.log('🔁 Normalized item fields for classifieds (description ↔ content) and prepared Adjacency jobs sections');
}

/**
 * Produce the canonical normalized newsletter data shared between the email
 * builder and the backoffice export pipeline.
 *
 * @param {object} sourceNewsletterData
 * @param {{
 *   repoRoot: string,
 *   templateName: string,
 *   args?: string[],
 *   outputName?: string,
 *   sourcePath?: string,
 *   strictSchema?: boolean,
 *   logger?: Pick<Console, 'log'>
 * }} options
 * @returns {object}
 */
export function prepareNewsletterData(
  sourceNewsletterData,
  {
    repoRoot,
    templateName,
    args = [],
    outputName,
    sourcePath,
    strictSchema,
    logger = console,
  } = {},
) {
  const newsletterData = structuredClone(sourceNewsletterData);

  pruneBuildInjectedFields(newsletterData);
  normalizeNewsletterForSchemaValidation(newsletterData, { logger });
  validateNewsletterDataAgainstSchema(newsletterData, templateName, {
    repoRoot,
    args,
    strict: strictSchema,
    logger,
  });
  injectViewOnlineLink(newsletterData, {
    templateName,
    outputName,
    sourcePath,
    logger,
  });
  const textBreakFixes = normalizeNewsletterTextBreaks(newsletterData);
  if (textBreakFixes > 0) {
    logger.log(`↵ Normalized ${textBreakFixes} newsletter text field${textBreakFixes === 1 ? '' : 's'} with authored paragraph breaks`);
  }
  hydrateAdBlockSections(newsletterData, repoRoot, { logger });
  hydrateShortTakeSections(newsletterData, repoRoot, { logger });
  prepareAdjacencyProductReviewNewsletter(newsletterData);
  normalizeCrossTemplateItemFields(newsletterData, { logger });
  const footerCtaState = resolveNewsletterFooterCta(newsletterData.footer, {
    issueId: inferIssueId(newsletterData, { outputName, sourcePath }),
  });
  newsletterData.footer = footerCtaState.footer;
  if (footerCtaState.reminder) {
    logger.log('⚠️  Footer CTA missing from newsletter frontmatter. Injected default newsletter footer CTA.');
    logger.log(`   Variant: ${footerCtaState.reminder.variant}`);
    logger.log('Suggested frontmatter snippet:');
    footerCtaState.reminder.snippet.split('\n').forEach((line) => {
      logger.log(`   ${line}`);
    });
  }
  normalizeFontFamiliesDeep(newsletterData);

  return newsletterData;
}
