import { JSDOM } from 'jsdom';

// Convert normalized correspondence content to text without the email layout,
// hidden preheader, or mobile-only word-break markers. Parsing a fragment does
// not run scripts or fetch linked images and stylesheets.
function linkText(label, href) {
  const text = String(label || '').trim();
  const destination = String(href || '').trim();
  if (!destination || destination === text || destination === `mailto:${text}`) return text;
  return text ? `${text} (${destination})` : destination;
}

function htmlToText(html) {
  const fragment = JSDOM.fragment(String(html || ''));
  const children = node => [...node.childNodes].map(visit).join('');

  function visit(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return children(node);

    const tag = node.tagName;
    if (['SCRIPT', 'STYLE', 'HEAD', 'TEMPLATE'].includes(tag) || node.hasAttribute('hidden')
      || /display\s*:\s*none/i.test(node.getAttribute('style') || '')) return '';
    if (tag === 'BR') return '\n';
    if (tag === 'HR') return '\n\n---\n\n';
    if (tag === 'IMG') return node.getAttribute('alt') || '';
    if (tag === 'A') return linkText(children(node), node.getAttribute('href'));

    // Register labels are aria-hidden in HTML because screen readers announce
    // the list structure. Keep their literal numbers once in the text export.
    if (tag === 'TR' && node.getAttribute('role') === 'listitem') {
      const [label, copy] = node.children;
      if (label && copy) return `${label.textContent.trim()}. ${children(copy).trim()}\n`;
    }
    if (tag === 'LI') {
      const parent = node.parentElement;
      const requestedStart = Number.parseInt(parent?.getAttribute('start') ?? '1', 10);
      const start = Number.isFinite(requestedStart) ? requestedStart : 1;
      const index = parent ? [...parent.children].indexOf(node) : 0;
      const marker = parent?.tagName === 'OL' ? `${start + index}.` : '-';
      return `${marker} ${children(node).trim()}\n`;
    }
    if (tag === 'TR') return [...node.children].map(children).join(' ') + '\n';
    const content = children(node);
    if (['P', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) return `\n\n${content}\n\n`;
    if (['DIV', 'TABLE', 'UL', 'OL'].includes(tag)) return `${content}\n`;
    return content;
  }

  return children(fragment)
    .replace(/[\u200b\ufeff]/g, '')
    .split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// The canonical normalizer owns the field defaults and Markdown conversion.
// This formatter reads those same visible fields for a sibling .txt file.
export function renderCorrespondencePlainText(data) {
  const message = data.correspondence;
  const blocks = [];
  if (message.showSubject) blocks.push(message.subject);
  if (message.showFromHeader && message.from.name) {
    blocks.push(['name', 'role', 'organization', 'email']
      .map(key => message.from[key]).filter(Boolean).join('\n'));
  }
  blocks.push(htmlToText(message.bodyHtml), htmlToText(message.signatureHtml));

  if (message.sharedItems.length) {
    blocks.push(message.sharedItemsHeading);
    for (const item of message.sharedItems) {
      blocks.push([item.label, linkText(item.title, item.href), htmlToText(item.descriptionHtml)]
        .filter(Boolean).join('\n'));
    }
  }
  blocks.push(htmlToText(message.footerNote));
  blocks.push(message.footerLinks.map(item => linkText(item.label, item.href)).join('\n'));
  return blocks.filter(Boolean).join('\n\n').trim() + '\n';
}
