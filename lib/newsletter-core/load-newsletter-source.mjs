import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { prepareNewsletterData } from './prepare-newsletter.mjs';

export function inferYearFromIssueId(issueId) {
  const match = /(?:^|-)y(\d{2,4})$/i.exec(issueId);
  if (!match) return null;
  const suffix = match[1];
  if (suffix.length === 4) return Number(suffix);
  const year = Number(suffix);
  return Number.isFinite(year) ? 2000 + year : null;
}

export function resolveBackofficeRoot(explicitRoot) {
  if (explicitRoot) return path.resolve(explicitRoot);
  if (process.env.NFL_BACKOFFICE_ROOT) return path.resolve(process.env.NFL_BACKOFFICE_ROOT);
  return path.resolve(process.cwd(), '..', 'nfl-backoffice');
}

export function resolveIssueSourcePath(issueId, { backofficeRoot } = {}) {
  const year = inferYearFromIssueId(issueId);
  if (!year) {
    throw new Error(`Could not infer year from issue id: ${issueId}`);
  }

  const resolvedBackofficeRoot = resolveBackofficeRoot(backofficeRoot);
  return path.join(resolvedBackofficeRoot, 'public', 'outbox', 'data', String(year), `${issueId}.md`);
}

function normalizeInputMetadata(resolvedInputPath, parsedData) {
  const issueId = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
  return {
    issueId,
    sourcePath: resolvedInputPath,
    sourceKind: resolvedInputPath.endsWith('.json') ? 'json' : 'markdown',
    templateName: parsedData.template || 'dense-discovery',
  };
}

/**
 * Load source newsletter content from markdown frontmatter or JSON, then apply
 * the shared normalization path used by the email renderer.
 *
 * @param {{
 *   repoRoot: string,
 *   inputPath?: string,
 *   issueId?: string,
 *   backofficeRoot?: string,
 *   args?: string[],
 *   strictSchema?: boolean,
 *   logger?: Pick<Console, 'log'>
 * }} options
 */
export function loadNewsletterSource({
  repoRoot,
  inputPath,
  issueId,
  backofficeRoot,
  args = [],
  strictSchema,
  logger = console,
} = {}) {
  const resolvedInputPath = inputPath
    ? path.resolve(inputPath)
    : resolveIssueSourcePath(issueId, { backofficeRoot });

  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Newsletter source not found: ${resolvedInputPath}`);
  }

  let parsedData;
  if (resolvedInputPath.endsWith('.json')) {
    parsedData = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
  } else {
    const source = fs.readFileSync(resolvedInputPath, 'utf8');
    const { data, content } = matter(source);
    parsedData = { ...data };
    if (content && content.trim()) {
      parsedData.markdownBody = content.trim();
    }
  }

  const metadata = normalizeInputMetadata(resolvedInputPath, parsedData);
  const newsletterData = prepareNewsletterData(parsedData, {
    repoRoot,
    templateName: metadata.templateName,
    args,
    strictSchema,
    logger,
  });

  return {
    ...metadata,
    newsletterData,
  };
}
