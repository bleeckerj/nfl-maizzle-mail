import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_UPLOAD_ENDPOINT = 'http://localhost:3000/api/upload/external';
const DEFAULT_UPLOAD_FOLDER = 'newsletter-ad-block-snapshots';
const SNAPSHOT_CACHE_DIR = ['.cache', 'newsletter-ad-block-snapshots'];
const SNAPSHOT_UPLOAD_CACHE_FILE = [...SNAPSHOT_CACHE_DIR, 'upload-cache.json'];
const AD_SNAPSHOT_PRESETS = ['native', '1x1', '4x5', '9x16'];

function resolveEditorialRoot(repoRoot) {
  const envRoot = process.env.NFL_EDITORIAL_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return path.resolve(envRoot);
  }

  return path.resolve(repoRoot, '..', 'nfl-editorial');
}

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadRepoEnvFiles(repoRoot) {
  const loaded = {};
  for (const envFile of ['.env', '.env.local']) {
    const envPath = path.join(repoRoot, envFile);
    try {
      const source = await readFile(envPath, 'utf8');
      Object.assign(loaded, parseEnvFile(source));
    } catch {
      continue;
    }
  }
  return loaded;
}

async function prepareEditorialRendererEnvironment(editorialRoot) {
  const browserPath = path.join(editorialRoot, '.cache', 'ms-playwright');
  await mkdir(browserPath, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= browserPath;

  const repoEnv = await loadRepoEnvFiles(editorialRoot);
  for (const [key, value] of Object.entries(repoEnv)) {
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

async function readEditorialAdsInventory(editorialRoot) {
  const inventoryPath = process.env.NFL_EDITORIAL_ADS_PATH && fs.existsSync(process.env.NFL_EDITORIAL_ADS_PATH)
    ? path.resolve(process.env.NFL_EDITORIAL_ADS_PATH)
    : path.join(editorialRoot, 'src', 'content', 'ads.json');

  const ads = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const index = new Map();
  if (Array.isArray(ads)) {
    ads.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const id = typeof entry.id === 'string' ? entry.id.trim() : '';
      if (!id || index.has(id)) return;
      index.set(id, entry);
    });
  }

  return {
    inventoryPath,
    tuningRegistryPath: path.join(editorialRoot, 'src', 'content', 'ads.lockup-tuning.json'),
    index,
  };
}

async function withWorkingDirectory(cwd, task) {
  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    return await task();
  } finally {
    process.chdir(previousCwd);
  }
}

async function importSnapshotRuntime(editorialRoot) {
  const candidates = [
    path.join(editorialRoot, 'scripts', 'ads', 'snapshots.mjs'),
    path.join(editorialRoot, 'scripts', 'ads', 'snapshots.js'),
    path.join(editorialRoot, 'scripts', 'ads', 'snapshots.ts'),
  ];
  const snapshotModulePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!snapshotModulePath) {
    throw new Error(`Could not find editorial ad snapshots runtime under ${editorialRoot}/scripts/ads.`);
  }

  if (snapshotModulePath.endsWith('.js') || snapshotModulePath.endsWith('.ts')) {
    const tsxLoaderPath = path.join(editorialRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs');
    if (!fs.existsSync(tsxLoaderPath)) {
      throw new Error(
        `Editorial ad snapshots runtime requires tsx for TypeScript module resolution, but it was not found at ${tsxLoaderPath}. Run npm install in ${editorialRoot}.`,
      );
    }
    await import(pathToFileURL(tsxLoaderPath).href);
  }

  return import(pathToFileURL(snapshotModulePath).href);
}

function selectUploadVariant(payload) {
  if (Array.isArray(payload?.variants) && payload.variants.length > 0) {
    return payload.variants.find((variant) => /\/public$/.test(variant)) ?? payload.variants[0];
  }

  return payload?.url;
}

async function computeFileHash(filePath) {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

async function loadUploadCache(cachePath) {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    return {};
  }
}

async function saveUploadCache(cachePath, cache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(cache, null, 2));
}

