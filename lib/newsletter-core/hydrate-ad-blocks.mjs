import fs from 'node:fs';
import path from 'node:path';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeLinkValue(value) {
  const stringHref = asNonEmptyString(value);
  if (stringHref) {
    return { href: stringHref };
  }

  if (!isRecord(value)) {
    return null;
  }

  const href = asNonEmptyString(value.href) ?? asNonEmptyString(value.url);
  if (!href) {
    return null;
  }

  return {
    href,
    label: asNonEmptyString(value.label),
    category: asNonEmptyString(value.category),
    role: asNonEmptyString(value.role),
  };
}

function firstNonEmpty(values) {
  return values.find((value) => typeof value === 'string' && value.length > 0) ?? '';
}

function buildTrackedLinkValue(href, sources, fallback = {}) {
  const resolvedHref = asNonEmptyString(href);
  if (!resolvedHref) {
    return '';
  }

  const label = firstNonEmpty([
    ...sources.map((source) => source?.label),
    fallback.label,
  ]);
  const category = firstNonEmpty([
    ...sources.map((source) => source?.category),
    fallback.category,
  ]);
  const role = firstNonEmpty([
    ...sources.map((source) => source?.role),
    fallback.role,
  ]);

  if (!label && !category) {
    return resolvedHref;
  }

  return {
    href: resolvedHref,
    ...(label ? { label } : {}),
    ...(category ? { category } : {}),
    ...(role ? { role } : {}),
  };
}

function normalizeAdCopyHtml(copy) {
  if (typeof copy !== 'string') return '';
  const trimmed = copy.trim();
  if (!trimmed) return '';
  if (/^\s*<(p|div|ul|ol|table|blockquote)\b/i.test(trimmed)) {
    return trimmed;
  }
  return `<p>${trimmed}</p>`;
}

function buildCommerceMetadata(ad, iconCatalog) {
  const source = ad?.commerce;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const commerce = { presentation: 'compact-band' };
  if (typeof source.priceText === 'string' && source.priceText.trim()) {
    commerce.priceText = source.priceText.trim();
  }
  if (Number.isFinite(source.rating)) {
    commerce.rating = source.rating;
  }
  if (Number.isFinite(source.reviewCount)) {
    commerce.reviewCount = source.reviewCount;
  }
  if (typeof source.reviewCountText === 'string') commerce.reviewCountText = source.reviewCountText.trim();
  if (typeof source.availability === 'string' && source.availability.trim()) {
    commerce.availability = source.availability.trim();
  }
  if (source.icon && typeof source.icon === 'object' && typeof source.icon.src === 'string' && source.icon.src.trim()) {
    commerce.icon = {
      src: source.icon.src.trim(),
      altText: typeof source.icon.altText === 'string' && source.icon.altText.trim()
        ? source.icon.altText.trim()
        : 'Commerce',
    };
  }
  if (!commerce.icon) commerce.icon = iconCatalog[source.iconId || 'PrimeCheckmark'];

  return Object.keys(commerce).length > 0 ? commerce : null;
}

function normalizeAdRenderMode(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized === 'snapshot' || normalized === 'legacy' ? normalized : '';
}

function normalizeAdSnapshotPreset(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return ['native', '1x1', '4x5', '9x16'].includes(normalized) ? normalized : '';
}

function getEditorialAdsPath(repoRoot) {
  const envPath = process.env.NFL_EDITORIAL_ADS_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return path.resolve(envPath);
  }

  const editorialRoot = process.env.NFL_EDITORIAL_ROOT
    ? path.resolve(process.env.NFL_EDITORIAL_ROOT)
    : path.resolve(repoRoot, '..', 'nfl-editorial');
  return path.join(editorialRoot, 'src', 'content', 'ads.json');
}

