const SLOT_ATTRIBUTE = 'data-content-slot';

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function displayNameForSlot(slotKey) {
  return slotKey
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function kindForSlot(slotKey) {
  return /(^|[_-])cta($|[_-])/i.test(slotKey) ? 'cta' : 'content';
}

/**
 * Builds the downstream content-slot manifest from final rendered newsletter HTML.
 *
 * @param {string} html Final built HTML after link metadata enrichment.
 * @param {object} context Build metadata included in the manifest.
 * @returns {object} Stable manifest consumed by soup-to-nuts campaign tooling.
 */
export function buildContentSlotManifest(html, context = {}) {
  const slots = [];
  const seen = new Set();
  const pattern = new RegExp(`${SLOT_ATTRIBUTE}\\s*=\\s*["']([^"']+)["']`, 'gi');

  for (const match of html.matchAll(pattern)) {
    const slotKey = decodeHtmlAttribute(match[1]);
    if (!slotKey || seen.has(slotKey)) continue;
    seen.add(slotKey);
    slots.push({
      slotKey,
      displayName: displayNameForSlot(slotKey),
      kind: kindForSlot(slotKey),
      htmlSelector: `[${SLOT_ATTRIBUTE}="${slotKey}"]`,
      textMarker: `[[content-slot:${slotKey}]]`,
      schemaKey: slotKey,
    });
  }

  return {
    version: 1,
    sourcePath: context.sourcePath,
    outputHtmlPath: context.outputHtmlPath,
    templateName: context.templateName,
    outputName: context.outputName,
    slots,
  };
}
