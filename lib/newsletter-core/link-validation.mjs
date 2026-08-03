import https from 'https';
import http from 'http';

const LINK_CHECK_TIMEOUT_MS = 5000;
const LINK_CHECK_USER_AGENT = 'Near Future Laboratory Newsletter Link Validator/1.0';
const HEAD_FALLBACK_STATUSES = new Set([403, 404, 405]);

function isServerErrorStatus(status) {
  return Number.isInteger(status) && status >= 500 && status < 600;
}

export const LINK_FIELD_CANDIDATES = new Set([
  'abouturl',
  'applyurl',
  'archiveurl',
  'bookinglink',
  'href',
  'link',
  'readmorelink',
  'imagelink',
  'logolink',
  'sponsorlink',
  'bylinelink',
  'calendarlink',
  'authorlink',
  'ctalink',
  'dispatchlink',
  'eventlink',
  'featurelink',
  'locationpickerurl',
  'morelink',
  'originalsourceurl',
  'shareurl',
  'sourcelink',
  'viewonlinelink',
  'newslettersubscribelink',
  'unsubscribelink',
  'url',
]);

export function isHttpLink(value) {
  return /^https?:/i.test(value);
}

export function isPlaceholderLink(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === '#' ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized === 'javascript:void(0)' ||
    normalized === 'javascript:;'
  );
}

function isBuildOwnedCalendarUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      url.hostname === 'nearfuturelaboratory.com' &&
      /^\/calendar\/\d{4}\/[^/]+\.ics$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function isBuildOwnedNewsletterArchiveUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      url.hostname === 'nearfuturelaboratory.com' &&
      /^\/newsletters\/\d{4}\/[^/]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function formatLinkPath(path = []) {
  if (!path.length) return 'root';
  return path.reduce((acc, segment, index) => {
    if (typeof segment === 'number' || /^\d+$/.test(segment)) {
      return `${acc}[${segment}]`;
    }
    return index === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

export function collectLinkCandidates(value, path = []) {
  const entries = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(...collectLinkCandidates(item, [...path, index]));
    });
    return entries;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const nextPath = [...path, key];
      const normalizedKey = key.toLowerCase();
      if (typeof child === 'string' && LINK_FIELD_CANDIDATES.has(normalizedKey)) {
        entries.push({ path: nextPath, url: child });
      }
      if (
        child &&
        typeof child === 'object' &&
        !Array.isArray(child) &&
        LINK_FIELD_CANDIDATES.has(normalizedKey)
      ) {
        const objectUrl = typeof child.href === 'string' && child.href.trim()
          ? child.href
          : typeof child.url === 'string' && child.url.trim()
            ? child.url
            : '';
        if (objectUrl) {
          entries.push({ path: nextPath, url: objectUrl });
        }
      }
      if (Array.isArray(child) || (child && typeof child === 'object')) {
        entries.push(...collectLinkCandidates(child, nextPath));
      }
    });
  }

  return entries;
}

export function collectHtmlLinkCandidates(html) {
  const entries = [];
  if (typeof html !== 'string' || !html.trim()) return entries;

  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gis;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    entries.push({
      path: ['html', 'a', entries.length, 'href'],
      url: match[2].replace(/&amp;/g, '&').trim(),
    });
  }
  return entries;
}

export function checkHttpUrl(url) {
  if (!url || typeof url !== 'string') {
    return Promise.resolve({ valid: false, error: 'URL missing' });
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return Promise.resolve({ valid: false, error: 'URL empty' });
  }

  const lowercase = trimmed.toLowerCase();
  if (!lowercase.startsWith('https:') && !lowercase.startsWith('http:')) {
    return Promise.resolve({ valid: false, error: 'Unsupported protocol' });
  }

  return requestHttpUrl(trimmed, { method: 'HEAD' }).then(async (headResult) => {
    if (
      headResult.valid ||
      (!HEAD_FALLBACK_STATUSES.has(headResult.status) && !isServerErrorStatus(headResult.status))
    ) {
      return headResult;
    }
    const getResult = await requestHttpUrl(trimmed, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
        'User-Agent': LINK_CHECK_USER_AGENT,
      },
      abortAfterHeaders: true,
    });
    return getResult.valid ? getResult : headResult;
  });
}

