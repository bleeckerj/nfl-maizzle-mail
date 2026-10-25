import { JSDOM } from 'jsdom';
import { canonicalContentId } from './link-tracking-metadata.mjs';

// Compact serialized tracking provenance without changing its parsed value.
// JSON double quotes can remain literal inside a single-quoted HTML attribute.
// This preserves the sending platform's metadata while reducing email bytes.
export function compactTrackingProvenanceAttributes(html) {
  if (typeof html !== 'string') return html;
  return html.replace(/(\sdata-content-provenance=)"([^"]*)"/gi, (original, prefix, value) => {
    const compactValue = value.replace(/&quot;/g, '"').replace(/'/g, '&#39;');
    const compactAttribute = `${prefix}'${compactValue}'`;
    return compactAttribute.length < original.length ? compactAttribute : original;
  });
}

// The sending platform reconstructs a missing URL-derived ID from href.
// Use source locations to remove only that attribute without reserializing HTML,
// changing conditional comments, or touching authored IDs and provenance.
export function omitRedundantCanonicalContentIds(html) {
  if (typeof html !== 'string' || !html.includes('data-content-id')) return html;
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const removals = new Map();
  try {
    for (const anchor of dom.window.document.querySelectorAll('a[data-content-id]')) {
      const contentId = anchor.getAttribute('data-content-id');
      const href = anchor.getAttribute('href');
      if (!contentId || !/^https?:\/\//i.test(href || '')) continue;
      try {
        new URL(href);
        const provenance = JSON.parse(anchor.getAttribute('data-content-provenance'));
        if (provenance?.contentId?.source !== 'canonical_url' || canonicalContentId(href) !== contentId) continue;
      } catch {
        continue;
      }
      const location = dom.nodeLocation(anchor)?.startTag;
      if (!location) continue;
      const tag = html.slice(location.startOffset, location.endOffset);
      // Read whole attributes, skipping quoted values that may contain attribute names.
      const attributes = [...tag.matchAll(/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+))?/g)];
      const named = name => attributes.filter(match => match[1].toLowerCase() === name);
      if (['href', 'data-content-id', 'data-content-provenance'].some(name => named(name).length !== 1)) continue;
      const attribute = named('data-content-id')[0];
      removals.set(location.startOffset + attribute.index, attribute[0].length);
    }
    for (const [start, length] of [...removals].sort(([a], [b]) => b - a)) html = html.slice(0, start) + html.slice(start + length);
    return html;
  } finally {
    dom.window.close();
  }
}
