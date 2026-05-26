// Deterministic style harvester. Walks each candidate section and extracts
// the dominant inline-style declarations, bucketed into the shape that
// templates/<name>/section-styles.json uses:
//   {
//     containerStyles: { backgroundColor, padding, borderRadius, borderLeft* },
//     contentStyles:   { fontFamily, fontSize, lineHeight, fontWeight, color, textAlign },
//     linkStyles:      { color, textDecoration, fontWeight },
//     headingStyles:   { fontFamily, fontSize, fontWeight, color }
//   }
//
// Strategy: for each bucket we count occurrences of each property value across
// the relevant descendant set and pick the mode. This gives us the "dominant"
// look without being fooled by one-off overrides.

const CONTAINER_PROPS = [
  'background-color',
  'background',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-radius',
  'border-left',
  'border-left-color',
  'border-left-width',
  'border-left-style',
  'border-top',
  'border-bottom',
];
const CONTENT_PROPS = [
  'font-family',
  'font-size',
  'line-height',
  'font-weight',
  'color',
  'text-align',
  'font-style',
];
const LINK_PROPS = ['color', 'text-decoration', 'font-weight'];
const HEADING_PROPS = ['font-family', 'font-size', 'font-weight', 'color', 'line-height'];

export function harvest(candidate) {
  const el = candidate.element;
  const container = harvestContainer(el);
  const content = harvestContent(el);
  const links = harvestLinks(el);
  const headings = harvestHeadings(el);
  return {
    containerStyles: toCamel(container),
    contentStyles: toCamel(content),
    linkStyles: toCamel(links),
    headingStyles: toCamel(headings),
  };
}

function harvestContainer(el) {
  // Container styles live on the outermost element + first wrapping tables/tds
  // (email HTML wraps payload tables for layout). Sample those.
  const targets = [el, ...descendantsWithLayoutRole(el).slice(0, 6)];
  return pickDominant(targets, CONTAINER_PROPS);
}

function harvestContent(el) {
  // Content styles come from text-bearing descendants (p, span, td, div containing text).
  const targets = [...el.querySelectorAll('p, span, td, div')].filter(
    (n) => {
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      // Avoid double-counting nested wrappers — only count nodes whose direct text
      // contributes most of their content.
      if (t.length < 8) return false;
      const childText = [...n.children]
        .map((c) => c.textContent.replace(/\s+/g, ' ').trim().length)
        .reduce((a, b) => a + b, 0);
      return t.length - childText >= 5;
    }
  );
  return pickDominant(targets, CONTENT_PROPS);
}

function harvestLinks(el) {
  const targets = [...el.querySelectorAll('a')].filter(
    (a) => a.textContent.trim().length > 0
  );
  return pickDominant(targets, LINK_PROPS);
}

function harvestHeadings(el) {
  const targets = [...el.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (targets.length === 0) {
    // No real headings — fall back to spans/strong elements with notably larger font-size.
    return {};
  }
  return pickDominant(targets, HEADING_PROPS);
}

function descendantsWithLayoutRole(el) {
  return [...el.querySelectorAll('table, td')];
}

function pickDominant(elements, props) {
  const buckets = Object.create(null);
  for (const node of elements) {
    const style = parseStyleAttr(node.getAttribute && node.getAttribute('style'));
    for (const prop of props) {
      const val = style[prop];
      if (!val) continue;
      if (!buckets[prop]) buckets[prop] = new Map();
      buckets[prop].set(val, (buckets[prop].get(val) || 0) + 1);
    }
  }
  const out = {};
  for (const [prop, counts] of Object.entries(buckets)) {
    let bestVal = null;
    let bestN = 0;
    for (const [val, n] of counts) {
      if (n > bestN) {
        bestN = n;
        bestVal = val;
      }
    }
    if (bestVal != null) out[prop] = bestVal;
  }
  return out;
}

function parseStyleAttr(s) {
  const out = Object.create(null);
  if (!s) return out;
  for (const decl of s.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const k = decl.slice(0, idx).trim().toLowerCase();
    const v = decl.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

function toCamel(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}
