function addClassToOpeningTag(match, attrs, className) {
  const classMatch = attrs.match(/\sclass=(["'])(.*?)\1/i);
  if (classMatch) {
    const existingClasses = classMatch[2].split(/\s+/).filter(Boolean);
    if (existingClasses.includes(className)) return match;
    const nextClasses = [...existingClasses, className].join(' ');
    return match.replace(classMatch[0], ` class=${classMatch[1]}${nextClasses}${classMatch[1]}`);
  }

  return match.replace(/^<([a-z0-9-]+)/i, `<$1 class="${className}"`);
}

function classifyShareTechMonoTag(tagName, attrs) {
  if (!/Share Tech Mono/i.test(attrs)) return null;

  if (/^h[1-6]$/i.test(tagName)) return 'review-mobile-ad-meta';

  const isCompactMeta =
    /font-size\s*:\s*1[01]px/i.test(attrs) ||
    /text-transform\s*:\s*uppercase/i.test(attrs) ||
    /letter-spacing\s*:/i.test(attrs);

  return isCompactMeta ? 'review-mobile-ad-meta' : 'review-mobile-ad-copy';
}

function isProductReviewAdCardDiv(attrs) {
  return (
    /style\s*=/i.test(attrs) &&
    /padding\s*:\s*12px/i.test(attrs) &&
    /background\s*:\s*#f5f4f0/i.test(attrs) &&
    /border\s*:\s*1px\s+solid\s+#c9cfdb/i.test(attrs)
  );
}

function isRemarksGroundingDiv(attrs) {
  return (
    /style\s*=/i.test(attrs) &&
    /padding\s*:\s*24px/i.test(attrs) &&
    /border-top\s*:\s*2px\s+dashed\s+#d1d5db/i.test(attrs) &&
    /background\s*:\s*#f9fafb/i.test(attrs)
  );
}

function isContextNoteDiv(attrs) {
  const classMatch = attrs.match(/\sclass=(["'])(.*?)\1/i);
  return Boolean(classMatch?.[2].split(/\s+/).includes('review-mobile-context-note'));
}

export function decorateAdjacencyProductReviewBodyHtml(bodyHtml) {
  if (typeof bodyHtml !== 'string' || bodyHtml.length === 0) return bodyHtml;

  return bodyHtml
    .replace(/<div\b([^>]*)>/gi, (match, attrs) => {
      if (isProductReviewAdCardDiv(attrs)) {
        return addClassToOpeningTag(match, attrs, 'review-mobile-ad-card');
      }
      if (isRemarksGroundingDiv(attrs)) {
        return addClassToOpeningTag(match, attrs, 'review-mobile-grounding-block');
      }
      if (isContextNoteDiv(attrs)) {
        return addClassToOpeningTag(match, attrs, 'review-mobile-context-note');
      }
      return match;
    })
    .replace(/<(p|h[1-6])\b([^>]*)>/gi, (match, tagName, attrs) => {
      const className = classifyShareTechMonoTag(tagName, attrs);
      return className ? addClassToOpeningTag(match, attrs, className) : match;
    });
}

export function prepareAdjacencyProductReviewNewsletter(newsletterData) {
  if (!newsletterData || newsletterData.template !== 'adjacency-product-review') return newsletterData;

  if (typeof newsletterData.bodyHtml === 'string') {
    newsletterData.bodyHtml = decorateAdjacencyProductReviewBodyHtml(newsletterData.bodyHtml);
  }

  return newsletterData;
}
