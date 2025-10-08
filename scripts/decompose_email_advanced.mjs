#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { program } from 'commander';

/**
 * Advanced Email Decomposition Workflow
 * Provides multiple strategies for converting HTML emails to templates
 */

const STRATEGIES = {
  'heuristic': 'Basic pattern matching (current method)',
  'ai': 'GPT-4o intelligent analysis',
  'interactive': 'Guided manual decomposition',
  'hybrid': 'AI analysis with manual refinement'
};

class EmailDecomposer {
  constructor(inputFile, templateName, strategy = 'heuristic') {
    this.inputFile = inputFile;
    this.templateName = templateName;
    this.strategy = strategy;
    this.templateDir = path.join('templates', templateName);
    this.htmlContent = '';
    this.dom = null;
    this.document = null;
    this.analysis = {};
  }

  async init() {
    if (!fs.existsSync(this.inputFile)) {
      throw new Error(`Input file "${this.inputFile}" not found`);
    }

    if (fs.existsSync(this.templateDir)) {
      throw new Error(`Template "${this.templateName}" already exists`);
    }

    this.htmlContent = fs.readFileSync(this.inputFile, 'utf8');
    this.dom = new JSDOM(this.htmlContent);
    this.document = this.dom.window.document;

    // Create template directories
    fs.mkdirSync(path.join(this.templateDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(this.templateDir, 'layouts'), { recursive: true });

    console.log(`🔍 Analyzing email: ${this.inputFile}`);
    console.log(`📧 Creating template: ${this.templateName}`);
    console.log(`🎯 Strategy: ${this.strategy} - ${STRATEGIES[this.strategy]}`);
  }

  /**
   * Enhanced heuristic analysis with better pattern recognition
   */
  analyzeHeuristic() {
    const components = {};
    const analysis = {
      structure: 'unknown',
      layout: 'unknown',
      sections: [],
      components: {},
      metadata: {}
    };

    // Detect email structure type
    const hasTableLayout = this.document.querySelectorAll('table[role="presentation"]').length > 5;
    const hasModernLayout = this.document.querySelectorAll('div.container, div.wrapper, .email-container').length > 0;
    
    analysis.structure = hasTableLayout ? 'table-based' : hasModernLayout ? 'div-based' : 'mixed';
    console.log(`📊 Detected structure: ${analysis.structure}`);

    // Analyze layout patterns
    const width600 = this.document.querySelector('table[width="600"], div[style*="max-width:600"], div[style*="width:600"]');
    if (width600) analysis.layout = 'standard-600px';

    // Enhanced section detection with scoring system
    const sectionDefinitions = [
      {
        name: 'preheader',
        selectors: [
          '[style*="display:none"]',
          '.preheader',
          'div[style*="font-size:1px"]'
        ],
        weight: 0.8,
        required: false
      },
      {
        name: 'header',
        selectors: [
          'header',
          '[role="banner"]',
          '.header',
          '#header',
          'table:first-child td:first-child',
          'div:first-child'
        ],
        weight: 0.9,
        required: true
      },
      {
        name: 'logo',
        selectors: [
          'img[alt*="logo" i]',
          '.logo img',
          'header img',
          'img[src*="logo" i]',
          'img:first-child'
        ],
        weight: 0.8,
        required: false
      },
      {
        name: 'hero',
        selectors: [
          '.hero',
          '#hero',
          '[class*="hero"]',
          'h1:first-of-type',
          '[style*="font-size:24px"], [style*="font-size:28px"]',
          'td[style*="padding:30px"], td[style*="padding:40px"]'
        ],
        weight: 0.9,
        required: true
      },
      {
        name: 'content',
        selectors: [
          'main',
          '.content',
          '#content',
          '[role="main"]',
          'table table table' // Often content is nested deep in table layouts
        ],
        weight: 0.7,
        required: true
      },
      {
        name: 'cta',
        selectors: [
          'a[style*="background-color"]',
          '.cta',
          '.button',
          'a[style*="padding"][style*="color"]'
        ],
        weight: 0.6,
        required: false
      },
      {
        name: 'footer',
        selectors: [
          'footer',
          '[role="contentinfo"]',
          '.footer',
          '#footer',
          'table:last-child',
          'div:last-child'
        ],
        weight: 0.9,
        required: true
      }
    ];

    // Score and extract sections
    sectionDefinitions.forEach(sectionDef => {
      const candidates = [];
      
      sectionDef.selectors.forEach(selector => {
        const elements = this.document.querySelectorAll(selector);
        elements.forEach(element => {
          const score = this.scoreElement(element, sectionDef.name);
          candidates.push({ element, score, selector });
        });
      });

      // Sort by score and pick the best candidate
      candidates.sort((a, b) => b.score - a.score);
      
      if (candidates.length > 0 && candidates[0].score > 0.3) {
        const best = candidates[0];
        console.log(`✅ Found ${sectionDef.name} (score: ${best.score.toFixed(2)}, selector: ${best.selector})`);
        
        components[sectionDef.name] = this.extractComponent(best.element, sectionDef.name);
        analysis.components[sectionDef.name] = {
          confidence: best.score,
          selector: best.selector,
          element: best.element.tagName
        };
      } else if (sectionDef.required) {
        console.log(`⚠️  Required section '${sectionDef.name}' not found with confidence`);
      }
    });

    return { components, analysis };
  }

  /**
   * Score an element's likelihood of being a specific section
   */
  scoreElement(element, sectionType) {
    let score = 0.1; // Base score

    const text = element.textContent?.toLowerCase() || '';
    const html = element.outerHTML.toLowerCase();
    const styles = element.getAttribute('style') || '';

    switch (sectionType) {
      case 'header':
        if (element.tagName === 'HEADER') score += 0.4;
        if (html.includes('logo')) score += 0.3;
        if (element.querySelector('img')) score += 0.2;
        if (styles.includes('background-color')) score += 0.1;
        break;

      case 'hero':
        if (element.querySelector('h1')) score += 0.4;
        if (element.querySelector('img')) score += 0.2;
        if (element.querySelector('a[style*="background"]')) score += 0.3;
        if (text.length > 50 && text.length < 200) score += 0.2;
        break;

      case 'footer':
        if (element.tagName === 'FOOTER') score += 0.4;
        if (text.includes('unsubscribe')) score += 0.3;
        if (text.includes('©') || text.includes('copyright')) score += 0.2;
        if (element.querySelectorAll('a').length >= 2) score += 0.2;
        break;

      case 'cta':
        if (element.tagName === 'A') score += 0.3;
        if (styles.includes('background-color')) score += 0.4;
        if (styles.includes('padding')) score += 0.2;
        if (text.includes('→') || text.includes('click') || text.includes('read')) score += 0.2;
        break;
    }

    // Penalize if element is too large (likely a container)
    if (element.children.length > 10) score -= 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Extract and templatize a component
   */
  extractComponent(element, sectionName) {
    let html = element.outerHTML;

    // More sophisticated text replacement
    html = this.templatizeContent(html, sectionName);

    return html;
  }

  /**
   * Replace content with template variables more intelligently
   */
  templatizeContent(html, sectionName) {
    // Replace images
    html = html.replace(/src="([^"]+)"/g, `src="{{ ${sectionName}.image.src }}"`);
    html = html.replace(/alt="([^"]+)"/g, `alt="{{ ${sectionName}.image.alt }}"`);

    // Replace links (but preserve mailto and tel links)
    html = html.replace(/href="((?!mailto:|tel:)[^"]+)"/g, `href="{{ ${sectionName}.url }}"`);

