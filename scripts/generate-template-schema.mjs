#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const USAGE = `
Generate a JSON Schema from a Maizzle template by scanning templates/components for data reads.

Usage:
  node scripts/generate-template-schema.mjs --entry templates/<template>/newsletter.html --output templates/<template>/newsletter.schema.json

Options:
  --entry <path>     Entry template HTML (required)
  --output <path>    Output schema path (required)
  --root <path>      Repo root (default: process.cwd())
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--entry') args.entry = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--root') args.root = argv[++i];
    else throw new Error(`Unknown arg: ${arg}`);
  }
  return args;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveRepoPath(repoRoot, maybeRelativePath) {
  if (!maybeRelativePath) return null;
  if (path.isAbsolute(maybeRelativePath)) return maybeRelativePath;
  return path.resolve(repoRoot, maybeRelativePath);
}

function extractSrcAttributes(html) {
  const sources = [];
  const patterns = [
    /<component\b[^>]*\bsrc="([^"]+)"[^>]*>/gi,
    /<extends\b[^>]*\bsrc="([^"]+)"[^>]*>/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      sources.push(match[1]);
    }
  }
  return sources;
}

function collectTemplateGraph(entryAbsPath, repoRoot) {
  const visited = new Set();
  const queue = [entryAbsPath];

  while (queue.length) {
    const current = queue.pop();
    const normalized = path.resolve(current);
    if (visited.has(normalized)) continue;
    if (!fileExists(normalized)) continue;

    visited.add(normalized);
    const html = readText(normalized);
    const srcs = extractSrcAttributes(html);

    for (const src of srcs) {
      const resolved = resolveRepoPath(repoRoot, src);
      if (resolved) queue.push(resolved);
    }
  }

  return [...visited].sort();
}

function extractExpressions(html) {
  const expressions = [];
  const tokenRe =
    /(\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}|<\/if>|<\/each>|<if\b[^>]*\bcondition="[^"]+"[^>]*>|<each\b[^>]*\bloop="[^"]+"[^>]*>)/g;

  let match;
  while ((match = tokenRe.exec(html)) !== null) {
    const token = match[1];

    if (token.startsWith('{{{')) {
      const expr = token.slice(3, -3).trim();
      if (expr) expressions.push({ kind: 'mustache', expr });
      continue;
    }

    if (token.startsWith('{{')) {
      const expr = token.slice(2, -2).trim();
      if (expr) expressions.push({ kind: 'mustache', expr });
      continue;
    }

    if (token.startsWith('<if')) {
      const m = /<if\b[^>]*\bcondition="([^"]+)"[^>]*>/.exec(token);
      const expr = m?.[1]?.trim();
      if (expr) expressions.push({ kind: 'if_open', expr });
      continue;
    }

    if (token === '</if>') {
      expressions.push({ kind: 'if_close' });
      continue;
    }

    if (token.startsWith('<each')) {
      const m = /<each\b[^>]*\bloop="([^"]+)"[^>]*>/.exec(token);
      const expr = m?.[1]?.trim();
      if (expr) expressions.push({ kind: 'each_open', expr });
      continue;
    }

    if (token === '</each>') {
      expressions.push({ kind: 'each_close' });
      continue;
    }
  }

  return expressions;
}

const IDENT = /[A-Za-z_$][0-9A-Za-z_$]*/.source;

// Matches chains like:
//   section.containerStyles.backgroundColor
//   themeColors['books-accessories']
//   item.images[0].src  (indexes are ignored; we only keep property key)
const MEMBER_CHAIN = new RegExp(
  `(${IDENT})(?:\\s*(?:\\.${IDENT}|\\[\\s*(['\\\"])\\s*([^'\\\"]+)\\s*\\2\\s*\\]|\\[\\s*\\d+\\s*\\]))+`,
  'g'
);

const IGNORE_ROOT_IDENTIFIERS = new Set([
  'Math', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'JSON',
  'console', 'process', 'require', 'module', 'exports', 'global', 'this',
  'undefined', 'null', 'true', 'false',
  'loop',
  'typeof', 'instanceof', 'new', 'return', 'if', 'else', 'for', 'while',
  'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
]);

