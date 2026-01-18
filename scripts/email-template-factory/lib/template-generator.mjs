/**
 * Template Generator
 * 
 * Generates Maizzle template files from analysis results.
 * Creates: layouts, components, sample data, schema, and main template.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export class TemplateGenerator {
  constructor() {
    this.templateDir = null;
  }

  async generate(templateName, analysis, preprocessed) {
    this.templateDir = `./templates/${templateName}`;
    
    // Create directory structure
    this.createDirectories();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    TEMPLATE GENERATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Generate layout
    console.log('   📄 Generating layout...');
    this.generateLayout(analysis);

    // Generate components
    console.log('   📦 Generating components...');
    this.generateComponents(analysis);

    // Generate main template
    console.log('   📝 Generating main template...');
    this.generateMainTemplate(analysis);

    // Generate sample data
    console.log('   💾 Generating sample data...');
    this.generateSampleData(analysis);

    // Generate schema
    console.log('   📋 Generating schema...');
    this.generateSchema(analysis);

    // Generate section styles
    console.log('   🎨 Generating section styles...');
    this.generateSectionStyles(analysis);

    // Generate skeleton markdown (minimal template for starting new content)
    console.log('   📝 Generating skeleton markdown...');
    this.generateSkeleton(analysis);

    // Generate sample content markdown (full example with all data)
    console.log('   📖 Generating sample content markdown...');
    this.generateSampleContent(analysis);

    // Generate section styles documentation
    console.log('   📚 Generating section styles documentation...');
    this.generateSectionStylesDoc(analysis);

    // Generate sample output HTML (build the template with sample data)
    console.log('   🌐 Generating sample output HTML...');
    await this.generateSampleOutput(templateName);

    console.log('');
    console.log(`   ✅ Template files created in ${this.templateDir}/`);
    
    return this.templateDir;
  }

  createDirectories() {
    const dirs = [
      this.templateDir,
      path.join(this.templateDir, 'components'),
      path.join(this.templateDir, 'layouts')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  generateLayout(analysis) {
    const colors = analysis.visualDesign?.colorPalette || {};
    const typography = analysis.visualDesign?.typography || {};
    const layoutInfo = analysis.visualDesign?.layout || {};
    
    // Check if we have LLM-generated layout
    let layoutHtml;
    if (analysis.components?.layout?.html) {
      layoutHtml = analysis.components.layout.html;
    } else {
      // Generate default layout
      layoutHtml = this.createDefaultLayout(colors, typography, layoutInfo);
    }

    fs.writeFileSync(
      path.join(this.templateDir, 'layouts', 'main.html'),
      layoutHtml
    );
  }

  createDefaultLayout(colors, typography, layoutInfo) {
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>{{ title }}</title>
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: ${colors.background || '#ffffff'};
      font-family: ${typography.bodyFont || "'Helvetica Neue', Helvetica, Arial, sans-serif"};
      font-size: ${typography.bodySize || '16px'};
      line-height: ${typography.lineHeights?.body || '1.5'};
      color: ${colors.text || '#333333'};
    }
    
    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      font-family: ${typography.headingFont || "'Helvetica Neue', Helvetica, Arial, sans-serif"};
      margin: 0;
      padding: 0;
    }
    
    a {
      color: ${colors.accent || '#0066cc'};
    }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .wrapper {
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .responsive-image {
        width: 100% !important;
        height: auto !important;
      }
      
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background || '#ffffff'};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${colors.background || '#ffffff'};">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" border="0" width="${layoutInfo.maxWidth?.replace('px', '') || '600'}" style="max-width: ${layoutInfo.maxWidth || '600px'}; width: 100%;">
          <tr>
            <td>
              <block name="template">
                <!-- Template content goes here -->
              </block>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  generateComponents(analysis) {
    const components = analysis.components?.components || [];
    
    if (components.length === 0) {
      // Generate basic components from structure analysis
      this.generateBasicComponents(analysis);
      return;
    }

    // Generate each component from LLM analysis
    components.forEach(component => {
      const filename = `${component.name}.html`;
      const content = this.wrapComponent(component);
      
      fs.writeFileSync(
        path.join(this.templateDir, 'components', filename),
        content
      );
    });
  }

  generateBasicComponents(analysis) {
    const sectionTypes = analysis.structure?.sectionTypes || [];
    
    sectionTypes.forEach(sectionType => {
      const componentName = this.pascalCase(sectionType.name);
      const content = this.createBasicComponent(sectionType);
      
      fs.writeFileSync(
        path.join(this.templateDir, 'components', `${componentName}.html`),
        content
      );
    });
  }

  wrapComponent(component) {
    // If HTML is already complete, use it
    if (component.html && component.html.includes('<table')) {
      return `<!-- ${component.name} Component -->
<!-- ${component.description || ''} -->
<!-- Variables: ${component.variables?.map(v => v.name).join(', ') || 'none'} -->

${component.html}
`;
    }

    // Otherwise wrap in basic structure
    return `<!-- ${component.name} Component -->
<!-- ${component.description || ''} -->
<!-- Variables: ${component.variables?.map(v => v.name).join(', ') || 'none'} -->

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px;">
      ${component.html || '<!-- Component content -->'}
    </td>
  </tr>
</table>
`;
  }

  createBasicComponent(sectionType) {
    const variables = sectionType.variables || [];
    const variableComments = variables.map(v => 
      `  {{ ${v.name} }} - ${v.description || v.type}`
    ).join('\n');

    return `<!-- ${this.pascalCase(sectionType.name)} Component -->
<!-- ${sectionType.description || ''} -->
<!-- 
Variables:
${variableComments || '  None'}
-->

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px;">
      <!-- TODO: Extract actual HTML structure for ${sectionType.name} -->
      <div class="${sectionType.name}-section">
        ${sectionType.isRepeating ? `<each loop="item in ${sectionType.name}Items">
          <!-- Repeating content here -->
        </each>` : '<!-- Section content here -->'}
      </div>
    </td>
  </tr>
</table>
`;
  }

  generateMainTemplate(analysis) {
    const components = analysis.components?.components || [];
    const sectionTypes = analysis.structure?.sectionTypes || [];
    const componentOrder = analysis.components?.templateStructure?.componentOrder || [];
    const templateName = path.basename(this.templateDir);
    
    // Determine component order
    let orderedComponents;
    if (componentOrder.length > 0) {
      orderedComponents = componentOrder;
    } else if (components.length > 0) {
      orderedComponents = components.map(c => c.name);
    } else {
      orderedComponents = sectionTypes.map(s => this.pascalCase(s.name));
    }

    // Use absolute paths from templates root
    const componentIncludes = orderedComponents.map(name => 
      `    <component src="templates/${templateName}/components/${name}.html"></component>`
    ).join('\n\n');

    const template = `---
title: "{{ title }}"
preheader: "{{ preheader || 'Email preview text' }}"
---

<extends src="templates/${templateName}/layouts/main.html">
  <block name="template">
    
${componentIncludes}
    
  </block>
</extends>
`;

    fs.writeFileSync(
      path.join(this.templateDir, 'newsletter.html'),
      template
    );
  }

  generateSampleData(analysis) {
    // Prefer sample data from component extraction (has proper nested structure)
    const componentSampleData = analysis.components?.sampleData || {};
    const contentSampleData = analysis.content?.sampleData || {};
    const sectionTypes = analysis.structure?.sectionTypes || [];
    
    // Merge sample data, preferring the component extraction's nested structure
    const enrichedData = {
      title: componentSampleData.title || contentSampleData.title || 'Sample Newsletter Title',
      preheader: componentSampleData.preheader || contentSampleData.preheader || 'Preview text for email clients',
      ...contentSampleData,
      ...componentSampleData
    };

    // Ensure we have proper nested objects for common sections
    if (!enrichedData.header) {
      enrichedData.header = {
        logoUrl: 'https://fpoimg.com/200x50?text=Logo',
        quote: 'Sample quote text',
        author: 'Quote Author'
      };
    }

    if (!enrichedData.intro) {
      enrichedData.intro = {
        title: 'Welcome',
        content: '<p>Introduction paragraph for the newsletter.</p>'
      };
    }

    if (!enrichedData.footer) {
      enrichedData.footer = {
        unsubscribeLink: '#',
        address: 'Company Address'
      };
    }

    // Add placeholder data for discovered section types that use sections array
    if (!enrichedData.sections) {
      enrichedData.sections = [];
      sectionTypes.forEach(sectionType => {
        if (sectionType.isRepeating) {
          enrichedData.sections.push({
            type: sectionType.name,
            title: `${this.pascalCase(sectionType.name)} Section`,
            items: [this.createSampleItem(sectionType)]
          });
        }
      });
    }

    fs.writeFileSync(
      path.join(this.templateDir, 'sample-data.json'),
      JSON.stringify(enrichedData, null, 2)
    );
  }

  createSampleItem(sectionType) {
    const item = {};
    
    (sectionType.variables || []).forEach(variable => {
      switch (variable.type) {
        case 'string':
          item[variable.name] = `Sample ${variable.name}`;
          break;
        case 'html':
          item[variable.name] = `<p>Sample HTML content for ${variable.name}</p>`;
          break;
        case 'url':
          item[variable.name] = 'https://example.com';
          break;
        case 'image':
          item[variable.name] = 'https://fpoimg.com/600x400?text=Sample+Image';
          break;
        case 'boolean':
          item[variable.name] = true;
          break;
        default:
          item[variable.name] = `Sample ${variable.name}`;
      }
    });

    return item;
  }

  generateSchema(analysis) {
    const sectionTypes = analysis.structure?.sectionTypes || [];
    
    const schema = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Newsletter Data Schema",
      "description": "Generated schema for newsletter template data",
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Newsletter title"
        },
        "preheader": {
          "type": "string",
          "description": "Email preview text"
        }
      },
      "required": ["title"]
    };

    // Add section type schemas
    sectionTypes.forEach(sectionType => {
      if (sectionType.isRepeating) {
        schema.properties[`${sectionType.name}Items`] = {
          "type": "array",
          "description": sectionType.description,
          "items": {
            "type": "object",
            "properties": this.variablesToSchemaProps(sectionType.variables)
          }
        };
      }
    });

    fs.writeFileSync(
      path.join(this.templateDir, 'schema.json'),
      JSON.stringify(schema, null, 2)
    );
  }

  variablesToSchemaProps(variables) {
    const props = {};
    
    (variables || []).forEach(variable => {
      props[variable.name] = {
        "type": variable.type === 'url' || variable.type === 'image' ? 'string' : variable.type,
        "description": variable.description || `${variable.name} field`
      };
      
      if (variable.type === 'url') {
        props[variable.name].format = 'uri';
      }
    });

    return props;
  }

  generateSectionStyles(analysis) {
    const colors = analysis.visualDesign?.colorPalette || {};
    const sectionTypes = analysis.structure?.sectionTypes || [];
    const reconciliation = analysis.reconciliation || {};
    
    const styles = {};
    
    sectionTypes.forEach(sectionType => {
      // Check if this is a novel type from reconciliation
      const isNovel = reconciliation.novelTypes?.some(n => n.name === sectionType.name);
      const mapping = reconciliation.mappedTypes?.find(m => m.discovered === sectionType.name);
      
      styles[sectionType.name] = {
        containerStyles: {
          backgroundColor: colors.backgroundAlt || colors.background || '#ffffff',
          padding: '20px'
        },
        headingStylesInline: `font-family: ${analysis.visualDesign?.typography?.headingFont || 'Arial, sans-serif'}; color: ${colors.primary || colors.text || '#333333'};`,
        contentStyles: {
          fontFamily: analysis.visualDesign?.typography?.bodyFont || 'Arial, sans-serif',
          fontSize: analysis.visualDesign?.typography?.bodySize || '16px',
          color: colors.text || '#333333'
        },
        linkStylesInline: `color: ${colors.accent || '#0066cc'}; text-decoration: underline;`,
        // Metadata for novel types
        _meta: {
          isNovel: isNovel || sectionType.isNovel || false,
          isVariant: mapping?.isVariant || false,
          variantOf: mapping?.variantOf || null,
          description: sectionType.description || null
        }
      };
    });

    fs.writeFileSync(
      path.join(this.templateDir, 'section-styles.json'),
      JSON.stringify(styles, null, 2)
    );
  }

  generateSkeleton(analysis) {
    const sectionTypes = analysis.structure?.sectionTypes || [];
    const sampleData = analysis.components?.sampleData || analysis.content?.sampleData || {};
    const components = analysis.components?.components || [];
    const templateName = path.basename(this.templateDir);
    
    let skeleton = `---
# ${templateName} Newsletter Skeleton
# This is a minimal template for starting new content.
# Copy this file to content/ and fill in your data.

template: ${templateName}
title: "Your Newsletter Title"
preheader: "Preview text for email clients"

`;

    // Add header if present in sample data or components
    if (sampleData.header || components.some(c => c.type === 'header')) {
      skeleton += `header:\n`;
      const headerFields = sampleData.header ? Object.keys(sampleData.header) : ['logoUrl', 'logoImage'];
      headerFields.forEach(key => {
        if (typeof sampleData.header?.[key] === 'string') {
          skeleton += `  ${key}: "" # ${this.getFieldHint(key)}\n`;
        } else if (typeof sampleData.header?.[key] === 'object') {
          skeleton += `  ${key}:\n`;
          skeleton += `    # Add nested properties\n`;
        } else {
          skeleton += `  ${key}: ""\n`;
        }
      });
      skeleton += `\n`;
    }

    // Add hero if present
    if (sampleData.hero) {
      skeleton += `hero:\n`;
      for (const [key, value] of Object.entries(sampleData.hero)) {
        if (typeof value === 'string') {
          skeleton += `  ${key}: "" # ${this.getFieldHint(key)}\n`;
        }
      }
      skeleton += `\n`;
    }

    // Add intro if present
    if (sampleData.intro || components.some(c => c.type === 'intro')) {
      skeleton += `intro:\n`;
      const introFields = sampleData.intro ? Object.keys(sampleData.intro) : ['title', 'content'];
      introFields.forEach(key => {
        if (key === 'content' || key === 'html' || key === 'body') {
          skeleton += `  ${key}: |\n    <p>Your introduction here.</p>\n`;
        } else {
          skeleton += `  ${key}: ""\n`;
        }
      });
      skeleton += `\n`;
    }

    // Check for top-level arrays (like articlePairs, productShowcase, etc.)
    const topLevelArrays = Object.entries(sampleData).filter(([key, value]) => 
      Array.isArray(value) && !['sections'].includes(key)
    );

    topLevelArrays.forEach(([arrayName, items]) => {
      skeleton += `${arrayName}:\n`;
      skeleton += `  - # First item\n`;
      if (items.length > 0 && typeof items[0] === 'object') {
        this.generateSkeletonFields(items[0], '    ', skeleton, (line) => skeleton += line);
        skeleton = skeleton; // Force update
      }
      skeleton += `\n`;
    });

    // Add sections if template uses sections array
    const hasSections = sampleData.sections || sectionTypes.some(s => !['header', 'intro', 'footer', 'hero', 'cta'].includes(s.name));
    
    if (hasSections && !topLevelArrays.length) {
      skeleton += `sections:\n`;
      
      const sectionTypesToDocument = sectionTypes.filter(s => 
        !['header', 'intro', 'footer', 'hero', 'cta'].includes(s.name)
      );
      
      if (sectionTypesToDocument.length === 0) {
        // Fallback if no section types defined
        skeleton += `  - type: article\n`;
        skeleton += `    title: "Section Title"\n`;
        skeleton += `    items:\n`;
        skeleton += `      - title: "Item Title"\n`;
        skeleton += `        link: "https://example.com"\n`;
        skeleton += `        description: "<p>Item description</p>"\n`;
      } else {
        sectionTypesToDocument.forEach(sectionType => {
          skeleton += `  - type: ${sectionType.name}\n`;
          skeleton += `    title: ""\n`;
          
          if (sectionType.isRepeating) {
            skeleton += `    items:\n`;
            skeleton += `      - # Add item fields based on component requirements\n`;
            (sectionType.variables || []).filter(v => v.path?.includes('item') || !v.path).forEach(variable => {
              const varName = variable.path ? variable.path.split('.').pop() : variable.name;
              skeleton += `        ${varName}: "" # ${variable.type || 'string'}${variable.required ? ' (required)' : ''}\n`;
            });
          }
          skeleton += `\n`;
        });
      }
    }

    // Add CTA if present
    if (sampleData.cta) {
      skeleton += `cta:\n`;
      for (const [key, value] of Object.entries(sampleData.cta)) {
        if (typeof value === 'string') {
          skeleton += `  ${key}: "" # ${this.getFieldHint(key)}\n`;
        }
      }
      skeleton += `\n`;
    }

    // Add footer if present
    if (sampleData.footer || components.some(c => c.type === 'footer')) {
      skeleton += `footer:\n`;
      const footerData = sampleData.footer || {};
      for (const [key, value] of Object.entries(footerData)) {
        if (typeof value === 'string') {
          skeleton += `  ${key}: "" # ${this.getFieldHint(key)}\n`;
        } else if (Array.isArray(value)) {
          skeleton += `  ${key}:\n`;
          skeleton += `    - # Add items\n`;
        } else if (typeof value === 'object' && value !== null) {
          skeleton += `  ${key}:\n`;
          for (const subKey of Object.keys(value)) {
            skeleton += `    ${subKey}: ""\n`;
          }
        }
      }
      if (Object.keys(footerData).length === 0) {
        skeleton += `  unsubscribeUrl: "#"\n`;
      }
      skeleton += `\n`;
    }

    skeleton += `---\n\n`;
    skeleton += `<!-- Remove this markdown section in production -->\n`;
    skeleton += `# ${templateName} Newsletter\n\n`;
    skeleton += `Replace the frontmatter above with your actual content.\n`;

    fs.writeFileSync(
      path.join(this.templateDir, 'skeleton.md'),
      skeleton
    );
  }

  generateSkeletonFields(obj, indent, skeleton, appendFn) {
    // Helper to document object structure in skeleton
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        appendFn(`${indent}${key}: "" # ${this.getFieldHint(key)}\n`);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        appendFn(`${indent}${key}:\n`);
        this.generateSkeletonFields(value, indent + '  ', skeleton, appendFn);
      }
    }
  }

  generateSampleContent(analysis) {
    const sampleData = analysis.components?.sampleData || analysis.content?.sampleData || {};
    const templateName = path.basename(this.templateDir);
    
    // Build comprehensive YAML frontmatter from all sample data
    let content = `---
# ${templateName} Sample Content
# This file contains complete sample data demonstrating all template features.
# Use this as a reference when creating your own content.

template: ${templateName}
`;

    // Recursively convert sample data to YAML, handling all nested structures
    const yamlLines = this.objectToYaml(sampleData, 0);
    content += yamlLines;

    content += `---\n\n`;
    content += `# ${sampleData.title || templateName + ' Newsletter'}\n\n`;
    content += `This is sample content demonstrating the ${templateName} template.\n\n`;
    content += `## Template Structure\n\n`;

    // Document the components used
    const components = analysis.components?.components || [];
    if (components.length > 0) {
      components.forEach(comp => {
        content += `- **${this.pascalCase(comp.type || comp.name)}**: ${comp.description || comp.type || 'Component'}\n`;
      });
    } else {
      // Fallback to section types
      const sectionTypes = analysis.structure?.sectionTypes || [];
      sectionTypes.forEach(section => {
        content += `- **${this.pascalCase(section.name)}**: ${section.description || section.name}\n`;
      });
    }

    fs.writeFileSync(
      path.join(this.templateDir, 'sample-content.md'),
      content
    );
  }

  objectToYaml(obj, depth = 0, skipKeys = ['template']) {
    const indent = '  '.repeat(depth);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (skipKeys.includes(key)) continue;
      
      if (value === null || value === undefined) continue;

      if (typeof value === 'string') {
        // Handle multiline strings and HTML content
        if (value.includes('\n') || value.includes('<')) {
          // Use literal block scalar for HTML/multiline
          const lines = value.split('\n');
          if (lines.length > 1 || value.length > 80) {
            yaml += `${indent}${key}: |\n`;
            lines.forEach(line => {
              yaml += `${indent}  ${line}\n`;
            });
          } else {
            // Single line HTML, use quotes
            yaml += `${indent}${key}: "${value.replace(/"/g, '\\"')}"\n`;
          }
        } else {
          yaml += `${indent}${key}: "${value.replace(/"/g, '\\"')}"\n`;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        yaml += `${indent}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        yaml += `${indent}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            yaml += `${indent}  -\n`;
            // Write each property of the object
            for (const [itemKey, itemValue] of Object.entries(item)) {
              const itemYaml = this.objectToYaml({ [itemKey]: itemValue }, depth + 2);
              yaml += itemYaml;
            }
          } else if (typeof item === 'string') {
            yaml += `${indent}  - "${item.replace(/"/g, '\\"')}"\n`;
          } else {
            yaml += `${indent}  - ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${indent}${key}:\n`;
        yaml += this.objectToYaml(value, depth + 1, []);
      }
    }

    return yaml;
  }

  generateSectionStylesDoc(analysis) {
    const colors = analysis.visualDesign?.colorPalette || {};
    const typography = analysis.visualDesign?.typography || {};
    const sectionTypes = analysis.structure?.sectionTypes || [];
    const reconciliation = analysis.reconciliation || {};
    const templateName = path.basename(this.templateDir);

    let doc = `# ${templateName} Section Styles

This document describes the visual styling applied to each section type in this template.

## Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary | \`${colors.primary || '#333333'}\` | Headings, CTAs, accents |
| Secondary | \`${colors.secondary || colors.accent || '#666666'}\` | Secondary text, borders |
| Background | \`${colors.background || '#ffffff'}\` | Page background |
| Background Alt | \`${colors.backgroundAlt || '#f5f5f5'}\` | Section backgrounds |
| Text | \`${colors.text || '#333333'}\` | Body text |
| Accent | \`${colors.accent || '#0066cc'}\` | Links, highlights |

## Typography

| Element | Font | Size | Line Height |
|---------|------|------|-------------|
| Headings | ${typography.headingFont || 'Arial, sans-serif'} | ${typography.headingSizes?.h1 || '24px'} | ${typography.lineHeights?.heading || '1.2'} |
| Body | ${typography.bodyFont || 'Arial, sans-serif'} | ${typography.bodySize || '16px'} | ${typography.lineHeights?.body || '1.5'} |
| Captions | ${typography.captionFont || typography.bodyFont || 'Arial, sans-serif'} | ${typography.captionSize || '14px'} | ${typography.lineHeights?.caption || '1.4'} |

## Section Types

`;

    sectionTypes.forEach(sectionType => {
      const isNovel = reconciliation.novelTypes?.some(n => n.name === sectionType.name);
      const mapping = reconciliation.mappedTypes?.find(m => m.discovered === sectionType.name);
      
      doc += `### ${this.pascalCase(sectionType.name)}

- **Type**: \`${sectionType.name}\`
- **Component**: \`components/${this.pascalCase(sectionType.name)}.html\`
- **Repeating**: ${sectionType.isRepeating ? 'Yes (loops through items)' : 'No (single instance)'}
`;

      if (isNovel) {
        doc += `- **Status**: 🆕 Novel type (created for this template)\n`;
      } else if (mapping?.isVariant) {
        doc += `- **Status**: Variant of \`${mapping.variantOf}\`\n`;
      }

      if (sectionType.description) {
        doc += `- **Description**: ${sectionType.description}\n`;
      }

      doc += `\n`;

      // Document variables
      if (sectionType.variables && sectionType.variables.length > 0) {
        doc += `#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
`;
        sectionType.variables.forEach(v => {
          const varName = v.path || v.name;
          doc += `| \`${varName}\` | ${v.type || 'string'} | ${v.required ? 'Yes' : 'No'} | ${v.description || '-'} |\n`;
        });
        doc += `\n`;
      }

      doc += `---\n\n`;
    });

    // Add usage examples
    doc += `## Usage Examples

### Basic Content File

\`\`\`yaml
---
template: ${templateName}
title: "My Newsletter"
preheader: "Preview text"

`;

    // Show abbreviated examples for each section type
    const mainSections = sectionTypes.filter(s => !['header', 'footer', 'hero', 'intro', 'cta'].includes(s.name));
    if (mainSections.length > 0) {
      doc += `sections:\n`;
      mainSections.slice(0, 2).forEach(section => {
        doc += `  - type: ${section.name}\n`;
        doc += `    title: "Section Title"\n`;
        if (section.isRepeating) {
          doc += `    items:\n`;
          doc += `      - # item data\n`;
        }
      });
    }

    doc += `---
\`\`\`

### Overriding Styles

You can override section styles in your content file:

\`\`\`yaml
sections:
  - type: article
    title: "Featured"
    containerStyles:
      backgroundColor: "#f0f0f0"
    headingStylesInline: "color: #ff0000;"
\`\`\`

## Files Reference

| File | Purpose |
|------|---------|
| \`section-styles.json\` | Default styles for each section type |
| \`sample-data.json\` | Complete sample data structure |
| \`skeleton.md\` | Minimal template for new content |
| \`sample-content.md\` | Full example with all sections |
| \`sample-output.html\` | Pre-built HTML output for quick reference |
| \`schema.json\` | JSON schema for data validation |
`;

    fs.writeFileSync(
      path.join(this.templateDir, 'SECTION-STYLES.md'),
      doc
    );
  }

  /**
   * Generate sample-output.html by building the template with sample-content.md
   * This provides a quick reference for what the template looks like when rendered
   */
  async generateSampleOutput(templateName) {
    const sampleContentPath = path.join(this.templateDir, 'sample-content.md');
    const sampleOutputPath = path.join(this.templateDir, 'sample-output.html');
    
    // Check if sample-content.md exists
    if (!fs.existsSync(sampleContentPath)) {
      console.log('      ⚠️  sample-content.md not found, skipping sample output generation');
      return;
    }

    return new Promise((resolve) => {
      // Run the build-newsletter script with sample content
      const build = spawn('node', [
        'scripts/build-newsletter.mjs',
        sampleContentPath,
        '--no-open'  // Don't open in browser
      ], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      build.stdout.on('data', (data) => { stdout += data.toString(); });
      build.stderr.on('data', (data) => { stderr += data.toString(); });

      build.on('close', (code) => {
        if (code === 0) {
          // Find the built file in build_production
          const builtFileName = path.basename(sampleContentPath, '.md') + '.html';
          const builtPath = path.join('build_production', builtFileName);
          
          if (fs.existsSync(builtPath)) {
            // Copy to template directory as sample-output.html
            fs.copyFileSync(builtPath, sampleOutputPath);
            console.log(`      ✓ Generated sample-output.html`);
          } else {
            console.log(`      ⚠️  Built file not found at ${builtPath}`);
          }
        } else {
          console.log(`      ⚠️  Build failed (exit code ${code}), sample output not generated`);
          // Log first error for debugging
          const errorLine = (stderr || stdout).split('\n').find(l => l.includes('Error') || l.includes('❌'));
          if (errorLine) {
            console.log(`         ${errorLine.substring(0, 100)}`);
          }
        }
        resolve();
      });

      build.on('error', (err) => {
        console.log(`      ⚠️  Could not run build: ${err.message}`);
        resolve();
      });
    });
  }

  getFieldHint(fieldName) {
    const hints = {
      logoUrl: 'URL to logo image',
      logoImage: 'Logo image URL',
      imageUrl: 'Image URL',
      image: 'Image URL',
      link: 'Link URL',
      url: 'URL',
      href: 'Link URL',
      title: 'Title text',
      description: 'Description (HTML allowed)',
      content: 'Content (HTML allowed)',
      html: 'HTML content',
      body: 'Body content (HTML allowed)',
      author: 'Author name',
      date: 'Date string',
      text: 'Plain text',
      buttonText: 'Button label',
      ctaText: 'Call-to-action text',
      unsubscribeUrl: 'Unsubscribe link',
      privacyUrl: 'Privacy policy link',
      preheader: 'Email preview text'
    };
    return hints[fieldName] || fieldName;
  }

  pascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
