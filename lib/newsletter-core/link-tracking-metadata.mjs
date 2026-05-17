import { JSDOM } from 'jsdom';

const TRACKABLE_LINK_KEYS = new Set([
  'abouturl',
  'applyurl',
  'archiveurl',
  'authorlink',
  'bookinglink',
  'bylinelink',
  'ctalink',
  'dispatchlink',
  'imagelink',
  'link',
  'locationpickerurl',
  'logolink',
  'newslettersubscribelink',
  'originalsourceurl',
  'readmorelink',
  'shareurl',
  'sourcelink',
  'sponsorlink',
  'unsubscribelink',
  'url',
  'viewonlinelink',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function isTrackableLinkKey(key) {
  return TRACKABLE_LINK_KEYS.has(String(key).toLowerCase());
}

function formatPath(path = []) {
  if (!path.length) return 'root';
  return path.reduce((acc, segment, index) => {
    if (typeof segment === 'number' || /^\d+$/.test(String(segment))) {
      return `${acc}[${segment}]`;
    }
    return index === 0 ? String(segment) : `${acc}.${segment}`;
  }, '');
}

function slugify(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function firstArrayString(value) {
  if (!Array.isArray(value)) return '';
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) return entry.trim();
  }
  return '';
}

function humanizeKey(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/url$/i, '')
    .replace(/link$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function inferLabel({ explicitLabel, fieldKey, parent, section, sectionIndex, path }) {
  if (explicitLabel) return explicitLabel;

  const lowerKey = String(fieldKey).toLowerCase();
  const fieldSpecificLabel =
    lowerKey === 'readmorelink'
      ? firstString(parent?.readMoreText, parent?.readMoreTxt, parent?.linkText)
      : lowerKey === 'dispatchlink'
        ? firstString(parent?.dispatchLabel)
        : lowerKey === 'ctalink'
          ? firstString(parent?.ctaText, parent?.ctaLabel, parent?.linkText)
          : lowerKey === 'applyurl'
            ? firstString(parent?.applyLabel)
            : lowerKey === 'locationpickerurl'
              ? firstString(parent?.locationPickerLabel)
              : '';

  const inferred = firstString(
    parent?.title,
    parent?.label,
    fieldSpecificLabel,
    section?.title,
  );
  if (inferred) return inferred;

  const sectionType = firstString(section?.type) || firstString(path[0]) || 'unknown';
  const displayIndex = Number.isInteger(sectionIndex) ? sectionIndex + 1 : 1;
  const locationLabel = section ? `${sectionType} section ${displayIndex}` : sectionType;
  return `${locationLabel} ${humanizeKey(String(path[path.length - 1] ?? fieldKey)) || fieldKey}`;
}

function inferCategory({ explicitCategory, parent, section, path }) {
  if (explicitCategory) return explicitCategory;
  const parentCategory = slugify(firstString(parent?.category));
  if (parentCategory) return parentCategory;
  const tagCategory = slugify(firstArrayString(parent?.tags));
  if (tagCategory) return tagCategory;
  return slugify(firstString(section?.type) || firstString(path[0])) || 'uncategorized';
}

function buildLineLookup(sourceText) {
  if (typeof sourceText !== 'string' || !sourceText) {
    return () => null;
  }

  const consumedByUrl = new Map();
  const lineStarts = [0];
  for (let index = 0; index < sourceText.length; index += 1) {
    if (sourceText[index] === '\n') lineStarts.push(index + 1);
  }

  function lineForIndex(index) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= index) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return high + 1;
  }

  const isBoundary = (char) => char === undefined || /[\s"'<>()[\]{},]/.test(char);

  return (url) => {
    if (!url) return null;
    const findExactIndex = (startAt) => {
      let index = sourceText.indexOf(url, startAt);
      while (index !== -1) {
        const nextChar = sourceText[index + url.length];
        if (isBoundary(nextChar)) return index;
        index = sourceText.indexOf(url, index + url.length);
      }
      return -1;
    };

    const startAt = consumedByUrl.get(url) ?? 0;
    let index = findExactIndex(startAt);
    if (index === -1 && startAt > 0) {
      index = findExactIndex(0);
    }
    if (index === -1) return null;
    consumedByUrl.set(url, index + url.length);
    return lineForIndex(index);
  };
}

function normalizeUrlKey(url) {
  return typeof url === 'string' ? url.trim() : '';
}

function getTrackedObjectUrl(value) {
  if (!isPlainObject(value)) return '';
  return firstString(value.href, value.url);
}

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildDefaultWarning(record) {
  const missing = [];
  if (record.defaultedLabel) missing.push('label');
  if (record.defaultedCategory) missing.push('category');
  const lineSuffix = record.line ? `:${record.line}` : '';
  return [
    `Tracking metadata defaulted: ${record.sourcePath ?? 'unknown'}${lineSuffix}`,
    `${record.pathLabel} missing ${missing.join(', ')};`,
    `using label=${quote(record.label)}, category=${quote(record.category)}`,
  ].join(' ');
}

function trackingMetadataSource(record) {
  if (record.explicitLabel && record.explicitCategory) return 'explicit';
  if (record.defaultedLabel && record.defaultedCategory) return 'defaulted';
  return 'partial';
}

function serializeTrackingRecord(record) {
  return {
    url: record.url,
    label: record.label,
    category: record.category,
    path: record.path,
    pathLabel: record.pathLabel,
    sourcePath: record.sourcePath,
    line: record.line,
    metadataSource: trackingMetadataSource(record),
    explicit: {
      label: record.explicitLabel,
      category: record.explicitCategory,
    },
    defaulted: {
      label: record.defaultedLabel,
      category: record.defaultedCategory,
    },
  };
}

function buildConflictWarning(existing, incoming) {
  return [
    `Tracking metadata conflict: ${incoming.url}`,
    `already uses label=${quote(existing.label)}, category=${quote(existing.category)};`,
    `ignored ${incoming.pathLabel} label=${quote(incoming.label)}, category=${quote(incoming.category)}`,
  ].join(' ');
}

function registerManifestRecord(manifest, conflicts, record) {
  const key = normalizeUrlKey(record.url);
  if (!key) return;
  const existing = manifest.get(key);
  if (!existing) {
    manifest.set(key, record);
    return;
  }

  const explicitIncoming = record.explicitLabel || record.explicitCategory;
  const differs =
    existing.label !== record.label ||
    existing.category !== record.category;
  if (explicitIncoming && differs) {
    conflicts.push(buildConflictWarning(existing, record));
  }
}

function normalizeLinkValue(value, context) {
  const { fieldKey, parent, section, sectionIndex, path, sourcePath, lineForUrl } = context;
  let url = '';
  let explicitLabel = '';
  let explicitCategory = '';
  let normalizedValue = value;

  if (typeof value === 'string') {
    url = value.trim();
  } else if (isPlainObject(value)) {
    url = getTrackedObjectUrl(value);
    explicitLabel = firstString(value.label);
    explicitCategory = firstString(value.category);
    if (!url && (explicitLabel || explicitCategory)) {
      throw new Error(`${formatPath(path)} must include href when label or category is provided`);
    }
    if (url) normalizedValue = url;
  }

  if (!isHttpUrl(url)) {
    return { normalizedValue, record: null };
  }

  const label = inferLabel({ explicitLabel, fieldKey, parent, section, sectionIndex, path });
  const category = inferCategory({ explicitCategory, parent, section, path });
  const record = {
    url,
    label,
    category,
    path,
    pathLabel: formatPath(path),
    sourcePath,
    line: lineForUrl(url),
    explicitLabel: Boolean(explicitLabel),
    explicitCategory: Boolean(explicitCategory),
    defaultedLabel: !explicitLabel,
    defaultedCategory: !explicitCategory,
  };

  return { normalizedValue, record };
}

function traverse(value, context) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      traverse(item, { ...context, path: [...context.path, index] });
    });
    return;
  }

  if (!isPlainObject(value)) return;

  const section =
    context.path.length === 2 &&
    context.path[0] === 'sections' &&
    Number.isInteger(context.path[1])
      ? value
      : context.section;
  const sectionIndex =
    context.path.length === 2 &&
    context.path[0] === 'sections' &&
    Number.isInteger(context.path[1])
      ? context.path[1]
      : context.sectionIndex;

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...context.path, key];
    if (isTrackableLinkKey(key)) {
      const { normalizedValue, record } = normalizeLinkValue(child, {
        ...context,
        fieldKey: key,
        parent: value,
        section,
        sectionIndex,
        path: childPath,
      });
      if (normalizedValue !== child) {
        value[key] = normalizedValue;
      }
      if (record) {
        context.records.push(record);
      }
    }

    const nextChild = value[key];
    if (Array.isArray(nextChild) || isPlainObject(nextChild)) {
      traverse(nextChild, {
        ...context,
        path: childPath,
        section,
        sectionIndex,
      });
    }
  }
}

