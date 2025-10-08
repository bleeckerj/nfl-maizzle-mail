#!/usr/bin/env node

import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class LLMEmailDecomposer {
  constructor() {
    this.openai = null;
  }

  async initializeOpenAI() {
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Test the connection
      await this.openai.models.list();
      console.log('✅ OpenAI API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ OpenAI API initialization failed:', error.message);
      return false;
    }
  }

  async analyzeWithGPT(htmlContent) {
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    
    const stats = {
      totalElements: doc.querySelectorAll('*').length,
      tables: doc.querySelectorAll('table').length,
      images: doc.querySelectorAll('img').length,
      links: doc.querySelectorAll('a').length,
      headings: doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      paragraphs: doc.querySelectorAll('p').length,
      text: doc.body?.textContent?.length || 0
    };

    const systemPrompt = `You are an expert email template analyst specializing in converting HTML emails into reusable Maizzle template systems. Your task is to intelligently decompose an email into logical, reusable components that work with Maizzle's templating system.

CRITICAL: Respond with valid JSON only. No markdown code blocks, no explanations, no extra text. Start your response with { and end with }. Output must be valid JSON that can be parsed directly.

MAIZZLE TEMPLATE REQUIREMENTS:
- Use Maizzle's <each loop="item in array"> syntax for repeating content, NOT Handlebars {{#each}}
- Use <if condition="variable"> for conditionals, NOT {{#if}}
- Variables use double braces: {{ variable }} or {{ object.property }}
- Components should preserve original styling with inline styles for email client compatibility
- Extract ALL images with their URLs - don't truncate or omit them
- For arrays (like articles), create complete sample data with multiple items
- Use semantic HTML structure while maintaining email table-based layout compatibility

Analyze the email and return this exact JSON structure:
{
  "emailType": "newsletter|marketing|transactional|ecommerce",
  "confidence": 0.0-1.0,
  "components": {
    "componentName": {
      "purpose": "what this component does",
      "content": "actual content excerpt from this section (not truncated)",
      "variables": ["list", "of", "template", "variables"],
      "htmlStructure": "key HTML patterns with proper Maizzle syntax",
      "styling": "important inline CSS styles and visual design notes",
      "images": ["array", "of", "image", "urls", "in", "this", "component"]
    }
  },
  "schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "arrayName": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "property": {"type": "string"}
          }
        }
      }
    }
  },
  "sampleData": {
    // Complete realistic sample data with FULL content, not truncated
    // Include multiple items for arrays (at least 2-4 items)
    // Preserve all image URLs and links from original
  },
  "recommendations": ["specific", "actionable", "recommendations", "for", "Maizzle", "template", "optimization"]
}

CONTENT EXTRACTION REQUIREMENTS:
1. Extract COMPLETE content - don't truncate with "..." 
2. Identify LOGICAL semantic sections (header, articles, sidebar, footer)
3. Create REUSABLE components that work for similar email types
4. Extract ALL image URLs and preserve them in sample data
5. For repeating content (articles, products, etc.), extract multiple complete examples
6. Preserve original styling and fonts as inline styles
7. Consider email client compatibility (tables, inline CSS)
8. Generate proper Maizzle template syntax for loops and conditionals

FOCUS AREAS:
- Newsletter articles/content blocks
- Product listings and descriptions  
- Image galleries and featured images
- Navigation and branding elements
- Call-to-action buttons and links
- Social media and footer content`;

    const userPrompt = `Analyze this HTML email for intelligent Maizzle template decomposition. Extract complete content and create a professional template system.

**Email Statistics:**
- Elements: ${stats.totalElements}
- Tables: ${stats.tables} 
- Images: ${stats.images}
- Links: ${stats.links}
- Headings: ${stats.headings}
- Paragraphs: ${stats.paragraphs}
- Text length: ${stats.text} chars

**ANALYSIS REQUIREMENTS:**
1. Extract ALL content - don't truncate article descriptions or other text
2. Identify ALL images and preserve their complete URLs
3. Find repeating patterns (articles, products, testimonials, etc.)
4. Extract complete styling information (fonts, colors, spacing)
5. Create proper Maizzle template syntax for dynamic content
6. Generate realistic sample data with multiple items for arrays

**HTML Content:**
${htmlContent.length > 20000 ? htmlContent.substring(0, 20000) + '\n\n[Content truncated - analyze the visible structure and patterns]' : htmlContent}

Create a comprehensive Maizzle template system that preserves the original design and content structure while making it reusable for similar emails. Pay special attention to:
- Typography and font styling
- Image placement and sizing
- Content hierarchy and spacing
- Interactive elements (links, buttons)
- Email client compatibility (table-based layout, inline styles)`;

    console.log('🤖 Sending to GPT-4o for analysis...');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000
      });

      const analysisText = response.choices[0].message.content;
      console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'unknown'}`);
      
      // Clean and parse JSON response
      try {
        let cleanedText = analysisText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const analysis = JSON.parse(cleanedText);
        return analysis;
      } catch (parseError) {
        console.error('❌ Failed to parse GPT response as JSON');
        console.log('Raw response:', analysisText.substring(0, 500) + '...');
        throw new Error('GPT response was not valid JSON');
      }
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      throw error;
    }
  }

  async decomposeEmail(sourceFile, templateName) {
    console.log('🤖 Pure LLM Email Decomposition');
    console.log('════════════════════════════════');
    console.log(`📧 Email: ${sourceFile}`);
    console.log(`🏗️  Template: ${templateName}`);
    console.log('⚡ Strategy: GPT-4o Only (no heuristics)');
    console.log('');

    // Initialize OpenAI
    const initialized = await this.initializeOpenAI();
    if (!initialized) {
      throw new Error('Failed to initialize OpenAI API');
    }

    // Read HTML file
    const htmlContent = fs.readFileSync(sourceFile, 'utf8');
    
    console.log('🧠 Step 1: GPT-4o Email Analysis');
    console.log('─────────────────────────────────');
    
    const analysis = await this.analyzeWithGPT(htmlContent);
    
    console.log('✅ GPT-4o analysis complete');
    console.log(`📧 Email type: ${analysis.emailType}`);
    console.log(`🎯 Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`🔧 Components: ${Object.keys(analysis.components).length}`);
    console.log('');

    console.log('🏗️  Step 2: Template Generation');
    console.log('─────────────────────────────────');
    
    await this.generateTemplate(analysis, templateName, sourceFile);
    
    console.log('');
    console.log('✅ Pure LLM Decomposition Complete!');
    console.log('═══════════════════════════════════');
    console.log(`📧 Template: ${templateName}`);
    console.log('🎯 Strategy: GPT-4o Only');
    console.log(`📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`🔧 Components: ${Object.keys(analysis.components).join(', ')}`);
    console.log('');
    
    return {
      success: true,
      emailType: analysis.emailType,
      confidence: analysis.confidence,
      components: Object.keys(analysis.components),
      templatePath: `templates/${templateName}/`
    };
  }

  async generateTemplate(analysis, templateName, sourceFile) {
    const templateDir = path.join('templates', templateName);
    
    // Create directory structure
    const dirs = [templateDir, 
                  path.join(templateDir, 'components'),
                  path.join(templateDir, 'layouts')];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Generate components
    const componentNames = Object.keys(analysis.components);
    console.log(`📄 Generating ${componentNames.length} components...`);
    
    componentNames.forEach(name => {
      this.generateSimpleComponent(name, analysis.components[name], templateDir);
    });

    // Generate main template
    this.generateMainTemplate(componentNames, templateName, templateDir);

    // Generate layout
    this.generateLayout(templateDir);

    // Generate schema and sample data
    const schemaFile = path.join(templateDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(analysis.schema, null, 2));

    const sampleDataFile = path.join(templateDir, 'sample-data.json');
    const sampleData = {
      ...analysis.sampleData,
      template: templateName,
      $schema: './schema.json'
    };
    fs.writeFileSync(sampleDataFile, JSON.stringify(sampleData, null, 2));

    // Generate analysis report
    const reportFile = path.join(templateDir, 'analysis-report.json');
    const report = {
      template: templateName,
      source: sourceFile,
      strategy: 'llm-only',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      analysis: analysis,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`✅ Template generated: ${templateDir}`);
  }

  generateSimpleComponent(name, componentData, templateDir) {
    const componentFile = path.join(templateDir, 'components', `${this.capitalize(name)}.html`);
    
    let content = `<!-- ${this.capitalize(name)} Component -->\n`;
    content += `<!-- Purpose: ${componentData.purpose} -->\n`;
    content += `<!-- Variables: ${componentData.variables.join(', ')} -->\n\n`;
    
    content += `<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">\n`;
    content += `  <tr>\n`;
    content += `    <td class="content-block" style="padding: 20px;">\n`;
    content += `      <div class="${name.toLowerCase()}">\n`;
    
    // Simple variable mapping for now
    componentData.variables.forEach(variable => {
      content += `        <p>{{ ${variable} }}</p>\n`;
    });
    
    content += `      </div>\n`;
    content += `    </td>\n`;
    content += `  </tr>\n`;
    content += `</table>`;

    fs.writeFileSync(componentFile, content);
  }

  generateMainTemplate(componentNames, templateName, templateDir) {
    const templateFile = path.join(templateDir, 'newsletter.html');
    
    let content = `---\ntitle: "{{ title }}"\n---\n\n`;
    content += `<extends src="templates/${templateName}/layouts/main.html">\n`;
    content += `  <block name="template">\n`;

    componentNames.forEach(name => {
      content += `    <component src="templates/${templateName}/components/${this.capitalize(name)}.html"></component>\n`;
    });

    content += `  </block>\n`;
    content += `</extends>`;

    fs.writeFileSync(templateFile, content);
  }

  generateLayout(templateDir) {
    const layoutFile = path.join(templateDir, 'layouts', 'main.html');
    
    const content = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{{ title }}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
<block name="template"></block>
</body>
</html>`;

    fs.writeFileSync(layoutFile, content);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI usage
if (process.argv.length < 4) {
  console.log('Usage: node llm_decomposer_fixed.mjs <email.html> <template-name>');
  console.log('Example: node llm_decomposer_fixed.mjs emails/sentiers.html sentiers-test');
  process.exit(1);
}

const htmlFile = process.argv[2];
const templateName = process.argv[3];

const decomposer = new LLMEmailDecomposer();

decomposer.decomposeEmail(htmlFile, templateName)
  .then(result => {
    console.log('\n🎯 LLM Analysis Summary:');
    console.log(`   Email Type: ${result.emailType}`);
    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`   Components: ${result.components.length}`);
    console.log(`   Template: ${result.templatePath}`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });