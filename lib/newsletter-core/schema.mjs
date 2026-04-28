import fs from 'node:fs';
import path from 'node:path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function jsonPointerToDotPath(pointer) {
  if (!pointer || pointer === '/') return '$';
  const parts = pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`));
  return '$' + parts.join('');
}

function describeSchemaLocation(instancePath, newsletterData) {
  const match = /^\/sections\/(\d+)(?:\/items\/(\d+))?/.exec(instancePath || '');
  if (!match) return null;

  const sectionIndex = Number(match[1]);
  const itemIndex = match[2] !== undefined ? Number(match[2]) : null;

  const section = Array.isArray(newsletterData?.sections) ? newsletterData.sections[sectionIndex] : null;
  const sectionType = section?.type ? String(section.type) : 'unknown-type';
  const sectionTitle = section?.title ? String(section.title) : null;

  const sectionLabel = sectionTitle
    ? `sections[${sectionIndex}] (${sectionType} / "${sectionTitle}")`
    : `sections[${sectionIndex}] (${sectionType})`;

  if (itemIndex === null) return sectionLabel;

  const item = Array.isArray(section?.items) ? section.items[itemIndex] : null;
  const itemTitle = item?.title ? String(item.title) : null;
  return itemTitle
    ? `${sectionLabel} → items[${itemIndex}] ("${itemTitle}")`
    : `${sectionLabel} → items[${itemIndex}]`;
}

/**
 * Validate normalized newsletter data against the best matching schema.
 *
 * This mirrors the warning-oriented schema behavior used by the mail build:
 * schema errors are logged unless strict mode is requested.
 *
 * @param {object} newsletterData
 * @param {string} templateName
 * @param {{ repoRoot: string, args?: string[], strict?: boolean, logger?: Pick<Console, 'log'> }} options
 */
export function validateNewsletterDataAgainstSchema(
  newsletterData,
  templateName,
  { repoRoot, args = [], strict, logger = console } = {},
) {
  const shouldFail = strict ?? (args.includes('--strict-schema') || process.env.SCHEMA_STRICT === '1');
  const schemaCandidates = [
    templateName ? path.join(repoRoot, 'templates', templateName, 'newsletter.schema.json') : null,
    path.join(repoRoot, 'newsletter.schema.json'),
  ].filter(Boolean);

  const schemaPath = schemaCandidates.find((candidate) => fs.existsSync(candidate));
  if (!schemaPath) return;

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read schema at ${schemaPath}: ${error.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  if (validate(newsletterData)) {
    logger.log(`✅ Schema validation passed (${path.relative(process.cwd(), schemaPath)})`);
    return;
  }

  const errors = validate.errors || [];
  logger.log(`\n⚠️  Schema validation found ${errors.length} issue(s) (${path.relative(process.cwd(), schemaPath)})`);

  errors
    .filter((error) => error.keyword !== 'if')
    .slice(0, 50)
    .forEach((error) => {
      const context = describeSchemaLocation(error.instancePath, newsletterData);
      const contextPrefix = context ? `${context}: ` : '';

      if (error.keyword === 'additionalProperties') {
        const base = jsonPointerToDotPath(error.instancePath);
        const extra = error.params?.additionalProperty ? `.${error.params.additionalProperty}` : '';
        logger.log(`   • ${contextPrefix}Unknown key: ${base}${extra}`);
        return;
      }

      logger.log(`   • ${contextPrefix}${jsonPointerToDotPath(error.instancePath)}: ${error.message}`);
    });

  if (errors.length > 50) {
    logger.log(`   • …and ${errors.length - 50} more`);
  }

  if (shouldFail) {
    throw new Error('Schema validation failed (strict mode)');
  }
}
