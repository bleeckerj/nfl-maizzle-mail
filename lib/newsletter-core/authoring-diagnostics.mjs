/** Report old boilerplate helpers before normalization removes them. Never edit source. */
import fs from 'node:fs';
import path from 'node:path';
import { projectAuthoringSchema } from './authoring-contract.mjs';
import { extractSectionSchema, resolveSchemaRef, resolveGenerationSchema } from './schema-resolution.mjs';

export function reportAuthoringCompatibility(data, template, { repoRoot, sourcePath, logger = console }) {
  const file = path.join(repoRoot, 'templates', template, 'newsletter.schema.json');
  if (!fs.existsSync(file)) return;
  const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
  function walk(value, fragment, location) {
    if (!value || typeof value !== 'object') return;
    const resolved = resolveGenerationSchema(fragment, { schema });
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, location === 'sections' ? extractSectionSchema(schema, entry?.type) : resolved.items, `${location}[${index}]`));
      return;
    }
    const author = projectAuthoringSchema(resolved, schema);
    for (const [key, entry] of Object.entries(value)) {
      const child = resolved.properties?.[key];
      if (!child) continue;
      const field = location ? `${location}.${key}` : key;
      if (!Object.hasOwn(author.properties || {}, key)) {
        const definition = resolveSchemaRef(schema, child);
        logger.log(`Compatibility notice: ${sourcePath || template}: ${field} is ${definition.readOnly ? 'generated during rendering' : 'a legacy field excluded from current authoring'}. ${definition.description || 'Remove it from future boilerplate.'}`);
      } else walk(entry, child, field);
    }
  }
  walk(data, schema, '');
}