async function uploadSnapshotArtifact({
  filePath,
  adId,
  preset,
  altText,
  contentType,
  cache,
  cachePath,
  uploadFolder,
  logger,
}) {
  const hash = await computeFileHash(filePath);
  const cached = cache[hash];
  if (cached?.cloudflareUrl) {
    logger.log(`☁️  Reusing cached newsletter ad snapshot upload for ${adId}`);
    return cached.cloudflareUrl;
  }

  const bytes = await readFile(filePath);
  const endpoint = process.env.IMAGE_MIGRATION_ENDPOINT ?? DEFAULT_UPLOAD_ENDPOINT;
  const mimeType = contentType || (filePath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), path.basename(filePath));
  form.append('folder', uploadFolder);
  form.append(
    'originalUrl',
    `https://nearfuturelaboratory.com/generated/newsletter-ad-block-snapshots/${encodeURIComponent(adId)}/ad-card.${preset}.${mimeType === 'image/webp' ? 'webp' : 'png'}`,
  );
  if (altText) {
    form.append('altText', altText);
  }
  form.append('description', `newsletter ad-block snapshot | ${adId}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let details = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => null);
    }
    throw new Error(
      `Snapshot upload failed for ${adId} (${response.status}): ${
        details ? JSON.stringify(details) : 'No response payload.'
      }`,
    );
  }

  const payload = await response.json();
  const cloudflareUrl = selectUploadVariant(payload);
  if (!cloudflareUrl) {
    throw new Error(`Snapshot upload response for ${adId} did not include a usable URL.`);
  }

  cache[hash] = {
    uploadId: payload.id,
    cloudflareUrl,
  };
  await saveUploadCache(cachePath, cache);
  logger.log(`☁️  Uploaded newsletter ad snapshot for ${adId}`);
  return cloudflareUrl;
}

function collectCommerceAdBlockTargets(newsletterData, adIndex) {
  if (!Array.isArray(newsletterData?.sections)) return [];

  const targets = [];
  newsletterData.sections.forEach((section, sectionIndex) => {
    if (!section || section.type !== 'ad-block' || !Array.isArray(section.items)) return;

    section.items.forEach((item, itemIndex) => {
      const adId = typeof item?.adId === 'string' ? item.adId.trim() : '';
      if (!adId) return;
      const ad = adIndex.get(adId);
      if (!ad?.commerce || typeof ad.commerce !== 'object') return;
      const renderMode = normalizeAdRenderMode(item?.adRenderMode);
      const shouldRenderSnapshot =
        renderMode === 'snapshot' ||
        (renderMode !== 'legacy' && ad.commerce.presentation === 'overlay-lockup');
      if (!shouldRenderSnapshot) return;
      targets.push({
        sectionIndex,
        itemIndex,
        item,
        adId,
        ad,
        preset: resolveTargetPreset(item, ad),
      });
    });
  });

  return targets;
}

function normalizeAdRenderMode(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized === 'snapshot' || normalized === 'legacy' ? normalized : '';
}

function normalizeSnapshotPreset(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/^social-/, '');
  return AD_SNAPSHOT_PRESETS.includes(normalized) ? normalized : '';
}

function resolveTargetPreset(item, ad) {
  return (
    normalizeSnapshotPreset(item?.adSnapshotPreset) ||
    normalizeSnapshotPreset(ad?.exportLockup?.article) ||
    normalizeSnapshotPreset(ad?.commerce?.lockup?.aspectRatio) ||
    'native'
  );
}

function renderedPresetMatches(renderedPresetId, requestedPreset) {
  return renderedPresetId === requestedPreset || renderedPresetId === `social-${requestedPreset}`;
}

function isWebpArtifact(artifact) {
  if (!artifact) return false;
  if (artifact.format === 'webp' || artifact.mimeType === 'image/webp') return true;
  return typeof artifact.localPath === 'string' && artifact.localPath.toLowerCase().endsWith('.webp');
}

function selectEmailSnapshotArtifact(rendered) {
  const candidates = [
    { artifact: rendered.carouselAnimatedWebpArtifact, artifactKind: 'animated-webp' },
    { artifact: rendered.animatedWebpArtifact, artifactKind: 'animated-webp' },
    { artifact: isWebpArtifact(rendered.artifact) ? rendered.artifact : null, artifactKind: 'animated-webp' },
    { artifact: rendered.stillArtifact, artifactKind: 'static-png' },
    { artifact: rendered.artifact, artifactKind: isWebpArtifact(rendered.artifact) ? 'animated-webp' : 'static-png' },
  ];

  return (
    candidates.find((candidate) => candidate.artifact?.photariumUrl) ||
    candidates.find((candidate) => candidate.artifact?.localPath) ||
    { artifact: null, artifactKind: 'static-png' }
  );
}

function buildAdBlockContextLabel(target) {
  return `section ${target.sectionIndex + 1} item ${target.itemIndex + 1} (${target.adId})`;
}

function resolveSnapshotAltText(item, ad) {
  const candidates = [
    item?.imageAlt,
    ad?.media?.altText,
    item?.title,
    ad?.title,
    'Advertisement',
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? 'Advertisement';
}

export async function resolveCommerceAdBlockSnapshots(
  newsletterData,
  {
    repoRoot,
    logger = console,
    uploadFolder = DEFAULT_UPLOAD_FOLDER,
  } = {},
) {
  if (!newsletterData || !Array.isArray(newsletterData.sections)) {
    return newsletterData;
  }

  const editorialRoot = resolveEditorialRoot(repoRoot);
  const { inventoryPath, tuningRegistryPath, index: adIndex } = await readEditorialAdsInventory(editorialRoot);
  const targets = collectCommerceAdBlockTargets(newsletterData, adIndex);

  if (!targets.length) {
    return newsletterData;
  }

  logger.log(`🛍️  Resolving ${targets.length} commerce ad-block snapshot(s)`);
  let editorialAdsSnapshotsRenderBatch;
  try {
    await prepareEditorialRendererEnvironment(editorialRoot);
    ({ editorialAdsSnapshotsRenderBatch } = await importSnapshotRuntime(editorialRoot));
  } catch (error) {
    logger.log(
      `⚠️  Commerce ad-block snapshot fallback: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return newsletterData;
  }

  const outputRoot = process.env.NFL_EDITORIAL_AD_SNAPSHOTS_OUTPUT_ROOT
    ? path.resolve(process.env.NFL_EDITORIAL_AD_SNAPSHOTS_OUTPUT_ROOT)
    : path.join(editorialRoot, 'output', 'ads-snapshots');
  const requestedPresets = [...new Set(targets.map((target) => target.preset))];
  let batch;
  try {
    batch = await withWorkingDirectory(editorialRoot, async () =>
      editorialAdsSnapshotsRenderBatch({
        ids: [...new Set(targets.map((target) => target.adId))],
        lockupPresets: requestedPresets,
        outputRoot,
        inventoryPath,
        tuningRegistryPath,
        autoScale: true,
        force: false,
        write: true,
        uploadToPhotarium: true,
      }),
    );
  } catch (error) {
    logger.log(
      `⚠️  Commerce ad-block snapshot fallback: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return newsletterData;
  }

  const renderedById = new Map((batch?.items ?? []).map((entry) => [entry.adId, entry]));
  const cachePath = path.join(repoRoot, ...SNAPSHOT_UPLOAD_CACHE_FILE);
  const uploadCache = await loadUploadCache(cachePath);

  for (const target of targets) {
    const contextLabel = buildAdBlockContextLabel(target);
    const snapshotResult = renderedById.get(target.adId);
    const rendered = snapshotResult?.rendered?.find((entry) => renderedPresetMatches(entry.presetId, target.preset));
    const failure = snapshotResult?.failed?.find((entry) => renderedPresetMatches(entry.presetId, target.preset));

    if (!rendered) {
      logger.log(
        `⚠️  Commerce ad-block snapshot fallback for ${contextLabel}: ${
          failure?.reason || `No ${target.preset} snapshot artifact was returned.`
        }`,
      );
      continue;
    }

    const { artifact: selectedArtifact, artifactKind } = selectEmailSnapshotArtifact(rendered);
    const selectedPath = selectedArtifact?.localPath;
    if (!selectedPath) {
      logger.log(`⚠️  Commerce ad-block snapshot fallback for ${contextLabel}: snapshot did not include a readable image artifact.`);
      continue;
    }

    const stats = await stat(selectedPath).catch(() => null);
    if (!stats?.isFile()) {
      logger.log(`⚠️  Commerce ad-block snapshot fallback for ${contextLabel}: image path was not readable (${selectedPath}).`);
      continue;
    }

    const altText = resolveSnapshotAltText(target.item, target.ad);
    let uploadedUrl = selectedArtifact.photariumUrl;
    try {
      if (!uploadedUrl) {
        logger.log(`⚠️  Commerce ad-block snapshot for ${contextLabel} did not include a Photarium URL; using legacy upload fallback.`);
        uploadedUrl = await uploadSnapshotArtifact({
          filePath: selectedPath,
          adId: target.adId,
          preset: target.preset,
          altText,
          contentType: selectedArtifact.mimeType || (isWebpArtifact(selectedArtifact) ? 'image/webp' : 'image/png'),
          cache: uploadCache,
          cachePath,
          uploadFolder,
          logger,
        });
      }
    } catch (error) {
      logger.log(
        `⚠️  Commerce ad-block snapshot upload fallback for ${contextLabel}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      continue;
    }

    target.item.renderMode = 'snapshot';
    target.item.image = uploadedUrl;
    target.item.imageAlt = altText;
    target.item.snapshotPreset = target.preset;
    target.item.snapshotEditorialPreset = rendered.presetId;
    target.item.snapshotArtifactKind = artifactKind;
    target.item.snapshotSourceFingerprint = rendered.sourceFingerprint;
    target.item.snapshotPhotariumId = selectedArtifact.photariumId;
    target.item.snapshotPhotariumUrl = selectedArtifact.photariumUrl || uploadedUrl;
    target.item.snapshotPhotariumParentId = selectedArtifact.photariumParentId;
    target.item.snapshotWarnings = [
      ...(snapshotResult?.warnings ?? []),
      ...(rendered.warnings ?? []),
    ].filter(Boolean);
    if (!target.item.link && typeof target.item.readMoreLink === 'string' && target.item.readMoreLink.trim()) {
      target.item.link = target.item.readMoreLink.trim();
    }
    if (!target.item.link && typeof target.ad?.link?.url === 'string' && target.ad.link.url.trim()) {
      target.item.link = target.ad.link.url.trim();
    }

    logger.log(`🖼️  Commerce ad-block ready for ${target.adId}`);
  }

  return newsletterData;
}
