// Read section discriminators from the canonical template schema. A style
// preset is optional and does not define whether a content section is supported.
// Handle both derived if/then schemas and authored oneOf section contracts.
export function collectTemplateSectionContracts(schema) {
  const contracts = new Map();
  function visit(rule) {
    if (!rule || typeof rule !== 'object') return;
    const discriminator = rule.if?.properties?.type || rule.properties?.type;
    const types = discriminator?.const ? [discriminator.const] : discriminator?.enum || [];
    for (const type of types) contracts.set(type, rule.then || rule);
    for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
      for (const child of rule[keyword] || []) visit(child);
    }
  }
  visit(schema?.properties?.sections?.items);
  return contracts;
}
