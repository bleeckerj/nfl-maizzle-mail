import { JSDOM } from 'jsdom';

// Keep prose links underlined while inheriting the surrounding editorial type.
// This changes only the render payload; the newsletter source is never rewritten.
const DEFAULT_LINK_STYLES = Object.freeze({
  color: '#333',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'normal',
  lineHeight: 'inherit',
  textDecoration: 'underline',
});

export function styleDailyHeadlinesArticleLinks(article, overrides = {}) {
  const styles = { ...DEFAULT_LINK_STYLES, ...overrides };
  function styleLinks(html) {
    if (typeof html !== 'string' || !/<a(?:\s|>)/i.test(html)) return html;
    const fragment = JSDOM.fragment(html);
    for (const anchor of fragment.querySelectorAll('a')) {
      for (const [name, value] of Object.entries(styles)) {
        if (value === undefined || value === null) continue;
        const property = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        anchor.style.setProperty(property, String(value).replace(/\s*!important\s*$/i, ''), /!important\s*$/i.test(String(value)) ? 'important' : '');
      }
    }
    const container = fragment.ownerDocument.createElement('div');
    container.append(fragment);
    return container.innerHTML;
  }
  if (typeof article.lede === 'string') article.lede = styleLinks(article.lede);
  for (const block of Array.isArray(article.body_blocks) ? article.body_blocks : []) {
    if (block?.type === 'text') block.html = styleLinks(block.html);
  }
}