    // Replace text content more selectively
    html = html.replace(/>([^<]{10,})</g, (match, text) => {
      // Don't replace if it looks like code, CSS, or structural content
      if (text.includes('{') || text.includes('/*') || text.includes('function') || 
          text.includes('&nbsp;') || text.trim().length < 5) {
        return match;
      }
      return `>{{ ${sectionName}.content }}<`;
    });

    // Replace style colors that might be brand colors
    html = html.replace(/(background-color:\s*)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/g, 
      `$1{{ theme.primary_color || '$2' }}`);

    return html;
  }

  /**
   * Generate schema based on analysis
   */
  generateSchema(analysis) {
    const schema = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": `${this.templateName.charAt(0).toUpperCase() + this.templateName.slice(1)} Template Schema`,
      "description": `Generated from ${path.basename(this.inputFile)} using ${this.strategy} strategy`,
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Newsletter title"
        }
      },
      "required": ["title"]
    };

    // Add sections to schema
    Object.keys(analysis.components).forEach(sectionName => {
      schema.properties[sectionName] = {
        "type": "object",
        "description": `${sectionName} section content`,
        "properties": {
          "content": { "type": "string", "description": `${sectionName} text content` },
          "url": { "type": "string", "format": "uri", "description": `${sectionName} link URL` },
          "image": {
            "type": "object",
            "properties": {
              "src": { "type": "string", "format": "uri" },
              "alt": { "type": "string" }
            }
          }
        }
      };

      if (analysis.components[sectionName].confidence > 0.7) {
        schema.required.push(sectionName);
      }
    });

    return schema;
  }

  /**
   * AI-powered analysis using GPT-4o (placeholder - would need API integration)
   */
  async analyzeWithAI() {
    console.log('🤖 AI analysis would integrate with GPT-4o API here');
    console.log('📋 Sending HTML structure and requesting component identification...');
    
    // This would send the HTML to GPT-4o with a structured prompt
    // For now, falling back to enhanced heuristic
    return this.analyzeHeuristic();
  }

  /**
   * Interactive analysis with user input
   */
  async analyzeInteractive() {
    console.log('🔍 Interactive mode - you would select sections manually');
    // This would present the HTML structure and let users click/select sections
    // For now, falling back to heuristic with confirmation prompts
    return this.analyzeHeuristic();
  }

  /**
   * Main decomposition workflow
   */
  async decompose() {
    await this.init();

    let result;
    switch (this.strategy) {
      case 'ai':
        result = await this.analyzeWithAI();
        break;
      case 'interactive':
        result = await this.analyzeInteractive();
        break;
      case 'hybrid':
        result = await this.analyzeWithAI();
        // Would then allow manual refinement
        break;
      default:
        result = this.analyzeHeuristic();
    }

    const { components, analysis } = result;

    // Generate files
    this.createComponentFiles(components);
    this.createLayoutFile();
    this.createTemplateFile(Object.keys(components));
    
    const schema = this.generateSchema(analysis);
    this.createSchemaFile(schema);
    this.createSampleContent(Object.keys(components));

    // Generate analysis report
    this.generateReport(analysis);

    console.log('\n🎉 Email decomposition complete!');
    console.log(`📧 Template created: ${this.templateName}`);
    console.log(`📄 Components: ${Object.keys(components).length}`);
    console.log(`📊 Structure: ${analysis.structure}`);
  }

  createComponentFiles(components) {
    Object.entries(components).forEach(([name, html]) => {
      const componentFile = path.join(this.templateDir, 'components', `${name.charAt(0).toUpperCase() + name.slice(1)}.html`);
      
      const wrappedHtml = `<!-- ${name.charAt(0).toUpperCase() + name.slice(1)} Component -->
<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td class="content-block" style="padding: 20px;">
      ${html}
    </td>
  </tr>
</table>`;
      
      fs.writeFileSync(componentFile, wrappedHtml);
    });
  }

  createLayoutFile() {
    const layout = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  <style>
    /* Email-safe CSS */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
          <tr>
            <td>
              <block name="template">
                <!-- Template content -->
              </block>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    fs.writeFileSync(path.join(this.templateDir, 'layouts', 'main.html'), layout);
  }

  createTemplateFile(componentNames) {
    const includes = componentNames
      .map(name => `    <component src="templates/${this.templateName}/components/${name.charAt(0).toUpperCase() + name.slice(1)}.html"></component>`)
      .join('\n\n');

    const template = `---
title: "{{ title }}"
---

<extends src="templates/${this.templateName}/layouts/main.html">
  <block name="template">
    
${includes}
    
  </block>
</extends>`;

    fs.writeFileSync(path.join(this.templateDir, 'newsletter.html'), template);
  }

  createSchemaFile(schema) {
    fs.writeFileSync(path.join(this.templateDir, 'schema.json'), JSON.stringify(schema, null, 2));
  }

  createSampleContent(componentNames) {
    const sampleData = componentNames.map(name => 
      `${name}:
  content: "Sample ${name} content"
  url: "https://example.com/${name}"
  image:
    src: "https://via.placeholder.com/300x200"
    alt: "Sample ${name} image"`
    ).join('\n');

    const content = `---
template: "${this.templateName}"
title: "Sample Newsletter - ${this.templateName}"
${sampleData}
---

Sample content for the ${this.templateName} template.`;

    fs.writeFileSync(path.join('content', `${this.templateName}-sample.md`), content);
  }

  generateReport(analysis) {
    const report = {
      template: this.templateName,
      source: this.inputFile,
      strategy: this.strategy,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.templateDir, 'analysis-report.json'), 
      JSON.stringify(report, null, 2)
    );

    console.log(`📊 Analysis report saved to templates/${this.templateName}/analysis-report.json`);
  }
}

// CLI setup
program
  .name('decompose-email')
  .description('Advanced email decomposition with multiple strategies')
  .argument('<input>', 'HTML email file to decompose')
  .argument('<template>', 'Template name to create')
  .option('-s, --strategy <strategy>', 'Analysis strategy', 'heuristic')
  .action(async (input, template, options) => {
    const decomposer = new EmailDecomposer(input, template, options.strategy);
    try {
      await decomposer.decompose();
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();