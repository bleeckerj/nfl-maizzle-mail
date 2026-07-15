export const MICRODROP_ASSEMBLY_SCHEMA = {
  type: 'object',
  required: ['assemblyPlan', 'markdown', 'sourceCoverage', 'warnings', 'promptVersion'],
  properties: {
    assemblyPlan: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sourceBlockId', 'action', 'sectionType', 'rationale'],
        properties: {
          sourceBlockId: { type: 'string' },
          action: { type: 'string', 'enum': ['include', 'omit', 'transform'] },
          sectionType: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
    markdown: { type: 'string' },
    sourceCoverage: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sourceBlockId', 'status', 'selectedSectionType'],
        properties: {
          sourceBlockId: { type: 'string' },
          status: { type: 'string', 'enum': ['included', 'omitted', 'transformed'] },
          selectedSectionType: { type: 'string' },
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
    promptVersion: { type: 'string' },
  },
};
