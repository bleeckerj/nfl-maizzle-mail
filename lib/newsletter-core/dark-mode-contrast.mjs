// Audit the built email without loading remote assets or running page scripts.
// Juice resolves active dark rules against inline styles. JSDOM provides computed
// colors; this is a CSS contrast check, not an email-client or layout simulator.
import { JSDOM } from 'jsdom';
import juice from 'juice';
import postcss from 'postcss';

export function resolvedPaletteDocument(html, scheme) {
  const source = new JSDOM(html);
  let darkCss = '';
  for (const style of source.window.document.querySelectorAll('style')) {
    postcss.parse(style.textContent).walkAtRules('media', (rule) => {
      if (/prefers-color-scheme:\s*dark/.test(rule.params)) {
        rule.walkRules((darkRule) => {
          try { source.window.document.querySelector(darkRule.selector); }
          catch { throw new Error(`Invalid dark-mode CSS selector: ${darkRule.selector}`); }
        });
        darkCss += rule.nodes.map((node) => node.toString()).join('\n');
      }
    });
  }
  source.window.close();
  return new JSDOM(scheme === 'dark'
    ? juice.inlineContent(html, darkCss, { preserveImportant: true })
    : html);
}

function rgba(value) {
  if (value === 'transparent' || !value) return [0, 0, 0, 0];
  // JSDOM leaves the default light canvas colors as CSS system keywords.
  if (value.toLowerCase() === 'canvastext') return [0, 0, 0, 1];
  if (value.toLowerCase() === 'canvas') return [255, 255, 255, 1];
  if (/^#[\da-f]{6}$/i.test(value)) {
    return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).concat(1);
  }
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Unsupported computed color: ${value}`);
  return [...channels.slice(0, 3), channels[3] ?? 1];
}

function composite(foreground, background) {
  return foreground.slice(0, 3).map((value, index) =>
    value * foreground[3] + background[index] * (1 - foreground[3])).concat(1);
}

function luminance(color) {
  const linear = color.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

function describe(element) {
  return `${element.localName}${element.id ? `#${element.id}` : ''}${[...element.classList].map((name) => `.${name}`).join('')}`;
}

function inheritedFill(element) {
  // JSDOM does not implement WebKit text fill. Read that declaration explicitly
  // so a black button label cannot pass merely because its color is pale blue.
  for (let node = element; node; node = node.parentElement) {
    let fill;
    postcss.parse(`x{${node.getAttribute('style') || ''}}`).walkDecls('-webkit-text-fill-color', (declaration) => {
      fill = declaration.value;
    });
    if (fill && !['inherit', 'unset'].includes(fill.toLowerCase())) return fill;
  }
}

function declaredBackgroundImage(element) {
  // Keep complex authored gradients visible to the audit even when JSDOM's
  // CSS parser cannot compute them. Respect an explicit later image reset.
  let image = 'none';
  let priority = -1;
  postcss.parse(`x{${element.getAttribute('style') || ''}}`).walkDecls((declaration) => {
    const property = declaration.prop.toLowerCase();
    if (!['background', 'background-image'].includes(property)) return;
    const nextPriority = declaration.important ? 1 : 0;
    if (nextPriority < priority) return;
    priority = nextPriority;
    image = property === 'background-image' || /url\(|gradient\(/i.test(declaration.value)
      ? declaration.value : 'none';
  });
  return image;
}

function textContrast(window, element) {
  const ancestors = [];
  for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
  let background = [255, 255, 255, 1];
  for (const node of ancestors) {
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || node.hidden) return { hidden: true };
    if ((style.backgroundImage && style.backgroundImage !== 'none') || declaredBackgroundImage(node) !== 'none') return { unassessed: 'background image or gradient' };
    if (style.opacity && Number(style.opacity) < 1) return { unassessed: 'element opacity' };
    const paint = style.backgroundColor === 'rgba(0, 0, 0, 0)' && node.hasAttribute('bgcolor')
      ? node.getAttribute('bgcolor') : style.backgroundColor;
    const probe = window.document.createElement('span');
    probe.style.backgroundColor = paint;
    background = composite(rgba(window.getComputedStyle(probe).backgroundColor || paint), background);
  }
  const style = window.getComputedStyle(element);
  const fill = inheritedFill(element);
  const color = fill && fill.toLowerCase() !== 'currentcolor' ? fill : style.color || 'rgb(0, 0, 0)';
  const probe = window.document.createElement('span');
  probe.style.color = color;
  const resolvedColor = window.getComputedStyle(probe).color || color;
  const foreground = composite(rgba(resolvedColor), background);
  return { color, background: `rgb(${background.slice(0, 3).join(', ')})`, ratio: contrastRatio(foreground, background) };
}

export function panelContrast(html, selector, scheme) {
  const dom = resolvedPaletteDocument(html, scheme);
  try {
    const panel = dom.window.document.querySelector(selector);
    if (!panel) throw new Error(`Missing contrast fixture: ${selector}`);
    return textContrast(dom.window, panel.querySelector('p') || panel);
  } finally { dom.window.close(); }
}

export function auditTextContrast(html, scheme) {
  const dom = resolvedPaletteDocument(html, scheme);
  const results = [];
  const unassessed = [];
  try {
    const walker = dom.window.document.createTreeWalker(dom.window.document.body, dom.window.NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      const element = node.parentElement;
      if (!text || element.closest('style,script,noscript,template')) continue;
      const result = textContrast(dom.window, element);
      const record = { element: describe(element), text: text.slice(0, 120), ...result };
      if (result.unassessed) unassessed.push(record);
      else if (!result.hidden) results.push(record);
    }
    return {
      scheme,
      checked: results.length,
      minimumContrast: Math.min(...results.map((result) => result.ratio)),
      failures: results.filter((result) => result.ratio < 4.5),
      unassessed,
      artworkFailures: scheme === 'dark'
        ? [...dom.window.document.querySelectorAll('.footer img[alt="Footer Logo"], .footer-social-links img')]
          .filter((element) => dom.window.getComputedStyle(element).filter !== 'brightness(0) invert(1)')
          .map((element) => ({ src: element.getAttribute('src'), alt: element.getAttribute('alt') }))
        : [],
      artwork: [...dom.window.document.querySelectorAll('img.dm-footer-artwork')].map((element) => ({
        src: element.getAttribute('src'),
        width: element.getAttribute('width'),
        height: element.getAttribute('height'),
        filter: dom.window.getComputedStyle(element).filter,
      })),
    };
  } finally { dom.window.close(); }
}

// Run after CSS inlining and priority release, before saving production output.
// Unassessed image-backed text remains a visible review limitation in build logs.
export function assertDarkModeContrast({ html, templateName, policy, logger = console }) {
  if (templateName !== 'dense-discovery' || !policy?.flatten) return null;
  const audit = auditTextContrast(html, 'dark');
  if (audit.failures.length) {
    const details = audit.failures.slice(0, 5).map((item) =>
      `${item.element}: ${item.ratio.toFixed(2)}:1 (${item.color} on ${item.background}) ${item.text}`).join('\n');
    throw new Error(`Dark-mode contrast failed for ${audit.failures.length} text run(s); minimum required is 4.5:1.\n${details}`);
  }
  if (audit.artworkFailures.length) {
    throw new Error(`Dark-mode footer artwork failed: ${audit.artworkFailures.length} logo/icon image(s) lack their dark treatment.`);
  }
  logger.log(`✅ Dark-mode contrast: ${audit.checked} text runs checked, minimum ${audit.minimumContrast.toFixed(2)}:1`);
  if (audit.unassessed.length) {
    logger.warn(`⚠️ Dark-mode contrast: ${audit.unassessed.length} text run(s) require visual review (image backgrounds, gradients or opacity).`);
  }
  return audit;
}
