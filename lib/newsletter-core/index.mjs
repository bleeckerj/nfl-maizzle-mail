export { hydrateAdBlockSections } from './hydrate-ad-blocks.mjs';
export { hydrateShortTakeSections } from './hydrate-short-takes.mjs';
export { resolveCommerceAdBlockSnapshots } from './resolve-commerce-ad-block-snapshots.mjs';
export {
  inferYearFromIssueId,
  loadNewsletterSource,
  resolveBackofficeRoot,
  resolveIssueSourcePath,
} from './load-newsletter-source.mjs';
export {
  normalizeEscapedUnicodeDeep,
  normalizeFontFamiliesDeep,
  normalizeNewsletterForSchemaValidation,
  pruneBuildInjectedFields,
} from './normalize.mjs';
export {
  normalizeIntroStatementSection,
  normalizeIntroStatementSections,
  sanitizeIntroStatementHtml,
} from './intro-statement-html.mjs';
export {
  normalizeAuthorHtmlBreaks,
  normalizeNewsletterTextBreaks,
} from './text-breaks.mjs';
export { resolveNewsletterFooterCta, NEWSLETTER_FOOTER_CTA_VARIANTS } from './footer-cta.mjs';
export { buildContentSlotManifest } from './content-slots.mjs';
export {
  buildLinkTrackingMetadataManifest,
  enrichHtmlWithLinkTrackingMetadata,
  normalizeNewsletterLinkTracking,
  reportLinkTrackingMetadataNotices,
} from './link-tracking-metadata.mjs';
export {
  checkHttpUrl,
  collectHtmlLinkCandidates,
  collectLinkCandidates,
  validateLinkEntries,
  validateLinks,
  validateRenderedHtmlLinks,
} from './link-validation.mjs';
export { prepareNewsletterData } from './prepare-newsletter.mjs';
export { PUBLICATION_MODES, resolvePublicationMode } from './publication-mode.mjs';
export { validateNewsletterDataAgainstSchema } from './schema.mjs';
export {
  buildViewOnlineTrackedLink,
  buildViewOnlineUrl,
  inferIssueId as inferViewOnlineIssueId,
  injectViewOnlineLink,
  warnIfMissingViewOnlineLink,
} from './view-online-link.mjs';

export {
  normalizeCalendarEventSections,
  writeCalendarEventFiles,
} from './calendar-events.mjs';
