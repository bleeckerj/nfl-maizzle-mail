import path from 'node:path';

const DEFAULT_PUBLIC_NEWSLETTER_BASE_URL = 'https://nearfuturelaboratory.com/newsletters';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
