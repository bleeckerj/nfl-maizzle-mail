const TAG_TOKEN_PATTERN = /<!--[\s\S]*?-->|<[^>]+>/g;
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const SUPPRESSED_TAGS = new Set(['head', 'script', 'style', 'title', 'textarea']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const HTML_SPACE_PATTERN = /\s+/g;
const RAW_URL_PATTERN = /https?:\/\/[^\s<>"']+/i;
const LEADING_PUNCTUATION_PATTERN = /^[([{'"`]+/;
const TRAILING_PUNCTUATION_PATTERN = /[)\]},"'`.:;!?]+$/;

function getTagName(token) {
  const match = token.match(/^<\s*\/?\s*([a-zA-Z0-9:-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function extractStyleValue(token) {
  const match = token.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
  return match ? match[2] : '';
}

function isHiddenStyle(styleValue) {
  if (!styleValue) return false;
  const style = styleValue.toLowerCase().replace(HTML_SPACE_PATTERN, '');
  if (
    style.includes('display:none') ||
    style.includes('visibility:hidden') ||
    style.includes('mso-hide:all') ||
    style.includes('opacity:0')
  ) {
    return true;
  }

  return (
    (style.includes('max-height:0') || style.includes('max-width:0')) &&
    style.includes('overflow:hidden')
  );
}

function isOpeningTag(token) {
  return /^<\s*[a-zA-Z]/.test(token);
}

function isClosingTag(token) {
  return /^<\s*\//.test(token);
}

function isSelfClosingTag(token, tagName) {
  if (!tagName) return false;
  return /\/\s*>$/.test(token) || VOID_TAGS.has(tagName);
}

function normalizeTextPreview(text, maxLength = 80) {
  const normalized = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8203;/gi, '')
    .replace(/\u200B/g, '')
    .replace(HTML_SPACE_PATTERN, ' ')
    .trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function cleanTokenForAnalysis(token) {
  return token
    .replace(/\u200B/g, '')
    .replace(/&#8203;/gi, '')
    .replace(LEADING_PUNCTUATION_PATTERN, '')
    .replace(TRAILING_PUNCTUATION_PATTERN, '');
}

function insertBreakOpportunities(token) {
  let next = token;
  next = next.replace(/&amp;/gi, '&amp;\u200B');
  next = next.replace(/([/.?=_-])/g, '$1\u200B');
  return next;
}

function analyzeAndHardenToken(token, longTokenThreshold) {
  const cleaned = cleanTokenForAnalysis(token);
  const findings = [];
  const urlMatch = cleaned.match(RAW_URL_PATTERN);

  if (urlMatch) {
    const rawUrl = urlMatch[0].replace(/[),.;!?]+$/, '');
    findings.push({
      type: 'raw-url',
      length: rawUrl.length,
      token: rawUrl,
    });
  } else if (cleaned.length >= longTokenThreshold) {
    findings.push({
      type: 'long-token',
      length: cleaned.length,
      token: cleaned,
    });
  }

  if (!findings.length) {
    return {
      text: token,
      breakInsertions: 0,
      findings,
    };
  }

  const hardened = insertBreakOpportunities(token);
  const breakInsertions = (hardened.match(/\u200B/g) || []).length - (token.match(/\u200B/g) || []).length;

  return {
    text: hardened,
    breakInsertions,
    findings,
  };
}

function processTextSegment(segment, currentContext, longTokenThreshold) {
  if (!segment || !segment.trim()) {
    return {
      text: segment,
      breakInsertions: 0,
      warnings: [],
    };
  }

  const parts = segment.split(/(\s+)/);
  let breakInsertions = 0;
  const warnings = [];
  const nextParts = parts.map((part) => {
    if (!part || /^\s+$/.test(part)) return part;
    const result = analyzeAndHardenToken(part, longTokenThreshold);
    breakInsertions += result.breakInsertions;
    for (const finding of result.findings) {
      warnings.push({
        ...finding,
        context: currentContext || 'body',
      });
    }
    return result.text;
  });

  return {
    text: nextParts.join(''),
    breakInsertions,
    warnings,
  };
}

function pushEntry(state, entry) {
  state.stack.push(entry);
  if (entry.suppressesText) {
    state.suppressedDepth += 1;
  }
}

function finalizeHeading(entry, state) {
  if (!entry || !entry.capturesHeading) return;
  const heading = normalizeTextPreview(entry.headingText);
  if (heading) {
    state.currentHeading = heading;
  }
}

function popEntry(state, closingTagName) {
  while (state.stack.length) {
    const entry = state.stack.pop();
    if (entry.suppressesText) {
      state.suppressedDepth -= 1;
    }
    finalizeHeading(entry, state);
    if (entry.tagName === closingTagName) {
      break;
    }
  }
}

function buildContextLabel(state) {
  if (state.currentHeading) return state.currentHeading;

  for (let index = state.stack.length - 1; index >= 0; index -= 1) {
    const entry = state.stack[index];
    if (entry.tagName === 'body') continue;
    if (entry.className) {
      return `${entry.tagName}.${entry.className}`;
    }
    return entry.tagName;
  }

  return 'body';
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = `${warning.type}|${warning.context}|${warning.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hardenEmailHtmlForMobile(html, options = {}) {
  if (typeof html !== 'string' || html.length === 0) {
    return { html, breakInsertions: 0, warnings: [] };
  }

  const longTokenThreshold = Number.isFinite(options.longTokenThreshold)
    ? options.longTokenThreshold
    : 35;

  const state = {
    stack: [],
    suppressedDepth: 0,
    currentHeading: '',
  };
  const warnings = [];
  let output = '';
  let breakInsertions = 0;
  let lastIndex = 0;

  for (const match of html.matchAll(TAG_TOKEN_PATTERN)) {
    const token = match[0];
    const tokenIndex = match.index ?? 0;
    const precedingText = html.slice(lastIndex, tokenIndex);

    if (precedingText) {
      if (state.suppressedDepth > 0) {
        output += precedingText;
      } else {
        const currentHeadingEntry = state.stack[state.stack.length - 1];
        if (currentHeadingEntry?.capturesHeading) {
          currentHeadingEntry.headingText += precedingText;
        }
        const processed = processTextSegment(precedingText, buildContextLabel(state), longTokenThreshold);
        output += processed.text;
        breakInsertions += processed.breakInsertions;
        warnings.push(...processed.warnings);
      }
    }

    output += token;

    if (!token.startsWith('<!--')) {
      const tagName = getTagName(token);
      if (tagName) {
        if (isClosingTag(token)) {
          popEntry(state, tagName);
        } else if (isOpeningTag(token)) {
          const styleValue = extractStyleValue(token);
          const entry = {
            tagName,
            className: (() => {
              const classMatch = token.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
              if (!classMatch) return '';
              return classMatch[2]
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .join('.');
            })(),
            suppressesText: SUPPRESSED_TAGS.has(tagName) || isHiddenStyle(styleValue) || /(?:\s|^)hidden(?:\s|=|>)/i.test(token),
            capturesHeading: HEADING_TAGS.has(tagName),
            headingText: '',
          };

          if (tagName === 'body') {
            state.currentHeading = '';
          }

          if (!isSelfClosingTag(token, tagName)) {
            pushEntry(state, entry);
          } else {
            finalizeHeading(entry, state);
          }
        }
      }
    }

    lastIndex = tokenIndex + token.length;
  }

  const trailingText = html.slice(lastIndex);
  if (trailingText) {
    if (state.suppressedDepth > 0) {
      output += trailingText;
    } else {
      const currentHeadingEntry = state.stack[state.stack.length - 1];
      if (currentHeadingEntry?.capturesHeading) {
        currentHeadingEntry.headingText += trailingText;
      }
      const processed = processTextSegment(trailingText, buildContextLabel(state), longTokenThreshold);
      output += processed.text;
      breakInsertions += processed.breakInsertions;
      warnings.push(...processed.warnings);
    }
  }

  return {
    html: output.replace(/\u200B/g, '&#8203;'),
    breakInsertions,
    warnings: dedupeWarnings(warnings),
  };
}
