import { JSDOM } from 'jsdom';

const SKIP_TAGS = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'br']);

export function parse(html) {
  const dom = new JSDOM(html);
  return dom.window.document;
}

export function findLayoutRoot(doc) {
  // The "layout root" is the element whose direct children correspond to the
  // visible top-level sections of the email. Email HTML wraps payload tables
  // in many "passthrough" layers: <table> → <tbody> → <tr> → <td> chains
  // sometimes nested several times before reaching the actual section list.
  //
  // Strategy: start at <body> and walk down. At each step:
  //   - If the current element already has ≥3 structural children, it's the
  //     root (multiple peer sections live here).
  //   - Otherwise, if there's a single dominant structural child carrying
  //     most of the visible text (a passthrough wrapper), descend into it.
  //   - Stop when neither holds.
  const body = lastBody(doc);
  if (!body) throw new Error('No <body> element found');

  // Descend while there's a clearly-dominant child (≥70% of visible text).
  // Stop when the children are roughly peer-sized — that's the layout root.
  // No children-count threshold: <body> with 10 sparse children + one fat
  // wrapper still needs to descend into the wrapper.
  const MAX_DESCENT = 50;
  let cur = body;
  for (let i = 0; i < MAX_DESCENT; i++) {
    const struct = structuralChildren(cur);
    if (struct.length === 0) return cur;
    const totalText = visibleTextLength(cur);
    const dominant = struct
      .slice()
      .sort((a, b) => visibleTextLength(b) - visibleTextLength(a))[0];
    if (visibleTextLength(dominant) < totalText * 0.7) return cur;
    cur = dominant;
  }
  return cur;
}

function structuralChildren(el) {
  return [...el.children].filter(
    (c) => !SKIP_TAGS.has(c.tagName.toLowerCase()) && hasContent(c)
  );
}

function lastBody(doc) {
  const bodies = doc.querySelectorAll('body');
  return bodies[bodies.length - 1] || doc.documentElement;
}

function visibleTextLength(el) {
  // textContent includes <style>/<script> bodies — that's CSS or JS, not
  // visible to the reader. Subtract those so passthrough wrappers around
  // real content (the case where <body> has a fat <style> block sibling
  // alongside the actual layout div) aren't measured against bloated totals.
  const raw = el.textContent.replace(/\s+/g, ' ').trim().length;
  if (raw === 0) return 0;
  let invisible = 0;
  for (const ghost of el.querySelectorAll('style, script, noscript')) {
    invisible += ghost.textContent.replace(/\s+/g, ' ').trim().length;
  }
  return Math.max(raw - invisible, 0);
}

function hasContent(el) {
  const text = visibleTextLength(el);
  if (text >= 5) return true;
  return el.querySelectorAll('img').length > 0;
}

function depthOf(el) {
  let d = 0;
  let cur = el;
  while (cur && cur.parentElement) {
    d += 1;
    cur = cur.parentElement;
  }
  return d;
}

export function segment(html) {
  const doc = parse(html);
  const root = findLayoutRoot(doc);
  const candidates = [];
  let index = 0;
  for (const child of root.children) {
    if (SKIP_TAGS.has(child.tagName.toLowerCase())) continue;
    if (!hasContent(child)) continue;
    candidates.push(extractCandidate(child, index));
    index += 1;
  }
  return { doc, root, candidates };
}

function extractCandidate(el, index) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  const images = [...el.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src') || '',
    alt: i.getAttribute('alt') || '',
    width: i.getAttribute('width') || '',
    height: i.getAttribute('height') || '',
  }));
  const links = [...el.querySelectorAll('a')].map((a) => ({
    href: a.getAttribute('href') || '',
    text: a.textContent.replace(/\s+/g, ' ').trim(),
  }));
  const headings = [...el.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => ({
    level: parseInt(h.tagName.substring(1), 10),
    text: h.textContent.replace(/\s+/g, ' ').trim(),
  }));
  return {
    index,
    tag: el.tagName.toLowerCase(),
    className: el.getAttribute('class') || '',
    id: el.getAttribute('id') || '',
    textSnippet: text.slice(0, 280),
    textLength: text.length,
    imageCount: images.length,
    linkCount: links.length,
    headings,
    images,
    links: links.slice(0, 10),
    outerHTML: el.outerHTML,
    element: el,
  };
}
