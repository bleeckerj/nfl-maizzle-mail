/**
 * Build the authoring view of a maintained template schema. Internal and legacy
 * inputs remain in the validation schema for compatibility, but are never offered
 * as editable starter controls. This module performs no I/O or content mutation.
 */
import { resolveSchemaRef, extractSectionVariants } from './schema-resolution.mjs';

export function projectAuthoringSchema(fragment, root = fragment, references = new Set()) {
  if (!fragment || typeof fragment !== 'object' || Array.isArray(fragment)) return fragment;
  const reference = fragment.$ref;
  if (reference && references.has(reference)) return fragment;
  const nextReferences = reference ? new Set([...references, reference]) : references;
  const schema = resolveSchemaRef(root, fragment);
  const result = { ...schema };
  const contract = schema['x-nfl-authoring'];
  if (schema.properties) {
    const allowed = contract?.sectionFields;
    result.properties = {};
    for (const [name, child] of Object.entries(schema.properties)) {
      const resolved = resolveSchemaRef(root, child);
      if (resolved.readOnly || resolved.deprecated || (allowed && !allowed.includes(name))) continue;
      let value = child;
      if (name === 'items' && contract?.itemFields) {
        const collection = resolveSchemaRef(root, child);
        const item = resolveSchemaRef(root, collection.items || {});
        value = { ...collection, items: { ...item, 'x-nfl-authoring': {
          sectionFields: contract.itemFields, requiredSectionFields: contract.requiredItemFields || [],
        } } };
      }
      result.properties[name] = projectAuthoringSchema(value, root, nextReferences);
    }
    if (schema.required || contract?.requiredSectionFields) {
      result.required = (contract?.requiredSectionFields || schema.required).filter(name => Object.hasOwn(result.properties, name));
    }
  }
  for (const name of ['items', 'additionalProperties', 'if', 'then', 'else', 'not']) {
    if (schema[name] && typeof schema[name] === 'object') result[name] = projectAuthoringSchema(schema[name], root, nextReferences);
  }
  for (const name of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray(schema[name])) result[name] = schema[name].map(child => projectAuthoringSchema(child, root, nextReferences));
  }
  for (const name of ['definitions', '$defs']) {
    if (schema[name]) result[name] = Object.fromEntries(Object.entries(schema[name]).map(([key, child]) => [key, projectAuthoringSchema(child, root, nextReferences)]));
  }
  return result;
}

/** Return both views and all section variants, with no template-name allowlist. */
export function resolveTemplateContract(schema) {
  return {
    version: 1,
    validationSchema: schema,
    authoringSchema: projectAuthoringSchema(schema),
    sections: extractSectionVariants(schema).map(({ type, schema: section }) => ({
      type, schema: section, authoringSchema: projectAuthoringSchema(section, schema),
    })),
  };
}