/**
 * Normalize object-valued tracked links into template-safe URL strings and
 * collect effective tracking metadata for rendered anchor enrichment.
 *
 * @param {object} newsletterData
 * @param {{ sourcePath?: string, sourceText?: string }} options
 */
export function normalizeNewsletterLinkTracking(newsletterData, {
  sourcePath,
  sourceText,
} = {}) {
  const records = [];
  const lineForUrl = buildLineLookup(sourceText);

  traverse(newsletterData, {
    path: [],
    section: null,
    sectionIndex: null,
    sourcePath,
    lineForUrl,
    records,
  });

  const manifest = new Map();
  const conflictWarnings = [];
  records.forEach((record) => registerManifestRecord(manifest, conflictWarnings, record));

  return {
    manifest,
    records,
    defaultWarnings: records.filter((record) => record.defaultedLabel || record.defaultedCategory),
    conflictWarnings,
  };
}

/**
 * Apply collected tracking metadata to anchors in rendered newsletter HTML.
 *
 * @param {string} html
 * @param {Map<string, { label: string, category: string }>} manifest
 */
export function enrichHtmlWithLinkTrackingMetadata(html, manifest) {
  if (typeof html !== 'string' || !html || !manifest || manifest.size === 0) {
    return html;
  }

  const dom = new JSDOM(html);
  const { document } = dom.window;
  for (const anchor of document.querySelectorAll('a[href]')) {
    const metadata = manifest.get(normalizeUrlKey(anchor.getAttribute('href')));
    if (!metadata) continue;
    if (!anchor.hasAttribute('data-link-label')) {
      anchor.setAttribute('data-link-label', metadata.label);
    }
    if (!anchor.hasAttribute('data-link-category')) {
      anchor.setAttribute('data-link-category', metadata.category);
    }
  }
  return dom.serialize();
}

