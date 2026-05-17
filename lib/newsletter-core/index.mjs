export { hydrateAdBlockSections } from './hydrate-ad-blocks.mjs';
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
export { resolveNewsletterFooterCta, NEWSLETTER_FOOTER_CTA_VARIANTS } from './footer-cta.mjs';
export {
  buildLinkTrackingMetadataManifest,
  enrichHtmlWithLinkTrackingMetadata,
  normalizeNewsletterLinkTracking,
  reportLinkTrackingMetadataNotices,
} from './link-tracking-metadata.mjs';
export { prepareNewsletterData } from './prepare-newsletter.mjs';
export { validateNewsletterDataAgainstSchema } from './schema.mjs';
