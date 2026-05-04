#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import MaizzleFramework from '@maizzle/framework';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

import {
  buildAdjacencyMailSectionStyleOverrides,
  buildAdjacencyMailThemeTokens,
} from '../lib/adjacency-mail/adjacency-mail-theme-tokens.mjs';
import { buildAdjacencyJobsMailSectionStyleOverrides } from '../lib/adjacency-mail/adjacency-jobs-mail-theme-tokens.mjs';
import {
  prepareNewsletterData as prepareNormalizedNewsletterData,
  resolveCommerceAdBlockSnapshots,
} from '../lib/newsletter-core/index.mjs';
import { hardenEmailHtmlForMobile } from '../lib/newsletter-core/email-html-hardening.mjs';

// Get script's directory for repo root detection
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { build: maizzleBuild } = MaizzleFramework;

/**
 * Determine the repository root directory.
 * Priority: 1) --repo-root arg, 2) NFL_MAIZZLE_MAIL_ROOT env, 3) script location
 */
function getRepoRoot(args) {
  // Check for --repo-root argument
  const repoRootArg = args.find(arg => arg.startsWith('--repo-root='));
  if (repoRootArg) {
    const argPath = repoRootArg.split('=')[1];
    if (argPath && fs.existsSync(argPath)) {
      return path.resolve(argPath);
    }
  }
  
  // Check for NFL_MAIZZLE_MAIL_ROOT environment variable
  const envRoot = process.env.NFL_MAIZZLE_MAIL_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return path.resolve(envRoot);
  }
  
  // Default: derive from script location (scripts/ is one level below repo root)
  return path.resolve(__dirname, '..');
}

/**
 * Helper to construct absolute paths within the repo
 */
function repoPath(repoRoot, ...segments) {
  return path.join(repoRoot, ...segments);
}

function resolveBuiltNewsletterPath(baseDir, templateName) {
  const directNewsletterPath = path.join(baseDir, 'newsletter.html');
  const templateNewsletterPath = path.join(baseDir, templateName, 'newsletter.html');

  if (fs.existsSync(directNewsletterPath)) return directNewsletterPath;
  if (fs.existsSync(templateNewsletterPath)) return templateNewsletterPath;
  return null;
}

async function buildPopupJobsMailTemplate({ repoRoot, newsletterData, templateName, buildDirName }) {
  const buildDir = repoPath(repoRoot, buildDirName);
  fs.rmSync(buildDir, { recursive: true, force: true });

  await maizzleBuild('production', {
    build: {
      command: 'build',
      templates: {
        source: `templates/${templateName}`,
        destination: {
          path: buildDirName,
        },
      },
      components: {
        source: `templates/${templateName}/components`,
      },
    },
    inlineCSS: false,
    removeUnusedCSS: {
      enabled: true,
      whitelist: ['.mob-text'],
    },
    prettify: true,
    minify: {
      removeUnusedCSS: false,
    },
    locals: newsletterData,
  });

  return buildDir;
}

function getAdjacencyMailThemeOverridesPath(args) {
  const arg = args.find((value) => value.startsWith('--adjacency-mail-theme-overrides='));
  if (!arg) return null;
  const rawPath = arg.split('=')[1];
  if (!rawPath) return null;
  return path.resolve(rawPath);
}

function loadAdjacencyMailThemeOverrides(args) {
  const overridesPath = getAdjacencyMailThemeOverridesPath(args);
  if (!overridesPath) {
    return { overridesPath: null, overrides: undefined };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load Adjacency mail theme overrides from ${overridesPath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Adjacency mail theme overrides must be a JSON object: ${overridesPath}`);
  }

  return { overridesPath, overrides: parsed };
}

function extractLeadingFrontmatterBlock(text) {
  if (typeof text !== 'string' || !text.startsWith('---')) {
    return null;
  }

  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/);
  return match ? match[0] : null;
}

function mergeFrontmatterWithHtml(existingOutputRaw, builtHtmlRaw) {
  const existingFrontmatter = extractLeadingFrontmatterBlock(existingOutputRaw);
  if (!existingFrontmatter) {
    return {
      content: builtHtmlRaw,
      preservedFrontmatter: false,
    };
  }

  return {
    content: `${existingFrontmatter}${String(builtHtmlRaw).replace(/^\s+/, '')}`,
    preservedFrontmatter: true,
  };
}

function normalizeInlineStyleAttributeWhitespace(html) {
  if (typeof html !== 'string' || html.length === 0) return html;

  return html.replace(/style=(["'])([\s\S]*?)\1/gi, (_match, quote, styleValue) => {
    const normalized = String(styleValue)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return `style=${quote}${normalized}${quote}`;
  });
}

function reportMobileFitWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) return;

  console.log(`⚠️  Mobile fit warnings: ${warnings.length}`);
  warnings.slice(0, 10).forEach((warning) => {
    console.log(
      `   - ${warning.type} (${warning.length} chars) in "${warning.context}": ${warning.token}`,
    );
  });
  if (warnings.length > 10) {
    console.log(`   … ${warnings.length - 10} more warning(s) omitted`);
  }
}

function jsonPointerToDotPath(pointer) {
  if (!pointer || pointer === '/') return '$';
  const parts = pointer
    .split('/')
    .slice(1)
    .map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map(p => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`));
  return '$' + parts.join('');
}

function describeSchemaLocation(instancePath, newsletterData) {
  const match = /^\/sections\/(\d+)(?:\/items\/(\d+))?/.exec(instancePath || '');
  if (!match) return null;

  const sectionIndex = Number(match[1]);
  const itemIndex = match[2] !== undefined ? Number(match[2]) : null;

  const section = Array.isArray(newsletterData?.sections) ? newsletterData.sections[sectionIndex] : null;
  const sectionType = section?.type ? String(section.type) : 'unknown-type';
  const sectionTitle = section?.title ? String(section.title) : null;

  const sectionLabel = sectionTitle
    ? `sections[${sectionIndex}] (${sectionType} / "${sectionTitle}")`
    : `sections[${sectionIndex}] (${sectionType})`;

  if (itemIndex === null) return sectionLabel;

  const item = Array.isArray(section?.items) ? section.items[itemIndex] : null;
  const itemTitle = item?.title ? String(item.title) : null;
  const itemLabel = itemTitle
    ? `${sectionLabel} → items[${itemIndex}] ("${itemTitle}")`
    : `${sectionLabel} → items[${itemIndex}]`;

  return itemLabel;
}

function validateNewsletterDataAgainstSchema(newsletterData, templateName, args) {
  const strict = args.includes('--strict-schema') || process.env.SCHEMA_STRICT === '1';
  const schemaCandidates = [
    templateName ? path.resolve(`templates/${templateName}/newsletter.schema.json`) : null,
    path.resolve('newsletter.schema.json'),
  ].filter(Boolean);

  const schemaPath = schemaCandidates.find(p => fs.existsSync(p));
  if (!schemaPath) return;

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read schema at ${schemaPath}: ${err.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(newsletterData);
  if (valid) {
    console.log(`✅ Schema validation passed (${path.relative(process.cwd(), schemaPath)})`);
    return;
  }

  const errors = validate.errors || [];
  console.log(`\n⚠️  Schema validation found ${errors.length} issue(s) (${path.relative(process.cwd(), schemaPath)})`);

  errors
    .filter(err => err.keyword !== 'if') // if/then wrappers are noisy; show the underlying errors instead
    .slice(0, 50)
    .forEach(err => {
    const context = describeSchemaLocation(err.instancePath, newsletterData);
    const contextPrefix = context ? `${context}: ` : '';
    if (err.keyword === 'additionalProperties') {
      const base = jsonPointerToDotPath(err.instancePath);
      const extra = err.params?.additionalProperty ? `.${err.params.additionalProperty}` : '';
      console.log(`   • ${contextPrefix}Unknown key: ${base}${extra}`);
      return;
    }
    console.log(`   • ${contextPrefix}${jsonPointerToDotPath(err.instancePath)}: ${err.message}`);
    });

  if (errors.length > 50) {
    console.log(`   • …and ${errors.length - 50} more`);
  }

  if (strict) {
    throw new Error('Schema validation failed (strict mode)');
  }
}

function normalizeFontFamilyValue(value) {
  if (typeof value !== 'string') return value;

  let normalized = value
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return normalized;

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^['"]+|['"]+$/g, '').trim())
    .filter(Boolean);

  const lowerParts = parts.map((part) => part.toLowerCase());
  const appendIfMissing = (fallbackParts) => {
    fallbackParts.forEach((fallbackPart) => {
      if (!lowerParts.includes(fallbackPart.toLowerCase())) {
        parts.push(fallbackPart);
        lowerParts.push(fallbackPart.toLowerCase());
      }
    });
  };

  const removeIfPresent = (family) => {
    const familyLower = family.toLowerCase();
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (lowerParts[i] === familyLower) {
        parts.splice(i, 1);
        lowerParts.splice(i, 1);
      }
    }
  };

  if (lowerParts.includes('ibm plex sans')) {
    appendIfMissing(['Roboto', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif']);
  }

  if (lowerParts.includes('ubuntu')) {
    appendIfMissing(['Segoe UI', 'Helvetica', 'Arial', 'sans-serif']);
  }

  if (lowerParts.includes('roboto')) {
    appendIfMissing(['Segoe UI', 'Helvetica', 'Arial', 'sans-serif']);
  }

  if (lowerParts.includes('share tech mono')) {
    appendIfMissing(['Courier New', 'Courier', 'monospace']);
  }

  if (lowerParts.includes('workbench')) {
    appendIfMissing(['IBM Plex Sans', 'Roboto', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif']);
  }

  const hasKnownSans = ['ibm plex sans', 'ubuntu', 'roboto', 'workbench'].some((family) =>
    lowerParts.includes(family)
  );

  const hasKnownMono = lowerParts.includes('share tech mono');

  if (hasKnownSans) {
    removeIfPresent('serif');
    removeIfPresent('monospace');
    appendIfMissing(['sans-serif']);
  }

  if (hasKnownMono) {
    removeIfPresent('serif');
    appendIfMissing(['monospace']);
  }

  return parts.join(', ');
}

function normalizeFontFamiliesDeep(value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeFontFamiliesDeep(item));
    return;
  }

  if (typeof value !== 'object') return;

  Object.entries(value).forEach(([key, entry]) => {
    if (key === 'fontFamily' && typeof entry === 'string') {
      value[key] = normalizeFontFamilyValue(entry);
      return;
    }

    if (entry && (typeof entry === 'object' || Array.isArray(entry))) {
      normalizeFontFamiliesDeep(entry);
    }
  });
}

function pruneBuildInjectedFields(newsletterData) {
  if (!newsletterData || typeof newsletterData !== 'object') return;

  delete newsletterData.mobileTextFontSize;
  delete newsletterData.mobileTextLineHeight;
  delete newsletterData.mobileCaptionFontSize;
  delete newsletterData.mobileCaptionLineHeight;

  if (newsletterData.header && typeof newsletterData.header === 'object') {
    delete newsletterData.header.contentStyles;

    if (newsletterData.header.containerStyles && typeof newsletterData.header.containerStyles === 'object') {
      delete newsletterData.header.containerStyles.padding;
      if (Object.keys(newsletterData.header.containerStyles).length === 0) {
        delete newsletterData.header.containerStyles;
      }
    }
  }

  if (Array.isArray(newsletterData.sections)) {
    newsletterData.sections.forEach((section) => {
      if (!section || typeof section !== 'object') return;
      delete section._contentStyleOverrides;
      delete section.descriptionStyles;
      delete section.spacerBackgroundColor;
      delete section.headingStyles;
      delete section.linkStyles;
      delete section.labelStyles;
      delete section.headingStylesInline;
      delete section.linkStylesInline;
      delete section.labelStylesInline;
    });
  }
}

function decodeEscapedUnicodeString(value) {
  if (typeof value !== 'string' || !/\\u[0-9a-fA-F]{4}|\\U[0-9a-fA-F]{8}/.test(value)) {
    return value;
  }

  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return `\\U${hex}`;
      }
    });
}

