import https from 'https';
import http from 'http';

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
  'authorlink',
  'ctalink',
  'dispatchlink',
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

function isBuildOwnedNewsletterArchiveUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      url.hostname === 'nearfuturelaboratory.com' &&
      /^\/newsletters\/\d{4}\/[^/]+$/i.test(url.pathname)
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
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve({ valid: false, error: 'URL missing' });
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      resolve({ valid: false, error: 'URL empty' });
      return;
    }

    const lowercase = trimmed.toLowerCase();
    if (!lowercase.startsWith('https:') && !lowercase.startsWith('http:')) {
      resolve({ valid: false, error: 'Unsupported protocol' });
      return;
    }

    const client = lowercase.startsWith('https:') ? https : http;
    const req = client.request(trimmed, { method: 'HEAD', timeout: 5000 }, (res) => {
      const isValid = res.statusCode >= 200 && res.statusCode < 400;
      resolve({ valid: isValid, status: res.statusCode });
    });

    req.on('error', (error) => {
      resolve({ valid: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, error: 'Request timeout' });
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
    (status === 404 && isBuildOwnedNewsletterArchiveUrl(url))
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
