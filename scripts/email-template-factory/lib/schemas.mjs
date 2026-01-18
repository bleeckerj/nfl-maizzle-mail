/**
 * JSON Schemas for LLM Response Validation
 * 
 * These schemas define the expected structure of LLM responses
 * and are used for validation and repair.
 */

export const SCHEMAS = {
  /**
   * Visual Design Analysis Schema
   */
  visualDesign: {
    type: 'object',
    required: ['colorPalette', 'typography', 'layout'],
    properties: {
      reasoning: { type: 'string' },
      colorPalette: {
        type: 'object',
        required: ['primary', 'background', 'text'],
        properties: {
          primary: { type: 'string' },
          secondary: { type: 'string' },
          accent: { type: 'string' },
          background: { type: 'string' },
          backgroundAlt: { type: 'string' },
          text: { type: 'string' },
          textMuted: { type: 'string' },
          border: { type: 'string' },
          allColors: { type: 'array', items: { type: 'string' } }
        }
      },
      typography: {
        type: 'object',
        properties: {
          headingFont: { type: 'string' },
          bodyFont: { type: 'string' },
          monoFont: { type: 'string' },
          headingSizes: { type: 'object' },
          bodySize: { type: 'string' },
          smallSize: { type: 'string' },
          lineHeights: { type: 'object' },
          fontWeights: { type: 'object' }
        }
      },
      spacing: {
        type: 'object',
        properties: {
          containerPadding: { type: 'string' },
          sectionGap: { type: 'string' },
          elementGap: { type: 'string' },
          patterns: { type: 'array', items: { type: 'string' } }
        }
      },
      images: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            src: { type: 'string' },
            alt: { type: 'string' },
            role: { type: 'string' },
            width: { type: 'string' },
            context: { type: 'string' }
          }
        }
      },
      layout: {
        type: 'object',
        required: ['maxWidth', 'structure'],
        properties: {
          maxWidth: { type: 'string' },
          structure: { type: 'string' },
          containerType: { type: 'string' },
          responsiveHints: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },

  /**
   * Structural Analysis Schema
   */
  structure: {
    type: 'object',
    required: ['sections', 'sectionTypes'],
    properties: {
      reasoning: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'type'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            purpose: { type: 'string' },
            order: { type: 'number' },
            contentType: { type: 'string', enum: ['static', 'dynamic', 'repeating'] },
            estimatedStartLine: { type: 'string' },
            keyIdentifiers: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      sectionTypes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'description', 'variables'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            isRepeating: { type: 'boolean' },
            instanceCount: { type: 'number' },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  required: { type: 'boolean' },
                  description: { type: 'string' }
                }
              }
            },
            containerStructure: { type: 'string' },
            stylingNotes: { type: 'string' }
          }
        }
      },
      repeatingSections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            pattern: { type: 'string' },
            instanceCount: { type: 'number' },
            variablesPerInstance: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      globalElements: {
        type: 'object',
        properties: {
          header: { type: 'object' },
          footer: { type: 'object' },
          wrapper: { type: 'object' }
        }
      },
      hierarchy: {
        type: 'object',
        properties: {
          depth: { type: 'number' },
          description: { type: 'string' }
        }
      }
    }
  },

  /**
   * Content Extraction Schema
   */
  content: {
    type: 'object',
    required: ['emailType', 'sampleData'],
    properties: {
      reasoning: { type: 'string' },
      emailType: { type: 'string', enum: ['newsletter', 'marketing', 'transactional', 'ecommerce'] },
      emailSubtype: { type: 'string' },
      title: { type: 'string' },
      preheader: { type: 'string' },
      contentBySectionType: { type: 'object' },
      sampleData: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          preheader: { type: 'string' },
          date: { type: 'string' },
          sections: { type: 'array' },
          header: { type: 'object' },
          footer: { type: 'object' }
        }
      },
      staticContent: {
        type: 'object',
        properties: {
          elements: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },

  /**
   * Component Extraction Schema
   */
  components: {
    type: 'object',
    required: ['components'],
    properties: {
      reasoning: { type: 'string' },
      components: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'type', 'html', 'variables'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            html: { type: 'string' },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  required: { type: 'boolean' },
                  default: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            loops: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  variable: { type: 'string' },
                  itemVariable: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            conditionals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  variable: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      },
      layout: {
        type: 'object',
        required: ['html'],
        properties: {
          name: { type: 'string' },
          html: { type: 'string' },
          description: { type: 'string' }
        }
      },
      globalStyles: {
        type: 'object',
        properties: {
          embedded: { type: 'string' },
          critical: { type: 'string' }
        }
      },
      templateStructure: {
        type: 'object',
        properties: {
          mainTemplate: { type: 'string' },
          componentOrder: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

/**
 * Validate a response against a schema
 * Returns { valid: boolean, errors: string[] }
 */
export function validateAgainstSchema(data, schema, path = '') {
  const errors = [];

  if (!data) {
    errors.push(`${path || 'root'}: data is null or undefined`);
    return { valid: false, errors };
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push(`${path || 'root'}: missing required field '${field}'`);
      }
    }
  }

  // Check property types
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const value = data[key];
        const propPath = path ? `${path}.${key}` : key;

        if (propSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`${propPath}: expected string, got ${typeof value}`);
        } else if (propSchema.type === 'number' && typeof value !== 'number') {
          errors.push(`${propPath}: expected number, got ${typeof value}`);
        } else if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${propPath}: expected boolean, got ${typeof value}`);
        } else if (propSchema.type === 'array' && !Array.isArray(value)) {
          errors.push(`${propPath}: expected array, got ${typeof value}`);
        } else if (propSchema.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          errors.push(`${propPath}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
        }

        // Check enum values
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`${propPath}: value '${value}' not in allowed values [${propSchema.enum.join(', ')}]`);
        }

        // Recursively validate nested objects
        if (propSchema.type === 'object' && propSchema.properties && typeof value === 'object') {
          const nested = validateAgainstSchema(value, propSchema, propPath);
          errors.push(...nested.errors);
        }

        // Validate array items
        if (propSchema.type === 'array' && propSchema.items && Array.isArray(value)) {
          value.forEach((item, index) => {
            if (propSchema.items.type === 'object' && propSchema.items.properties) {
              const nested = validateAgainstSchema(item, propSchema.items, `${propPath}[${index}]`);
              errors.push(...nested.errors);
            }
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
