import { JSDOM } from 'jsdom';

// Inline !important beats dark media rules even when the selector is more specific.
// Release only text-color priorities on surfaces managed by Dense Discovery's
// flatten policy. Keep the authored light color and all typography priorities.
// Source offsets let us preserve email comments, attributes, and HTML byte layout.
export function releaseDarkModeTextColors(html, policy) {
  if (!policy?.flatten || !html) return html;
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const patches = [];
  const selector = '.dm-bg[style], .dm-bg [style], .dm-text[style], .dm-muted[style], .dm-link[style]';

  for (const element of dom.window.document.querySelectorAll(selector)) {
    const location = dom.nodeLocation(element)?.attrs?.style;
    if (!location) continue;
    const original = html.slice(location.startOffset, location.endOffset);
    const updated = original.replace(/^(style\s*=\s*)(["'])([\s\S]*)\2$/i, (_match, prefix, quote, value) => {
      const color = value.replace(/(^|;)(\s*color\s*:[^;]*?)\s*!important(\s*)(?=;|$)/gi, '$1$2$3');
      return `${prefix}${quote}${color}${quote}`;
    });
    if (original !== updated) patches.push({ ...location, updated });
  }
  dom.window.close();

  // Apply from the end so earlier source offsets remain valid.
  for (const patch of patches.sort((a, b) => b.startOffset - a.startOffset)) {
    html = html.slice(0, patch.startOffset) + patch.updated + html.slice(patch.endOffset);
  }
  return html;
}
