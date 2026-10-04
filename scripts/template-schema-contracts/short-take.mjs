// Short Take email sources carry exactly one Editorial registry ID. The build
// hydrates copy, images, and styles later; those fields are never source overrides.
// Return a fresh schema so template-specific processing cannot mutate another one.
export function shortTakeSourceSectionSchema() {
  return {
    type: 'object',
    description: 'Registry-backed Short Take with the canonical Geist Bold SHORT TAKES brand rail; lockup.brandRail: false omits the complete rail. Footer CTAs link to the record destination when one is present.',
    required: ['type', 'items'],
    properties: {
      type: { const: 'short-take' },
      items: {
        type: 'array', minItems: 1, maxItems: 1,
        items: {
          type: 'object', required: ['shortTakeId'],
          properties: { shortTakeId: { type: 'string', minLength: 1, pattern: '\\S' } },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  };
}