function buildEditorialAdsIndex(repoRoot, { logger = console } = {}) {
  const adsPath = getEditorialAdsPath(repoRoot);
  if (!fs.existsSync(adsPath)) {
    throw new Error(`Editorial ads inventory not found: ${adsPath}`);
  }

  let adsData;
  try {
    adsData = JSON.parse(fs.readFileSync(adsPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse editorial ads inventory at ${adsPath}: ${error.message}`);
  }

  if (!Array.isArray(adsData)) {
    throw new Error(`Editorial ads inventory must be an array: ${adsPath}`);
  }

  const index = new Map();
  adsData.forEach((ad, idx) => {
    if (!ad || typeof ad !== 'object') return;
    const id = typeof ad.id === 'string' ? ad.id.trim() : '';
    if (!id) return;

    if (!index.has(id)) {
      index.set(id, ad);
      return;
    }

    logger.log(`⚠️  Duplicate ad id "${id}" in editorial inventory at position ${idx + 1}; using first occurrence`);
  });

  return { adsPath, index };
}

/**
 * Hydrate `ad-block` sections from the editorial ads inventory so downstream
 * consumers see the same expanded section payload that the mail renderer uses.
 *
 * @param {object} newsletterData
 * @param {string} repoRoot
 * @param {{ logger?: Pick<Console, 'log'> }} options
 */
export function hydrateAdBlockSections(newsletterData, repoRoot, { logger = console } = {}) {
  if (!newsletterData || !Array.isArray(newsletterData.sections)) return;

  const adBlockSections = newsletterData.sections.filter((section) => section?.type === 'ad-block');
  if (adBlockSections.length === 0) return;

  const { adsPath, index } = buildEditorialAdsIndex(repoRoot, { logger });
  // Read the canonical registry beside the inventory, also for alternate roots.
  const iconCatalogPath = path.resolve(path.dirname(adsPath), '../../shared/ads/commerce-icons.json');
  const iconCatalog = fs.existsSync(iconCatalogPath) ? JSON.parse(fs.readFileSync(iconCatalogPath, 'utf8')) : {};

  logger.log(`🧩 Hydrating ${adBlockSections.length} ad-block section(s) from ${adsPath}`);

  newsletterData.sections.forEach((section, sectionIndex) => {
    if (!section || section.type !== 'ad-block') return;

    if (Array.isArray(section.items)) {
      section.items = section.items.filter((item) => item && typeof item === 'object' && Object.keys(item).length > 0);
    }

    if (!Array.isArray(section.items) || section.items.length !== 1) {
      throw new Error(`Section ${sectionIndex + 1} (ad-block) must contain exactly one item`);
    }

    const sourceItem = section.items[0];
    const adId = typeof sourceItem?.adId === 'string' ? sourceItem.adId.trim() : '';
    if (!adId) {
      throw new Error(`Section ${sectionIndex + 1} (ad-block) is missing required items[0].adId`);
    }

    const ad = index.get(adId);
    if (!ad) {
      throw new Error(`Section ${sectionIndex + 1} (ad-block) references unknown adId "${adId}"`);
    }

    const markdownLink = normalizeLinkValue(sourceItem?.link);
    const markdownReadMoreLink = normalizeLinkValue(sourceItem?.readMoreLink);
    const markdownReadMoreText = typeof sourceItem?.readMoreText === 'string' && sourceItem.readMoreText.trim()
      ? sourceItem.readMoreText.trim()
      : typeof sourceItem?.readMoreTxt === 'string' && sourceItem.readMoreTxt.trim()
        ? sourceItem.readMoreTxt.trim()
        : '';
    const resolvedCopy = typeof ad.copy === 'string' && ad.copy.trim()
      ? ad.copy.trim()
      : typeof ad.landscapeCopy === 'string' && ad.landscapeCopy.trim()
        ? ad.landscapeCopy.trim()
        : '';
    const inventoryLink = normalizeLinkValue(ad.link);
    const resolvedLinkUrl = markdownLink?.href || inventoryLink?.href || '';
    const resolvedReadMoreLink = markdownReadMoreLink?.href || markdownLink?.href || inventoryLink?.href || '';
    const inventoryLinkLabel = typeof ad.link?.label === 'string' && ad.link.label.trim()
      ? ad.link.label.trim()
      : 'Learn more';
    const resolvedLinkLabel = markdownReadMoreText || inventoryLinkLabel;
    const markdownLabel = typeof sourceItem?.label === 'string' && sourceItem.label.trim()
      ? sourceItem.label.trim()
      : '';
    // An authored item title names this placement above its image. Keep the
    // inventory headline below the image, and allow an empty title to hide the label.
    const markdownTitle = typeof sourceItem?.title === 'string' ? sourceItem.title.trim() : undefined;
    const inventoryLabel = typeof ad.label === 'string' && ad.label.trim()
      ? ad.label.trim()
      : '';
    const existingSectionTitle = typeof section.title === 'string' && section.title.trim()
      ? section.title.trim()
      : '';
    const inventoryTitle = typeof ad.title === 'string' && ad.title.trim()
      ? ad.title.trim()
      : '';
    const inventoryCategory = typeof ad.category === 'string' && ad.category.trim()
      ? ad.category.trim()
      : '';
    const inventoryTags = Array.isArray(ad.tags)
      ? ad.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
      : [];
    const sourceContent = sourceItem?.content && typeof sourceItem.content === 'object' && !Array.isArray(sourceItem.content)
      ? sourceItem.content
      : sourceItem?.contentMetadata && typeof sourceItem.contentMetadata === 'object' && !Array.isArray(sourceItem.contentMetadata)
        ? sourceItem.contentMetadata
        : {};
    const contentLabel = typeof sourceContent.label === 'string' && sourceContent.label.trim()
      ? sourceContent.label.trim()
      : markdownLabel || inventoryLabel;
    const contentCategory = typeof sourceContent.category === 'string' && sourceContent.category.trim()
      ? sourceContent.category.trim()
      : inventoryCategory;
    const contentTags = Array.isArray(sourceContent.tags) && sourceContent.tags.length > 0
      ? sourceContent.tags
      : inventoryTags;
    const contentId = typeof sourceContent.id === 'string' && sourceContent.id.trim()
      ? sourceContent.id.trim()
      : adId;

    if (!existingSectionTitle && inventoryTitle) {
      section.title = inventoryTitle;
    }

    const hydratedItem = {
      adId,
      label: markdownTitle ?? (markdownLabel || inventoryLabel),
      content: {
        id: contentId,
        ...(contentLabel ? { label: contentLabel } : {}),
        ...(contentCategory ? { category: contentCategory } : {}),
        ...(contentTags.length ? { tags: contentTags } : {}),
      },
      sponsor: typeof ad.sponsor === 'string' ? ad.sponsor.trim() : '',
      title: existingSectionTitle ? inventoryTitle : '',
      description: normalizeAdCopyHtml(resolvedCopy),
      image: typeof ad.media?.src === 'string' ? ad.media.src.trim() : '',
      imageAlt: typeof ad.media?.altText === 'string' ? ad.media.altText.trim() : '',
    };
    const adRenderMode = normalizeAdRenderMode(sourceItem?.adRenderMode);
    const adSnapshotPreset = normalizeAdSnapshotPreset(sourceItem?.adSnapshotPreset);
    if (adRenderMode) {
      hydratedItem.adRenderMode = adRenderMode;
    }
    if (adSnapshotPreset) {
      hydratedItem.adSnapshotPreset = adSnapshotPreset;
    }
    const commerce = buildCommerceMetadata(ad, iconCatalog);
    if (commerce) {
      hydratedItem.commerce = commerce;
      hydratedItem.renderMode = 'commerce-compact-band';
    }

    // Live commerce keeps the original image even when legacy snapshot options
    // are present in an older draft. Labels and sponsor remain ordinary HTML.

    if (resolvedLinkUrl) {
      hydratedItem.link = buildTrackedLinkValue(
        resolvedLinkUrl,
        [markdownLink],
        {
          label: adId,
          role: 'advertisement',
        },
      );
    }

    if (resolvedReadMoreLink) {
      hydratedItem.readMoreLink = resolvedReadMoreLink === resolvedLinkUrl && hydratedItem.link
        ? hydratedItem.link
        : buildTrackedLinkValue(
            resolvedReadMoreLink,
            [markdownReadMoreLink, markdownLink],
            {
              label: adId,
              role: 'advertisement',
            },
          );
    }

    if (resolvedLinkLabel && resolvedReadMoreLink) {
      hydratedItem.readMoreText = resolvedLinkLabel;
    }

    section.items = [hydratedItem];
  });
}
