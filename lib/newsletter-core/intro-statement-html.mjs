import { JSDOM } from 'jsdom';

const ALLOWED_TAGS = new Set(['p', 'em', 'strong', 'a']);
const ALLOWED_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const DROP_WITH_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed']);

function hasHtmlTag(value) {
  return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);
}

function isAllowedHref(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim(), 'https://nearfuturelaboratory.com');
    return ALLOWED_HREF_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function unwrapElement(element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function sanitizeElement(element) {
  const tagName = element.tagName.toLowerCase();
  if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    unwrapElement(element);
    return;
  }

  const href = tagName === 'a' ? element.getAttribute('href') : '';
  for (const attribute of Array.from(element.attributes)) {
    element.removeAttribute(attribute.name);
  }

  if (tagName === 'a') {
    if (isAllowedHref(href)) {
      element.setAttribute('href', href.trim());
    } else {
      unwrapElement(element);
    }
  }
}

export function sanitizeIntroStatementHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';

  const dom = new JSDOM(`<body>${html}</body>`);
  const { document, NodeFilter } = dom.window;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  while (walker.nextNode()) {
    elements.push(walker.currentNode);
  }

  elements.reverse().forEach((element) => sanitizeElement(element));

  return document.body.innerHTML
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function normalizeIntroStatementSection(section) {
  if (!section || typeof section !== 'object' || section.type !== 'intro_statement') {
    return false;
  }

  const source = typeof section.statement_html === 'string' && section.statement_html.trim()
    ? section.statement_html
    : hasHtmlTag(section.statement)
      ? section.statement
      : '';

  if (!source) {
    delete section.statement_rendered_html;
    return false;
  }

  const sanitized = sanitizeIntroStatementHtml(source);
  if (!sanitized) {
    delete section.statement_rendered_html;
    return false;
  }

  section.statement_rendered_html = sanitized;
  return true;
}

export function normalizeIntroStatementSections(newsletterData) {
  if (!newsletterData || !Array.isArray(newsletterData.sections)) return 0;
  let normalized = 0;
  newsletterData.sections.forEach((section) => {
    if (normalizeIntroStatementSection(section)) normalized += 1;
  });
  return normalized;
}
