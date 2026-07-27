import fs from 'node:fs';
import path from 'node:path';

const TRACKING_CATEGORY = 'short-take';
const EDITORIAL_SITE_ORIGIN = 'https://nearfuturelaboratory.com';
const RECORD_KEYS = new Set([
  'id',
  'headline',
  'image',
  'caption',
  'url',
  'maxWidth',
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
]);
const IMAGE_KEYS = new Set(['url', 'altText']);
const MAX_WIDTH_KEYS = new Set(['base', 'sm', 'md', 'lg', 'xl']);
const DESTINATION_KEYS = new Set(['href', 'label', 'category', 'interests', 'intent']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function assertOnlyKeys(value, allowedKeys, prefix) {
  const extras = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (extras.length) {
    throw new Error(`${prefix} contains unsupported field${extras.length === 1 ? '' : 's'}: ${extras.join(', ')}`);
  }
}

function resolveInventoryPath(repoRoot) {
  if (nonEmptyString(process.env.NFL_EDITORIAL_SHORT_TAKES_PATH)) {
    return path.resolve(process.env.NFL_EDITORIAL_SHORT_TAKES_PATH.trim());
  }

  const editorialRoot = nonEmptyString(process.env.NFL_EDITORIAL_ROOT)
    ? path.resolve(process.env.NFL_EDITORIAL_ROOT.trim())
    : path.resolve(repoRoot, '..', 'nfl-editorial');
  return path.join(editorialRoot, 'src', 'content', 'shortTakes.json');
}

function validatePhotariumUrl(value, prefix) {
  const candidate = nonEmptyString(value);
  try {
    const url = new URL(candidate);
    if (url.protocol === 'https:' && url.hostname === 'imagedelivery.net') return candidate;
  } catch {
    // The shared error below includes the inventory field path.
  }
  throw new Error(`${prefix} must be a public Photarium Cloudflare Image Delivery URL`);
}

function resolveDestinationUrl(value, prefix) {
  const candidate = nonEmptyString(value);
  if (!candidate) {
    throw new Error(`${prefix} must be an HTTPS URL or a site-relative path beginning with /`);
  }
  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return new URL(candidate, EDITORIAL_SITE_ORIGIN).href;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol === 'https:') return url.href;
  } catch {
    // The shared error below includes the inventory field path.
  }
  throw new Error(`${prefix} must be an HTTPS URL or a site-relative path beginning with /`);
}

// A Short Take destination is either a bare URL string or a tracked-link object
// carrying analytics metadata ({ href, label, category, interests, intent }).
// Both forms normalize to the object shape; the string form yields just { href }.
function resolveShortTakeDestination(value, prefix) {
  if (typeof value === 'string') {
    return { href: resolveDestinationUrl(value, prefix) };
  }
  if (!isRecord(value)) {
    throw new Error(`${prefix} must be a URL string or a tracked-link object`);
  }
  assertOnlyKeys(value, DESTINATION_KEYS, prefix);
  const destination = { href: resolveDestinationUrl(value.href, `${prefix}.href`) };
  for (const field of ['label', 'category', 'intent']) {
    if (value[field] === undefined) continue;
    const scalar = nonEmptyString(value[field]);
    if (!scalar) throw new Error(`${prefix}.${field} must be a non-empty string`);
    destination[field] = scalar;
  }
  if (value.interests !== undefined) {
    if (!Array.isArray(value.interests) || value.interests.length === 0) {
      throw new Error(`${prefix}.interests must be a non-empty array of strings`);
    }
    destination.interests = value.interests.map((entry, entryIndex) => {
      const scalar = nonEmptyString(entry);
      if (!scalar) throw new Error(`${prefix}.interests[${entryIndex}] must be a non-empty string`);
      return scalar;
    });
  }
  return destination;
}

function validateMaxWidth(value, prefix) {
  if (value === undefined) return undefined;
  const scalar = nonEmptyString(value);
  if (scalar) return scalar;
  if (!isRecord(value)) {
    throw new Error(`${prefix} must be a non-empty string or a responsive width object`);
  }
  assertOnlyKeys(value, MAX_WIDTH_KEYS, prefix);
  const normalized = {};
  for (const key of MAX_WIDTH_KEYS) {
    if (value[key] === undefined) continue;
    const width = nonEmptyString(value[key]);
    if (!width) throw new Error(`${prefix}.${key} must be a non-empty string`);
    normalized[key] = width;
  }
  return normalized;
}

