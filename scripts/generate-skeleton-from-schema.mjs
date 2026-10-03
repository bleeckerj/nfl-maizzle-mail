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
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { resolveSchemaRef, resolveGenerationSchema, extractSectionVariants, extractSectionSchema } from '../lib/newsletter-core/schema-resolution.mjs';
import { projectAuthoringSchema } from '../lib/newsletter-core/authoring-contract.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');


const USAGE = `
Generate a newsletter skeleton from a JSON Schema.

Usage:
  node scripts/generate-skeleton-from-schema.mjs [OPTIONS]

Options:
  --template <name>        Template name (looks for templates/<name>/newsletter.schema.json or schema.json)
  --template-name <name>   Template name to write when using --schema
  --schema <path>          Path to JSON schema file (alternative to --template)
  --output <path>          Output file path (default: stdout)
  --minimal                Generate minimal skeleton with fewer items per section
  --all-section-fields     Emit every declared section field in the full starter
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
    templateName: null,
    schema: null,
    output: null,
    minimal: false,
    allSectionFields: true,
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
      case '--template-name':
        args.templateName = argv[++i];
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
      case '--all-section-fields':
        args.allSectionFields = true;
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



function generatePlaceholderValue(propName, propSchema = {}, context = {}) {
  const generationDepth = Number.isInteger(context.generationDepth)
    ? context.generationDepth
    : 0;
  if (generationDepth > 32) {
    return {};
  }

  const nextContext = { ...context, generationDepth: generationDepth + 1 };
  const resolvedSchema = resolveGenerationSchema(propSchema, context);
  if (Object.prototype.hasOwnProperty.call(resolvedSchema, 'const')) {
    return resolvedSchema.const;
  }
  if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length > 0) {
    return resolvedSchema.enum[0];
  }
  if (Object.prototype.hasOwnProperty.call(resolvedSchema, 'default')) {
    return resolvedSchema.default;
  }
  if (Object.prototype.hasOwnProperty.call(resolvedSchema, 'example')) {
    return resolvedSchema.example;
  }
  if (Array.isArray(resolvedSchema.examples) && resolvedSchema.examples.length > 0) {
    return resolvedSchema.examples[0];
  }

  const type = resolvedSchema.type;

  // Handle explicit types
  if (type === 'array') {
    return generateArrayPlaceholder(propName, resolvedSchema, nextContext);
  }

  if (type === 'object') {
    return generateObjectPlaceholder(propName, resolvedSchema, nextContext);
  }

  throw new Error(`No explicit starter example or default for ${context.templateName || 'schema'}.${propName}. Add examples, default, const, or enum to the owning schema.`);
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
    generatePlaceholderValue(propName, itemSchema, { ...context, index: index + 1 }),
  );
}

function generateObjectPlaceholder(propName, propSchema, context = {}) {
  const result = {};
  const properties = propSchema.properties || {};

  for (const [key, keySchema] of Object.entries(properties)) {
    // Build-generated fields must not become duplicate editable content.
    if (keySchema.readOnly) continue;
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

// ============================================================================
// Section Type Extraction
// ============================================================================

function extractSectionTypes(schema) {
  return extractSectionVariants(schema).map(({ type }) => type).sort();
}

function projectSectionSchemaForAuthoring(sectionType, sectionSchema = {}, schema = {}) {
  return projectAuthoringSchema(sectionSchema, schema);
}

function projectItemSchemaForAuthoring(sectionType, itemSchema = {}, schema = {}) {
  return projectAuthoringSchema(resolveSchemaRef(schema, itemSchema), schema);
}

function assertStarterCompleteness(markdown, schema) {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatterMatch) {
    throw new Error('Generated starter is missing YAML frontmatter');
  }

  const payload = yaml.load(frontmatterMatch[1]) || {};
  const missing = [];

  function walk(value, propSchema, location) {
    if (value === null || value === undefined) return;

    const resolvedSchema = resolveGenerationSchema(propSchema, { schema });
    if (Array.isArray(value)) {
      const itemSchema = resolvedSchema.items || {};
      for (const [index, item] of value.entries()) {
        walk(item, itemSchema, `${location}[${index}]`);
      }
      return;
    }

    if (typeof value !== 'object') return;

    const mutuallyExclusiveProperties = new Set(
      Array.isArray(resolvedSchema.not?.required) ? resolvedSchema.not.required : [],
    );
    for (const [propertyName, propertySchema] of Object.entries(resolvedSchema.properties || {})) {
      if (propertySchema.readOnly) continue;
      const propertyPath = `${location}.${propertyName}`;
      if (!Object.prototype.hasOwnProperty.call(value, propertyName)) {
        if (
          mutuallyExclusiveProperties.has(propertyName)
          && Array.from(mutuallyExclusiveProperties).some((candidate) =>
            candidate !== propertyName && Object.prototype.hasOwnProperty.call(value, candidate),
          )
        ) {
          continue;
        }
        missing.push(propertyPath);
        continue;
      }
      walk(value[propertyName], propertySchema, propertyPath);
    }
  }

  for (const [propertyName, propertySchema] of Object.entries(schema.properties || {})) {
    if (propertyName === '$schema') continue;
    if (!Object.prototype.hasOwnProperty.call(payload, propertyName)) {
      missing.push(propertyName);
      continue;
    }

    if (propertyName === 'sections' && Array.isArray(payload.sections)) {
      for (const [index, section] of payload.sections.entries()) {
        const sectionPath = `sections[${index}]`;
        if (!section || typeof section !== 'object') continue;
        const sectionSchema = projectSectionSchemaForAuthoring(
          section.type,
          extractSectionSchema(schema, section.type),
          schema,
        );
        walk(section, sectionSchema || propertySchema.items || {}, sectionPath);
      }
      continue;
    }

    walk(payload[propertyName], propertySchema, propertyName);
  }

  if (missing.length > 0) {
    throw new Error(
      `Schema starter is incomplete; missing ${missing.length} declared field(s): ${missing.join(', ')}`,
    );
  }
}

// ============================================================================
// Skeleton Generation
// ============================================================================

function generateSkeleton(schema, options = {}) {
  const {
    templateName,
    minimal,
    allSectionFields,
    sections: requestedSections,
    itemsPerSection,
  } = options;
  const lines = [];

  lines.push('---');

  // Template name
  if (templateName) {
    lines.push(`template: ${templateName}`);
  }

  // Emit every schema-declared root field except structural collections handled below.
  const structuralProps = new Set(['$schema', 'template', 'sections', 'header', 'intro', 'footer']);
  const topLevelProps = Object.keys(schema.properties || {}).filter((prop) => !structuralProps.has(prop));
  for (const prop of topLevelProps) {
    if (schema.properties?.[prop]) {
      const value = generatePlaceholderValue(prop, schema.properties[prop], { minimal, schema, templateName });
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
    lines.push(...generateYamlObject('header', schema.properties.header, { minimal, indent: 0, schema, templateName }));
  }

  // Intro (if exists)
  if (schema.properties?.intro) {
    lines.push('');
    lines.push(...generateYamlObject('intro', schema.properties.intro, { minimal, indent: 0, schema, templateName }));
  }

  // Sections
  const availableSections = extractSectionTypes(schema);
  const unsupported = (requestedSections || []).filter(s => !availableSections.includes(s));
  if (unsupported.length) throw new Error(`Unsupported section(s): ${unsupported.join(', ')}. Available: ${availableSections.join(', ')}`);
  const sectionsToGenerate = requestedSections
    ? requestedSections
    : availableSections.filter(sectionType => !extractSectionSchema(schema, sectionType)?.deprecated);

  if (sectionsToGenerate.length > 0) {
    lines.push('');
    lines.push('sections:');

    for (const sectionType of sectionsToGenerate) {
      const sectionSchema = extractSectionSchema(schema, sectionType);
      lines.push(...generateSectionYaml(sectionType, sectionSchema, {
        minimal,
        allSectionFields,
        itemsPerSection,
        schema,
        templateName,
      }));
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
    lines.push(...generateYamlObject('footer', schema.properties.footer, { minimal, indent: 0, schema, templateName }));
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

function generateSectionYaml(sectionType, sectionSchema, options = {}) {
  const { minimal, allSectionFields, itemsPerSection = 2 } = options;
  const lines = [];
  const indent = '  ';

  lines.push(`- type: ${sectionType}`);

  const authoringSectionSchema = projectSectionSchemaForAuthoring(
    sectionType,
    sectionSchema,
    options.schema,
  );

  if (!authoringSectionSchema?.properties) {
    throw new Error(`Section ${sectionType} has no declared authoring properties.`);
  }

  const props = authoringSectionSchema.properties;
  const emittedFields = new Set();

  // Title first
  if (props.title) {
    lines.push(`${indent}title: ${formatYamlValue(generatePlaceholderValue('title', props.title, { schema: options.schema, templateName: options.templateName }))}`);
    emittedFields.add('title');
  }

  // Description if present
  if (props.description) {
    lines.push(`${indent}description: ${formatYamlValue(generatePlaceholderValue('description', props.description, { schema: options.schema, templateName: options.templateName }))}`);
    emittedFields.add('description');
  }

  // Collection arrays such as items and section_article_group articles.
  const resolvedItemsSchema = props.items
    ? resolveGenerationSchema(props.items, { schema: options.schema })
    : null;
  const resolvedArticlesSchema = props.articles
    ? resolveGenerationSchema(props.articles, { schema: options.schema })
    : null;
  const collectionProp = resolvedItemsSchema?.type === 'array' || resolvedItemsSchema?.items
    ? 'items'
    : resolvedArticlesSchema?.type === 'array' || resolvedArticlesSchema?.items
      ? 'articles'
      : null;
  if (collectionProp) {
    lines.push(`${indent}${collectionProp}:`);
    const collectionSchema = collectionProp === 'items'
      ? resolvedItemsSchema
      : resolvedArticlesSchema;
    const itemSchema = projectItemSchemaForAuthoring(
      sectionType,
      collectionSchema.items || {},
      options.schema,
    );
    const requestedCount = minimal ? 1 : itemsPerSection;
    const minimumCount = Number.isInteger(collectionSchema.minItems) ? collectionSchema.minItems : 0;
    const maximumCount = Number.isInteger(collectionSchema.maxItems) ? collectionSchema.maxItems : Infinity;
    const itemCount = Math.max(minimumCount, Math.min(requestedCount, maximumCount));

    for (let i = 0; i < itemCount; i++) {
      const itemLines = generateItemYaml(sectionType, itemSchema, i + 1, {
        minimal,
        allSectionFields,
        schema: options.schema,
        templateName: options.templateName,
      });
      lines.push(...(itemLines.length > 0 ? itemLines : [`${indent}- {}`]));
    }
  }

  // Emit required scalar/object fields for sections without a collection.
  const requiredFields = Array.isArray(authoringSectionSchema.required) ? authoringSectionSchema.required : [];
  for (const propName of requiredFields) {
    if (
      propName === 'type'
      || propName === collectionProp
      || emittedFields.has(propName)
      || !props[propName]
    ) continue;
    const value = generatePlaceholderValue(propName, props[propName], {
      minimal,
      schema: options.schema,
      templateName: options.templateName,
    });
    lines.push(`${indent}${propName}: ${formatYamlValue(value)}`);
    emittedFields.add(propName);
  }

  // Full starters represent every schema-declared section field. This keeps
  // defaults and structured styling fields visible even when they are
  // optional in the authoring contract.
  if (allSectionFields && !minimal) {
    for (const [propName, propSchema] of Object.entries(props)) {
      if (
        propName === 'type'
        || propName === collectionProp
        || emittedFields.has(propName)
      ) continue;
      const value = generatePlaceholderValue(propName, propSchema, {
        minimal,
        sectionType,
        schema: options.schema,
        templateName: options.templateName,
      });
      lines.push(`${indent}${propName}: ${formatYamlValue(value)}`);
      emittedFields.add(propName);
    }
  }

  return lines;
}

function generateItemYaml(sectionType, itemSchema, index, options = {}) {
  const { minimal, allSectionFields } = options;
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
    ...propNames.filter((p) => !keyProps.includes(p) && (minimal || allSectionFields || !isStyleProperty(p))),
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
    const value = generatePlaceholderValue(propName, propSchema, {
      index,
      sectionType,
      schema: options.schema,
      templateName: options.templateName,
    });

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

    const value = generatePlaceholderValue(propName, propSchema, {
      minimal,
      schema: options.schema,
      templateName: options.templateName,
    });

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
      /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value) ||
      /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value) ||
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
    templateName = args.templateName || (match ? match[1] : null);
  }

  console.error(`Loading schema from: ${schemaPath}`);
  const sourceSchema = loadSchema(schemaPath);
  const schema = projectAuthoringSchema(sourceSchema, sourceSchema);

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
    allSectionFields: args.allSectionFields,
    sections: args.sections,
    itemsPerSection: args.itemsPerSection,
  });

  if (!args.minimal && args.allSectionFields) {
    assertStarterCompleteness(skeleton, schema);
  }
  validateStarter(skeleton, sourceSchema);

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

/** Check generated source locally; generating a starter never triggers a build. */
export function validateStarter(markdown, schema) {
  const payload = yaml.load(markdown.match(/^---\n([\s\S]*?)\n---/)[1]);
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(payload)) throw new Error(`Generated starter violates its schema: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  return payload;
}

export { generateSkeleton, generatePlaceholderValue, assertStarterCompleteness };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
