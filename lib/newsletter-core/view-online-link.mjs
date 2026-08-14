import path from 'node:path';

const DEFAULT_PUBLIC_NEWSLETTER_BASE_URL = 'https://nearfuturelaboratory.com/newsletters';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function viewOnlineHref(value) {
  if (typeof value === 'string') return value.trim();
  if (!isRecord(value)) return '';
  return typeof value.href === 'string' ? value.href.trim() : '';
}

function isPlaceholderViewOnlineHref(href) {
  return /wxx-yxx/i.test(href) || /w\d{1,2}-y(?:xx|yy)/i.test(href);
}

function percentEncodeMailtoValue(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.codePointAt(0).toString(16).toUpperCase()}`,
  );
}

export function inferYearFromIssueId(issueId) {
  const match = /(?:^|-)y(\d{2,4})$/i.exec(String(issueId || '').trim());
  if (!match) return null;
  const suffix = match[1];
  if (suffix.length === 4) return Number(suffix);
  const year = Number(suffix);
  return Number.isFinite(year) ? 2000 + year : null;
}

export function inferIssueId(newsletterData, { outputName, sourcePath } = {}) {
  const explicitIssueId = typeof newsletterData?.issueId === 'string' ? newsletterData.issueId.trim() : '';
  if (explicitIssueId) return explicitIssueId;

  const outputIssueId = typeof outputName === 'string' ? outputName.trim() : '';
  if (/(?:^|-)y\d{2,4}$/i.test(outputIssueId)) return outputIssueId;

  if (typeof sourcePath === 'string' && sourcePath.trim()) {
    const basename = path.basename(sourcePath, path.extname(sourcePath));
    if (/(?:^|-)y\d{2,4}$/i.test(basename)) return basename;
  }

  return '';
}

export function buildViewOnlineUrl(issueId, {
  publicBaseUrl = DEFAULT_PUBLIC_NEWSLETTER_BASE_URL,
} = {}) {
  const resolvedIssueId = typeof issueId === 'string' ? issueId.trim() : '';
  const year = inferYearFromIssueId(resolvedIssueId);
  if (!resolvedIssueId || !year) return '';

  const normalizedBase = String(publicBaseUrl || DEFAULT_PUBLIC_NEWSLETTER_BASE_URL).replace(/\/+$/, '');
  return `${normalizedBase}/${year}/${encodeURIComponent(resolvedIssueId)}`;
}

export function buildViewOnlineTrackedLink(issueId, options = {}) {
  const href = buildViewOnlineUrl(issueId, options);
  if (!href) return null;
  return {
    href,
    label: `${issueId} | view online`,
    category: 'issue-nav',
    intent: 'read-related',
  };
}

export function buildDailyHeadlinesShareEmailHref(onlineUrl) {
  const resolvedOnlineUrl = typeof onlineUrl === 'string' ? onlineUrl.trim() : '';
  if (!resolvedOnlineUrl) return '';

  const subject = 'Near Future Laboratory Daily Headlines';
  const body = `Thought you'd like this: ${resolvedOnlineUrl}`;
  return `mailto:?subject=${percentEncodeMailtoValue(subject)}&body=${percentEncodeMailtoValue(body)}`;
}

export function injectDailyHeadlinesShareEmailHrefs(newsletterData, { templateName } = {}) {
  const resolvedTemplate = templateName || newsletterData?.template;
  if (resolvedTemplate !== 'near-future-lab-daily-headlines' || !Array.isArray(newsletterData?.sections)) {
    return 0;
  }

  let injected = 0;
  for (const section of newsletterData.sections) {
    if (section?.type !== 'share_this' || viewOnlineHref(section.email_href)) continue;

    const emailHref = buildDailyHeadlinesShareEmailHref(section.online_url);
    if (!emailHref) continue;

    section.email_href = emailHref;
    injected += 1;
  }
  return injected;
}

function injectDenseDiscoveryViewOnlineLink(newsletterData, link) {
  newsletterData.intro = isRecord(newsletterData.intro) ? newsletterData.intro : {};
  newsletterData.intro.viewOnlineLink = link;
}

function injectDailyHeadlinesViewOnlineLink(newsletterData, link) {
  if (!Array.isArray(newsletterData.sections)) return;
  const masthead = newsletterData.sections.find((section) => section?.type === 'newsletter_masthead');
  if (!masthead || !isRecord(masthead)) return;
  masthead.viewOnlineLink = link;
}

function viewOnlineTarget(newsletterData, templateName) {
  const resolvedTemplate = templateName || newsletterData?.template;
  if (resolvedTemplate === 'dense-discovery') {
    return {
      field: 'intro.viewOnlineLink',
      value: newsletterData?.intro?.viewOnlineLink,
    };
  }
  if (resolvedTemplate === 'near-future-lab-daily-headlines') {
    const masthead = Array.isArray(newsletterData?.sections)
      ? newsletterData.sections.find((section) => section?.type === 'newsletter_masthead')
      : null;
    return {
      field: 'sections[type=newsletter_masthead].viewOnlineLink',
      value: masthead?.viewOnlineLink,
    };
  }
  return null;
}

export function warnIfMissingViewOnlineLink(newsletterData, {
  templateName,
  publicationMode,
  logger = console,
} = {}) {
  if (!isRecord(newsletterData)) return null;
  const resolvedPublicationMode = publicationMode || newsletterData.publicationMode || 'public-issue';
  if (resolvedPublicationMode !== 'public-issue') return null;

  const target = viewOnlineTarget(newsletterData, templateName);
  if (!target) return null;

  const href = viewOnlineHref(target.value);
  if (href && href !== '#' && !isPlaceholderViewOnlineHref(href)) return null;

  const message = `⚠️  View/share online link missing or placeholder in newsletter source: expected ${target.field}. The public build will inject the canonical issue URL when an issue id is available.`;
  const warn = typeof logger.warn === 'function' ? logger.warn : logger.log;
  warn?.call(logger, message);
  return { field: target.field, message };
}

export function injectViewOnlineLink(newsletterData, {
  templateName,
  outputName,
  sourcePath,
  publicationMode,
  logger = console,
  publicBaseUrl,
} = {}) {
  if (!isRecord(newsletterData)) return null;
  const resolvedPublicationMode = publicationMode || newsletterData.publicationMode || 'public-issue';
  if (resolvedPublicationMode !== 'public-issue') return null;

  const issueId = inferIssueId(newsletterData, { outputName, sourcePath });
  const link = buildViewOnlineTrackedLink(issueId, { publicBaseUrl });
  if (!link) return null;

  if (templateName === 'dense-discovery' || newsletterData.template === 'dense-discovery') {
    injectDenseDiscoveryViewOnlineLink(newsletterData, link);
  } else if (
    templateName === 'near-future-lab-daily-headlines' ||
    newsletterData.template === 'near-future-lab-daily-headlines'
  ) {
    injectDailyHeadlinesViewOnlineLink(newsletterData, link);
  } else {
    return null;
  }

  logger.log?.(`🔗 Injected view-online link: ${link.href}`);
  return link;
}
