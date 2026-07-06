import fs from 'node:fs';
import path from 'node:path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import matter from 'gray-matter';

export const DEFAULT_CORRESPONDENCE_TEMPLATE = 'standard-correspondence';

const MONOSPACE_FONT_STACK = [
  'JetBrainsMono Nerd Font',
  'MesloLGS NF',
  'FiraCode Nerd Font',
  'Hack Nerd Font',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'Liberation Mono',
  'Courier New',
  'monospace',
].join(', ');

const DEFAULT_THEME = {
  backgroundColor: '#ffffff',
  surfaceColor: '#ffffff',
  textColor: '#222222',
  mutedTextColor: '#666f7a',
  linkColor: '#0b63ce',
  borderColor: '#e5e5e5',
  accentColor: '#0b63ce',
  fontFamily: MONOSPACE_FONT_STACK,
  serifFontFamily: MONOSPACE_FONT_STACK,
};

const SAFE_HREF_PATTERN = /^(https?:\/\/|mailto:|tel:)/i;
const SAFE_IMAGE_SRC_PATTERN = /^(https?:\/\/|cid:|data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,])/i;

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtmlAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function sanitizeHref(value) {
  const href = String(value ?? '').trim();
  if (!href || !SAFE_HREF_PATTERN.test(href)) return null;
  return href;
}

function sanitizeImageSrc(value) {
  const src = String(value ?? '').trim();
  if (!src || !SAFE_IMAGE_SRC_PATTERN.test(src)) return null;
  return src;
}

function stashHtml(stash, html) {
  const token = `%%CORRESPONDENCEHTMLTOKEN${stash.length}%%`;
  stash.push([token, html]);
  return token;
}

function restoreStashedHtml(value, stash) {
  return stash.reduce((next, [token, html]) => next.replaceAll(token, html), value);
}

