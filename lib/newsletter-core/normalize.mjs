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
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (lowerParts[index] === familyLower) {
        parts.splice(index, 1);
        lowerParts.splice(index, 1);
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
    lowerParts.includes(family),
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

/**
 * Recursively normalize font family values so HTML/CSS output does not inherit
 * escaped entities or broken quote wrappers from stored JSON/YAML.
 *
 * @param {unknown} value
 */
export function normalizeFontFamiliesDeep(value) {
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

/**
 * Remove build-time helper fields so validation operates on author source data
 * rather than fields injected by a previous render pass.
 *
 * @param {object} newsletterData
 */
export function pruneBuildInjectedFields(newsletterData) {
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

  if (newsletterData.intro && typeof newsletterData.intro === 'object') {
    delete newsletterData.intro.viewOnlineLink;
  }

  if (!Array.isArray(newsletterData.sections)) return;

  newsletterData.sections.forEach((section) => {
    if (!section || typeof section !== 'object') return;
    delete section.viewOnlineLink;
    delete section._contentStyleOverrides;
    delete section.descriptionStyles;
    delete section.spacerBackgroundColor;
    delete section.headingStylesInline;
    delete section.linkStylesInline;
    delete section.labelStylesInline;
    delete section.articleCtaStylesInline;
    delete section.statement_rendered_html;
    if (Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        delete item.renderMode;
      });
    }
  });
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

/**
 * Decode escaped unicode sequences recursively so validation and exporters see
 * the actual characters represented in YAML/JSON.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeEscapedUnicodeDeep(value) {
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

/**
 * Normalize source newsletter data into the structure expected by validation and
 * downstream renderers before any template-specific styling is applied.
 *
 * @param {object} newsletterData
 * @param {{ logger?: Pick<Console, 'log'> }} options
 */
export function normalizeNewsletterForSchemaValidation(newsletterData, { logger = console } = {}) {
  const unicodeFixes = normalizeEscapedUnicodeDeep(newsletterData);
  if (unicodeFixes > 0) {
    logger.log(`🔡 Decoded ${unicodeFixes} escaped Unicode string${unicodeFixes === 1 ? '' : 's'} in newsletter data`);
  }

  normalizeFontFamiliesDeep(newsletterData);
  if (!newsletterData || typeof newsletterData !== 'object' || !Array.isArray(newsletterData.sections)) {
    return;
  }

  newsletterData.sections.forEach((section) => {
    if (!section || typeof section !== 'object') return;

    if (typeof section.backgroundColor === 'string' && section.backgroundColor.trim().length) {
      section.containerStyles = (section.containerStyles && typeof section.containerStyles === 'object' && !Array.isArray(section.containerStyles))
        ? section.containerStyles
        : {};
      if (section.containerStyles.backgroundColor == null) {
        section.containerStyles.backgroundColor = section.backgroundColor.trim();
      }
      delete section.backgroundColor;
    }

    if (section.type === 'classifieds' && Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        if (!item.content && typeof item.description === 'string') {
          item.content = item.description;
        }
        if (item.content && typeof item.description === 'string') {
          delete item.description;
        }
      });
    }
  });
}