function validateRecord(record, index) {
  const prefix = `shortTakes[${index}]`;
  if (!isRecord(record)) throw new Error(`${prefix} must be an object`);
  assertOnlyKeys(record, RECORD_KEYS, prefix);

  const normalized = {};
  for (const field of ['id', 'headline', 'caption']) {
    normalized[field] = nonEmptyString(record[field]);
    if (!normalized[field]) throw new Error(`${prefix}.${field} must be a non-empty string`);
  }

  if (!isRecord(record.image)) throw new Error(`${prefix}.image must be an object`);
  assertOnlyKeys(record.image, IMAGE_KEYS, `${prefix}.image`);
  normalized.image = {
    url: validatePhotariumUrl(record.image.url, `${prefix}.image.url`),
    altText: nonEmptyString(record.image.altText),
  };
  if (!normalized.image.altText) throw new Error(`${prefix}.image.altText must be a non-empty string`);

  if (record.url !== undefined) normalized.url = resolveShortTakeDestination(record.url, `${prefix}.url`);
  if (record.maxWidth !== undefined) normalized.maxWidth = validateMaxWidth(record.maxWidth, `${prefix}.maxWidth`);
  for (const field of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    if (record[field] === undefined) continue;
    normalized[field] = nonEmptyString(record[field]);
    if (!normalized[field]) throw new Error(`${prefix}.${field} must be a non-empty string`);
  }
  return normalized;
}

function loadInventory(repoRoot) {
  const inventoryPath = resolveInventoryPath(repoRoot);
  let source;
  try {
    source = fs.readFileSync(inventoryPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read Short Take inventory at ${inventoryPath}: ${error.message}`);
  }

  let inventory;
  try {
    inventory = JSON.parse(source);
  } catch (error) {
    throw new Error(`Failed to parse Short Take inventory at ${inventoryPath}: ${error.message}`);
  }
  if (!Array.isArray(inventory)) throw new Error(`Short Take inventory must be a JSON array: ${inventoryPath}`);

  const index = new Map();
  inventory.forEach((sourceRecord, recordIndex) => {
    let record;
    try {
      record = validateRecord(sourceRecord, recordIndex);
    } catch (error) {
      throw new Error(`Invalid Short Take inventory at ${inventoryPath}: ${error.message}`);
    }
    if (index.has(record.id)) {
      throw new Error(`Invalid Short Take inventory at ${inventoryPath}: Duplicate Short Take ids: ${record.id}`);
    }
    index.set(record.id, record);
  });
  return { inventoryPath, index };
}

function captionWithoutNestedAnchors(caption) {
  return caption
    .replace(/<a\b([^>]*)>/gi, (_match, attributes) => `<span${attributes.replace(/\s+href=(?:"[^"]*"|'[^']*')/gi, '')}>`)
    .replace(/<\/a>/gi, '</span>');
}

function flattenCaptionParagraphs(caption) {
  return caption
    .replace(/<\/?(?:p|div)\b[^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateSourceSection(section, sectionIndex) {
  const prefix = `Section ${sectionIndex + 1} (short-take)`;
  if (!isRecord(section)) throw new Error(`${prefix} must be an object`);
  assertOnlyKeys(section, new Set(['type', 'items']), prefix);
  if (!Array.isArray(section.items) || section.items.length !== 1) {
    throw new Error(`${prefix} must contain exactly one item`);
  }
  const sourceItem = section.items[0];
  if (!isRecord(sourceItem)) throw new Error(`${prefix} items[0] must be an object`);
  assertOnlyKeys(sourceItem, new Set(['shortTakeId']), `${prefix} items[0]`);
  const shortTakeId = nonEmptyString(sourceItem.shortTakeId);
  if (!shortTakeId) throw new Error(`${prefix} is missing required items[0].shortTakeId`);
  return shortTakeId;
}

/**
 * Hydrate compact `short-take` source sections from the canonical editorial inventory.
 * The inventory is read only when the newsletter contains at least one Short Take.
 */
export function hydrateShortTakeSections(newsletterData, repoRoot, { logger = console } = {}) {
  if (!Array.isArray(newsletterData?.sections)) return;
  const shortTakeCount = newsletterData.sections.filter((section) => section?.type === 'short-take').length;
  if (!shortTakeCount) return;

  const { inventoryPath, index } = loadInventory(repoRoot);
  logger.log(`🧩 Hydrating ${shortTakeCount} short-take section(s) from ${inventoryPath}`);

  newsletterData.sections.forEach((section, sectionIndex) => {
    if (section?.type !== 'short-take') return;
    const shortTakeId = validateSourceSection(section, sectionIndex);
    const record = index.get(shortTakeId);
    if (!record) {
      throw new Error(`Section ${sectionIndex + 1} (short-take) references unknown shortTakeId "${shortTakeId}" in ${inventoryPath}`);
    }

    const hydratedItem = {
      shortTakeId,
      headline: record.headline,
      caption: flattenCaptionParagraphs(record.url ? captionWithoutNestedAnchors(record.caption) : record.caption),
      image: record.image.url,
      imageAlt: record.image.altText,
    };
    if (record.url) {
      hydratedItem.link = {
        href: record.url.href,
        label: record.url.label || shortTakeId,
        category: record.url.category || TRACKING_CATEGORY,
      };
      if (record.url.interests) hydratedItem.link.interests = record.url.interests;
      if (record.url.intent) hydratedItem.link.intent = record.url.intent;
    }
    for (const field of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'maxWidth']) {
      if (record[field] !== undefined) hydratedItem[field] = record[field];
    }
    section.items = [hydratedItem];
  });
}