export function renderInlineMarkdown(value) {
  let text = String(value ?? '');
  const stash = [];

  text = text.replace(/`([^`]+)`/g, (_match, code) =>
    stashHtml(stash, `<code class="correspondence-code">${escapeHtml(code)}</code>`),
  );

  text = text.replace(/<a\s+[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote, rawHref, label) => {
    const href = sanitizeHref(rawHref);
    const cleanLabel = String(label ?? '').replace(/<[^>]*>/g, '').trim();
    if (!href || !cleanLabel) return cleanLabel;

    return stashHtml(
      stash,
      `<a href="${escapeHtmlAttribute(href)}" class="correspondence-link">${escapeHtml(cleanLabel)}</a>`,
    );
  });

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, rawHref) => {
    const href = sanitizeHref(rawHref);
    if (!href) return escapeHtml(label);

    return stashHtml(
      stash,
      `<a href="${escapeHtmlAttribute(href)}" class="correspondence-link">${escapeHtml(label)}</a>`,
    );
  });

  let html = escapeHtml(text);
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<span style="font-style: italic;">$1</span>')
    .replace(/_([^_]+)_/g, '<span style="font-style: italic;">$1</span>');

  return restoreStashedHtml(html, stash);
}

function renderParagraph(block) {
  const text = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!text) return '';
  return `<p class="correspondence-p">${renderInlineMarkdown(text)}</p>`;
}

function renderList(block, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  const itemPattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
  const items = block
    .split(/\r?\n/)
    .map((line) => line.replace(itemPattern, '').trim())
    .filter(Boolean)
    .map((line) => `<li class="correspondence-li">${renderInlineMarkdown(line)}</li>`)
    .join('');

  return items ? `<${tag} class="correspondence-list">${items}</${tag}>` : '';
}

function renderBlockquote(block) {
  const quote = block
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>\s?/, '').trim())
    .filter(Boolean)
    .join(' ');

  if (!quote) return '';
  return `<blockquote class="correspondence-quote"><p>${renderInlineMarkdown(quote)}</p></blockquote>`;
}

export function renderMarkdownToEmailHtml(markdown) {
  const blocks = String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      if (/^\s*(?:---|\*\*\*)\s*$/.test(block)) {
        return '<hr class="correspondence-rule">';
      }

      const headingMatch = block.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length + 1, 4);
        return `<h${level} class="correspondence-heading correspondence-heading-${level}">${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`;
      }

      const lines = block.split(/\r?\n/);
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        return renderList(block, false);
      }
      if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
        return renderList(block, true);
      }
      if (lines.every((line) => /^\s*>\s?/.test(line))) {
        return renderBlockquote(block);
      }

      return renderParagraph(block);
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeFooterLinks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const href = sanitizeHref(entry.href || entry.url);
      const label = String(entry.label || entry.text || '').trim();
      if (!href || !label) return null;
      return { href, label };
    })
    .filter(Boolean);
}

function normalizeSharedItemImage(entry) {
  const imageInput = entry.image && typeof entry.image === 'object' && !Array.isArray(entry.image)
    ? entry.image
    : null;
  const src = sanitizeImageSrc(
    imageInput?.src ||
      imageInput?.url ||
      entry.imageSrc ||
      entry.imageUrl ||
      (typeof entry.image === 'string' ? entry.image : ''),
  );

  if (!src) return null;

  const alt = String(
    imageInput?.alt ||
      imageInput?.altText ||
      entry.imageAlt ||
      entry.imageAltText ||
      entry.title ||
      '',
  ).trim();

  return {
    src,
    alt,
  };
}

function normalizeSharedItems(value, fallbackHeading) {
  const source = Array.isArray(value)
    ? { heading: fallbackHeading, items: value }
    : value && typeof value === 'object' && !Array.isArray(value)
      ? {
          heading: value.heading || value.title || fallbackHeading,
          items: Array.isArray(value.items) ? value.items : [],
        }
      : { heading: fallbackHeading, items: [] };

  const items = source.items
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const href = sanitizeHref(entry.href || entry.url || entry.link);
      const title = String(entry.title || '').trim();
      if (!href || !title) return null;

      return {
        title,
        href,
        label: String(entry.label || entry.source || '').trim(),
        image: normalizeSharedItemImage(entry),
        descriptionHtml: entry.description ? renderInlineMarkdown(entry.description) : '',
      };
    })
    .filter(Boolean);

  if (items.length > 0 && ![2, 4].includes(items.length)) {
    throw new Error('Correspondence sharedItems must contain either 2 or 4 valid items');
  }

  return {
    heading: String(source.heading || 'Shared items').trim(),
    items,
    rows: Array.from({ length: Math.ceil(items.length / 2) }, (_value, index) =>
      items.slice(index * 2, index * 2 + 2),
    ),
  };
}

function normalizeSignature(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parts = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!parts.length) return null;
    return {
      name: parts[0],
      lines: parts.slice(1),
    };
  }

  if (typeof value !== 'object' || Array.isArray(value)) return null;

  const name = String(value.name || '').trim();
  const lines = [];
  if (Array.isArray(value.lines)) {
    value.lines.forEach((line) => {
      const normalized = String(line ?? '').trim();
      if (normalized) lines.push(normalized);
    });
  }
  if (value.role) lines.push(String(value.role).trim());
  if (value.organization) lines.push(String(value.organization).trim());
  if (value.email) lines.push(String(value.email).trim());

  const cleanLines = lines.filter(Boolean);
  if (!name && cleanLines.length === 0) return null;
  return {
    name,
    lines: cleanLines,
  };
}

function renderSignatureHtml(signature) {
  if (!signature?.name && !signature?.lines?.length) return '';

  const blocks = [];
  if (signature.name) {
    blocks.push(`<div class="correspondence-signature-name">${renderInlineMarkdown(signature.name)}</div>`);
  }

  if (signature.lines?.length) {
    blocks.push(
      `<div class="correspondence-signature-lines">${signature.lines
        .map((line) => `<div class="correspondence-signature-line">${renderInlineMarkdown(line)}</div>`)
        .join('\n')}</div>`,
    );
  }

  return blocks.join('\n');
}

function normalizeFrom(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return {
    name: String(value.name || '').trim(),
    role: String(value.role || '').trim(),
    organization: String(value.organization || '').trim(),
    email: String(value.email || '').trim(),
  };
}

function normalizeTheme(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_THEME };
  return { ...DEFAULT_THEME, ...value };
}

export function normalizeCorrespondenceEmailData(source, { inputPath, outputName } = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Correspondence source must be an object');
  }

  const subject = String(source.subject || source.title || outputName || 'Correspondence').trim();
  const preheader = String(source.preheader || source.summary || '').trim();
  const template = String(source.template || DEFAULT_CORRESPONDENCE_TEMPLATE).trim();
  const bodyHtml = String(
    source.bodyHtml || renderMarkdownToEmailHtml(source.bodyMarkdown || source.body || ''),
  ).trim();

  if (!bodyHtml) {
    throw new Error('Correspondence email needs Markdown body content or bodyHtml');
  }

  const signature = normalizeSignature(source.signature);
  const footerLinks = normalizeFooterLinks(source.footerLinks);
  const sharedItems = normalizeSharedItems(source.sharedItems, source.sharedItemsHeading || 'Shared items');
  const theme = normalizeTheme(source.theme);
  const from = normalizeFrom(source.from);

  return {
    template,
    subject,
    preheader,
    correspondence: {
      subject,
      preheader,
      bodyHtml,
      signatureHtml: renderSignatureHtml(signature),
      sharedItemsHeading: sharedItems.heading,
      sharedItems: sharedItems.items,
      sharedItemRows: sharedItems.rows,
      footerNote: source.footerNote ? renderInlineMarkdown(source.footerNote) : '',
      footerLinks,
      from,
      showSubject: source.showSubject === true,
      showFromHeader: source.showFromHeader === true,
      theme,
      sourcePath: inputPath ? path.resolve(inputPath) : '',
    },
  };
}

export function loadCorrespondenceEmailSource(inputPath, options = {}) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const ext = path.extname(inputPath).toLowerCase();

  if (ext === '.json') {
    const parsed = JSON.parse(raw);
    return normalizeCorrespondenceEmailData(parsed, options);
  }

  if (ext !== '.md' && ext !== '.markdown') {
    throw new Error(`Correspondence source must be Markdown or JSON: ${inputPath}`);
  }

  const parsed = matter(raw);
  return normalizeCorrespondenceEmailData(
    {
      ...parsed.data,
      bodyMarkdown: parsed.content,
    },
    options,
  );
}

export function resolveCorrespondenceInputPath(inputFile, { repoRoot } = {}) {
  if (!inputFile) throw new Error('Missing correspondence input file');
  if (path.isAbsolute(inputFile)) return inputFile;

  const candidates = [
    path.resolve(inputFile),
    repoRoot ? path.join(repoRoot, inputFile) : null,
    repoRoot ? path.join(repoRoot, 'correspondence', inputFile) : null,
    repoRoot ? path.join(repoRoot, 'examples', 'correspondence', inputFile) : null,
  ].filter(Boolean);

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match || candidates[0];
}

export function slugifyOutputName(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'correspondence';
}

function jsonPointerToDotPath(pointer) {
  if (!pointer || pointer === '/') return '$';
  return '$' + pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`))
    .join('');
}

export function validateCorrespondenceEmailData(data, templateName, {
  repoRoot,
  strict = false,
  logger = console,
} = {}) {
  if (!repoRoot) throw new Error('repoRoot is required for correspondence schema validation');

  const schemaPath = path.join(repoRoot, 'templates', templateName, 'newsletter.schema.json');
  if (!fs.existsSync(schemaPath)) return;

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  if (validate(data)) {
    logger.log(`✅ Schema validation passed (${path.relative(repoRoot, schemaPath)})`);
    return;
  }

  const errors = validate.errors || [];
  logger.log(`⚠️  Schema validation found ${errors.length} issue(s) (${path.relative(repoRoot, schemaPath)})`);
  errors.slice(0, 50).forEach((error) => {
    logger.log(`   - ${jsonPointerToDotPath(error.instancePath)}: ${error.message}`);
  });

  if (strict) {
    throw new Error('Correspondence schema validation failed');
  }
}
