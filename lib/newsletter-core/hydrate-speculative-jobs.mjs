import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inferIssueId } from './view-online-link.mjs';
import { assertSpeculativeJobsPrepared, isSpeculativeJobPrepared } from './speculative-job-validation.mjs';

// Reuse Backoffice's canonical job reader and publication resolver. This adapter
// closes the direct Markdown/JSON build gap without copying the job mapping rules.
// Complete edition-prepared cards pass through unchanged. Authoring inputs are cloned.
export async function hydrateSpeculativeJobReferences(source, {
  repoRoot = process.cwd(), backofficeRoot, editorialRoot, registryPath,
  edition = 'full', outputName, sourcePath, logger = console,
} = {}) {
  const data = structuredClone(source);
  const pending = [];
  (Array.isArray(data.sections) ? data.sections : []).forEach((section) => {
    if (section?.type !== 'speculative-job') return;
    (Array.isArray(section.items) ? section.items : []).forEach((item, index) => {
      if (!isSpeculativeJobPrepared(item)) pending.push({ section, index, item });
    });
  });
  if (pending.length) {
    const providerRoot = path.resolve(backofficeRoot || process.env.NFL_BACKOFFICE_ROOT || path.join(repoRoot, '../nfl-backoffice'));
    const contentRoot = path.resolve(editorialRoot || process.env.NFL_EDITORIAL_ROOT || path.join(repoRoot, '../nfl-editorial'));
    const [{ hydrateSpeculativeJobSections }, { loadPopupUrlIndex, resolvePopupUrl }] = await Promise.all([
      import(pathToFileURL(path.join(providerRoot, 'scripts/newsletter-build/speculativeJobs.js')).href),
      import(pathToFileURL(path.join(providerRoot, 'scripts/newsletter-build/popup-url-resolver.js')).href),
    ]);
    const issueId = inferIssueId(data, { outputName, sourcePath });
    const subset = { sections: pending.map(({ section, item }) => ({ ...section, items: [item] })) };
    await hydrateSpeculativeJobSections(subset, { editorialRoot: contentRoot, issueId });
    const registry = await loadPopupUrlIndex({ registryPath: registryPath || process.env.POPUP_REGISTRY_PATH || path.join(contentRoot, 'output/popup-sites/registry.json') });
    pending.forEach(({ section, index }, pendingIndex) => {
      const resolved = subset.sections[pendingIndex].items[0];
      const { sourceRef, ...link } = resolved.link;
      resolved.link = { ...link, href: resolvePopupUrl(registry, sourceRef, edition) };
      section.items[index] = resolved;
    });
    logger.log(`💼 Resolved ${pending.length} canonical job reference(s) and registered destination(s)`);
  }
  assertSpeculativeJobsPrepared(data);
  return data;
}
