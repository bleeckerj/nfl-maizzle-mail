const BLOCK_HTML_TAG_PATTERN = /<\/?(?:p|div|table|ul|ol|li|blockquote|h[1-6]|section|article)\b/i;
const BR_ONLY_PATTERN = /^<br\s*\/?>$/i;
const ENDS_WITH_BR_PATTERN = /<br\s*\/?>\s*$/i;

function normalizeAuthorHtmlBreaks(value) {
  if (typeof value !== 'string' || !value.trim()) return value;

  const trimmed = value.replace(/\r\n?/g, '\n').trim();
  if (!trimmed || BLOCK_HTML_TAG_PATTERN.test(trimmed)) return trimmed;

  const lines = trimmed.split('\n');
  const normalizedLines = [];
  let pendingBlankLine = false;

  lines.forEach((line) => {
    const nextLine = line.trim();

    if (!nextLine) {
      pendingBlankLine = true;
      return;
    }

    const previousLine = normalizedLines.at(-1) || '';
    if (
      pendingBlankLine &&
      normalizedLines.length > 0 &&
      !ENDS_WITH_BR_PATTERN.test(previousLine) &&
      !BR_ONLY_PATTERN.test(nextLine)
    ) {
      normalizedLines.push('<br/>');
    }

    normalizedLines.push(nextLine);
    pendingBlankLine = false;
  });

  return normalizedLines.join('\n');
}

export function normalizeNewsletterTextBreaks(newsletterData) {
  if (!newsletterData || typeof newsletterData !== 'object' || !Array.isArray(newsletterData.sections)) {
    return 0;
  }

  let changes = 0;

  newsletterData.sections.forEach((section) => {
    if (!section || typeof section !== 'object') return;
    if (section.type !== 'section_article_group' || !Array.isArray(section.articles)) return;

    section.articles.forEach((article) => {
      if (!article || typeof article !== 'object' || typeof article.lede !== 'string') return;

      const normalized = normalizeAuthorHtmlBreaks(article.lede);
      if (normalized !== article.lede) {
        article.lede = normalized;
        changes += 1;
      }
    });
  });

  return changes;
}

export { normalizeAuthorHtmlBreaks };