/**
 * Build a serializable link-tracking metadata manifest for a newsletter build.
 *
 * @param {{ records?: object[], defaultWarnings?: object[] | string[], conflictWarnings?: string[] }} linkTracking
 * @param {{ generatedAt?: string, sourcePath?: string, outputHtmlPath?: string, templateName?: string, outputName?: string }} options
 */
export function buildLinkTrackingMetadataManifest(linkTracking = {}, {
  generatedAt = new Date().toISOString(),
  sourcePath,
  outputHtmlPath,
  templateName,
  outputName,
} = {}) {
  const records = Array.isArray(linkTracking.records) ? linkTracking.records : [];
  const links = records.map((record) => serializeTrackingRecord(record));
  const defaultWarnings = Array.isArray(linkTracking.defaultWarnings)
    ? linkTracking.defaultWarnings.map((warning) =>
        typeof warning === 'string' ? warning : buildDefaultWarning(warning),
      )
    : [];
  const conflictWarnings = Array.isArray(linkTracking.conflictWarnings)
    ? linkTracking.conflictWarnings.map((warning) => String(warning))
    : [];

  return {
    version: 1,
    generatedAt,
    template: templateName,
    outputName,
    sourcePath,
    outputHtmlPath,
    totals: {
      links: links.length,
      explicit: links.filter((link) => link.metadataSource === 'explicit').length,
      partial: links.filter((link) => link.metadataSource === 'partial').length,
      defaulted: links.filter((link) => link.metadataSource === 'defaulted').length,
      conflicts: conflictWarnings.length,
    },
    links,
    warnings: {
      defaulted: defaultWarnings,
      conflicts: conflictWarnings,
    },
  };
}

/**
 * Print link tracking metadata notices using the requested yellow-green color
 * when terminal color is enabled.
 *
 * @param {{ defaultWarnings?: string[] | object[], conflictWarnings?: string[] }} input
 * @param {{ logger?: Pick<Console, 'log'>, useColor?: boolean }} options
 */
export function reportLinkTrackingMetadataNotices({
  defaultWarnings = [],
  conflictWarnings = [],
} = {}, {
  logger = console,
  useColor = process.env.NO_COLOR === undefined,
} = {}) {
  const colorStart = useColor ? '\x1b[38;2;236;243;13m' : '';
  const colorEnd = useColor ? '\x1b[0m' : '';
  const lines = [
    ...defaultWarnings.map((warning) =>
      typeof warning === 'string' ? warning : buildDefaultWarning(warning),
    ),
    ...conflictWarnings,
  ];
  if (lines.length === 0) return;

  logger.log(`${colorStart}⚠️  Link tracking metadata notices: ${lines.length}${colorEnd}`);
  lines.forEach((line) => logger.log(`${colorStart}   ${line}${colorEnd}`));
}
