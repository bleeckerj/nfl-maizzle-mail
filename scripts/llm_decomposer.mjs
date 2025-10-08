#!/usr/bin/env node

import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

/**
 * Pure LLM Email Decomposition Workflow
 * Uses only GPT-4o for intelligent email analysis and template generation
 */

class LLMEmailDecomposer {
  constructor() {
    this.openai = null;
    this.initializeAPI();
  }

  initializeAPI() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.log('❌ OpenAI API key not found or not configured.');
      console.log('📝 Please set your API key in the .env file:');
      console.log('   OPENAI_API_KEY=your-actual-api-key-here');
      console.log('🔗 Get API key: https://platform.openai.com/api-keys');
      process.exit(1);
    }

    try {
      this.openai = new OpenAI({ apiKey });
      console.log('✅ OpenAI API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI API:', error.message);
      process.exit(1);
    }
  }

  async decomposeEmail(htmlFile, templateName) {
    console.log('🤖 Pure LLM Email Decomposition');
    console.log('════════════════════════════════');
    console.log(`📧 Email: ${htmlFile}`);
    console.log(`🏗️  Template: ${templateName}`);
    console.log('⚡ Strategy: GPT-4o Only (no heuristics)');

    if (!fs.existsSync(htmlFile)) {
      throw new Error(`Email file not found: ${htmlFile}`);
    }

    // Step 1: Analyze email with GPT-4o
    console.log('\n🧠 Step 1: GPT-4o Email Analysis');
    console.log('─────────────────────────────────');
    
    const htmlContent = fs.readFileSync(htmlFile, 'utf8');
    const analysis = await this.analyzeWithGPT(htmlContent);
    
    console.log(`✅ GPT-4o analysis complete`);
    console.log(`📧 Email type: ${analysis.emailType}`);
    console.log(`🎯 Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`🔧 Components: ${Object.keys(analysis.components).length}`);

    // Step 2: Generate template structure
    console.log('\n🏗️  Step 2: Template Generation');
    console.log('─────────────────────────────────');
    
    await this.generateTemplateFromAnalysis(analysis, templateName, htmlFile);
    
    console.log('\n✅ Pure LLM Decomposition Complete!');
    console.log('═══════════════════════════════════');
    console.log(`📧 Template: ${templateName}`);
    console.log(`🎯 Strategy: GPT-4o Only`);
    console.log(`📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`🔧 Components: ${Object.keys(analysis.components).join(', ')}`);
    
    return analysis;
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
      // Include arrays for repeating content like articles, products, etc.
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
        // Remove markdown code blocks if present
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
      console.error('❌ GPT-4o analysis failed:', error.message);
      
      if (error.code === 'insufficient_quota') {
        console.log('💳 API quota exceeded. Check your OpenAI billing.');
      } else if (error.code === 'invalid_api_key') {
        console.log('🔑 Invalid API key. Check your .env file.');
      }
      
      throw error;
    }
  }

  async generateTemplateFromAnalysis(analysis, templateName, sourceFile) {
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
      this.generateComponent(name, analysis.components[name], templateDir);
    });

    // Generate main template
    this.generateMainTemplate(componentNames, templateName, templateDir);

    // Generate layout
    this.generateLayout(templateDir);

    // Generate schema
    const schemaFile = path.join(templateDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(analysis.schema, null, 2));

    // Generate sample data
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

  generateComponent(name, componentData, templateDir) {
    const componentFile = path.join(templateDir, 'components', `${this.capitalize(name)}.html`);
    
    let content = `<!-- ${this.capitalize(name)} Component -->\n`;
    content += `<!-- Purpose: ${componentData.purpose} -->\n`;
    content += `<!-- Variables: ${componentData.variables.join(', ')} -->\n\n`;
    
    content += `<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">\n`;
    content += `  <tr>\n`;
    content += `    <td class="content-block" style="padding: 20px;">\n`;
    
    // Generate component HTML based on the analysis with proper styling
    if (componentData.htmlStructure) {
      content += `      <!-- ${componentData.htmlStructure} -->\n`;
    }
    
    // Check if this is a repeating component (like articles)
    const hasArrayData = componentData.variables.some(v => 
      v.includes('article') || v.includes('product') || v.includes('item')
    );
    
    if (hasArrayData) {
      // Generate component with Maizzle loop syntax
      const arrayName = componentData.variables.find(v => v.includes('article')) ? 'articles' : 
                       componentData.variables.find(v => v.includes('product')) ? 'products' : 'items';
      
      content += `      <div class="${name.toLowerCase()}">\n`;
      content += `        <each loop="item in ${arrayName}">\n`;
      
      // Add styled content based on component variables
      componentData.variables.forEach(variable => {
        if (variable.includes('title') || variable.includes('Title')) {
          content += `          <h2 style="font-family: 'Lora', serif; margin: 0; padding: 48px 0 0; font-size: 36px; line-height: 1.2em; font-weight: 400;">\n`;
          content += `            <a href="{{ item.${variable.replace('Title', 'Link').replace('title', 'Link')} }}" style="color: #DC4B4B; text-decoration: none;">{{ item.${variable} }}</a>\n`;
          content += `          </h2>\n`;
        } else if (variable.includes('image') || variable.includes('Image')) {
          content += `          <if condition="item.${variable}">\n`;
          content += `            <img src="{{ item.${variable} }}" alt="{{ item.${componentData.variables.find(v => v.includes('title') || v.includes('Title')) || 'Image'} }}" style="max-width: 100%; height: auto; margin: 20px 0;">\n`;
          content += `          </if>\n`;
        } else if (variable.includes('description') || variable.includes('Description')) {
          content += `          <p style="font-size: 18px; line-height: 1.6em;">{{ item.${variable} }}</p>\n`;
        }
      });
      
      content += `        </each>\n`;
      content += `      </div>\n`;
    } else {
      // Generate simple component without loops
      content += `      <div class="${name.toLowerCase()}">\n`;
      
      componentData.variables.forEach(variable => {
        if (variable.includes('title') || variable.includes('Title')) {
          content += `        <h1 style="font-family: 'Lora', serif; margin: 12px 0 0; padding: 10px 0; line-height: 100%; font-weight: normal; border-bottom: 1px solid;">{{ ${variable} }}</h1>\n`;
        } else if (variable.includes('image') || variable.includes('Image') || variable.includes('logo') || variable.includes('Logo')) {
          content += `        <img src="{{ ${variable} }}" alt="Logo" style="margin: 0; padding: 0; max-width: 300px; height: auto;">\n`;
        } else if (variable.includes('text') || variable.includes('Text')) {
          content += `        <p style="font-size: 18px; line-height: 1.6em;"><strong style="text-transform: uppercase;">{{ ${variable} }}</strong></p>\n`;
        } else if (variable.includes('link') || variable.includes('Link')) {
          content += `        <a href="{{ ${variable} }}" style="color: #fff; text-decoration: none; background: #DC4B4B; border: none; border-radius: 0.3rem; cursor: pointer; display: inline-block; font-size: 0.8888em; font-weight: 600; line-height: 1; margin: 5px 0 0; padding: 1.175em 1.75em; text-align: center;">Join now</a>\n`;
        } else {
          content += `        <p>{{ ${variable} }}</p>\n`;
        }
      });
      
      content += `      </div>\n`;
    }
    
    content += `    </td>\n`;
    content += `  </tr>\n`;
    content += `</table>`;

    fs.writeFileSync(componentFile, content);
  }
      } else {
        content += `        <p>{{ ${name}.${variable} }}</p>\n`;
      }
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
  <style>
    /* Email-safe CSS */
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    table { border-collapse: collapse; }
    .wrapper { width: 100%; }
    .content-block { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <block name="template"></block>
</body>
</html>`;

    fs.writeFileSync(layoutFile, content);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI Usage
if (process.argv.length < 4) {
  console.log('Usage: node scripts/llm_decomposer.mjs <email.html> <template-name>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/llm_decomposer.mjs emails/newsletter.html my-template');
  console.log('  node scripts/llm_decomposer.mjs emails/sentiers.html sentiers-llm');
  console.log('');
  console.log('Prerequisites:');
  console.log('  1. Set OPENAI_API_KEY in .env file');
  console.log('  2. Ensure email HTML file exists');
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
    console.log(`   Components: ${Object.keys(result.components).length}`);
    console.log(`   Template: templates/${templateName}/`);
  })
  .catch(error => {
    console.error('❌ LLM decomposition failed:', error.message);
    process.exit(1);
  });