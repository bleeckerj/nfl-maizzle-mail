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