function normalizeChainText(raw) {
  // Remove numeric indices like [0]
  return raw.replace(/\[\s*\d+\s*\]/g, '');
}

function chainToSegments(chainText) {
  // Example: themeColors['books-accessories'].linkAccent -> ["themeColors","books-accessories","linkAccent"]
  const segments = [];
  let i = 0;

  // leading identifier
  const leadMatch = new RegExp(`^${IDENT}`).exec(chainText);
  if (!leadMatch) return null;
  segments.push(leadMatch[0]);
  i += leadMatch[0].length;

  while (i < chainText.length) {
    const ch = chainText[i];
    if (ch === '.') {
      i++;
      const m = new RegExp(`^${IDENT}`).exec(chainText.slice(i));
      if (!m) return null;
      segments.push(m[0]);
      i += m[0].length;
      continue;
    }
    if (ch === '[') {
      const rest = chainText.slice(i);
      const m = /^\[\s*(['"])\s*([^'"]+)\s*\1\s*\]/.exec(rest);
      if (!m) return null;
      segments.push(m[2]);
      i += m[0].length;
      continue;
    }
    // Unknown token; bail
    return null;
  }

  return segments;
}

function parseEachLoop(loopExpr) {
  // "item in section.items"
  const m = /^\s*([A-Za-z_$][0-9A-Za-z_$]*)\s+in\s+(.+?)\s*$/.exec(loopExpr);
  if (!m) return null;
  return { varName: m[1], collectionExpr: m[2].trim() };
}

function parseSectionTypeConstants(expr) {
  // Detect `section.type === 'books-accessories'` patterns
  const types = [];
  const re = /\bsection\.type\s*={2,3}\s*(['"])([^'"]+)\1/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    types.push(m[2]);
  }
  return types;
}

function segmentsToPath(segments) {
  return segments.join('.');
}

function applyBindings(segments, bindings) {
  const [root, ...rest] = segments;
  const bound = bindings.get(root);
  if (!bound) return segments;
  return [...bound, ...rest];
}

function collectDataPathsFromExpression(expr, bindings) {
  const paths = new Set();
  const text = normalizeChainText(expr);

  let match;
  while ((match = MEMBER_CHAIN.exec(text)) !== null) {
    const rawChain = match[0];
    const segments = chainToSegments(rawChain);
    if (!segments) continue;

    // Ignore obvious globals unless they are loop variables/bindings
    const root = segments[0];
    if (IGNORE_ROOT_IDENTIFIERS.has(root) && !bindings.has(root)) continue;

    const withBindings = applyBindings(segments, bindings);

    // Ignore JS/engine fields that are not part of the data shape.
    if (withBindings[withBindings.length - 1] === 'length') continue;
    if (withBindings[0] === 'loop') continue;

    paths.add(segmentsToPath(withBindings));
  }

  // Also add plain identifiers like "title" when used alone.
  // Keep this conservative to reduce noise.
  const bareId = new RegExp(`\\b(${IDENT})\\b`, 'g');
  while ((match = bareId.exec(expr)) !== null) {
    const ident = match[1];
    if (IGNORE_ROOT_IDENTIFIERS.has(ident)) continue;
    if (bindings.has(ident)) continue; // loop vars are not root keys
    // Heuristic: only accept a few well-known root locals without being too loose
      if (['title', 'preheader', 'ogImage', 'header', 'intro', 'sections', 'footer', 'themeColors', 'theme'].includes(ident)) {
      paths.add(ident);
    }
  }

  return paths;
}

function addPathToSchema(schema, dottedPath) {
  const tokens = dottedPath.split('.').filter(Boolean);
  let current = schema;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isArray = token.endsWith('[*]');
    const prop = isArray ? token.slice(0, -3) : token;
    const isLeaf = i === tokens.length - 1;

    if (!current.properties) current.properties = {};
    if (!current.additionalProperties && current.additionalProperties !== false) {
      // do nothing
    }

    if (!current.properties[prop]) {
      current.properties[prop] = {};
    }

    const node = current.properties[prop];

    if (isArray) {
      // If we previously inferred an object here, prefer array and clear object-specific hints.
      if (node.type !== 'array') {
        node.type = 'array';
      }
      node.items = node.items || { type: 'object', properties: {}, additionalProperties: false };
      delete node.properties;
      delete node.additionalProperties;
      current = node.items;
      continue;
    }

    if (isLeaf) {
      // Leave leaf unconstrained; we only care about allowed keys.
      if (node.type === undefined && node.properties === undefined && node.items === undefined) {
        // Keep as-is (empty schema)
      }
      continue;
    }

    // If we previously inferred an array here, keep it as an array and descend into its items.
    // This avoids accidentally converting arrays to objects because of a later expression.
    if (node.type === 'array') {
      node.items = node.items || { type: 'object', properties: {}, additionalProperties: false };
      current = node.items;
      continue;
    }

    // Intermediate object
    if (node.type !== 'object') {
      node.type = 'object';
      node.properties = node.properties || {};
      node.additionalProperties = node.additionalProperties ?? false;
    }

    current = node;
  }
}

function buildSchemaFromPaths(paths) {
  const root = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Derived Newsletter Schema',
    type: 'object',
    properties: {},
    additionalProperties: false,
  };

  for (const p of paths) {
    addPathToSchema(root, p);
  }

  // Escape hatch for freeform metadata.
  root.properties.meta = { type: 'object', additionalProperties: true };

  // Common injected objects can be treated as maps to avoid noisy false positives.
  for (const key of ['themeColors', 'sectionStyles', 'theme', 'page']) {
    if (root.properties[key]) {
      root.properties[key].type = 'object';
      root.properties[key].additionalProperties = true;
      delete root.properties[key].properties;
    }
  }

  return root;
}

function addPathsWithPrefix(targetSchema, paths, prefix) {
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const stripped = p.slice(prefix.length);
    if (!stripped) continue;
    addPathToSchema(targetSchema, stripped);
  }
}

function makeTypedSectionVariant(type, baseSectionPaths, baseItemPaths, typePaths) {
  const sectionSchema = { type: 'object', properties: {}, additionalProperties: false };
  const itemSchema = { type: 'object', properties: {}, additionalProperties: false };

  addPathsWithPrefix(sectionSchema, baseSectionPaths, 'sections[*].');
  addPathsWithPrefix(itemSchema, baseItemPaths, 'sections[*].items[*].');

  addPathsWithPrefix(sectionSchema, typePaths, 'sections[*].');
  addPathsWithPrefix(itemSchema, typePaths, 'sections[*].items[*].');

  // These are injected by the build pipeline for all sections.
  sectionSchema.properties.headingStylesInline = sectionSchema.properties.headingStylesInline || {};
  sectionSchema.properties.linkStylesInline = sectionSchema.properties.linkStylesInline || {};

  sectionSchema.properties.type = { const: type };
  sectionSchema.properties.items = { type: 'array', items: itemSchema };

  // The build pipeline may inject style objects onto sections even if the template
  // mostly references their inline-string derivatives; treat these as freeform maps.
  for (const styleKey of ['containerStyles', 'contentStyles', 'headingStyles', 'linkStyles']) {
    // Allow null because upstream preprocessors may explicitly set these to null.
    sectionSchema.properties[styleKey] = { type: ['object', 'null'], additionalProperties: true };
  }

  return sectionSchema;
}

function findTypedSectionVariant(schema, type) {
  const variants = schema?.properties?.sections?.items?.allOf;
  if (!Array.isArray(variants)) return null;

  return (
    variants.find((variant) => variant?.if?.properties?.type?.const === type)?.then
    || null
  );
}

function findTypedSectionVariantEntry(schema, type) {
  const variants = schema?.properties?.sections?.items?.allOf;
  if (!Array.isArray(variants)) return null;

  return variants.find((variant) => variant?.if?.properties?.type?.const === type) || null;
}

/**
 * The template scan can only see fields read directly by Maizzle templates.
 * Some authoring-only keys are valid before normalization or hydration, so we
 * layer those allowances back onto the derived schema here.
 */
function applyDerivedSchemaOverrides(schema, entryAbsPath) {
  for (const rootKey of ['ogImageAltText', 'pubDate']) {
    if (!schema?.properties?.[rootKey]) {
      schema.properties[rootKey] = {};
    }
  }
  schema.properties.socialCard = { type: ['object', 'null'], additionalProperties: true };
  const footerCtaSchema = schema.properties.footer?.properties?.footerCta;
  if (footerCtaSchema?.properties && !footerCtaSchema.properties.variant) {
    footerCtaSchema.properties.variant = {};
  }

  const footerProperties = schema.properties.footer?.properties;
  if (footerProperties) {
    footerProperties.workCtaLabel = {};
    footerProperties.workCtaUrl = {};
  }

  const viewOnlineLinkSchema = schema.properties.intro?.properties?.viewOnlineLink;
  if (viewOnlineLinkSchema) {
    schema.properties.intro.properties.viewOnlineLink = {
      oneOf: [
        { type: 'string' },
        viewOnlineLinkSchema,
      ],
    };
  }

  const templateId = path.basename(path.dirname(entryAbsPath));
  if (templateId !== 'dense-discovery') return;

  const adjacencyJobsVariant = findTypedSectionVariant(schema, 'adjacency-job-posting');
  if (adjacencyJobsVariant?.properties) {
    adjacencyJobsVariant.properties.brandVariant = {};
    adjacencyJobsVariant.properties.canonicalUrl = {};

    const listsSchema = adjacencyJobsVariant.properties.lists;
    const listProperties = listsSchema?.items?.properties;
    if (listProperties) {
      listProperties.id = {};
      listProperties.items = { type: 'array', items: {} };
      listProperties.itemsHtml = { type: 'array', items: {} };
    }
  }

  const adBlockVariant = findTypedSectionVariant(schema, 'ad-block');
  const adBlockItemSchema = adBlockVariant?.properties?.items?.items;
  if (adBlockItemSchema?.properties) {
    delete adBlockItemSchema.properties.image;
    delete adBlockItemSchema.properties.imageAlt;
    if (!adBlockItemSchema.properties.adId) {
      adBlockItemSchema.properties.adId = {};
    }
  }

  const sectionTypeEnum = schema?.properties?.sections?.items?.properties?.type?.enum;
  if (Array.isArray(sectionTypeEnum) && !sectionTypeEnum.includes('image')) {
    const animatedIndex = sectionTypeEnum.indexOf('animated-image');
    sectionTypeEnum.splice(animatedIndex >= 0 ? animatedIndex + 1 : sectionTypeEnum.length, 0, 'image');
  }

  const variants = schema?.properties?.sections?.items?.allOf;
  const animatedImageEntry = findTypedSectionVariantEntry(schema, 'animated-image');
  const imageItemDescriptionSchema = {
    type: 'string',
    description: 'HTML fragment for the image item description; simple tags such as <p>, <a href>, <strong>, and <em> are supported.',
  };
  const itemTitlePlacementSchema = {
    type: 'string',
    enum: ['above-image', 'below-image-centered', 'below-image-before-description'],
    default: 'below-image-before-description',
    description: 'Controls where an image-section item title appears relative to its image and description.',
  };
  const animatedImageVariant = findTypedSectionVariant(schema, 'animated-image');
  if (animatedImageVariant?.properties) {
    const animatedImageItemProperties = animatedImageVariant.properties.items?.items?.properties;
    if (animatedImageItemProperties) {
      animatedImageItemProperties.description = imageItemDescriptionSchema;
    }
    animatedImageVariant.properties.itemTitlePlacement = itemTitlePlacementSchema;
  }
  const imageVariant = findTypedSectionVariant(schema, 'image');
  if (imageVariant?.properties) {
    const imageItemProperties = imageVariant.properties.items?.items?.properties;
    if (imageItemProperties) {
      imageItemProperties.description = imageItemDescriptionSchema;
    }
    imageVariant.properties.itemTitlePlacement = itemTitlePlacementSchema;
  }
  if (Array.isArray(variants) && animatedImageEntry && !findTypedSectionVariantEntry(schema, 'image')) {
    const imageEntry = JSON.parse(JSON.stringify(animatedImageEntry));
    imageEntry.if.properties.type.const = 'image';
    imageEntry.then.properties.type.const = 'image';
    const animatedIndex = variants.indexOf(animatedImageEntry);
    variants.splice(animatedIndex >= 0 ? animatedIndex + 1 : variants.length, 0, imageEntry);
  }

  const foodForThoughtVariant = findTypedSectionVariant(schema, 'food-for-thought');
  const readMoreLinksItemSchema =
    foodForThoughtVariant?.properties?.items?.items?.properties?.readMoreLinks?.items;
  if (readMoreLinksItemSchema?.properties) {
    readMoreLinksItemSchema.required = ['text', 'link'];
  }

  for (const type of ['single-column', 'indie-mag-single-column']) {
    const singleColumnVariant = findTypedSectionVariant(schema, type);
    const singleColumnItemSchema = singleColumnVariant?.properties?.items?.items;
    if (singleColumnItemSchema?.properties?.image && singleColumnItemSchema?.properties?.images) {
      const singleColumnImageSchema = {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            required: ['src'],
            properties: {
              src: { type: 'string' },
              alt: { type: 'string' },
              link: {},
              caption: { type: 'string' },
            },
            additionalProperties: false,
          },
        ],
      };

      singleColumnItemSchema.properties.image = singleColumnImageSchema;
      singleColumnItemSchema.properties.images = {
        type: 'array',
        items: singleColumnImageSchema,
      };
      singleColumnItemSchema.not = { required: ['image', 'images'] };
    }
  }

  const platformLinksSchema = {
    type: 'array',
    items: {
      type: 'object',
      required: ['platform', 'label', 'url'],
      properties: {
        platform: { enum: ['spotify', 'youtube', 'apple-podcasts'] },
        label: { type: 'string' },
        url: { type: 'string' },
        category: { type: 'string' },
        intent: { type: 'string' },
        interests: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string' },
          ],
        },
        interest: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string' },
          ],
        },
      },
      additionalProperties: false,
    },
  };

  for (const variant of variants ?? []) {
    const typeEnum = variant?.then?.properties?.type?.enum;
    if (Array.isArray(typeEnum) && typeEnum.includes('feature') && typeEnum.includes('sponsor')) {
      const itemProperties = variant?.then?.properties?.items?.items?.properties;
      if (itemProperties) {
        itemProperties.platformLinks = platformLinksSchema;
      }
    }
  }

  for (const variant of variants ?? []) {
    const itemProperties = variant?.then?.properties?.items?.items?.properties;
    const variantType = variant?.then?.properties?.type?.const;
    if (itemProperties?.image && !['single-column', 'indie-mag-single-column'].includes(variantType)) {
      itemProperties.image = {};
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }

  if (!args.entry || !args.output) {
    console.error(USAGE.trim());
    process.exit(1);
  }

  const repoRoot = args.root ? path.resolve(args.root) : process.cwd();
  const entryAbs = resolveRepoPath(repoRoot, args.entry);
  const outAbs = resolveRepoPath(repoRoot, args.output);

  if (!entryAbs || !fileExists(entryAbs)) {
    throw new Error(`Entry not found: ${entryAbs}`);
  }

  const files = collectTemplateGraph(entryAbs, repoRoot);
  const bindings = new Map();
  const loopVarStack = [];
  const typeContextStack = [];
  const typePaths = new Map(); // section.type -> Set(paths)
  const untypedPaths = new Set(); // paths collected outside any section.type context
  const paths = new Set();
  const sectionTypes = new Set();

  function currentTypeContext() {
    for (let i = typeContextStack.length - 1; i >= 0; i--) {
      const entry = typeContextStack[i];
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  function addPathsForCurrentContext(expr, localBindings) {
    const found = collectDataPathsFromExpression(expr, localBindings);
    for (const p of found) paths.add(p);

    const activeTypes = currentTypeContext();
    if (!activeTypes || activeTypes === 'AMBIGUOUS') {
      for (const p of found) untypedPaths.add(p);
      return;
    }

    for (const t of activeTypes) {
      if (!typePaths.has(t)) typePaths.set(t, new Set());
      const set = typePaths.get(t);
      for (const p of found) set.add(p);
    }
  }

  for (const file of files) {
    const html = readText(file);
    const exprs = extractExpressions(html);

    for (const { kind, expr } of exprs) {
      if (kind === 'if_open') {
        parseSectionTypeConstants(expr).forEach(t => sectionTypes.add(t));

        const foundTypes = parseSectionTypeConstants(expr);
        const next = foundTypes.length ? new Set(foundTypes) : undefined;
        const current = currentTypeContext();

        if (!next) {
          typeContextStack.push(undefined);
        } else if (!current || current === 'AMBIGUOUS') {
          typeContextStack.push(next);
        } else {
          const intersect = new Set([...current].filter(t => next.has(t)));
          typeContextStack.push(intersect.size ? intersect : 'AMBIGUOUS');
        }

        addPathsForCurrentContext(expr, bindings);
        continue;
      }

      if (kind === 'if_close') {
        typeContextStack.pop();
        continue;
      }

      if (kind === 'each_open') {
        const parsed = parseEachLoop(expr);
        if (parsed) {
          addPathsForCurrentContext(parsed.collectionExpr, bindings);

          // Bind loop var to collection path + [*]
          const chainText = normalizeChainText(parsed.collectionExpr);
          const m = new RegExp(`^${IDENT}(?:\\s*(?:\\.${IDENT}|\\[\\s*['\\\"][^'\\\"]+['\\\"]\\s*\\]|\\[\\s*\\d+\\s*\\]))*`).exec(chainText);
          const chain = m ? m[0] : null;
          const segs = chain ? chainToSegments(chain) : null;

          const prev = bindings.has(parsed.varName) ? bindings.get(parsed.varName) : null;
          loopVarStack.push({ varName: parsed.varName, prev });

          if (segs) {
            const withBindings = applyBindings(segs, bindings);
            const last = withBindings[withBindings.length - 1];
            withBindings[withBindings.length - 1] = `${last}[*]`;
            bindings.set(parsed.varName, withBindings);
          }
        }
        continue;
      }

      if (kind === 'each_close') {
        const entry = loopVarStack.pop();
        if (entry) {
          if (entry.prev) bindings.set(entry.varName, entry.prev);
          else bindings.delete(entry.varName);
        }
        continue;
      }

      if (kind === 'mustache') {
        addPathsForCurrentContext(expr, bindings);
      }
    }
  }

  // Ensure core locals exist
  [
    '$schema',
    'title',
    'preheader',
    'ogImage',
    'template',
    'colorTheme',
    'sectionStylesFile',
    'sectionStyles',
    'intro',
    'header',
    'sections',
    'footer',
  ].forEach(k => paths.add(k));

  const schema = buildSchemaFromPaths(paths);

  // Replace the generic sections[*] schema with a type-discriminated union keyed by `section.type`.
  if (schema.properties.sections?.type === 'array') {
    const baseSectionPaths = new Set([...untypedPaths].filter(p => p.startsWith('sections[*].') && !p.startsWith('sections[*].items[*].')));
    const baseItemPaths = new Set([...untypedPaths].filter(p => p.startsWith('sections[*].items[*].')));

    const variants = [...sectionTypes].sort().map(t => {
      const perType = typePaths.get(t) || new Set();
      return makeTypedSectionVariant(t, baseSectionPaths, baseItemPaths, perType);
    });

    // Use an if/then discriminator instead of oneOf:
    // - avoids noisy "must equal constant" errors for non-matching types
    // - only validates the matching section.type branch
    schema.properties.sections.items = {
      type: 'object',
      required: ['type'],
      properties: {
        type: { enum: [...sectionTypes].sort() },
      },
      additionalProperties: true,
      allOf: variants.map(v => ({
        if: {
          type: 'object',
          required: ['type'],
          properties: { type: { const: v.properties.type.const } },
        },
        then: v,
      })),
    };
  }

  applyDerivedSchemaOverrides(schema, entryAbs);

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(schema, null, 2));

  console.log(`✓ Schema generated: ${path.relative(repoRoot, outAbs)}`);
  console.log(`  Files scanned: ${files.length}`);
  console.log(`  Paths found: ${paths.size}`);
  if (sectionTypes.size) console.log(`  Section types: ${[...sectionTypes].sort().join(', ')}`);
}

main().catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
