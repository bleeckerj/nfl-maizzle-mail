#!/usr/bin/env node

import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class EnhancedEmailDecomposer {
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

  /**
   * Helper function to safely parse JSON with better error handling
   */
  safeJsonParse(responseText, stage = 'Unknown') {
    // Clean JSON response if wrapped in markdown
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.log(`⚠️  JSON Parse Error in ${stage}:`, parseError.message);
      
      // Try to fix common JSON issues
      let fixedText = cleanText;
      
      // Fix unterminated strings by finding the last complete object
      if (parseError.message.includes('Unterminated string')) {
        console.log('🔧 Attempting to repair truncated JSON...');
        const lastCompleteObject = this.findLastCompleteJsonObject(cleanText);
        if (lastCompleteObject) {
          try {
            const result = JSON.parse(lastCompleteObject);
            console.log('✅ Successfully repaired JSON');
            return result;
          } catch (stillError) {
            console.log('❌ Could not repair JSON');
          }
        }
      }
      
      // Show diagnostic info
      console.log('First 300 chars of response:', cleanText.substring(0, 300));
      console.log('Last 300 chars of response:', cleanText.substring(cleanText.length - 300));
      throw parseError;
    }
  }

  /**
   * Helper to find the last complete JSON object in truncated text
   */
  findLastCompleteJsonObject(text) {
    // Count braces to find where JSON might be complete
    let braceCount = 0;
    let lastCompleteIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastCompleteIndex = i;
        }
      }
    }
    
    if (lastCompleteIndex > 0) {
      return text.substring(0, lastCompleteIndex + 1);
    }
    
    return null;
  }

  /**
   * STAGE 1: Visual Analysis - Extract colors, images, typography
   */
  async analyzeVisualDesign(htmlContent) {
    const systemPrompt = `You are a visual design expert specializing in email aesthetics. Your ONLY job is to extract visual design elements from HTML emails.

CRITICAL: Respond with valid JSON only. No markdown, no explanations.

Extract these visual elements:
{
  "colorPalette": {
    "primary": "#hexcode",
    "secondary": "#hexcode", 
    "accent": "#hexcode",
    "background": "#hexcode",
    "text": "#hexcode",
    "allColors": ["#hex1", "#hex2", "#hex3"]
  },
  "typography": {
    "headingFont": "font family",
    "bodyFont": "font family", 
    "headingSizes": ["36px", "24px", "18px"],
    "bodySize": "16px",
    "lineHeight": "1.4"
  },
  "images": [
    {
      "src": "image URL",
      "alt": "alt text",
      "type": "logo|hero|thumbnail|icon",
      "dimensions": "width x height"
    }
  ],
  "layout": {
    "maxWidth": "600px",
    "structure": "single-column|two-column|grid",
    "sections": ["header", "hero", "content", "footer"]
  }
}`;

    const userPrompt = `Extract visual design elements from this HTML email. Focus on colors, fonts, images, and layout structure.

HTML Content:
${htmlContent}`;

    console.log('🎨 Stage 1: Visual Design Analysis...');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    let responseText = response.choices[0].message.content.trim();
    const result = this.safeJsonParse(responseText, 'Stage 1');
    
    console.log(`✅ Visual Analysis: ${result.colorPalette?.allColors?.length || 0} colors, ${result.images?.length || 0} images`);
    return result;
  }

  /**
   * STAGE 2: Structural Analysis - Identify logical sections and components
   */
  async analyzeStructure(htmlContent, visualDesign) {
    const systemPrompt = `You are a structural HTML expert. Analyze email HTML to identify logical sections and reusable components.

CRITICAL: Respond with valid JSON only. No markdown, no explanations.
IMPORTANT: Keep descriptions concise to avoid response truncation.

Identify logical sections:
{
  "sections": [
    {
      "name": "descriptive name",
      "purpose": "what this section does",
      "contentType": "static|dynamic|repeating",
      "variables": ["data variables needed"],
      "cssClasses": ["key classes"],
      "pattern": "brief structural description"
    }
  ],
  "repeatingSections": [
    {
      "name": "section name",
      "pattern": "what repeats",
      "exampleCount": 3,
      "variables": ["variables per item"]
    }
  ],
  "globalElements": {
    "header": "header summary",
    "footer": "footer summary", 
    "wrapper": "main container type"
  }
}`;

    // Truncate HTML content to manageable size
    const maxHtmlLength = 40000;
    const truncatedHtml = htmlContent.length > maxHtmlLength 
      ? htmlContent.substring(0, maxHtmlLength) + "\n\n[... HTML truncated for analysis ...]"
      : htmlContent;

    const userPrompt = `Analyze the HTML structure to identify logical sections and reusable components.

Visual Context: ${visualDesign.layout?.sections?.join(', ') || 'Unknown layout'}

HTML Content (${truncatedHtml.length} chars):
${truncatedHtml}`;

    console.log('🏗️  Stage 2: Structural Analysis...');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2500 // Reduced to ensure complete responses
      });

      let responseText = response.choices[0].message.content.trim();
      return this.safeJsonParse(responseText, 'Stage 2');
      
    } catch (parseError) {
      console.log('🔄 Attempting simplified structure analysis...');
      return await this.fallbackStructureAnalysis(htmlContent);
    }
  }

  /**
   * Fallback structure analysis when main analysis fails
   */
  async fallbackStructureAnalysis(htmlContent) {
    const systemPrompt = `Provide a simple structural summary in valid JSON only:

{
  "sections": [
    {"name": "Header", "purpose": "Top section", "contentType": "static"},
    {"name": "Main Content", "purpose": "Primary content", "contentType": "dynamic"},
    {"name": "Footer", "purpose": "Bottom section", "contentType": "static"}
  ],
  "repeatingSections": [],
  "globalElements": {
    "header": "table-based header",  
    "footer": "table-based footer",
    "wrapper": "email container"
  }
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this HTML: ${htmlContent.substring(0, 5000)}` }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    return this.safeJsonParse(response.choices[0].message.content.trim(), 'Fallback Structure');
  }

  /**
   * STAGE 3: Content Analysis - Extract actual content and create sample data
   */
  async analyzeContent(htmlContent, structure) {
    const systemPrompt = `Extract content from HTML email and create sample data.

CRITICAL: Respond with valid JSON only. No markdown, no explanations.

{
  "contentAnalysis": {
    "emailType": "newsletter|marketing|ecommerce",
    "primaryTopic": "main subject",
    "contentSections": [
      {
        "section": "section name",
        "content": "extracted text content",
        "links": ["url1", "url2"],
        "images": ["img1", "img2"]
      }
    ]
  },
  "sampleData": {
    "title": "extracted or sample title",
    "subtitle": "extracted or sample subtitle"
  }
}`;

    // Further truncate for content analysis
    const contentSample = htmlContent.length > 20000 
      ? htmlContent.substring(0, 20000) + "\n[...truncated...]"
      : htmlContent;

    const userPrompt = `Extract content and create sample data for this email:

${contentSample}`;

    console.log('📝 Stage 3: Content Analysis...');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    return this.safeJsonParse(response.choices[0].message.content.trim(), 'Stage 3');
  }

  /**
   * Generate Maizzle template files from analysis
   */
  async generateTemplateFiles(templateName, analysisResult) {
    const templateDir = `./templates/${templateName}`;
    
    // Create template directory
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // Create subdirectories
    ['components', 'layouts'].forEach(dir => {
      const dirPath = path.join(templateDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    console.log(`📁 Creating template files in ${templateDir}/`);

    // Generate main template HTML
    const templateHtml = this.generateMainTemplate(analysisResult);
    fs.writeFileSync(path.join(templateDir, 'newsletter.html'), templateHtml);

    // Generate component files
    if (analysisResult.structure?.sections) {
      for (const section of analysisResult.structure.sections) {
        const componentHtml = this.generateComponent(section);
        const componentName = section.name.replace(/\s+/g, '') + '.html';
        fs.writeFileSync(path.join(templateDir, 'components', componentName), componentHtml);
      }
    }

    // Generate layout
    const layoutHtml = this.generateLayout(analysisResult);
    fs.writeFileSync(path.join(templateDir, 'layouts', 'main.html'), layoutHtml);

    // Generate sample data
    const sampleData = this.generateSampleData(analysisResult);
    fs.writeFileSync(path.join(templateDir, 'sample-data.json'), JSON.stringify(sampleData, null, 2));

    // Generate schema
    const schema = this.generateSchema(analysisResult);
    fs.writeFileSync(path.join(templateDir, 'schema.json'), JSON.stringify(schema, null, 2));

    console.log('✅ Template files generated successfully!');
  }

  generateMainTemplate(analysis) {
    const sections = analysis.structure?.sections || [];
    const components = sections.map(section => {
      const componentName = section.name.replace(/\s+/g, '');
      return `    <component src="components/${componentName}.html"></component>`;
    }).join('\n');

    return `---
title: "{{ title }}"
preheader: "{{ subtitle || 'Newsletter preview' }}"
---

<extends src="layouts/main.html">
  <block name="template">
${components}
  </block>
</extends>
`;
  }

  generateComponent(section) {
    return `<!-- ${section.name} Component -->
<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td class="content-block" style="padding: 20px;">
      <!-- ${section.purpose} -->
      <div class="${section.cssClasses?.join(' ') || 'content-section'}">
        <!-- Component content goes here -->
        <!-- Variables: ${section.variables?.join(', ') || 'none'} -->
      </div>
    </td>
  </tr>
</table>
`;
  }

  generateLayout(analysis) {
    const colors = analysis.visualDesign?.colorPalette || {};
    
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>{{ title }}</title>
  
  <style>
    /* Email styles */
    body {
      margin: 0;
      padding: 0;
      background-color: ${colors.background || '#ffffff'};
      color: ${colors.text || '#333333'};
      font-family: Arial, sans-serif;
    }
    
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .responsive-image {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <block name="template">
      <!-- Template content -->
    </block>
  </div>
</body>
</html>
`;
  }

  generateSampleData(analysis) {
    const contentAnalysis = analysis.content?.contentAnalysis || {};
    const sampleData = analysis.content?.sampleData || {};
    
    return {
      title: sampleData.title || "Sample Newsletter Title",
      subtitle: sampleData.subtitle || "Sample subtitle or preview text",
      emailType: contentAnalysis.emailType || "newsletter",
      ...sampleData
    };
  }

  generateSchema(analysis) {
    return {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Newsletter Data Schema",
      "description": "Schema for newsletter content data",
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Newsletter title"
        },
        "subtitle": {
          "type": "string", 
          "description": "Newsletter subtitle or preview"
        }
      },
      "required": ["title"]
    };
  }

  /**
   * Main decomposition process
   */
  async decompose(htmlFile, templateName) {
    console.log('🚀 Enhanced Multi-Stage Email Decomposition');
    console.log('════════════════════════════════════════════');
    console.log(`📧 Email: ${htmlFile}`);
    console.log(`🏗️  Template: ${templateName}`);
    console.log('⚡ Strategy: Multi-stage GPT-4o Analysis');
    console.log('');

    // Initialize OpenAI
    const openaiReady = await this.initializeOpenAI();
    if (!openaiReady) {
      process.exit(1);
    }

    // Read HTML file
    let htmlContent;
    try {
      htmlContent = fs.readFileSync(htmlFile, 'utf8');
      console.log(`📄 HTML Content: ${htmlContent.length} characters`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error reading file ${htmlFile}:`, error.message);
      process.exit(1);
    }

    try {
      // Stage 1: Visual Design Analysis
      const visualDesign = await this.analyzeVisualDesign(htmlContent);

      // Stage 2: Structural Analysis  
      const structure = await this.analyzeStructure(htmlContent, visualDesign);

      // Stage 3: Content Analysis
      const content = await this.analyzeContent(htmlContent, structure);

      // Combine results
      const analysisResult = {
        visualDesign,
        structure,
        content,
        metadata: {
          originalFile: htmlFile,
          templateName: templateName,
          analysisDate: new Date().toISOString(),
          htmlLength: htmlContent.length
        }
      };

      // Save comprehensive analysis
      const templateDir = `./templates/${templateName}`;
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      
      const analysisFile = path.join(templateDir, 'analysis-report.json');
      fs.writeFileSync(analysisFile, JSON.stringify(analysisResult, null, 2));
      console.log(`💾 Analysis saved to ${analysisFile}`);

      // Generate template files
      await this.generateTemplateFiles(templateName, analysisResult);

      console.log('');
      console.log('🎉 Multi-stage decomposition completed successfully!');
      console.log(`📁 Template created: ./templates/${templateName}/`);
      
      return analysisResult;

    } catch (error) {
      console.error('❌ Decomposition failed:', error.message);
      
      // Create a basic fallback template
      console.log('🔄 Creating basic fallback template...');
      await this.createFallbackTemplate(templateName, htmlContent);
      
      process.exit(1);
    }
  }

  async createFallbackTemplate(templateName, htmlContent) {
    const templateDir = `./templates/${templateName}`;
    
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // Create a basic template structure
    const basicTemplate = `---
title: "{{ title }}"
preheader: "{{ subtitle }}"
---

<extends src="layouts/main.html">
  <block name="template">
    <!-- Basic template content -->
    <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px;">
          <h1>{{ title }}</h1>
          <p>{{ content }}</p>
        </td>
      </tr>
    </table>
  </block>
</extends>
`;

    fs.writeFileSync(path.join(templateDir, 'newsletter.html'), basicTemplate);
    fs.writeFileSync(path.join(templateDir, 'sample-data.json'), JSON.stringify({
      title: "Sample Newsletter",
      subtitle: "Sample preview text",
      content: "Sample content"
    }, null, 2));

    console.log(`📁 Basic fallback template created: ${templateDir}/`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('📧 Enhanced Email Decomposer (Fixed)');
    console.log('Usage: node scripts/enhanced-decomposer-fixed.mjs <html-file> <template-name>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/enhanced-decomposer-fixed.mjs emails/dense-discovery.html dense-discovery-enhanced');
    process.exit(1);
  }

  const [htmlFile, templateName] = args;

  const decomposer = new EnhancedEmailDecomposer();
  await decomposer.decompose(htmlFile, templateName);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default EnhancedEmailDecomposer;