function requestHttpUrl(url, {
  method,
  headers = {},
  abortAfterHeaders = false,
}) {
  return new Promise((resolve) => {
    const lowercase = url.toLowerCase();
    const client = lowercase.startsWith('https:') ? https : http;
    let settled = false;
    let intentionallyAborted = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = client.request(url, {
      method,
      headers,
      timeout: LINK_CHECK_TIMEOUT_MS,
    }, (res) => {
      const isValid = res.statusCode >= 200 && res.statusCode < 400;
      finish({ valid: isValid, status: res.statusCode });

      if (abortAfterHeaders) {
        intentionallyAborted = true;
        req.destroy();
        return;
      }
      res.resume();
    });

    req.on('error', (error) => {
      if (intentionallyAborted && settled) return;
      finish({ valid: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      finish({ valid: false, error: 'Request timeout' });
    });

    req.end();
  });
}

function isWarningHttpStatus(status, url) {
  return (
    status === 403 ||
    status === 405 ||
    status === 429 ||
    status === 999 ||
    isServerErrorStatus(status) ||
    (status === 404 && (isBuildOwnedNewsletterArchiveUrl(url) || isBuildOwnedCalendarUrl(url)))
  );
}

function isTransientProbeError(error) {
  if (!error) return false;
  const message = String(error).toLowerCase();
  return (
    message.includes('request timeout') ||
    message.includes('timeout') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  );
}

export async function validateLinkEntries(
  entries,
  {
    checkHttpUrl: checkUrl = checkHttpUrl,
    logger = console,
    throwOnError = true,
  } = {},
) {
  if (entries.length === 0) {
    logger.log('🔍 No hyperlink candidates found for validation');
    return { entries, errors: [], warnings: [], validLinks: 0 };
  }

  if (typeof checkUrl !== 'function') {
    throw new TypeError('validateLinks requires checkHttpUrl');
  }

  logger.log('🔍 Validating hyperlinks...');
  const errors = [];
  const warnings = [];
  let validLinks = 0;

  for (const entry of entries) {
    const rawUrl = entry.url;
    const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const pathLabel = formatLinkPath(entry.path);

    if (!trimmed) {
      errors.push(`❌ ${pathLabel}: link is empty`);
      continue;
    }

    if (isPlaceholderLink(trimmed)) {
      errors.push(`❌ ${pathLabel}: placeholder link value "${trimmed}"`);
      continue;
    }

    if (isHttpLink(trimmed)) {
      const result = await checkUrl(trimmed);
      if (result.valid) {
        validLinks++;
      } else {
        const reason = result.error ? result.error : `HTTP ${result.status}`;
        if (isWarningHttpStatus(result.status, trimmed) || isTransientProbeError(result.error)) {
          warnings.push(`⚠️  ${pathLabel}: ${trimmed} (${reason})`);
          validLinks++;
        } else {
          errors.push(`❌ ${pathLabel}: ${trimmed} (${reason})`);
        }
      }
    } else {
      validLinks++;
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    logger.log(`\n⚠️  Link Validation Results: ${validLinks}/${entries.length} links passed`);
    errors.forEach(error => logger.log(`   ${error}`));
    warnings.forEach(warning => logger.log(`   ${warning}`));
    logger.log('');
  } else {
    logger.log(`✅ All ${entries.length} links validated successfully`);
  }

  if (throwOnError && errors.length > 0) {
    throw new Error(`Link validation failed with ${errors.length} error(s)`);
  }

  return { entries, errors, warnings, validLinks };
}

export async function validateLinks(data, options = {}) {
  return validateLinkEntries(collectLinkCandidates(data), options);
}

export async function validateRenderedHtmlLinks(html, options = {}) {
  return validateLinkEntries(collectHtmlLinkCandidates(html), options);
}