function normalizeEscapedUnicodeDeep(value) {
  if (Array.isArray(value)) {
    let changes = 0;
    value.forEach((entry, index) => {
      if (typeof entry === 'string') {
        const normalized = decodeEscapedUnicodeString(entry);
        if (normalized !== entry) {
          value[index] = normalized;
          changes += 1;
        }
        return;
      }

      if (entry && typeof entry === 'object') {
        changes += normalizeEscapedUnicodeDeep(entry);
      }
    });
    return changes;
  }

  if (!value || typeof value !== 'object') {
    return 0;
  }

  let changes = 0;
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === 'string') {
      const normalized = decodeEscapedUnicodeString(entry);
      if (normalized !== entry) {
        value[key] = normalized;
        changes += 1;
      }
      return;
    }

    if (entry && typeof entry === 'object') {
      changes += normalizeEscapedUnicodeDeep(entry);
    }
  });
  return changes;
}

function normalizeNewsletterForSchemaValidation(newsletterData) {
  // Normalize typography values before style preprocessing/rendering so
  // template interpolation doesn't emit escaped quote entities in inline CSS.
  const unicodeFixes = normalizeEscapedUnicodeDeep(newsletterData);
  if (unicodeFixes > 0) {
    console.log(`🔡 Decoded ${unicodeFixes} escaped Unicode string${unicodeFixes === 1 ? '' : 's'} in newsletter data`);
  }
  normalizeFontFamiliesDeep(newsletterData);
  if (!newsletterData || typeof newsletterData !== 'object') return;
  if (!Array.isArray(newsletterData.sections)) return;

  newsletterData.sections.forEach(section => {
    if (!section || typeof section !== 'object') return;

    // Some content sources use a convenience `backgroundColor` at the section level.
    // The templates read `section.containerStyles.backgroundColor`, so normalize and
    // remove the convenience key to keep schema validation (and rendering) aligned.
    if (typeof section.backgroundColor === 'string' && section.backgroundColor.trim().length) {
      section.containerStyles = (section.containerStyles && typeof section.containerStyles === 'object' && !Array.isArray(section.containerStyles))
        ? section.containerStyles
        : {};
      if (section.containerStyles.backgroundColor == null) {
        section.containerStyles.backgroundColor = section.backgroundColor.trim();
      }
      delete section.backgroundColor;
    }

    // Normalize classifieds content fields for validation:
    // - Schema for classifieds is keyed off what the template reads (`item.content`).
    // - Content sources may provide `description` instead; accept it by copying.
    // - Drop the extra field during validation to avoid per-type "unknown key" noise;
    //   the later build normalization will re-hydrate both directions as needed.
    if (section.type === 'classifieds' && Array.isArray(section.items)) {
      section.items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!item.content && typeof item.description === 'string') item.content = item.description;
        if (item.content && typeof item.description === 'string') delete item.description;
      });
    }
  });
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

function buildEditorialAdsIndex(repoRoot) {
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
    console.log(`⚠️  Duplicate ad id "${id}" in editorial inventory at position ${idx + 1}; using first occurrence`);
  });

  return { adsPath, index };
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

function isCommerceOverlayLockup(ad) {
  return ad?.commerce?.presentation === 'overlay-lockup';
}

function buildCommerceOverlayLockupPayload(ad) {
  const commerce = ad?.commerce && typeof ad.commerce === 'object' ? ad.commerce : {};
  const lockup = commerce.lockup && typeof commerce.lockup === 'object' ? commerce.lockup : {};
  const pricePosition = typeof lockup.pricePosition === 'string' ? lockup.pricePosition.trim() : 'bottom-left';
  const rightPositionsByPrice = {
    'top-left': 'top-right',
    'top-right': 'top-right',
    'bottom-left': 'bottom-right',
    'bottom-right': 'bottom-right',
  };
  const requestedIconPosition = typeof lockup.iconPosition === 'string' ? lockup.iconPosition.trim() : '';
  const iconPosition =
    requestedIconPosition === 'top-right' || requestedIconPosition === 'bottom-right'
      ? requestedIconPosition
      : rightPositionsByPrice[pricePosition] ?? 'bottom-right';
  const positionStyles = {
    'top-left': 'left: 5.4%;top: 5.4%;',
    'top-right': 'right: 5.4%;top: 5.4%;',
    'bottom-left': 'left: 5.4%;bottom: 5.4%;',
    'bottom-right': 'right: 5.4%;bottom: 5.4%;',
  };
  return {
    priceText: typeof commerce.priceText === 'string' ? commerce.priceText.trim() : '',
    icon: {
      src: typeof commerce.icon?.src === 'string' ? commerce.icon.src.trim() : '',
      altText: typeof commerce.icon?.altText === 'string' ? commerce.icon.altText.trim() : '',
    },
    lockup: {
      aspectRatio: typeof lockup.aspectRatio === 'string' ? lockup.aspectRatio.trim() : '1x1',
      snapshotSrc: typeof lockup.snapshotSrc === 'string' ? lockup.snapshotSrc.trim() : '',
      snapshotAltText: typeof lockup.snapshotAltText === 'string' ? lockup.snapshotAltText.trim() : '',
      pricePosition,
      iconPosition,
      pricePositionStyle: positionStyles[pricePosition] ?? positionStyles['bottom-left'],
      iconPositionStyle: positionStyles[iconPosition] ?? positionStyles['top-right'],
      textColor: typeof lockup.textColor === 'string' ? lockup.textColor.trim() : '#ff3048',
    },
  };
}

function hydrateAdBlockSections(newsletterData, repoRoot) {
  if (!newsletterData || !Array.isArray(newsletterData.sections)) return;

  const adBlockSections = newsletterData.sections.filter((section) => section?.type === 'ad-block');
  if (adBlockSections.length === 0) return;

  const { adsPath, index } = buildEditorialAdsIndex(repoRoot);
  console.log(`🧩 Hydrating ${adBlockSections.length} ad-block section(s) from ${adsPath}`);

  newsletterData.sections.forEach((section, sectionIndex) => {
    if (!section || section.type !== 'ad-block') return;

    // Ignore accidental empty YAML list stubs (e.g. trailing "-" with no fields).
    if (Array.isArray(section.items)) {
      section.items = section.items.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        return Object.keys(item).length > 0;
      });
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

    const markdownLinkUrl = typeof sourceItem?.link === 'string' && sourceItem.link.trim()
      ? sourceItem.link.trim()
      : '';
    const markdownReadMoreLink = typeof sourceItem?.readMoreLink === 'string' && sourceItem.readMoreLink.trim()
      ? sourceItem.readMoreLink.trim()
      : '';
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
    const inventoryLinkUrl = typeof ad.link?.url === 'string' ? ad.link.url.trim() : '';
    const resolvedLinkUrl = markdownLinkUrl || inventoryLinkUrl;
    const resolvedReadMoreLink = markdownReadMoreLink || markdownLinkUrl || inventoryLinkUrl;
    const inventoryLinkLabel = typeof ad.link?.label === 'string' && ad.link.label.trim()
      ? ad.link.label.trim()
      : 'Learn more';
    const resolvedLinkLabel = markdownReadMoreText || inventoryLinkLabel;
    const markdownLabel = typeof sourceItem?.label === 'string' && sourceItem.label.trim()
      ? sourceItem.label.trim()
      : '';
    const resolvedLabel = markdownLabel
      ? markdownLabel
      : typeof ad.label === 'string' && ad.label.trim()
        ? ad.label.trim()
        : '';

    const isOverlayLockup = isCommerceOverlayLockup(ad);
    const commerceOverlay = isOverlayLockup ? buildCommerceOverlayLockupPayload(ad) : null;
    const overlaySnapshotSrc = commerceOverlay?.lockup.snapshotSrc || '';
    const overlaySnapshotAltText = commerceOverlay?.lockup.snapshotAltText || '';

    if (isOverlayLockup && !overlaySnapshotSrc) {
      console.log(`⚠️  Ad "${adId}" is a commerce overlay lockup without commerce.lockup.snapshotSrc; using layered email fallback`);
    }

    const hydratedItem = {
      adId,
      label: resolvedLabel,
      sponsor: typeof ad.sponsor === 'string' ? ad.sponsor.trim() : '',
      title: typeof ad.title === 'string' ? ad.title.trim() : '',
      description: isOverlayLockup ? '' : normalizeAdCopyHtml(resolvedCopy),
      image: overlaySnapshotSrc || (typeof ad.media?.src === 'string' ? ad.media.src.trim() : ''),
      imageAlt: overlaySnapshotAltText || (typeof ad.media?.altText === 'string' ? ad.media.altText.trim() : ''),
    };

    if (isOverlayLockup) {
      hydratedItem.renderMode = overlaySnapshotSrc ? 'snapshot' : 'commerce-overlay-lockup';
      hydratedItem.commerce = commerceOverlay;
    }

    if (resolvedLinkUrl) {
      hydratedItem.link = resolvedLinkUrl;
    }

    if (resolvedReadMoreLink) {
      hydratedItem.readMoreLink = resolvedReadMoreLink;
    }

    if (resolvedLinkLabel && resolvedReadMoreLink) {
      hydratedItem.readMoreText = resolvedLinkLabel;
    }

    section.items = [hydratedItem];
  });
}

function checkHttpUrl(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve({ valid: false, error: 'URL missing' });
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      resolve({ valid: false, error: 'URL empty' });
      return;
    }

    const lowercase = trimmed.toLowerCase();
    if (!lowercase.startsWith('https:') && !lowercase.startsWith('http:')) {
      resolve({ valid: false, error: 'Unsupported protocol' });
      return;
    }

    const client = lowercase.startsWith('https:') ? https : http;
    const req = client.request(trimmed, { method: 'HEAD', timeout: 5000 }, (res) => {
      const isValid = res.statusCode >= 200 && res.statusCode < 400;
      resolve({ valid: isValid, status: res.statusCode });
    });

    req.on('error', (error) => {
      resolve({ valid: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, error: 'Request timeout' });
    });

  req.end();
});
}

function resolveImageEntryUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof entry === 'object') {
    if (typeof entry.src === 'string' && entry.src.trim().length) {
      return entry.src.trim();
    }
    if (typeof entry.image === 'string' && entry.image.trim().length) {
      return entry.image.trim();
    }
  }
  return null;
}

/**
 * Check if an image URL exists and is accessible
 */
function checkImageUrl(url) {
  return checkHttpUrl(url);
}

/**
 * Convert hex color to ANSI RGB background color
 */
