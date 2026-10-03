/**
 * Resolve template schema references and section discriminators for all callers.
 * Input is the maintained JSON Schema; output is a resolved fragment. Definitions
 * stay in their owning schema, and reference-site annotations take precedence.
 */
export function resolveSchemaRef(schema, propSchema) {
  if (!propSchema || typeof propSchema !== 'object' || typeof propSchema.$ref !== 'string') {
    return propSchema || {};
  }

  if (!schema || !propSchema.$ref.startsWith('#/')) return propSchema;

  let resolved = schema;
  for (const part of propSchema.$ref.slice(2).split('/')) {
    if (!resolved || typeof resolved !== 'object') throw new Error(`Unresolved schema reference: ${propSchema.$ref}`);
    resolved = resolved[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  if (!resolved || typeof resolved !== 'object') throw new Error(`Unresolved schema reference: ${propSchema.$ref}`);
  const { $ref, ...annotations } = propSchema;
  return mergeSchemaFragments(resolved, annotations);
}

export function resolveGenerationSchema(propSchema = {}, context = {}) {
  const resolvingRefs = context.resolvingRefs || new Set();
  const currentRef = propSchema && typeof propSchema.$ref === 'string'
    ? propSchema.$ref
    : null;
  if (currentRef && resolvingRefs.has(currentRef)) {
    return { type: 'object', properties: {} };
  }

  const nextContext = currentRef
    ? { ...context, resolvingRefs: new Set([...resolvingRefs, currentRef]) }
    : { ...context, resolvingRefs };
  let resolved = resolveSchemaRef(nextContext.schema, propSchema);

  const alternatives = resolved.anyOf || resolved.oneOf;
  if (Array.isArray(alternatives) && alternatives.length > 0) {
    // Prefer structured objects for tracked links and action objects so the
    // generated Markdown demonstrates the authoring shape accepted by the schema.
    const resolvedAlternatives = alternatives.map((candidate) => {
      const resolvedCandidate = resolveSchemaRef(nextContext.schema, candidate);
      return resolvedCandidate.anyOf || resolvedCandidate.oneOf
        ? resolveGenerationSchema(resolvedCandidate, nextContext)
        : resolvedCandidate;
    });
    const selectedAlternative = resolvedAlternatives.find((candidate) => candidate?.type === 'object' || candidate?.type?.includes?.('object'))
      || resolvedAlternatives.find((candidate) => Object.prototype.hasOwnProperty.call(candidate, 'const'))
      || resolvedAlternatives[0];
    const { anyOf, oneOf, ...annotations } = resolved;
    resolved = mergeSchemaFragments(selectedAlternative, annotations);
    resolved = resolveSchemaRef(nextContext.schema, resolved);
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

export function mergeSchemaFragments(base = {}, extension = {}) {
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

export function materializeConditionalSchema(schema, candidate, sectionType) {
  const resolved = resolveSchemaRef(schema, candidate);
  const { allOf, oneOf, anyOf, if: condition, then, else: otherwise, ...base } = resolved;
  let result = base;
  for (const branch of allOf || []) {
    result = mergeSchemaFragments(result, materializeConditionalSchema(schema, branch, sectionType));
  }
  const alternatives = oneOf || anyOf;
  if (alternatives) {
    const match = alternatives.find(branch => conditionMatches(resolveSchemaRef(schema, branch), sectionType));
    if (match) result = mergeSchemaFragments(result, materializeConditionalSchema(schema, match, sectionType));
  }
  if (condition) {
    const selected = conditionMatches(condition, sectionType) ? then : otherwise;
    if (selected) result = mergeSchemaFragments(result, materializeConditionalSchema(schema, selected, sectionType));
  }
  return result;
}

/** Discover discriminators, then apply common and conditional fields per type. */
export function extractSectionVariants(schema) {
  const item = resolveSchemaRef(schema, schema.properties?.sections)?.items;
  if (!item) return [];
  const types = new Set();
  const seen = new Set();
  function visit(candidate) {
    if (candidate?.$ref) {
      if (seen.has(candidate.$ref)) return;
      seen.add(candidate.$ref);
    }
    const resolved = resolveSchemaRef(schema, candidate);
    const discriminator = resolved?.properties?.type;
    if (typeof discriminator?.const === 'string') types.add(discriminator.const);
    for (const type of discriminator?.enum || []) if (typeof type === 'string') types.add(type);
    for (const key of ['allOf', 'oneOf', 'anyOf']) for (const branch of resolved?.[key] || []) visit(branch);
    if (resolved?.if) visit(resolved.if);
  }
  visit(item);
  return [...types].map(type => ({ type, schema: materializeConditionalSchema(schema, item, type) }));
}

export function extractSectionSchema(schema, sectionType) {
  const match = extractSectionVariants(schema).find(({ type }) => type === sectionType);
  if (match) return match.schema;

  return schema.properties?.sections?.items || null;
}
