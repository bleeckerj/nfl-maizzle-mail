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
 * Validate author source before rendering. A selected template owns its schema;
 * a missing schema or invalid value stops the build instead of hiding drift.
 *
 * @param {object} newsletterData
 * @param {string} templateName
 * @param {{ repoRoot: string, sourcePath?: string, logger?: Pick<Console, 'log'> }} options
 */
export function validateNewsletterDataAgainstSchema(
  newsletterData,
  templateName,
  { repoRoot, sourcePath, logger = console } = {},
) {
  const schemaCandidates = [
    templateName ? path.join(repoRoot, 'templates', templateName, 'newsletter.schema.json') : null,
    !templateName ? path.join(repoRoot, 'newsletter.schema.json') : null,
  ].filter(Boolean);

  const schemaPath = schemaCandidates.find((candidate) => fs.existsSync(candidate));
  if (!schemaPath) throw new Error(`No canonical newsletter schema for template ${templateName || '(missing)'}`);

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read schema at ${schemaPath}: ${error.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const {
    $schema: _buildSchemaReference,
    issueId: _buildIssueId,
    ...sourceNewsletterData
  } = newsletterData;
  if (validate(sourceNewsletterData)) {
    logger.log(`✅ Schema validation passed (${path.relative(process.cwd(), schemaPath)})`);
    return;
  }

  // Conditional branch failures duplicate their underlying field errors.
  // Count the same actionable errors that are printed below.
  const errors = (validate.errors || []).filter((error) => {
    if (['if', 'oneOf', 'anyOf'].includes(error.keyword)) return false;
    const sectionMatch = /^\/sections\/(\d+)/.exec(error.instancePath);
    const sectionType = sectionMatch && sourceNewsletterData.sections?.[Number(sectionMatch[1])]?.type;
    // Discard failures from alternative section types; retain the matching
    // branch's field errors and all failures for unknown discriminators.
    if (sectionType) {
      const parts = error.schemaPath.replace(/^#\//, '').split('/');
      let fragment = schema;
      for (const part of parts) {
        const discriminator = fragment?.properties?.type;
        if (discriminator?.const && discriminator.const !== sectionType && error.keyword !== 'const') return false;
        fragment = fragment?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
      }
      if (error.keyword === 'const' && error.instancePath.endsWith('/type')) return false;
    }
    return true;
  });
  if (!errors.length) errors.push(...(validate.errors || []).filter(error => error.keyword !== 'if').slice(0, 1));
  const location = sourcePath || templateName || schemaPath;
  logger.log(`\nSchema validation failed for ${location} (${errors.length} issue(s))`);
  const messages = [];

  errors
    .slice(0, 50)
    .forEach((error) => {
      const context = describeSchemaLocation(error.instancePath, sourceNewsletterData);
      const contextPrefix = context ? `${context}: ` : '';

      if (error.keyword === 'additionalProperties') {
        const base = jsonPointerToDotPath(error.instancePath);
        const extra = error.params?.additionalProperty ? `.${error.params.additionalProperty}` : '';
        const message = `${contextPrefix}Unknown key: ${base}${extra}; remove it or use a declared field.`;
        messages.push(message);
        logger.log(`   • ${message}`);
        return;
      }

      const value = error.instancePath.split('/').slice(1).reduce((current, part) => current?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], sourceNewsletterData);
      const expected = error.params?.pattern || error.params?.type || (error.params?.allowedValues && JSON.stringify(error.params.allowedValues)) || error.params?.missingProperty || error.message;
      const message = `${contextPrefix}${jsonPointerToDotPath(error.instancePath)}: ${error.message}; supplied ${JSON.stringify(value)?.slice(0, 240) ?? '(missing)'}; expected ${expected}`;
      messages.push(message);
      logger.log(`   • ${message}`);
    });

  if (errors.length > 50) {
    logger.log(`   • …and ${errors.length - 50} more`);
  }

  throw new Error(`Schema validation failed for ${location}:\n${messages.join('\n')}`);
}