function hexToAnsiBackground(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Return ANSI RGB background color code
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * Generate dynamic CSS classes for section styles
 */
function generateSectionStylesCSS(sectionStyles, theme) {
  if (!sectionStyles || !sectionStyles.sectionStyles) return '';
  
  let cssOutput = '\n    /* Dynamic section styles generated from configuration */\n';
  
  Object.entries(sectionStyles.sectionStyles).forEach(([sectionType, config]) => {
    const className = `${sectionType}-section`;
    
    // Generate container styles
    cssOutput += `    .${className} {\n`;
    if (config.containerStyles) {
      Object.entries(config.containerStyles).forEach(([property, value]) => {
        if (value !== null) {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value};\n`;
        }
      });
    }
    cssOutput += `    }\n\n`;
    
    // Generate content styles (applies to all child elements)
    cssOutput += `    .${className}, .${className} * {\n`;
    if (config.contentStyles) {
      Object.entries(config.contentStyles).forEach(([property, value]) => {
        if (value !== null && value !== 'inherit') {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value} !important;\n`;
        }
      });
    }
    cssOutput += `    }\n\n`;
    
    // Generate link-specific styles
    if (config.linkStyles) {
      cssOutput += `    .${className} a, .${className} a * {\n`;
      Object.entries(config.linkStyles).forEach(([property, value]) => {
        if (value !== null) {
          if (value === 'inherit') {
            // For inherit values, use the theme color if available
            if (property === 'color' && theme && theme.linkAccent) {
              cssOutput += `      color: ${theme.linkAccent} !important;\n`;
            }
          } else {
            const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            cssOutput += `      ${cssProp}: ${value} !important;\n`;
          }
        }
      });
      cssOutput += `    }\n\n`;
    }
    
    // Generate heading-specific styles
    if (config.headingStyles) {
      cssOutput += `    .${className} h1, .${className} h2, .${className} h3, .${className} h4, .${className} h5, .${className} h6 {\n`;
      Object.entries(config.headingStyles).forEach(([property, value]) => {
        if (value !== null && value !== 'inherit') {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value} !important;\n`;
        }
      });
      cssOutput += `    }\n\n`;
    }
  });
  
  return cssOutput;
}

// Convert hex to RGB and RGB to HSL for lightweight color adjustments.
const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const cleaned = hex.replace('#', '').trim();
  if (![3, 6].includes(cleaned.length)) return null;
  const normalized = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const int = parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHex = ({ r, g, b }) => {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h /= 6;
  }
  return { h, s, l };
};

const hslToRgb = ({ h, s, l }) => {
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
};

const adjustHexColor = (hex, { lightness = 0, saturation = 0 } = {}) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const adjusted = {
    h: hsl.h,
    s: clamp(hsl.s + saturation / 100),
    l: clamp(hsl.l + lightness / 100),
  };
  return rgbToHex(hslToRgb(adjusted));
};

/**
 * Display color theme in ASCII format with actual colors
 */
function displayColorTheme(newsletterData) {
  const colorThemeName = newsletterData.colorTheme || 'current';
  
  // Load color themes
  let colorThemes = {};
  try {
    const themesData = fs.readFileSync(repoPath(REPO_ROOT, 'data/color-themes.json'), 'utf8');
    colorThemes = JSON.parse(themesData);
  } catch (error) {
    console.log('⚠️  No color themes found, using defaults');
    return;
  }

  const theme = colorThemes.themes[colorThemeName];
  if (!theme) {
    console.log(`⚠️  Theme "${colorThemeName}" not found, using defaults`);
    return;
  }

  console.log(`🎨 Color Theme: "${theme.name}" (${colorThemeName})`);
  console.log(`📝 ${theme.description}`);
  console.log('');
  console.log('🎨 Section Colors:');
  
  // Create ASCII color swatches with actual colors
  const colors = theme.colors;
  const sectionNames = Object.keys(colors);
  const reset = '\x1b[0m'; // Reset color
  
  sectionNames.forEach(sectionName => {
    const color = colors[sectionName];
    const displayName = sectionName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Create colored ASCII block
    const bgColor = hexToAnsiBackground(color);
    const colorBlock = `${bgColor}        ${reset}`; // 8 spaces with background color
    
    console.log(`  ${colorBlock} ${displayName.padEnd(20)} ${color}`);
  });
  
  if (theme.linkAccent) {
    const bgColor = hexToAnsiBackground(theme.linkAccent);
    const colorBlock = `${bgColor}        ${reset}`;
    console.log(`  ${colorBlock} ${'Link Accent'.padEnd(20)} ${theme.linkAccent}`);
  }
  
  console.log('');
}

function logSectionBackgroundOverrides(sections = [], theme) {
  if (!Array.isArray(sections)) return;

  const overrides = sections.map(section => {
    const color = section?.containerStyles?.backgroundColor;
    if (!color) return null;
    return {
      type: section.type || 'unknown',
      title: section.title,
      color,
      fallbackColor: theme?.colors?.[section.type]
    };
  }).filter(Boolean);

  if (overrides.length === 0) return;

  console.log('');
  console.log('🟣 Section background overrides detected:');
  const reset = '\x1b[0m';

  overrides.forEach(({ type, title, color, fallbackColor }) => {
    const normalizedType = type.replace(/-/g, ' ');
    const labelParts = [normalizedType];
    if (title) {
      labelParts.push(`"${title}"`);
    }
    const fallbackNote =
      fallbackColor && fallbackColor.toLowerCase() !== color.toLowerCase()
        ? ` (theme default ${fallbackColor})`
        : '';
    const bgColor = hexToAnsiBackground(color);
    const colorBlock = `${bgColor}        ${reset}`;
    console.log(`  ${colorBlock} ${labelParts.join(' / ')}: ${color}${fallbackNote}`);
  });
}

/**
 * Catalog all sections in the newsletter data for debugging
 */
function catalogSections(newsletterData) {
  console.log('📋 Section Catalog:');
  console.log('═══════════════════');

  const sectionList = Array.isArray(newsletterData.sections)
    ? newsletterData.sections
    : Array.isArray(newsletterData.jobPopupMail?.sections)
      ? newsletterData.jobPopupMail.sections
      : null;

  if (!sectionList) {
    console.log('❌ No sections found in newsletter data');
    return;
  }

  console.log(`📊 Total sections: ${sectionList.length}`);
  console.log('');

  sectionList.forEach((section, index) => {
    const type = section.type || section.kind || 'undefined';
    const title = section.title || 'No title';
    const itemCount = Array.isArray(section.items)
      ? section.items.length
      : (Array.isArray(section.itemsHtml) ? section.itemsHtml.length : 0);
    
    console.log(`${index + 1}. Type: "${type}" | Title: "${title}" | Items: ${itemCount}`);
    
    // Show item details for gif and animated-image sections specifically
    if ((type === 'gif' || type === 'animated-image') && section.items) {
      section.items.forEach((item, itemIndex) => {
        console.log(`   Item ${itemIndex + 1}:`);
        console.log(`     - image: ${item.image || 'none'}`);
        console.log(`     - gif: ${item.gif || 'none'}`);
        console.log(`     - description: ${item.description ? 'present' : 'none'}`);
      });
    }
  });
  
  console.log('');
}

const LINK_FIELD_CANDIDATES = new Set([
  'link',
  'readmorelink',
  'imagelink',
  'logolink',
  'sponsorlink',
  'bylinelink',
  'authorlink',
  'viewonlinelink',
  'newslettersubscribelink',
  'unsubscribelink',
  'url'
]);

function isHttpLink(value) {
  return /^https?:/i.test(value);
}

function isPlaceholderLink(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === '#' ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized === 'javascript:void(0)' ||
    normalized === 'javascript:;'
  );
}

function formatLinkPath(path = []) {
  if (!path.length) return 'root';
  return path.reduce((acc, segment, index) => {
    if (typeof segment === 'number' || /^\d+$/.test(segment)) {
      return `${acc}[${segment}]`;
    }
    return index === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

function collectLinkCandidates(value, path = []) {
  const entries = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(...collectLinkCandidates(item, [...path, index]));
    });
    return entries;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const nextPath = [...path, key];
      if (typeof child === 'string' && LINK_FIELD_CANDIDATES.has(key.toLowerCase())) {
        entries.push({ path: nextPath, url: child });
      }
      if (Array.isArray(child) || (child && typeof child === 'object')) {
        entries.push(...collectLinkCandidates(child, nextPath));
      }
    });
  }

  return entries;
}

async function validateLinks(data) {
  const entries = collectLinkCandidates(data);
  if (entries.length === 0) {
    console.log('🔍 No hyperlink candidates found for validation');
    return;
  }

  console.log('🔍 Validating hyperlinks...');
  const errors = [];
  const warnings = [];
  let validLinks = 0;

  for (const entry of entries) {
    const rawUrl = entry.url;
    const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const pathLabel = formatLinkPath(entry.path);

    if (!trimmed) {
      errors.push(`❌ ${pathLabel}: link is empty`);
      continue;
    }

    if (isPlaceholderLink(trimmed)) {
      errors.push(`❌ ${pathLabel}: placeholder link value "${trimmed}"`);
      continue;
    }

    if (isHttpLink(trimmed)) {
      const result = await checkHttpUrl(trimmed);
      if (result.valid) {
        validLinks++;
      } else {
        const reason = result.error ? result.error : `HTTP ${result.status}`;
        if (result.status === 403 || result.status === 999) {
          warnings.push(`⚠️  ${pathLabel}: ${trimmed} (${reason})`);
          validLinks++;
        } else {
          errors.push(`❌ ${pathLabel}: ${trimmed} (${reason})`);
        }
      }
    } else {
      validLinks++; // Non-HTTP links (mailto, tel, relative) are assumed acceptable
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    console.log(`\n⚠️  Link Validation Results: ${validLinks}/${entries.length} links passed`);
    errors.forEach(error => console.log(`   ${error}`));
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  } else {
    console.log(`✅ All ${entries.length} links validated successfully`);
  }
}

/**
 * Validate all images in newsletter data
 */
async function validateImages(data) {
  const errors = [];
  let totalImages = 0;
  let validImages = 0;

  console.log('🔍 Validating image URLs...');

  const formatSectionReference = (section, sectionIndex) => {
    const sectionType = section?.type ? String(section.type) : 'unknown-type';
    const sectionTitle = section?.title ? String(section.title) : null;
    return sectionTitle
      ? `Section "${sectionTitle}" (${sectionType})`
      : `Section ${sectionIndex + 1} (${sectionType})`;
  };

  const formatItemReference = (item, itemIndex) => {
    const itemTitle = item?.title ? String(item.title) : null;
    return itemTitle
      ? `item ${itemIndex + 1} "${itemTitle}"`
      : `item ${itemIndex + 1}`;
  };

  // Check header images
  if (data.header?.featuredImage) {
    totalImages++;
    const result = await checkImageUrl(data.header.featuredImage);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header featured image: ${data.header.featuredImage} (${result.error || result.status})`);
    }
  }

  if (data.header?.logoTop) {
    totalImages++;
    const result = await checkImageUrl(data.header.logoTop);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header logo top: ${data.header.logoTop} (${result.error || result.status})`);
    }
  }

  if (data.header?.logoBottom) {
    totalImages++;
    const result = await checkImageUrl(data.header.logoBottom);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header logo bottom: ${data.header.logoBottom} (${result.error || result.status})`);
    }
  }

  // Check section images
  if (data.sections) {
    for (let sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex++) {
      const section = data.sections[sectionIndex];
      
      if (section.items) {
        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];
          
          // Check single image
          const singleImageUrl = resolveImageEntryUrl(item.image);
          if (singleImageUrl) {
            totalImages++;
            const result = await checkImageUrl(singleImageUrl);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, ${formatItemReference(item, itemIndex)}: ${singleImageUrl} (${result.error || result.status})`);
            }
          } else if (item.image) {
            totalImages++;
            errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, ${formatItemReference(item, itemIndex)}: ${JSON.stringify(item.image)} (URL missing)`);
          }
          
          // Check multiple images (for aesthetically-pleasing section)
          if (item.images && Array.isArray(item.images)) {
            for (let imgIndex = 0; imgIndex < item.images.length; imgIndex++) {
              const imageEntry = item.images[imgIndex];
              const imageUrl = resolveImageEntryUrl(imageEntry);
              if (imageUrl) {
                totalImages++;
                const result = await checkImageUrl(imageUrl);
                if (result.valid) {
                  validImages++;
                } else {
                  errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1}, image ${imgIndex + 1}: ${imageUrl} (${result.error || result.status})`);
                }
              } else {
                totalImages++;
                errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1}, image ${imgIndex + 1}: ${JSON.stringify(imageEntry)} (URL missing)`);
              }
            }
          }
          
          // Check GIF
          if (item.gif) {
            totalImages++;
            console.log('Checking GIF URL:', item.gif);
            const result = await checkImageUrl(item.gif);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1} GIF: ${item.gif} (${result.error || result.status})`);
            }
          }
        }
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.log(`\n⚠️  Image Validation Results: ${validImages}/${totalImages} images valid\n`);
    errors.forEach(error => console.log(error));
    console.log('');
  } else if (totalImages > 0) {
    console.log(`✅ All ${totalImages} images validated successfully`);
  }

  return { totalImages, validImages, errors };
}

// Get command line arguments
const args = process.argv.slice(2);

// Initialize REPO_ROOT for cross-repository usage
const REPO_ROOT = getRepoRoot(args);

// Parse --output-dir option (for external usage)
const outputDirArg = args.find(arg => arg.startsWith('--output-dir='));
const outputDir = outputDirArg 
  ? path.resolve(outputDirArg.split('=')[1])
  : repoPath(REPO_ROOT, 'build_production');

if (args.length < 1) {
  console.log('📧 Newsletter Builder');
  console.log('Usage: node scripts/build-newsletter.mjs <file> [output-name] [options]');
  console.log('');
  console.log('Examples:');
  console.log('  # From JSON data file:');
  console.log('  node scripts/build-newsletter.mjs brain-dead-20251007.json');
  console.log('  node scripts/build-newsletter.mjs sentiers-20251007.json sentiers-latest');
  console.log('');
  console.log('  # From Markdown content file:');
  console.log('  node scripts/build-newsletter.mjs content/2025-10-07.md');
  console.log('  node scripts/build-newsletter.mjs content/holiday-2025.md holiday-campaign --template=wirecutter');
  console.log('');
  console.log('Options:');
  console.log('  --template=<name>    Specify template (wirecutter, brain-dead-template, sentiers-llm)');
  console.log('  --no-open            Don\'t auto-open the built newsletter');
  console.log('  --repo-root=<path>   Specify nfl-maizzle-mail repo root (for cross-repo usage)');
  console.log('  --output-dir=<path>  Output directory (default: build_production in repo)');
  console.log('  --adjacency-mail-theme-overrides=<path>  JSON file with Adjacency mail theme overrides');
  console.log('');
  console.log('Environment Variables:');
  console.log('  NFL_MAIZZLE_MAIL_ROOT  Alternative to --repo-root');
  console.log('');
  console.log(`Current Repo Root: ${REPO_ROOT}`);
  console.log('');
  console.log('Available files:');
  
  // List available data files
  const dataDir = repoPath(REPO_ROOT, 'data/');
  const dataFiles = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('newsletter.json'))
    .sort();
  
  console.log('  📄 JSON Data Files:');
  dataFiles.forEach(file => {
    console.log(`    - ${file}`);
  });
  
  // List available markdown files
  const contentDir = repoPath(REPO_ROOT, 'content/');
  if (fs.existsSync(contentDir)) {
    const mdFiles = fs.readdirSync(contentDir)
      .filter(file => file.endsWith('.md'))
      .sort();
    
    if (mdFiles.length > 0) {
      console.log('  📝 Markdown Content Files:');
      mdFiles.forEach(file => {
        console.log(`    - content/${file}`);
      });
    }
  }
  
  process.exit(1);
}

// Filter out template arguments
const fileArgs = args.filter(arg => !arg.startsWith('--'));
const inputFile = fileArgs[0];
const outputName = fileArgs[1] || path.basename(inputFile, path.extname(inputFile));

// Determine if input is Markdown or JSON
const isMarkdown = inputFile.endsWith('.md');
const isJson = inputFile.endsWith('.json');

if (!isMarkdown && !isJson) {
  console.error(`❌ File must be .md or .json: ${inputFile}`);
  process.exit(1);
}

// Set up paths - handle both absolute and relative paths
let inputPath;
if (isMarkdown) {
  // If it's an absolute path, use it directly
  if (path.isAbsolute(inputFile)) {
    inputPath = inputFile;
  } else if (inputFile.startsWith('content/')) {
    // Already has content/ prefix
    inputPath = inputFile;
  } else {
    // Relative path, assume it's in content/ directory
    inputPath = path.join('content', inputFile);
  }
} else {
  // JSON files
  if (path.isAbsolute(inputFile)) {
    inputPath = inputFile;
  } else if (inputFile.startsWith('data/')) {
    inputPath = inputFile;
  } else {
    inputPath = path.join('data', inputFile);
  }
}

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  if (!path.isAbsolute(inputFile)) {
    console.error(`   Tried: ${path.resolve(inputPath)}`);
  }
  process.exit(1);
}

async function buildNewsletter() {
  console.log('📧 Building Newsletter');
  console.log('════════════════════');
  console.log(`📄 Input: ${inputPath}`);
  console.log(`🏗️  Output: ${outputName}.html`);
  console.log(`📍 Repo: ${REPO_ROOT}`);

  const authorFacingNewsletterJsonPath = repoPath(REPO_ROOT, 'data/newsletter.json');
  const inputUsesAuthorFacingNewsletterJson =
    !isMarkdown && path.resolve(inputPath) === path.resolve(authorFacingNewsletterJsonPath);
  let dataNewsletterJson = null;
  let originalNewsletterJsonRaw = null;
  const priorNewsletterJsonRaw = fs.existsSync(authorFacingNewsletterJsonPath)
    ? fs.readFileSync(authorFacingNewsletterJsonPath, 'utf8')
    : null;
  const shouldRestorePriorNewsletterJson =
    isMarkdown || !inputUsesAuthorFacingNewsletterJson;
  const finalOutputPath = path.join(outputDir, `${outputName}.html`);
  const existingOutputRawBeforeBuild = fs.existsSync(finalOutputPath)
    ? fs.readFileSync(finalOutputPath, 'utf8')
    : null;
  try {
    let templateName = 'wirecutter'; // default
    
    if (isMarkdown) {
      // Handle Markdown workflow
      console.log('📝 Converting Markdown to JSON...');
      
      // Extract template from command line args or default
      const templateArg = args.find(arg => arg.startsWith('--template='));
      if (templateArg) {
        templateName = templateArg.split('=')[1];
      }
      
      // Run markdown to JSON conversion with error handling
      const mdToJsonScript = repoPath(REPO_ROOT, 'scripts/md_to_json.mjs');
      try {
        execSync(`node ${mdToJsonScript} ${inputPath} ${authorFacingNewsletterJsonPath} --template=${templateName}`, { 
          stdio: 'inherit',
          cwd: REPO_ROOT
        });
        
        // Verify the conversion worked
        if (!fs.existsSync(authorFacingNewsletterJsonPath)) {
          throw new Error('Markdown conversion failed - newsletter.json not created');
        }
        
        // After conversion, ensure the template is set correctly in the JSON
        const newsletterData = JSON.parse(fs.readFileSync(authorFacingNewsletterJsonPath, 'utf8'));
        
        // If template was provided via CLI, enforce it. Otherwise respect what's in the JSON (from frontmatter)
        if (templateArg) {
          newsletterData.template = templateName;
        } else if (newsletterData.template) {
          templateName = newsletterData.template;
        }
        
        fs.writeFileSync(authorFacingNewsletterJsonPath, JSON.stringify(newsletterData, null, 2));
        
        console.log('✅ Markdown converted successfully');
        
      } catch (conversionError) {
        console.error('❌ Markdown conversion failed:', conversionError.message);
        throw conversionError;
      }
      
    } else {
      // Handle JSON workflow
      console.log('📋 Using JSON data file...');
      
      // Read the data to get template info
      const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      templateName = data.template || 'wirecutter';
      
      // Copy data file to newsletter.json
      dataNewsletterJson = authorFacingNewsletterJsonPath;
      fs.copyFileSync(inputPath, dataNewsletterJson);
    }

    dataNewsletterJson = authorFacingNewsletterJsonPath;
    console.log(`🎨 Template: "${templateName}"`);
    console.log(`📊 Newsletter: "${JSON.parse(fs.readFileSync(dataNewsletterJson, 'utf8')).title}"`);

    // Load newsletter data and display color theme
    const sourceNewsletterData = JSON.parse(fs.readFileSync(dataNewsletterJson, 'utf8'));

    if (!shouldRestorePriorNewsletterJson) {
      // Remove prior run-injected fields before preserving the JSON file so the
      // build can always restore a clean author-facing source payload.
      pruneBuildInjectedFields(sourceNewsletterData);
      originalNewsletterJsonRaw = `${JSON.stringify(sourceNewsletterData, null, 2)}\n`;
    }

    const newsletterData = prepareNormalizedNewsletterData(sourceNewsletterData, {
      repoRoot: REPO_ROOT,
      templateName,
      args,
    });
    await resolveCommerceAdBlockSnapshots(newsletterData, {
      repoRoot: REPO_ROOT,
      logger: console,
    });
    
    // Catalog sections for debugging
    catalogSections(newsletterData);
    
    // Normalize item fields for templates that expect different field names.
    // Known mapping: classifieds templates expect `item.content`, while content sources
    // may provide either `description` (common in Markdown frontmatter) or `content`.
    // We normalize BOTH ways so downstream styling and templates behave consistently:
    // - Ensure `item.content` exists for templates that render `content`
    // - Ensure `item.description` exists for the style-preprocessor (it targets `description`)
    if (newsletterData.sections && Array.isArray(newsletterData.sections)) {
      newsletterData.sections.forEach(section => {
        if (!section || !section.items) return;
        if (section.type === 'classifieds') {
          section.items.forEach(item => {
            if (!item.content && typeof item.description === 'string') item.content = item.description;
            if (!item.description && typeof item.content === 'string') item.description = item.content;
          });
        }
        // Normalize dispatch tags: accept either a comma-separated string or an array
        if (section.type === 'dispatch') {
          let tags = section.tags || (section.dispatch && section.dispatch.tags);
          if (tags) {
            if (typeof tags === 'string') {
              tags = tags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.toUpperCase());
            } else if (Array.isArray(tags)) {
              tags = tags.map(t => String(t).trim()).filter(Boolean).map(t => t.toUpperCase());
            }
            section.tags = tags;
          }
        }
      });
      console.log('🔁 Normalized item fields for classifieds (description ↔ content)');
    }
    
    displayColorTheme(newsletterData);
    
    // Inject theme colors into newsletter data
    const colorThemeName = newsletterData.colorTheme || 'current';
    let colorThemes = {};
    try {
      const themesData = fs.readFileSync(repoPath(REPO_ROOT, 'data/color-themes.json'), 'utf8');
      colorThemes = JSON.parse(themesData);
    } catch (error) {
      console.log('⚠️  No color themes found, using defaults');
    }
    
    const theme = colorThemes.themes && colorThemes.themes[colorThemeName];
    if (theme) {
      // Add theme colors to newsletter data for template access
      newsletterData.themeColors = {
        ...theme.colors,  // All section background colors
        linkAccent: theme.linkAccent  // Link accent color for all links
      };
      
      // Add the theme object itself for CSS class generation
      newsletterData.theme = theme;
    }

    // Load section styles configuration
    let sectionStyles = {};
    let sectionStylesPath = repoPath(REPO_ROOT, 'data/section-styles.json'); // Default path
    let sectionStylesSourceReason = 'default repository styles';
    
    // Check if newsletter data specifies a custom section styles file
    if (newsletterData.sectionStylesFile) {
      sectionStylesPath = repoPath(REPO_ROOT, newsletterData.sectionStylesFile);
      sectionStylesSourceReason = 'specified via sectionStylesFile';
      console.log(`📋 Using custom section styles file: ${sectionStylesPath}`);
    } else if (templateName) {
      // Auto-detect template-specific section styles file
      const templateSpecificPath = repoPath(REPO_ROOT, `templates/${templateName}/section-styles.json`);
      if (fs.existsSync(templateSpecificPath)) {
        sectionStylesPath = templateSpecificPath;
        sectionStylesSourceReason = `auto-detected for template "${templateName}"`;
        console.log(`📋 Auto-detected template section styles: ${templateSpecificPath}`);
      }
    }

    const resolvedSectionStylesPath = fs.existsSync(sectionStylesPath)
      ? fs.realpathSync(sectionStylesPath)
      : path.resolve(sectionStylesPath);
    console.log(`🗂  Section styles source: ${resolvedSectionStylesPath} (${sectionStylesSourceReason})`);
    
    try {
      const sectionStylesData = fs.readFileSync(sectionStylesPath, 'utf8');
      sectionStyles = JSON.parse(sectionStylesData);

      // Normalize keys: allow comma-separated section type keys to map the same
      // config to multiple section types. E.g. "books-accessories, apps-sites": {...}
      if (sectionStyles && sectionStyles.sectionStyles) {
        const original = sectionStyles.sectionStyles;
        const normalized = {};

        Object.entries(original).forEach(([key, cfg]) => {
          // Split on comma and trim each entry
          const parts = key.split(',').map(k => k.trim()).filter(Boolean);
          // If there was only one part, keep the key as-is
          if (parts.length === 1) {
            normalized[parts[0]] = cfg;
          } else {
            // Map the same cfg object to each individual section type
            parts.forEach(p => {
              // If a key collision occurs, prefer the explicit key already present
              if (!normalized[p]) normalized[p] = cfg;
            });
          }
        });
        // Normalize any quoted or entity-escaped font family values from section-styles.json
        // so template interpolation does not emit escaped quotes (e.g. &#039;Roboto&#039;).
        normalizeFontFamiliesDeep(sectionStyles);
        sectionStyles.sectionStyles = normalized;
      }
    } catch (error) {
      const baseMessage = `Failed to load section styles from ${sectionStylesPath}`;
      if (sectionStylesSourceReason === 'specified via sectionStylesFile') {
        throw new Error(`${baseMessage} (your newsletter data explicitly set sectionStylesFile): ${error.message}`);
      }
      console.log(`⚠️  ${baseMessage}, skipping style processing (${error.message})`);
    }

    const { overridesPath: adjacencyMailOverridesPath, overrides: adjacencyMailOverrides } =
      loadAdjacencyMailThemeOverrides(args);
    const adjacencyMailTokens = buildAdjacencyMailThemeTokens(adjacencyMailOverrides);
    const adjacencyMailSectionOverrides = buildAdjacencyMailSectionStyleOverrides(adjacencyMailTokens);
    const adjacencyJobsMailSectionOverrides = buildAdjacencyJobsMailSectionStyleOverrides();
    normalizeFontFamiliesDeep(adjacencyMailSectionOverrides);
    normalizeFontFamiliesDeep(adjacencyJobsMailSectionOverrides);

    const existingSectionStyles =
      sectionStyles && typeof sectionStyles === 'object' && !Array.isArray(sectionStyles) ? sectionStyles : {};
    const existingSectionStyleMap =
      existingSectionStyles.sectionStyles &&
      typeof existingSectionStyles.sectionStyles === 'object' &&
      !Array.isArray(existingSectionStyles.sectionStyles)
        ? existingSectionStyles.sectionStyles
        : {};

    sectionStyles = {
      ...existingSectionStyles,
      sectionStyles: {
        ...existingSectionStyleMap,
        ...adjacencyMailSectionOverrides,
        ...adjacencyJobsMailSectionOverrides,
      },
    };

    newsletterData.sectionStyles = sectionStyles;
    console.log(
      `🎛️ Applied Adjacency mail theme overrides: ${[
        ...Object.keys(adjacencyMailSectionOverrides),
        ...Object.keys(adjacencyJobsMailSectionOverrides),
      ].join(', ')}`,
    );
    if (adjacencyMailOverridesPath) {
      console.log(`🧪 Adjacency mail theme override file: ${adjacencyMailOverridesPath}`);
    }
    console.log(
      `✅ Loaded section styles from ${sectionStylesPath}: ${Object.keys(sectionStyles.sectionStyles).length} section types (normalized)`,
    );

    // Apply section styles through preprocessing (more reliable for email compatibility)
    if (sectionStyles.sectionStyles && newsletterData.sections) {
      console.log('🎨 Applying section styles through preprocessing...');
      console.log('');

      const sanitizeHtmlFragment = (html) => {
        if (!html || typeof html !== 'string') return html;
        let out = html;

        // Remove empty paragraphs that can get default/global styling inlined later.
        out = out.replace(/<p\b[^>]*>\s*<\/p>/gi, '');

        // Unwrap nested paragraphs like <p ...><p ...>...</p></p>.
        // We apply this a few times to handle repeated nesting from upstream converters.
        for (let i = 0; i < 3; i++) {
          const next = out
            .replace(/<p\b[^>]*>\s*(<p\b[^>]*>)/gi, '$1')
            .replace(/<\/p>\s*<\/p>/gi, '</p>');
          if (next === out) break;
          out = next;
        }

        return out;
      };

      const applyInlineLinkStyles = (html, linkStyles, theme) => {
        if (!html || typeof html !== 'string') return html;

        if (linkStyles && Object.keys(linkStyles).length > 0) {
          let linkCSSProperties = [];
          if (linkStyles.fontFamily) linkCSSProperties.push(`font-family: ${linkStyles.fontFamily} !important`);
          if (linkStyles.fontSize) linkCSSProperties.push(`font-size: ${linkStyles.fontSize} !important`);
          if (linkStyles.fontWeight) linkCSSProperties.push(`font-weight: ${linkStyles.fontWeight} !important`);
          if (linkStyles.textDecoration) linkCSSProperties.push(`text-decoration: ${linkStyles.textDecoration} !important`);
          if (linkStyles.color === 'inherit' && theme?.linkAccent) {
            linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
          } else if (linkStyles.color && linkStyles.color !== 'inherit') {
            linkCSSProperties.push(`color: ${linkStyles.color} !important`);
          } else if (theme?.linkAccent) {
            linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
          }

          const linkCSSString = linkCSSProperties.join('; ');
          return html.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
            attrs = attrs || '';
            const styleMatch = attrs.match(/style="([^"]*)"/i);
            if (styleMatch) {
              let existingStyle = styleMatch[1];
              existingStyle = existingStyle
                .replace(/font-family:[^;]*;?/gi, '')
                .replace(/font-size:[^;]*;?/gi, '')
                .replace(/font-weight:[^;]*;?/gi, '')
                .replace(/text-decoration:[^;]*;?/gi, '')
                .replace(/color:[^;]*;?/gi, '');
              const combinedLinkStyle = `${existingStyle}; ${linkCSSString}`.replace(/^;+|;+$/g, '');
              return `<a${attrs.replace(/style="[^"]*"/i, `style="${combinedLinkStyle}"`)}>`;
            }
            return `<a${attrs} style="${linkCSSString}">`;
          });
        }

        if (!theme?.linkAccent) return html;
        return html.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
          attrs = attrs || '';
          if (!attrs.includes('style=')) {
            return `<a${attrs} style="color: ${theme.linkAccent} !important; text-decoration: underline;">`;
          }
          return match.replace(/style="([^"]*)"/, (styleMatch, styles) => {
            const cleanStyles = styles.replace(/color:[^;]*;?/gi, '');
            return `style="${cleanStyles}; color: ${theme.linkAccent} !important; text-decoration: underline;"`;
          });
        });
      };
      
      let processedItems = 0;
      let totalItems = 0;
      const sectionSummary = [];
      let sectionsWithMatchedConfig = 0;
      let sectionsUsingDefaultConfig = 0;
      let sectionsWithInjectedContentStyles = 0;
      
      newsletterData.sections.forEach((section, sIndex) => {
          if (section && section.type !== undefined && section.type !== null) {
            section.type = String(section.type).trim();
          }

          // Helper to convert style objects into inline CSS strings with camelCase to kebab-case conversion.
          // Uses !important so section-level overrides survive Maizzle's global CSS inlining
          // (the layout has `a { color: <theme.linkAccent> !important; }` which would otherwise win).
          const toCssString = (styles = {}, theme) => {
            return Object.entries(styles)
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([prop, val]) => {
                const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                // Special handling: if color is "inherit", prefer theme link accent when available
                if (cssProp === 'color' && val === 'inherit' && theme?.linkAccent) {
                  return `color: ${theme.linkAccent} !important`;
                }
                return `${cssProp}: ${val} !important`;
              })
              .join('; ');
          };

          const sectionConfig = sectionStyles.sectionStyles[section.type];
          const fallbackConfig = sectionStyles.sectionStyles.default || {};
          const usedConfig = sectionConfig || fallbackConfig;
          const safeUsedConfig = usedConfig && typeof usedConfig === 'object' ? usedConfig : {};
          if (sectionConfig) {
            sectionsWithMatchedConfig++;
          } else {
            sectionsUsingDefaultConfig++;
          }
          const incomingContainerStyles = section.containerStyles && typeof section.containerStyles === 'object'
            ? { ...section.containerStyles }
            : {};
          const incomingLinkStyles = section.linkStyles && typeof section.linkStyles === 'object'
            ? { ...section.linkStyles }
            : {};
          const mergedLinkStyles = {
            ...((safeUsedConfig.linkStyles && typeof safeUsedConfig.linkStyles === 'object')
              ? safeUsedConfig.linkStyles
              : {}),
            ...incomingLinkStyles,
          };
          // --- PATCH: Apply descriptionStyles/contentStyles/linkStyles to section.description ---
          if (section.description && typeof section.description === 'string') {
            section.description = sanitizeHtmlFragment(section.description);
            let desc = section.description;
            let wasModified = false;
            // Apply descriptionStyles if provided, otherwise fall back to contentStyles
            // Merge: template section-styles.json provides defaults, section-level frontmatter overrides
            const templateDescStyles = (safeUsedConfig.descriptionStyles && Object.keys(safeUsedConfig.descriptionStyles).length > 0)
              ? safeUsedConfig.descriptionStyles
              : safeUsedConfig.contentStyles;
            const sectionDescStyles = (section.descriptionStyles && Object.keys(section.descriptionStyles).length > 0)
              ? section.descriptionStyles
              : section.type === 'ad-block'
                ? {}
                : section.contentStyles;
            const descStyles = { ...templateDescStyles, ...sectionDescStyles };
            if (descStyles && Object.keys(descStyles).length > 0) {
              const contentStyles = descStyles;
              let cssProperties = [];
              if (contentStyles.fontFamily) cssProperties.push(`font-family: ${contentStyles.fontFamily} !important`);
              if (contentStyles.fontSize) cssProperties.push(`font-size: ${contentStyles.fontSize} !important`);
              if (contentStyles.lineHeight) cssProperties.push(`line-height: ${contentStyles.lineHeight} !important`);
              if (contentStyles.color) cssProperties.push(`color: ${contentStyles.color} !important`);
              if (contentStyles.textAlign) cssProperties.push(`text-align: ${contentStyles.textAlign} !important`);
              const newCSSString = cssProperties.join('; ');
              desc = desc.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
                attrs = attrs || '';
                if (section.type === 'ad-block') {
                  const classMatch = attrs.match(/class="([^"]*)"/i);
                  if (classMatch) {
                    if (!classMatch[1].includes('mob-text')) {
                      attrs = attrs.replace(/class="([^"]*)"/i, `class="$1 mob-text"`);
                    }
                  } else {
                    attrs = ` class="mob-text"${attrs}`;
                  }
                }
                const styleMatch = attrs.match(/style="([^"]*)"/i);
                if (styleMatch) {
                  let existingStyle = styleMatch[1];
                  existingStyle = existingStyle
                    .replace(/font-family:[^;]*;?/gi, '')
                    .replace(/font-size:[^;]*;?/gi, '')
                    .replace(/line-height:[^;]*;?/gi, '')
                    .replace(/color:[^;]*;?/gi, '')
                    .replace(/text-align:[^;]*;?/gi, '');
                  const combinedStyle = `${existingStyle}; ${newCSSString}`.replace(/^;+|;+$/g, '');
                  return `<p${attrs.replace(/style="[^"]*"/i, `style="${combinedStyle}"`)}>`;
                } else {
                  return `<p${attrs} style="${newCSSString}">`;
                }
              });
              wasModified = true;
            }
            // Apply linkStyles
            if ((mergedLinkStyles && Object.keys(mergedLinkStyles).length > 0) || theme?.linkAccent) {
              desc = applyInlineLinkStyles(desc, mergedLinkStyles, theme);
              wasModified = true;
            }
            if (wasModified) {
              section.description = desc;
            }
          }

          // Inject containerStyles into the section for template access
          // Normalize and provide sensible defaults so templates can reference
          // `section.containerStyles.borderRadius`, `padding`, and `backgroundColor`.
          const baseContainerStyles = (safeUsedConfig.containerStyles && typeof safeUsedConfig.containerStyles === 'object')
            ? { ...safeUsedConfig.containerStyles }
            : { backgroundColor: null, padding: '15px 20px', borderRadius: '0px' };
          section.containerStyles = { ...baseContainerStyles, ...incomingContainerStyles };
          // Ensure values are strings and have defaults
          section.containerStyles.borderRadius = section.containerStyles.borderRadius ? String(section.containerStyles.borderRadius).trim() : '0px';
          section.containerStyles.padding = section.containerStyles.padding ? String(section.containerStyles.padding).trim() : '15px 20px';
          // keep explicit null for backgroundColor when not set so templates can fallback to themeColors
          section.containerStyles.backgroundColor = section.containerStyles.backgroundColor == null ? null : String(section.containerStyles.backgroundColor).trim();

          // Expose contentStyles so templates can use configured typography instead of hardcoded values
          // Merge: template section-styles.json provides defaults, section-level frontmatter overrides
          const incomingContentStyles = section.contentStyles && typeof section.contentStyles === 'object'
            ? { ...section.contentStyles }
            : {};
          const templateContentStyles = (safeUsedConfig.contentStyles && typeof safeUsedConfig.contentStyles === 'object')
            ? { ...safeUsedConfig.contentStyles }
            : {};
          section.contentStyles = { ...templateContentStyles, ...incomingContentStyles };
          // Track which properties were overridden by frontmatter for logging
          section._contentStyleOverrides = Object.keys(incomingContentStyles).length > 0 ? incomingContentStyles : null;
          if (section.contentStyles && Object.keys(section.contentStyles).length > 0) {
            sectionsWithInjectedContentStyles++;
          }
          // Expose descriptionStyles with fallback to contentStyles for section.description rendering
          section.descriptionStyles = (safeUsedConfig.descriptionStyles && typeof safeUsedConfig.descriptionStyles === 'object')
            ? { ...safeUsedConfig.descriptionStyles }
            : { ...section.contentStyles };
          // Compute a spacer background derived from the section background color.
          const baseBackground =
            section.containerStyles.backgroundColor ||
            theme?.colors?.[section.type] ||
            null;
          const spacerAdjust = safeUsedConfig.spacerBackgroundAdjust && typeof safeUsedConfig.spacerBackgroundAdjust === 'object'
            ? safeUsedConfig.spacerBackgroundAdjust
            : { lightness: -6, saturation: 4 };
          section.spacerBackgroundColor = baseBackground
            ? adjustHexColor(baseBackground, spacerAdjust)
            : null;

          // Expose headingStyles/linkStyles for template use with sane defaults
          const defaultHeading = { fontFamily: "'Ubuntu', sans-serif", fontSize: '18px', lineHeight: '23px', fontWeight: '600', color: '#000000' };
          const defaultSectionHeaderHeading = { fontFamily: "'Ubuntu', sans-serif", fontSize: '21px', lineHeight: '23px', fontWeight: '600', color: '#000000' };
          const defaultLink = { textDecoration: 'underline', fontWeight: '400', color: theme?.linkAccent || '#707070' };
          const defaultLabel = {
            fontFamily: 'Geist, ui-sans-serif, sans-serif',
            fontSize: '12px',
            lineHeight: '14px',
            fontWeight: '300',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#778095'
          };
          section.headingStyles = safeUsedConfig.headingStyles && typeof safeUsedConfig.headingStyles === 'object' ? { ...safeUsedConfig.headingStyles } : {};
          section.linkStyles = mergedLinkStyles;
          const incomingLabelStyles = section.labelStyles && typeof section.labelStyles === 'object'
            ? { ...section.labelStyles }
            : {};
          const templateLabelStyles = safeUsedConfig.labelStyles && typeof safeUsedConfig.labelStyles === 'object'
            ? { ...safeUsedConfig.labelStyles }
            : {};
          const incomingSectionHeaderHeadingStyles = section.sectionHeaderHeadingStyles && typeof section.sectionHeaderHeadingStyles === 'object'
            ? { ...section.sectionHeaderHeadingStyles }
            : {};
          const templateSectionHeaderHeadingStyles = safeUsedConfig.sectionHeaderHeadingStyles && typeof safeUsedConfig.sectionHeaderHeadingStyles === 'object'
            ? { ...safeUsedConfig.sectionHeaderHeadingStyles }
            : {};
          section.labelStyles = { ...templateLabelStyles, ...incomingLabelStyles };
          section.sectionHeaderHeadingStyles = { ...templateSectionHeaderHeadingStyles, ...incomingSectionHeaderHeadingStyles };
          section.headingStylesInline = toCssString({ ...defaultHeading, ...section.headingStyles });
          section.sectionHeaderHeadingStylesInline = toCssString({ ...defaultSectionHeaderHeading, ...section.sectionHeaderHeadingStyles });
          section.linkStylesInline = toCssString({ ...defaultLink, ...section.linkStyles }, theme);
          section.labelStylesInline = toCssString({ ...defaultLabel, ...section.labelStyles });
        const usingFallback = !sectionConfig;
        
        let sectionProcessedItems = 0;
        let sectionTotalItems = 0;
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        
        if (sectionItems.length > 0) {
          sectionTotalItems = sectionItems.filter(item => item.description && typeof item.description === 'string').length;
          totalItems += sectionTotalItems;
          
          // Show section header with styling info
          if (sectionTotalItems > 0) {
            const hasOverrides = section._contentStyleOverrides && Object.keys(section._contentStyleOverrides).length > 0;
            const statusIcon = usingFallback ? '⚠️ ' : (hasOverrides ? '🎨' : '✅');
            const configInfo = usingFallback ? `using "default" styles` : `using "${section.type}" styles`;
            const templateFontInfo = safeUsedConfig?.contentStyles?.fontFamily ? ` (${safeUsedConfig.contentStyles.fontFamily})` : '';
            
            console.log(`${statusIcon} Section ${sIndex + 1}: "${section.type}" - ${configInfo}${templateFontInfo}`);
            
            if (usingFallback) {
              console.log(`   ℹ️  No specific styles found for "${section.type}", falling back to default`);
            }
            
            // Announce frontmatter overrides prominently
            if (hasOverrides) {
              const overrideEntries = Object.entries(section._contentStyleOverrides);
              const overrideList = overrideEntries.map(([prop, val]) => `${prop}: ${val}`).join(', ');
              console.log(`   🔶 FRONTMATTER OVERRIDES → ${overrideList}`);
            }
          }
          
          sectionItems.forEach((item, iIndex) => {
            if (section.type === 'signals-adjacent-now') {
              if (Array.isArray(item.storySeeds)) {
                item.storySeeds = item.storySeeds.map((seed) =>
                  applyInlineLinkStyles(sanitizeHtmlFragment(seed), mergedLinkStyles, theme)
                );
              }
              if (Array.isArray(item.strategyQuestions)) {
                item.strategyQuestions = item.strategyQuestions.map((question) =>
                  applyInlineLinkStyles(sanitizeHtmlFragment(question), mergedLinkStyles, theme)
                );
              }
            }

            if (item.description && typeof item.description === 'string') {
              item.description = sanitizeHtmlFragment(item.description);
              let originalDescription = item.description;
              let wasModified = false;
              
              // Apply all contentStyles properties (using merged section.contentStyles which includes frontmatter overrides)
              const mergedContentStyles = section.contentStyles && Object.keys(section.contentStyles).length > 0
                ? section.contentStyles
                : safeUsedConfig.contentStyles;
              if (mergedContentStyles && Object.keys(mergedContentStyles).length > 0) {
                const contentStyles = mergedContentStyles;
                
                // Build CSS properties from contentStyles
                let cssProperties = [];
                if (contentStyles.fontFamily) {
                  cssProperties.push(`font-family: ${contentStyles.fontFamily} !important`);
                }
                if (contentStyles.fontSize) {
                  cssProperties.push(`font-size: ${contentStyles.fontSize}`);
                }
                if (contentStyles.lineHeight) {
                  cssProperties.push(`line-height: ${contentStyles.lineHeight}`);
                }
                if (contentStyles.color) {
                  cssProperties.push(`color: ${contentStyles.color} !important`);
                }
                if (contentStyles.textAlign) {
                  cssProperties.push(`text-align: ${contentStyles.textAlign} !important`);
                }
                
                const newCSSString = cssProperties.join('; ');
                
                // Process <p> tags — add mob-text class for mobile media query targeting
                item.description = item.description.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
                  attrs = attrs || '';
                  // Add mob-text class for mobile media query targeting
                  const classMatch = attrs.match(/class="([^"]*)"/i);
                  if (classMatch) {
                    if (!classMatch[1].includes('mob-text')) {
                      attrs = attrs.replace(/class="([^"]*)"/i, `class="$1 mob-text"`);
                    }
                  } else {
                    attrs = ` class="mob-text"${attrs}`;
                  }
                  const styleMatch = attrs.match(/style="([^"]*)"/i);
                  if (styleMatch) {
                    let existingStyle = styleMatch[1];
                    // Remove existing properties that we're overriding
                    existingStyle = existingStyle
                      .replace(/font-family:[^;]*;?/gi, '')
                      .replace(/font-size:[^;]*;?/gi, '')
                      .replace(/line-height:[^;]*;?/gi, '')
                      .replace(/color:[^;]*;?/gi, '')
                      .replace(/text-align:[^;]*;?/gi, '');
                    const combinedStyle = `${existingStyle}; ${newCSSString}`.replace(/^;+|;+$/g, '');
                    return `<p${attrs.replace(/style="[^"]*"/i, `style="${combinedStyle}"`)}>`;
                  } else {
                    return `<p${attrs} style="${newCSSString}">`;
                  }
                });
                wasModified = true;
              }
              
              // Apply linkStyles properties to <a> tags
              if ((mergedLinkStyles && Object.keys(mergedLinkStyles).length > 0) || theme?.linkAccent) {
                item.description = applyInlineLinkStyles(item.description, mergedLinkStyles, theme);
                wasModified = true;
              }
              
              const inlineStyleMatches = item.description.match(/style="[^"]*"/gi) || [];
              const inlineFontFamilies = [];
              const normalizeFontFamily = (value) =>
                value
                  .replace(/!important/gi, '')
                  .replace(/['"]/g, '')
                  .split(',')
                  .map((font) => font.trim())
                  .filter(Boolean)[0] || '';
              inlineStyleMatches.forEach((styleMatch) => {
                const fontMatch = styleMatch.match(/font-family\s*:\s*([^;"]+)/i);
                if (fontMatch) {
                  const normalized = normalizeFontFamily(fontMatch[1]);
                  if (normalized) {
                    inlineFontFamilies.push(normalized);
                  }
                }
              });
              const uniqueInlineFonts = Array.from(new Set(inlineFontFamilies));
              const inlineStyleSummary = [];
              if (inlineStyleMatches.length) {
                inlineStyleSummary.push(`${inlineStyleMatches.length} inline style${inlineStyleMatches.length > 1 ? 's' : ''}`);
              }
              if (uniqueInlineFonts.length) {
                inlineStyleSummary.push(`font: ${uniqueInlineFonts.join(', ')}`);
              }
              
              // Show effective styles being applied (merged result)
              const effectiveStyles = section.contentStyles || {};
              const appliedStylesList = [];
              if (effectiveStyles.fontSize) appliedStylesList.push(`size: ${effectiveStyles.fontSize}`);
              if (effectiveStyles.lineHeight) appliedStylesList.push(`line-height: ${effectiveStyles.lineHeight}`);
              if (effectiveStyles.fontWeight) appliedStylesList.push(`weight: ${effectiveStyles.fontWeight}`);
              if (effectiveStyles.color) appliedStylesList.push(`color: ${effectiveStyles.color}`);
              if (effectiveStyles.textAlign) appliedStylesList.push(`align: ${effectiveStyles.textAlign}`);
              
              if (appliedStylesList.length > 0) {
                inlineStyleSummary.push(appliedStylesList.join(', '));
              }

              if (wasModified) {
                processedItems++;
                sectionProcessedItems++;
                console.log(`   📝 Item ${iIndex + 1}: Styled content`);
              } else {
                console.log(`   📄 Item ${iIndex + 1}: No styles applied (no content to process)`);
              }

              if (inlineStyleSummary.length > 0) {
                console.log(`   🧷 Item ${iIndex + 1}: ${inlineStyleSummary.join('; ')}`);
              }
            }

            if (item.calloutText && typeof item.calloutText === 'string') {
              item.calloutText = sanitizeHtmlFragment(item.calloutText);
              let originalCalloutText = item.calloutText;
              let calloutWasModified = false;

              const mergedContentStyles = section.contentStyles && Object.keys(section.contentStyles).length > 0
                ? section.contentStyles
                : safeUsedConfig.contentStyles;

              if (mergedContentStyles && Object.keys(mergedContentStyles).length > 0) {
                const contentStyles = mergedContentStyles;
                let cssProperties = [];
                if (contentStyles.fontFamily) {
                  cssProperties.push(`font-family: ${contentStyles.fontFamily} !important`);
                }
                if (contentStyles.fontSize) {
                  cssProperties.push(`font-size: ${contentStyles.fontSize}`);
                }
                if (contentStyles.lineHeight) {
                  cssProperties.push(`line-height: ${contentStyles.lineHeight}`);
                }
                if (contentStyles.color) {
                  cssProperties.push(`color: ${contentStyles.color} !important`);
                }
                if (contentStyles.textAlign) {
                  cssProperties.push(`text-align: ${contentStyles.textAlign} !important`);
                }

                const newCSSString = cssProperties.join('; ');

                item.calloutText = item.calloutText.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
                  attrs = attrs || '';
                  const classMatch = attrs.match(/class="([^"]*)"/i);
                  if (classMatch) {
                    if (!classMatch[1].includes('mob-text')) {
                      attrs = attrs.replace(/class="([^"]*)"/i, `class="$1 mob-text"`);
                    }
                  } else {
                    attrs = ` class="mob-text"${attrs}`;
                  }
                  const styleMatch = attrs.match(/style="([^"]*)"/i);
                  if (styleMatch) {
                    let existingStyle = styleMatch[1];
                    existingStyle = existingStyle
                      .replace(/font-family:[^;]*;?/gi, '')
                      .replace(/font-size:[^;]*;?/gi, '')
                      .replace(/line-height:[^;]*;?/gi, '')
                      .replace(/color:[^;]*;?/gi, '')
                      .replace(/text-align:[^;]*;?/gi, '');
                    const combinedStyle = `${existingStyle}; ${newCSSString}`.replace(/^;+|;+$/g, '');
                    return `<p${attrs.replace(/style="[^"]*"/i, `style="${combinedStyle}"`)}>`;
                  }
                  return `<p${attrs} style="${newCSSString}">`;
                });
                calloutWasModified = true;
              }

              if (calloutWasModified && item.calloutText !== originalCalloutText) {
                console.log(`    🗨️  Processed calloutText in section "${section.type}" item ${iIndex + 1}`);
              }
            }
          });
          
          // Section summary
          if (sectionTotalItems > 0) {
            const sectionStatus = sectionProcessedItems === sectionTotalItems ? '✅' : '⚠️ ';
            sectionSummary.push({
              type: section.type,
              processed: sectionProcessedItems,
              total: sectionTotalItems,
              hasConfig: !usingFallback,
              configName: usingFallback ? 'default' : section.type
            });
            console.log(`   ${sectionStatus} Section summary: ${sectionProcessedItems}/${sectionTotalItems} items styled`);
            console.log('');
          }
        }
      });

      console.log('🧩 Section styles injection summary:');
      console.log(`   - Sections: ${newsletterData.sections.length}`);
      console.log(`   - Matched config: ${sectionsWithMatchedConfig}`);
      console.log(`   - Default config: ${sectionsUsingDefaultConfig}`);
      console.log(`   - Injected contentStyles: ${sectionsWithInjectedContentStyles}`);
      
      // Overall summary
      console.log('📊 Style Processing Summary:');
      console.log('═══════════════════════════');
      sectionSummary.forEach((summary, index) => {
        const statusIcon = summary.hasConfig ? '✅' : '⚠️ ';
        const configText = summary.hasConfig ? `custom "${summary.type}" config` : 'fallback "default" config';
        console.log(`${statusIcon} ${summary.type}: ${summary.processed}/${summary.total} items (${configText})`);
      });
      
      const unconfiguredSections = sectionSummary.filter(s => !s.hasConfig);
      if (unconfiguredSections.length > 0) {
        console.log('');
        console.log('💡 Tip: Create specific configurations for these section types:');
        unconfiguredSections.forEach(s => {
          console.log(`   • "${s.type}" section type needs configuration`);
        });
      }
      
      console.log('');
      console.log(`✅ Total: ${processedItems}/${totalItems} items processed successfully`);
      logSectionBackgroundOverrides(newsletterData.sections, theme);
    }

    // Process header contentStyles and containerStyles (similar to intro processing)
    if (newsletterData.header) {
      const header = newsletterData.header;
      
      // Get header config from section-styles.json
      const headerConfig = sectionStyles.sectionStyles
        ? sectionStyles.sectionStyles.header || {}
        : {};
      
      // Default header styles
      const defaultHeaderContainerStyles = {
        backgroundColor: null,
        padding: '20px'
      };
      const defaultHeaderContentStyles = {
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: '18px',
        lineHeight: '23px',
        fontWeight: '400',
        color: '#000000',
        authorFontSize: '16px',
        authorFontWeight: '600',
        artistFontSize: '16px',
        anchorColor: '#000000'
      };
      
      // Get incoming styles from markdown frontmatter
      const incomingHeaderContainerStyles =
        header.containerStyles && typeof header.containerStyles === 'object'
          ? { ...header.containerStyles }
          : {};
      const incomingHeaderContentStyles =
        header.contentStyles && typeof header.contentStyles === 'object'
          ? { ...header.contentStyles }
          : {};
      
      // Merge: defaults < section-styles.json config < markdown frontmatter
      const baseHeaderContainerStyles =
        headerConfig.containerStyles && typeof headerConfig.containerStyles === 'object'
          ? { ...defaultHeaderContainerStyles, ...headerConfig.containerStyles }
          : { ...defaultHeaderContainerStyles };
      const baseHeaderContentStyles =
        headerConfig.contentStyles && typeof headerConfig.contentStyles === 'object'
          ? { ...defaultHeaderContentStyles, ...headerConfig.contentStyles }
          : { ...defaultHeaderContentStyles };
      
      header.containerStyles = { ...baseHeaderContainerStyles, ...incomingHeaderContainerStyles };
      header.contentStyles = { ...baseHeaderContentStyles, ...incomingHeaderContentStyles };
    }

    if (newsletterData.intro) {
      const intro = newsletterData.intro;
      const applyContentStylesToHtml = (html, styles = {}) => {
        if (!html || typeof html !== 'string') return html;
        const cssProperties = [];
        if (styles.fontFamily) cssProperties.push(`font-family: ${styles.fontFamily} !important`);
        if (styles.fontSize) cssProperties.push(`font-size: ${styles.fontSize}`);
        if (styles.lineHeight) cssProperties.push(`line-height: ${styles.lineHeight}`);
        if (styles.fontStyle) cssProperties.push(`font-style: ${styles.fontStyle} !important`);
        if (styles.color) cssProperties.push(`color: ${styles.color} !important`);
        if (styles.textAlign) cssProperties.push(`text-align: ${styles.textAlign} !important`);
        if (!cssProperties.length) return html;
        const newCSSString = cssProperties.join('; ');
        return html.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
          attrs = attrs || '';
          // Add mob-text class for mobile media query targeting
          const classMatch = attrs.match(/class="([^"]*)"/i);
          if (classMatch) {
            if (!classMatch[1].includes('mob-text')) {
              attrs = attrs.replace(/class="([^"]*)"/i, `class="$1 mob-text"`);
            }
          } else {
            attrs = ` class="mob-text"${attrs}`;
          }
          const styleMatch = attrs.match(/style="([^"]*)"/i);
          if (styleMatch) {
            let existingStyle = styleMatch[1];
            existingStyle = existingStyle
              .replace(/font-family:[^;]*;?/gi, '')
              .replace(/font-size:[^;]*;?/gi, '')
              .replace(/line-height:[^;]*;?/gi, '')
              .replace(/font-style:[^;]*;?/gi, '')
              .replace(/color:[^;]*;?/gi, '')
              .replace(/text-align:[^;]*;?/gi, '');
            const combinedStyle = `${existingStyle}; ${newCSSString}`.replace(/^;+|;+$/g, '');
            return `<p${attrs.replace(/style="[^"]*"/i, `style="${combinedStyle}"`)}>`;
          }
          return `<p${attrs} style="${newCSSString}">`;
        });
      };

      // --- Set mobile text override properties from globalOverrides.mobileAdjustments ---
      // These are used by the layout template's media query to override inline
      // font-size on <p class="mob-text"> elements on mobile viewports.
      const globalOverrides = sectionStyles.globalOverrides || {};
      const mobileAdj = globalOverrides.mobileAdjustments || {};
      if (mobileAdj.contentStyles) {
        const mc = mobileAdj.contentStyles;
        if (mc.fontSize) {
          newsletterData.mobileTextFontSize = mc.fontSize;
        }
        if (mc.lineHeight) {
          newsletterData.mobileTextLineHeight = mc.lineHeight;
        }
        const setProps = [mc.fontSize && 'fontSize', mc.lineHeight && 'lineHeight'].filter(Boolean);
        if (setProps.length) {
          console.log(`📱 Mobile text overrides: ${setProps.join(', ')} → .mob-text in media query (from globalOverrides.mobileAdjustments)`);
        }
      }

      if (mobileAdj.captionStyles) {
        const mc = mobileAdj.captionStyles;
        if (mc.fontSize) {
          newsletterData.mobileCaptionFontSize = mc.fontSize;
        }
        if (mc.lineHeight) {
          newsletterData.mobileCaptionLineHeight = mc.lineHeight;
        }
        const setProps = [mc.fontSize && 'fontSize', mc.lineHeight && 'lineHeight'].filter(Boolean);
        if (setProps.length) {
          console.log(`📱 Mobile caption overrides: ${setProps.join(', ')} → .mob-caption in media query (from globalOverrides.mobileAdjustments)`);
        }
      }

      const introContentConfig = sectionStyles.sectionStyles
        ? sectionStyles.sectionStyles['intro-content'] ||
          sectionStyles.sectionStyles.introContent ||
          sectionStyles.sectionStyles.intro ||
          {}
        : {};
      const defaultIntroContainerStyles = {
        backgroundColor: null,
        padding: '0',
        borderRadius: '0px'
      };
      const defaultIntroContentStyles = {
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        fontWeight: '400',
        color: '#000000',
        textAlign: 'left'
      };
      const incomingIntroContainerStyles =
        intro.containerStyles && typeof intro.containerStyles === 'object'
          ? { ...intro.containerStyles }
          : {};
      const incomingIntroContentStyles =
        intro.contentStyles && typeof intro.contentStyles === 'object'
          ? { ...intro.contentStyles }
          : {};
      const baseIntroContainerStyles =
        introContentConfig.containerStyles && typeof introContentConfig.containerStyles === 'object'
          ? { ...defaultIntroContainerStyles, ...introContentConfig.containerStyles }
          : { ...defaultIntroContainerStyles };
      const baseIntroContentStyles =
        introContentConfig.contentStyles && typeof introContentConfig.contentStyles === 'object'
          ? { ...defaultIntroContentStyles, ...introContentConfig.contentStyles }
          : { ...defaultIntroContentStyles };

      intro.containerStyles = { ...baseIntroContainerStyles, ...incomingIntroContainerStyles };
      intro.contentStyles = { ...baseIntroContentStyles, ...incomingIntroContentStyles };
      if (intro.content && intro.contentStyles) {
        intro.content = applyContentStylesToHtml(intro.content, intro.contentStyles);
      }

      const introAsideConfig = sectionStyles.sectionStyles
        ? sectionStyles.sectionStyles['intro-aside'] ||
          sectionStyles.sectionStyles.introAside ||
          sectionStyles.sectionStyles.intro ||
          {}
        : {};
      const defaultIntroAsideContainerStyles = {
        backgroundColor: null,
        padding: '12px 14px',
        borderRadius: '6px',
        borderLeftColor: '#d7d1c6',
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid'
      };
      const defaultIntroAsideContentStyles = {
        fontFamily: 'Merriweather, serif',
        fontSize: '18px',
        lineHeight: '23px',
        fontStyle: 'italic',
        color: '#3f3f3f',
        textAlign: 'left'
      };
      const isAsideObject = intro.aside && typeof intro.aside === 'object' && !Array.isArray(intro.aside);
      const aside = isAsideObject ? { ...intro.aside } : { content: intro.aside };
      const incomingAsideContainerStyles =
        (aside.containerStyles && typeof aside.containerStyles === 'object')
          ? { ...aside.containerStyles }
          : (intro.asideContainerStyles && typeof intro.asideContainerStyles === 'object')
            ? { ...intro.asideContainerStyles }
            : {};
      const incomingAsideContentStyles =
        (aside.contentStyles && typeof aside.contentStyles === 'object')
          ? { ...aside.contentStyles }
          : (intro.asideContentStyles && typeof intro.asideContentStyles === 'object')
            ? { ...intro.asideContentStyles }
            : {};
      const baseAsideContainerStyles =
        introAsideConfig.containerStyles && typeof introAsideConfig.containerStyles === 'object'
          ? { ...defaultIntroAsideContainerStyles, ...introAsideConfig.containerStyles }
          : { ...defaultIntroAsideContainerStyles };
      const baseAsideContentStyles =
        introAsideConfig.contentStyles && typeof introAsideConfig.contentStyles === 'object'
          ? { ...defaultIntroAsideContentStyles, ...introAsideConfig.contentStyles }
          : { ...defaultIntroAsideContentStyles };

      aside.containerStyles = { ...baseAsideContainerStyles, ...incomingAsideContainerStyles };
      aside.contentStyles = { ...baseAsideContentStyles, ...incomingAsideContentStyles };
      if (!aside.content && !isAsideObject) {
        aside.content = intro.aside;
      }
      if (aside.content && aside.contentStyles) {
        aside.content = applyContentStylesToHtml(aside.content, aside.contentStyles);
      }

      // Only set intro.aside if there's actual content to display
      // Otherwise the template conditional will be truthy but render empty/broken
      if (aside.content) {
        intro.aside = aside;
      } else {
        delete intro.aside;
      }
    }
    
    // Write updated newsletter data back to file
    // For templates that render `item.content` for classifieds, copy the
    // preprocessed/styled `item.description` into `item.content` so the
    // template receives the inlined styles. This intentionally overwrites
    // `item.content` for classifieds because the template expects `content`.
    if (newsletterData.sections && Array.isArray(newsletterData.sections)) {
      newsletterData.sections.forEach(section => {
        if (!section || !section.items) return;
        if (section.type === 'classifieds') {
          section.items.forEach(item => {
            if (item.description) {
              item.content = item.description;
            }
          });
        }
      });
    }

    fs.writeFileSync(dataNewsletterJson, JSON.stringify(newsletterData, null, 2));
    console.log(`✅ Theme and section style data injected for Maizzle processing`);
    
    // Validate images in the newsletter data
    await validateImages(newsletterData);
    await validateLinks(newsletterData);

    // Build the newsletter
    console.log('🔨 Building newsletter...');
    console.log('');

    // Run Maizzle build from the repo root.
    // Popup jobs mail uses a dedicated programmatic build path so it can avoid
    // the shared build_production directory and the fragile juice phase.
    const originalCwd = process.cwd();
    let builtNewsletterPath = null;
    let popupJobsBuildDir = null;
    try {
      process.chdir(REPO_ROOT);
      console.log(`📍 Build directory: ${process.cwd()}`);
      if (templateName === 'popup-jobs-mail') {
        const popupJobsBuildDirName = `build_popup_jobs_mail_${process.pid}_${Date.now()}`;
        popupJobsBuildDir = await buildPopupJobsMailTemplate({
          repoRoot: REPO_ROOT,
          newsletterData,
          templateName,
          buildDirName: popupJobsBuildDirName,
        });
        builtNewsletterPath = resolveBuiltNewsletterPath(popupJobsBuildDir, templateName);
      } else {
        execSync('npx maizzle build production', { stdio: 'inherit' });
        builtNewsletterPath = resolveBuiltNewsletterPath(
          repoPath(REPO_ROOT, 'build_production'),
          templateName,
        );
      }
    } finally {
      process.chdir(originalCwd);
    }

    if (!builtNewsletterPath) {
      throw new Error(`Maizzle build failed - newsletter.html not created in either location`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`📦 Saving as ${finalOutputPath}...`);
    const builtHtmlRaw = normalizeInlineStyleAttributeWhitespace(
      fs.readFileSync(builtNewsletterPath, 'utf8'),
    );
    const hardenedBuiltHtml = hardenEmailHtmlForMobile(builtHtmlRaw, {
      longTokenThreshold: 35,
    });
    if (hardenedBuiltHtml.breakInsertions > 0) {
      console.log(
        `📱 Inserted ${hardenedBuiltHtml.breakInsertions} mobile break opportunity marker(s) in visible content`,
      );
    }
    reportMobileFitWarnings(hardenedBuiltHtml.warnings);
    const { content: finalOutputRaw, preservedFrontmatter } = mergeFrontmatterWithHtml(
      existingOutputRawBeforeBuild,
      hardenedBuiltHtml.html,
    );
    fs.writeFileSync(finalOutputPath, finalOutputRaw, 'utf8');
    if (preservedFrontmatter) {
      console.log('🧷 Preserved existing HTML frontmatter');
    }
    if (popupJobsBuildDir) {
      fs.rmSync(popupJobsBuildDir, { recursive: true, force: true });
    }

    console.log('');
    console.log('✅ Newsletter Built Successfully!');
    console.log('═══════════════════════════════');
    console.log(`📧 File: ${finalOutputPath}`);
    console.log(`🎨 Template: ${templateName}`);
    console.log(`📄 Source: ${inputPath}`);
    
    // Check for --no-open flag
    const noOpenFlag = args.includes('--no-open');
    if (!noOpenFlag) {
      console.log('');
      console.log('🌐 Opening newsletter...');
      try {
        execSync(`open ${finalOutputPath}`, { stdio: 'ignore' });
      } catch (openError) {
        console.log('⚠️  Could not auto-open file (you can open it manually)');
      }
    }
    if (dataNewsletterJson) {
      if (shouldRestorePriorNewsletterJson) {
        if (priorNewsletterJsonRaw !== null) {
          fs.writeFileSync(dataNewsletterJson, priorNewsletterJsonRaw);
        } else if (fs.existsSync(dataNewsletterJson)) {
          fs.unlinkSync(dataNewsletterJson);
        }
      } else if (originalNewsletterJsonRaw !== null) {
        fs.writeFileSync(dataNewsletterJson, originalNewsletterJsonRaw);
      }
    }

  } catch (error) {
    if (dataNewsletterJson) {
      try {
        if (shouldRestorePriorNewsletterJson) {
          if (priorNewsletterJsonRaw !== null) {
            fs.writeFileSync(dataNewsletterJson, priorNewsletterJsonRaw);
          } else if (fs.existsSync(dataNewsletterJson)) {
            fs.unlinkSync(dataNewsletterJson);
          }
        } else if (originalNewsletterJsonRaw !== null) {
          fs.writeFileSync(dataNewsletterJson, originalNewsletterJsonRaw);
        }
      } catch (restoreError) {
        console.error(`⚠️  Failed to restore source JSON: ${restoreError.message}`);
      }
    }
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildNewsletter();
