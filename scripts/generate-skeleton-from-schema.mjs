#!/usr/bin/env node

/**
 * Generate a newsletter skeleton from a JSON Schema.
 * 
 * This script reads a template's JSON schema and generates a Markdown skeleton
 * with YAML frontmatter containing all available fields with placeholder values.
 * 
 * Usage:
 *   node scripts/generate-skeleton-from-schema.mjs --template dense-discovery
 *   node scripts/generate-skeleton-from-schema.mjs --schema templates/dense-discovery/newsletter.schema.json
 *   node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --minimal
 *   node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --sections feature dispatch
 *   node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --output content/my-newsletter.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const USAGE = `
Generate a newsletter skeleton from a JSON Schema.

Usage:
  node scripts/generate-skeleton-from-schema.mjs [OPTIONS]

Options:
  --template <name>        Template name (looks for templates/<name>/newsletter.schema.json or schema.json)
  --schema <path>          Path to JSON schema file (alternative to --template)
  --output <path>          Output file path (default: stdout)
  --minimal                Generate minimal skeleton with fewer items per section
  --sections <types...>    Only include specific section types
  --list-sections          List available section types from the schema
  --items-per-section <n>  Number of items per section (default: 2, minimal: 1)
  -h, --help               Show this help message

Examples:
  # Generate full skeleton for dense-discovery template
  node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --output content/my-newsletter.md

  # Generate minimal skeleton
  node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --minimal --output content/minimal.md

  # Generate with specific sections only
  node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --sections feature dispatch food-for-thought

  # List available section types
  node scripts/generate-skeleton-from-schema.mjs --template dense-discovery --list-sections

  # Use custom schema path
  node scripts/generate-skeleton-from-schema.mjs --schema templates/coda-email/schema.json
`;

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv) {
  const args = {
    template: null,
    schema: null,
    output: null,
    minimal: false,
    sections: null,
    listSections: false,
    itemsPerSection: 2,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--template':
        args.template = argv[++i];
        break;
      case '--schema':
        args.schema = argv[++i];
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--minimal':
        args.minimal = true;
        args.itemsPerSection = 1;
        break;
      case '--sections':
        args.sections = [];
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          args.sections.push(argv[++i]);
        }
        break;
      case '--list-sections':
        args.listSections = true;
        break;
      case '--items-per-section':
        args.itemsPerSection = parseInt(argv[++i], 10);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return args;
}

// ============================================================================
// Schema Loading
// ============================================================================

function findSchemaPath(templateName) {
  const candidates = [
    path.join(REPO_ROOT, 'templates', templateName, 'newsletter.schema.json'),
    path.join(REPO_ROOT, 'templates', templateName, 'schema.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find schema for template "${templateName}". ` +
    `Looked in:\n  ${candidates.join('\n  ')}`
  );
}

function loadSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// Placeholder Value Generation
// ============================================================================

const PLACEHOLDER_IMAGE = (width = 800, height = 600, text = 'Image') =>
  `https://fpoimg.com/${width}x${height}?text=${encodeURIComponent(text)}&bg_color=e6e6e6&text_color=4FAAAA`;

const DEPRECATED_SECTION_TYPES = new Set(['sponsor']);

function resolveSchemaRef(schema, propSchema) {
  if (!propSchema || typeof propSchema !== 'object' || typeof propSchema.$ref !== 'string') {
    return propSchema || {};
  }

  if (!schema || !propSchema.$ref.startsWith('#/')) return propSchema;

  let resolved = schema;
  for (const part of propSchema.$ref.slice(2).split('/')) {
    if (!resolved || typeof resolved !== 'object') return propSchema;
    resolved = resolved[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return resolved && typeof resolved === 'object' ? resolved : propSchema;
}

function resolveGenerationSchema(propSchema = {}, context = {}) {
  let resolved = resolveSchemaRef(context.schema, propSchema);

  const alternatives = resolved.anyOf || resolved.oneOf;
  if (Array.isArray(alternatives) && alternatives.length > 0) {
    // Prefer structured objects for tracked links and action objects so the
    // generated Markdown demonstrates the authoring shape accepted by the schema.
    const resolvedAlternatives = alternatives.map((candidate) => {
      const resolvedCandidate = resolveSchemaRef(context.schema, candidate);
      return resolvedCandidate.anyOf || resolvedCandidate.oneOf
        ? resolveGenerationSchema(resolvedCandidate, context)
        : resolvedCandidate;
    });
    resolved = resolvedAlternatives.find((candidate) => candidate?.type === 'object' || candidate?.type?.includes?.('object'))
      || resolvedAlternatives.find((candidate) => Object.prototype.hasOwnProperty.call(candidate, 'const'))
      || resolvedAlternatives[0];
    resolved = resolveSchemaRef(context.schema, resolved);
  }

  // JSON Schema permits nullable values with a union type. Choose the
  // structured branch when one exists so the placeholder has the right YAML
  // shape; the generated value remains valid for the nullable union.
  if (Array.isArray(resolved.type)) {
    const preferredType = resolved.type.includes('object')
      ? 'object'
      : resolved.type.includes('array')
        ? 'array'
        : resolved.type.find((type) => type !== 'null') || resolved.type[0];
    resolved = { ...resolved, type: preferredType };
  }

  return resolved || {};
}

function mergeSchemaFragments(base = {}, extension = {}) {
  const merged = { ...base, ...extension };
  const baseProperties = base.properties || {};
  const extensionProperties = extension.properties || {};
  const properties = { ...baseProperties };

  for (const [propertyName, propertySchema] of Object.entries(extensionProperties)) {
    properties[propertyName] = baseProperties[propertyName]
      ? mergeSchemaFragments(baseProperties[propertyName], propertySchema)
      : propertySchema;
  }

  if (Object.keys(properties).length > 0) merged.properties = properties;

  const required = [...new Set([
    ...(Array.isArray(base.required) ? base.required : []),
    ...(Array.isArray(extension.required) ? extension.required : []),
  ])];
  if (required.length > 0) merged.required = required;
  return merged;
}

function conditionMatches(condition, sectionType) {
  const typeSchema = condition?.properties?.type;
  if (typeof typeSchema?.const === 'string') return typeSchema.const === sectionType;
  return Array.isArray(typeSchema?.enum) && typeSchema.enum.includes(sectionType);
}

function materializeConditionalSchema(schema, candidate, sectionType) {
  const resolved = resolveSchemaRef(schema, candidate);
  let materialized = { ...resolved };

  function applyRules(current, fragment) {
    let result = current;
    if (Array.isArray(fragment?.allOf)) {
      for (const branch of fragment.allOf) result = applyRules(result, branch);
      return result;
    }

    if (fragment?.if) {
      const selected = conditionMatches(fragment.if, sectionType) ? fragment.then : fragment.else;
      if (selected) {
        result = mergeSchemaFragments(result, resolveSchemaRef(schema, selected));
        result = applyRules(result, selected);
      }
    }
    return result;
  }

  materialized = applyRules(materialized, resolved);
  return materialized;
}

function generatePlaceholderValue(propName, propSchema = {}, context = {}) {
  const resolvedSchema = resolveGenerationSchema(propSchema, context);
  if (Object.prototype.hasOwnProperty.call(resolvedSchema, 'const')) {
    return resolvedSchema.const;
  }
  if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length > 0) {
    return resolvedSchema.enum[0];
  }

  const type = resolvedSchema.type || inferTypeFromName(propName);
  const description = resolvedSchema.description || '';

  // Handle explicit types
  if (type === 'array') {
    return generateArrayPlaceholder(propName, resolvedSchema, context);
  }

  if (type === 'object') {
    return generateObjectPlaceholder(propName, resolvedSchema, context);
  }

  if (type === 'boolean') {
    return false;
  }

  if (type === 'number' || type === 'integer') {
    return 0;
  }

  if (type === 'html') {
    return `<p>Example ${humanize(propName)} content.</p>`;
  }

  // String type - infer from property name
  return generateStringPlaceholder(propName, description);
}

function inferTypeFromName(propName) {
  const name = propName.toLowerCase();
  if (name.includes('items') || name.includes('links') || name.includes('images')) {
    return 'array';
  }
  if (name.includes('styles') || name.includes('config') || name.includes('settings')) {
    return 'object';
  }
  return 'string';
}

function generateStringPlaceholder(propName, description = '') {
  const name = propName.toLowerCase();

  if (name === 'alt' || name.includes('alttext')) {
    if (name === 'ogimagealttext') return 'Open graph preview image for this newsletter';
    return 'Image description for accessibility';
  }

  if (name === 'adid') return 'example-ad-id';
  if (name === 'shorttakeid') return 'example-short-take-id';

  // URLs and links
  if (name.includes('url') || name.includes('link') || name === 'href' || name === 'src') {
    if (name.includes('image') || name.includes('logo') || name.includes('featured')) {
      return PLACEHOLDER_IMAGE(600, 400, humanize(propName));
    }
    if (name.includes('unsubscribe')) {
      return '[unsubscribe]';
    }
    return 'https://nearfuturelaboratory.com';
  }

  // Images
  if (name === 'image' || name.includes('image') || name === 'featuredimage' || name === 'ogimage') {
    const width = name.includes('logo') ? 200 : 800;
    const height = name.includes('logo') ? 50 : 600;
    return PLACEHOLDER_IMAGE(width, height, humanize(propName));
  }

  if (name === 'logo' || name.includes('logo')) {
    return PLACEHOLDER_IMAGE(200, 50, 'Logo');
  }

  // Email-specific fields
  if (name === 'preheader') {
    return 'Short preview text that appears in email clients';
  }

  if (name === 'title') {
    return 'Newsletter Title';
  }

  if (name === 'description' || name === 'content' || name === 'body') {
    return `<p>Example ${humanize(propName)} content.</p>`;
  }

  if (name === 'quote') {
    return 'An inspiring quote or thought-provoking statement';
  }

  if (name === 'author' || name === 'authorname') {
    return 'Author Name';
  }

  if (name === 'name') {
    return 'Example Name';
  }

  if (name === 'email' || name === 'emailshare') {
    return 'mailto:?subject=Newsletter&body=Check%20this%20out';
  }

  if (name === 'address') {
    return '© 2025 Your Company<br>City, State<br>Country';
  }

  if (name === 'subtitle' || name === 'category' || name === 'channel') {
    return `Example ${humanize(propName)}`;
  }

  if (name.includes('readmore') || name.includes('linktext')) {
    return 'Read more →';
  }

  if (name.includes('callout')) {
    return 'Important callout text that draws attention';
  }

  // Default
  return description || `Example ${humanize(propName)}`;
}

function generateArrayPlaceholder(propName, propSchema, context) {
  const itemSchema = resolveSchemaRef(context.schema, propSchema.items || {});
  const requestedCount = context.itemsPerSection || 1;
  const minimumCount = Number.isInteger(propSchema.minItems) ? propSchema.minItems : 0;
  const maximumCount = Number.isInteger(propSchema.maxItems) ? propSchema.maxItems : Infinity;
  const count = Math.max(minimumCount, Math.min(requestedCount, maximumCount));

  if (itemSchema.type === 'object') {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(generateObjectPlaceholder(`${propName} item ${i + 1}`, itemSchema, { ...context, index: i + 1 }));
    }
    return items;
  }

  if (itemSchema.type === 'array') {
    return Array.from({ length: count }, () =>
      generateArrayPlaceholder(`${propName} item`, itemSchema, context),
    );
  }

  // Simple array
  return Array.from({ length: count }, (_, index) =>
    generatePlaceholderValue(`${propName} ${index + 1}`, itemSchema, context),
  );
}

function generateObjectPlaceholder(propName, propSchema, context = {}) {
  const result = {};
  const properties = propSchema.properties || {};

  for (const [key, keySchema] of Object.entries(properties)) {
    // Skip style objects in minimal mode unless they're essential
    if (context.minimal && isStyleProperty(key)) {
      continue;
    }

    result[key] = generatePlaceholderValue(key, keySchema, context);
  }

  return result;
}

function isStyleProperty(propName) {
  const name = propName.toLowerCase();
  return name.includes('styles') || name.includes('inline');
}

function humanize(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ============================================================================
// Section Type Extraction
// ============================================================================

function extractSectionTypes(schema) {
  return extractSectionVariants(schema).map(({ type }) => type).sort();
}

function extractSectionVariants(schema) {
  const sectionsSchema = schema.properties?.sections;
  if (!sectionsSchema?.items) return [];

  const variants = [];

  function visit(candidate) {
    const resolved = resolveSchemaRef(schema, candidate);
    if (!resolved || typeof resolved !== 'object') return;

    const typeSchema = resolved.properties?.type;
    const candidateTypes = [];
    if (typeof typeSchema?.const === 'string') candidateTypes.push(typeSchema.const);
    if (Array.isArray(typeSchema?.enum)) {
      for (const type of typeSchema.enum) {
        if (typeof type === 'string') candidateTypes.push(type);
      }
    }

    for (const type of candidateTypes) {
      variants.push({
        type,
        schema: materializeConditionalSchema(schema, resolved, type),
      });
    }

    for (const branch of [...(resolved.oneOf || []), ...(resolved.anyOf || [])]) {
      visit(branch);
    }

    for (const branch of resolved.allOf || []) {
      const branchType = branch?.if?.properties?.type;
      const conditionalTypes = [];
      if (typeof branchType?.const === 'string') conditionalTypes.push(branchType.const);
      if (Array.isArray(branchType?.enum)) {
        conditionalTypes.push(...branchType.enum.filter((type) => typeof type === 'string'));
      }
      for (const type of conditionalTypes) {
        variants.push({
          type,
          schema: materializeConditionalSchema(schema, resolved, type),
        });
      }
      if (conditionalTypes.length === 0) {
        visit(branch);
      }
    }
  }

  visit(sectionsSchema.items);
  return variants.filter(
    ({ type }, index) => variants.findIndex((candidate) => candidate.type === type) === index,
  );
}

function extractSectionSchema(schema, sectionType) {
  const match = extractSectionVariants(schema).find(({ type }) => type === sectionType);
  if (match) return match.schema;

  return schema.properties?.sections?.items || null;
}

// ============================================================================
// Skeleton Generation
// ============================================================================

function generateSkeleton(schema, options = {}) {
  const authoringStarter = schema['x-nfl-authoring-starter']?.markdown;
  if (Array.isArray(authoringStarter) && authoringStarter.every((line) => typeof line === 'string')) {
    return authoringStarter.join('\n');
  }

  const { templateName, minimal, sections: requestedSections, itemsPerSection } = options;
  const lines = [];

  lines.push('---');

  // Template name
  if (templateName) {
    lines.push(`template: ${templateName}`);
  }

  // Emit every schema-declared root field except structural collections handled below.
  const structuralProps = new Set(['template', 'sections', 'header', 'intro', 'footer']);
  const topLevelProps = Object.keys(schema.properties || {}).filter((prop) => !structuralProps.has(prop));
  for (const prop of topLevelProps) {
    if (schema.properties?.[prop]) {
      const value = generatePlaceholderValue(prop, schema.properties[prop], { minimal, schema });
      if (Array.isArray(value) && value.length > 0) {
        lines.push(`${prop}:`);
        for (const item of value) {
          if (Array.isArray(item)) {
            lines.push(`  - ${formatYamlValue(item)}`);
          } else if (typeof item === 'object' && item !== null) {
            lines.push(...formatNestedArrayItem(item, '  '));
          } else {
            lines.push(`  - ${formatYamlValue(item)}`);
          }
        }
      } else {
        lines.push(`${prop}: ${formatYamlValue(value)}`);
      }
    }
  }

  // Header
  if (schema.properties?.header) {
    lines.push('');
    lines.push(...generateYamlObject('header', schema.properties.header, { minimal, indent: 0, schema }));
  }

  // Intro (if exists)
  if (schema.properties?.intro) {
    lines.push('');
    lines.push(...generateYamlObject('intro', schema.properties.intro, { minimal, indent: 0, schema }));
  }

  // Sections
  const availableSections = extractSectionTypes(schema);
  const sectionsToGenerate = requestedSections
    ? requestedSections.filter((s) => availableSections.includes(s))
    : availableSections.filter((sectionType) => !DEPRECATED_SECTION_TYPES.has(sectionType));

  if (sectionsToGenerate.length > 0) {
    lines.push('');
    lines.push('sections:');

    for (const sectionType of sectionsToGenerate) {
      const sectionSchema = extractSectionSchema(schema, sectionType);
      lines.push(...generateSectionYaml(sectionType, sectionSchema, { minimal, itemsPerSection, schema }));
    }
  } else if (schema.properties?.sections) {
    // A schema may require the collection while intentionally leaving its
    // item vocabulary open to another authoring layer. Preserve the declared
    // collection shape without inventing a section type.
    lines.push('');
    lines.push('sections: []');
  }

  // Footer
  if (schema.properties?.footer) {
    lines.push('');
    lines.push(...generateYamlObject('footer', schema.properties.footer, { minimal, indent: 0, schema }));
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function generateSectionYaml(sectionType, sectionSchema, options = {}) {
  const { minimal, itemsPerSection = 2 } = options;
  const lines = [];
  const indent = '  ';

  lines.push(`- type: ${sectionType}`);

  if (!sectionSchema?.properties) {
    lines.push(`${indent}title: ${humanize(sectionType)} Section`);
    return lines;
  }

  const props = sectionSchema.properties;
  const emittedFields = new Set();

  // Title first
  if (props.title) {
    lines.push(`${indent}title: ${humanize(sectionType)} Section`);
    emittedFields.add('title');
  }

  // Description if present
  if (props.description) {
    lines.push(`${indent}description: <p>Description for ${sectionType} section.</p>`);
    emittedFields.add('description');
  }

  // Collection arrays such as items and section_article_group articles.
  const collectionProp = props.items?.items
    ? 'items'
    : props.articles?.items
      ? 'articles'
      : null;
  if (collectionProp) {
    lines.push(`${indent}${collectionProp}:`);
    const collectionSchema = props[collectionProp] || {};
    const itemSchema = collectionSchema.items || {};
    const requestedCount = minimal ? 1 : itemsPerSection;
    const minimumCount = Number.isInteger(collectionSchema.minItems) ? collectionSchema.minItems : 0;
    const maximumCount = Number.isInteger(collectionSchema.maxItems) ? collectionSchema.maxItems : Infinity;
    const itemCount = Math.max(minimumCount, Math.min(requestedCount, maximumCount));

    for (let i = 0; i < itemCount; i++) {
      const itemLines = generateItemYaml(sectionType, itemSchema, i + 1, {
        minimal,
        schema: options.schema,
      });
      lines.push(...(itemLines.length > 0 ? itemLines : [`${indent}- {}`]));
    }
  }

  // Emit required scalar/object fields for sections without a collection.
  const requiredFields = Array.isArray(sectionSchema.required) ? sectionSchema.required : [];
  for (const propName of requiredFields) {
    if (
      propName === 'type'
      || propName === collectionProp
      || emittedFields.has(propName)
      || !props[propName]
    ) continue;
    const value = generatePlaceholderValue(propName, props[propName], { minimal, schema: options.schema });
    lines.push(`${indent}${propName}: ${formatYamlValue(value)}`);
  }

  return lines;
}

function generateItemYaml(sectionType, itemSchema, index, options = {}) {
  const { minimal } = options;
  const lines = [];
  const baseIndent = '  ';
  const itemIndent = baseIndent + '  ';

  const resolvedItemSchema = resolveGenerationSchema(itemSchema, { schema: options.schema });
  const props = resolvedItemSchema.properties || {};
  const propNames = Object.keys(props);

  // Determine key properties to show first
  const keyProps = ['title', 'link', 'image', 'images', 'description', 'content', 'quote', 'calloutText'];
  const orderedProps = [
    ...keyProps.filter((p) => propNames.includes(p)),
    ...propNames.filter((p) => !keyProps.includes(p) && !isStyleProperty(p)),
  ];

  // In minimal mode, only show essential properties
  const requiredProps = Array.isArray(resolvedItemSchema.required) ? resolvedItemSchema.required : [];
  const mutuallyExclusiveProps = Array.isArray(resolvedItemSchema.not?.required)
    ? resolvedItemSchema.not.required
    : [];
  const propsToShow = minimal
    ? orderedProps.filter((p) =>
        ['title', 'link', 'image', 'images', 'description', 'content', 'quote', 'calloutText'].includes(p) ||
        requiredProps.includes(p),
      )
    : orderedProps;
  if (mutuallyExclusiveProps.length > 1) {
    const firstExclusiveProp = propsToShow.find((propName) => mutuallyExclusiveProps.includes(propName));
    if (firstExclusiveProp) {
      propsToShow.splice(
        0,
        propsToShow.length,
        ...propsToShow.filter(
          (propName) => !mutuallyExclusiveProps.includes(propName) || propName === firstExclusiveProp,
        ),
      );
    }
  }

  let isFirst = true;
  for (const propName of propsToShow) {
    const propSchema = props[propName];
    const value = generatePlaceholderValue(propName, propSchema, { index, sectionType, schema: options.schema });

    if (isFirst) {
      // First property uses array marker
      lines.push(`${baseIndent}- ${propName}: ${formatYamlValue(value, itemIndent)}`);
      isFirst = false;
    } else {
      lines.push(`${itemIndent}${propName}: ${formatYamlValue(value, itemIndent)}`);
    }

    // Handle nested arrays like 'images'
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      lines.pop(); // Remove the line we just added
      if (isFirst) {
        lines.push(`${baseIndent}- ${propName}:`);
        isFirst = false;
      } else {
        lines.push(`${itemIndent}${propName}:`);
      }
      for (const item of value) {
        lines.push(...formatNestedArrayItem(item, itemIndent + '  '));
      }
    }
  }

  return lines;
}

function formatNestedArrayItem(obj, indent) {
  const lines = [];
  const keys = Object.keys(obj);

  keys.forEach((key, i) => {
    const value = obj[key];
    if (i === 0) {
      lines.push(`${indent}- ${key}: ${formatYamlValue(value)}`);
    } else {
      lines.push(`${indent}  ${key}: ${formatYamlValue(value)}`);
    }
  });

  return lines;
}

function generateYamlObject(key, schema, options = {}) {
  const { minimal, indent = 0 } = options;
  const lines = [];
  const baseIndent = '  '.repeat(indent);
  const propIndent = '  '.repeat(indent + 1);

  lines.push(`${baseIndent}${key}:`);

  const props = schema.properties || {};

  for (const [propName, propSchema] of Object.entries(props)) {
    // Skip style objects in minimal mode
    if (minimal && isStyleProperty(propName)) {
      continue;
    }

    const value = generatePlaceholderValue(propName, propSchema, { minimal, schema: options.schema });

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Flow-style JSON is valid YAML and preserves referenced object shapes.
      lines.push(`${propIndent}${propName}: ${formatYamlValue(value)}`);
    } else if (Array.isArray(value)) {
      // Array
      lines.push(`${propIndent}${propName}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(...formatNestedArrayItem(item, propIndent));
        } else {
          lines.push(`${propIndent}- ${formatYamlValue(item)}`);
        }
      }
    } else {
      lines.push(`${propIndent}${propName}: ${formatYamlValue(value)}`);
    }
  }

  return lines;
}

function formatYamlValue(value, indent = '') {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    // Check if it needs quoting
    if (
      value.includes(':') ||
      value.includes('#') ||
      value.includes("'") ||
      value.includes('"') ||
      value.includes('\n') ||
      value.startsWith('[') ||
      value.startsWith('{') ||
      value === '' ||
      value === 'true' ||
      value === 'false' ||
      value === 'null'
    ) {
      // Use single quotes, escaping internal single quotes
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Return placeholder - actual formatting handled by caller
    return '[]';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  if (!args.template && !args.schema) {
    console.error('Error: Must specify either --template or --schema');
    console.log(USAGE);
    process.exit(1);
  }

  // Load schema
  let schemaPath;
  let templateName;

  if (args.template) {
    templateName = args.template;
    schemaPath = findSchemaPath(templateName);
  } else {
    schemaPath = path.resolve(args.schema);
    // Try to infer template name from path
    const match = schemaPath.match(/templates\/([^/]+)\//);
    templateName = match ? match[1] : null;
  }

  console.error(`Loading schema from: ${schemaPath}`);
  const schema = loadSchema(schemaPath);

  // List sections mode
  if (args.listSections) {
    const sectionTypes = extractSectionTypes(schema);
    console.log('\nAvailable section types:');
    for (const type of sectionTypes) {
      console.log(`  - ${type}`);
    }
    process.exit(0);
  }

  // Generate skeleton
  const skeleton = generateSkeleton(schema, {
    templateName,
    minimal: args.minimal,
    sections: args.sections,
    itemsPerSection: args.itemsPerSection,
  });

  // Output
  if (args.output) {
    const outputPath = path.resolve(args.output);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, skeleton, 'utf-8');
    console.error(`✓ Skeleton generated: ${outputPath}`);
  } else {
    console.log(skeleton);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
