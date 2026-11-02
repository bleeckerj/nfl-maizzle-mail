import { hydrateAdBlockSections } from './hydrate-ad-blocks.mjs';

/**
 * Resolve an optional Dense Discovery header ad through the ordinary ad catalog.
 * The draft supplies only header.adId; the returned header.ad is render-only
 * image, accessibility text, and tracked destination data. Reusing section
 * hydration keeps inventory lookup and link defaults consistent with body ads.
 */
export function hydrateHeaderAd(newsletterData, repoRoot, { logger = console } = {}) {
  const adId = newsletterData?.header?.adId?.trim();
  if (!adId) return;

  const placement = { sections: [{ type: 'ad-block', items: [{ adId }] }] };
  hydrateAdBlockSections(placement, repoRoot, { logger });
  const item = placement.sections[0].items[0];
  if (!item.image) throw new Error(`Header ad "${adId}" has no image in the ad inventory`);

  newsletterData.header.ad = {
    adId,
    image: item.image,
    imageAlt: item.imageAlt || adId,
    link: item.link || '',
  };
}
