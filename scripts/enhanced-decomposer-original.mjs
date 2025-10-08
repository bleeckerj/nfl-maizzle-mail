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
  "images": [
    {
      "url": "full image URL",
      "alt": "alt text",
      "purpose": "header|logo|product|article|decoration|gallery",
      "dimensions": "widthxheight or responsive",
      "placement": "where it appears in layout"
    }
  ],
  "typography": {
    "primaryFont": "font family",
    "headingStyles": "font properties for headings",
    "bodyStyles": "font properties for body text",
    "linkStyles": "font properties for links"
  },
  "layout": {
    "structure": "single-column|multi-column|complex",
    "width": "email width constraint",
    "sections": ["header", "hero", "content", "sidebar", "footer"],
    "backgroundStyles": "background colors and patterns per section"
  },
  "interactiveElements": {
    "buttons": ["CTA button styles and colors"],
    "links": ["link styling patterns"],
    "hover": "hover state descriptions"
  }
}`;

    const userPrompt = `Extract ALL visual design elements from this HTML email. Pay special attention to:
- Every single color used (backgrounds, text, borders, buttons)
- All images with complete URLs and purposes  
- Typography patterns and font styling
- Layout structure and section organization
- Interactive elements like buttons and links

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
      max_tokens: 3000
    });

    let responseText = response.choices[0].message.content.trim();
    
    // Clean JSON response if wrapped in markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(responseText);
  }

  /**
   * STAGE 2: Structural Analysis - Identify logical sections and components
   */
  async analyzeStructure(htmlContent, visualDesign) {
    const systemPrompt = `You are a structural HTML expert. Analyze email HTML to identify logical sections and reusable components.

CRITICAL: Respond with valid JSON only. No markdown, no explanations.

Identify logical sections and extract their actual HTML structure:
{
  "sections": [
    {
      "name": "descriptive name",
      "purpose": "what this section does",
      "htmlStructure": "actual HTML structure with classes and inline styles preserved",
      "contentType": "static|dynamic|repeating",
      "variables": ["list of data variables needed"],
      "startLine": "approximate line number where section starts",
      "endLine": "approximate line number where section ends"
    }
  ],
  "repeatingSections": [
    {
      "name": "section name",
      "pattern": "what repeats (articles, products, etc)",
      "htmlTemplate": "HTML structure for one item",
      "exampleCount": "how many examples exist",
      "variables": ["variables per item"]
    }
  ],
  "globalElements": {
    "header": "header HTML structure",
    "footer": "footer HTML structure", 
    "wrapper": "main container structure"
  }
}`;

    const userPrompt = `Analyze the HTML structure to identify logical sections and reusable components. Consider the visual design context:

Visual Design Context:
- Color palette: ${JSON.stringify(visualDesign.colorPalette)}
- Images: ${visualDesign.images.length} images found
- Layout: ${visualDesign.layout.structure} with sections: ${visualDesign.layout.sections.join(', ')}

Find:
1. Logical sections (header, hero, article blocks, sidebar, footer)
2. Repeating patterns (article lists, product grids, etc) 
3. Reusable components that could work for similar emails
4. Focus on STRUCTURE not full HTML - extract key patterns

HTML Content (truncated for analysis - focus on structural patterns):
${htmlContent.length > 30000 ? htmlContent.substring(0, 30000) + '\n\n[Content truncated - analyze visible structure patterns]' : htmlContent}`;

    console.log('🏗️  Stage 2: Structural Analysis...');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    let responseText = response.choices[0].message.content.trim();
    
    // Clean JSON response if wrapped in markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error in Stage 2:', parseError.message);
      console.log('First 500 chars of response:', responseText.substring(0, 500));
      console.log('Last 500 chars of response:', responseText.substring(responseText.length - 500));
      throw parseError;
    }
  }

  /**
   * STAGE 3: Content Analysis - Extract actual content and create sample data
   */
  async analyzeContent(htmlContent, structure) {
    const systemPrompt = `You are a content extraction expert. Extract actual content from HTML emails and create realistic sample data.

CRITICAL: Respond with valid JSON only. No markdown, no explanations.

Extract content and create comprehensive sample data:
{
  "contentAnalysis": {
    "emailType": "newsletter|marketing|ecommerce|transactional",
    "primaryTopic": "main subject matter",
    "contentSections": [
      {
        "section": "section name",
        "actualContent": "actual text content from this section (not truncated)",
        "contentType": "heading|paragraph|list|link|image",
        "importance": "primary|secondary|supporting"
      }
    ]
  },
  "sampleData": {
    "title": "extracted or inferred email title",
    "preheader": "preview text if found",
    "articles": [
      {
        "title": "actual article title from email",
        "description": "actual article description (complete, not truncated)",
        "url": "actual URL if present",
        "image": "actual image URL if present",
        "category": "inferred category"
      }
    ],
    "staticContent": {
      "companyName": "extracted company/brand name",
      "tagline": "brand tagline if present",
      "socialLinks": "social media links found"
    }
  },
  "schema": {
    "type": "object", 
    "properties": {
      "title": {"type": "string"},
      "preheader": {"type": "string"},
      "articles": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "url": {"type": "string"},
            "image": {"type": "string"}
          }
        }
      }
    }
  }
}`;

    const userPrompt = `Extract complete content from this HTML email. Create realistic sample data based on actual content found.

Structural Context: 
- Sections identified: ${structure.sections.map(s => s.name).join(', ')}
- Repeating patterns: ${structure.repeatingSections.map(r => r.pattern).join(', ')}

Instructions:
1. Extract actual content from each identified section
2. Preserve actual URLs, image paths, and links from the original
3. Create multiple sample items for repeating content (at least 3-4 items)
4. Generate proper JSON schema for the template system
5. Focus on CONTENT EXTRACTION not full HTML structure

HTML Content (truncated for content extraction):
${htmlContent.length > 25000 ? htmlContent.substring(0, 25000) + '\n\n[Content truncated - extract content patterns from visible sections]' : htmlContent}`;

    console.log('📝 Stage 3: Content Analysis...');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    let responseText = response.choices[0].message.content.trim();
    
    // Clean JSON response if wrapped in markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(responseText);
  }

  /**
   * STAGE 4: Component Generation - Create actual Maizzle components
   */
  async generateComponents(structure, visualDesign, contentAnalysis, templateName) {
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

    console.log('🔧 Stage 4: Component Generation...');

    // Generate components with actual HTML structure
    for (const section of structure.sections) {
      await this.generateAdvancedComponent(section, visualDesign, templateDir);
    }

    // Generate repeating components
    for (const repeating of structure.repeatingSections) {
      await this.generateRepeatingComponent(repeating, visualDesign, templateDir);
    }

    // Generate main template
    this.generateAdvancedMainTemplate(structure, templateName, templateDir);

    // Generate layout with visual design
    this.generateAdvancedLayout(templateDir, visualDesign);

    // Generate schema and sample data
    const schemaFile = path.join(templateDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(contentAnalysis.schema, null, 2));

    const sampleDataFile = path.join(templateDir, 'sample-data.json');
    fs.writeFileSync(sampleDataFile, JSON.stringify(contentAnalysis.sampleData, null, 2));

    console.log(`✅ Advanced template generated: ${templateDir}`);
  }

  async generateAdvancedComponent(section, visualDesign, templateDir) {
    const componentFile = path.join(templateDir, 'components', `${this.capitalize(section.name)}.html`);
    
    // Use actual HTML structure instead of generic template
    let content = `<!-- ${this.capitalize(section.name)} Component -->\n`;
    content += `<!-- Purpose: ${section.purpose} -->\n`;
    content += `<!-- Variables: ${section.variables.join(', ')} -->\n\n`;
    
    // Preserve actual HTML structure but add Maizzle templating
    let htmlStructure = section.htmlStructure;
    
    // Replace static content with variables
    section.variables.forEach(variable => {
      // Smart variable replacement based on context
      htmlStructure = htmlStructure.replace(/\{\{.*?\}\}/, `{{ ${variable} }}`);
    });
    
    content += htmlStructure;

    fs.writeFileSync(componentFile, content);
  }

  async generateRepeatingComponent(repeating, visualDesign, templateDir) {
    const componentFile = path.join(templateDir, 'components', `${this.capitalize(repeating.name)}.html`);
    
    let content = `<!-- ${this.capitalize(repeating.name)} Repeating Component -->\n`;
    content += `<!-- Pattern: ${repeating.pattern} -->\n`;
    content += `<!-- Variables per item: ${repeating.variables.join(', ')} -->\n\n`;
    
    content += `<each loop="item in ${repeating.name.toLowerCase()}">\n`;
    
    // Use actual HTML template structure
    let htmlTemplate = repeating.htmlTemplate;
    
    // Replace with loop variables
    repeating.variables.forEach(variable => {
      htmlTemplate = htmlTemplate.replace(new RegExp(variable, 'g'), `item.${variable}`);
    });
    
    content += htmlTemplate;
    content += `\n</each>`;

    fs.writeFileSync(componentFile, content);
  }

  generateAdvancedMainTemplate(structure, templateName, templateDir) {
    const templateFile = path.join(templateDir, 'newsletter.html');
    
    let content = `---\ntitle: "{{ title }}"\n---\n\n`;
    content += `<extends src="templates/${templateName}/layouts/main.html">\n`;
    content += `  <block name="template">\n`;

    // Add components in logical order
    structure.sections.forEach(section => {
      content += `    <component src="templates/${templateName}/components/${this.capitalize(section.name)}.html"></component>\n`;
    });

    structure.repeatingSections.forEach(repeating => {
      content += `    <component src="templates/${templateName}/components/${this.capitalize(repeating.name)}.html"></component>\n`;
    });

    content += `  </block>\n`;
    content += `</extends>`;

    fs.writeFileSync(templateFile, content);
  }

  generateAdvancedLayout(templateDir, visualDesign) {
    const layoutFile = path.join(templateDir, 'layouts', 'main.html');
    
    const content = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{{ title }}</title>
<style>
  /* Email Client Resets */
  body { margin: 0; padding: 0; font-family: ${visualDesign.typography.primaryFont}; }
  table { border-collapse: collapse; }
  img { display: block; }
  
  /* Primary Colors */
  .bg-primary { background-color: ${visualDesign.colorPalette.primary}; }
  .bg-secondary { background-color: ${visualDesign.colorPalette.secondary}; }
  .text-primary { color: ${visualDesign.colorPalette.text}; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${visualDesign.colorPalette.background};">
<block name="template"></block>
</body>
</html>`;

    fs.writeFileSync(layoutFile, content);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Main decomposition method - orchestrates all stages
   */
  async decomposeEmail(sourceFile, templateName) {
    console.log('🚀 Enhanced Multi-Stage Email Decomposition');
    console.log('════════════════════════════════════════════');
    console.log(`📧 Email: ${sourceFile}`);
    console.log(`🏗️  Template: ${templateName}`);
    console.log('⚡ Strategy: Multi-stage GPT-4o Analysis');
    console.log('');

    // Initialize OpenAI
    const initialized = await this.initializeOpenAI();
    if (!initialized) {
      throw new Error('Failed to initialize OpenAI API');
    }

    // Read HTML file
    const htmlContent = fs.readFileSync(sourceFile, 'utf8');
    console.log(`📄 HTML Content: ${htmlContent.length} characters`);
    console.log('');

    // Stage 1: Visual Design Analysis
    const visualDesign = await this.analyzeVisualDesign(htmlContent);
    console.log(`✅ Visual Analysis: ${visualDesign.colorPalette.allColors.length} colors, ${visualDesign.images.length} images`);

    // Stage 2: Structural Analysis  
    const structure = await this.analyzeStructure(htmlContent, visualDesign);
    console.log(`✅ Structure Analysis: ${structure.sections.length} sections, ${structure.repeatingSections.length} repeating patterns`);

    // Stage 3: Content Analysis
    const contentAnalysis = await this.analyzeContent(htmlContent, structure);
    console.log(`✅ Content Analysis: ${contentAnalysis.emailType} email with ${Object.keys(contentAnalysis.sampleData).length} data fields`);

    // Stage 4: Component Generation
    await this.generateComponents(structure, visualDesign, contentAnalysis, templateName);
    console.log(`✅ Components Generated`);

    console.log('');
    console.log('✅ Enhanced Multi-Stage Decomposition Complete!');
    console.log('═══════════════════════════════════════════════');
    console.log(`📧 Template: ${templateName}`);
    console.log(`🎨 Colors: ${visualDesign.colorPalette.allColors.join(', ')}`);
    console.log(`🖼️  Images: ${visualDesign.images.length} preserved`);
    console.log(`🔧 Components: ${structure.sections.length + structure.repeatingSections.length}`);
    console.log(`📊 Email Type: ${contentAnalysis.emailType}`);
    console.log('');
    
    return {
      success: true,
      emailType: contentAnalysis.emailType,
      components: structure.sections.length + structure.repeatingSections.length,
      colors: visualDesign.colorPalette.allColors.length,
      images: visualDesign.images.length,
      templatePath: `templates/${templateName}/`
    };
  }
}

// CLI usage
if (process.argv.length < 4) {
  console.log('Usage: node enhanced-decomposer.mjs <email.html> <template-name>');
  console.log('Example: node enhanced-decomposer.mjs emails/dense-discovery.html dense-discovery-enhanced');
  process.exit(1);
}

const htmlFile = process.argv[2];
const templateName = process.argv[3];

const decomposer = new EnhancedEmailDecomposer();

decomposer.decomposeEmail(htmlFile, templateName)
  .then(result => {
    console.log('\n🎯 Enhanced Decomposition Summary:');
    console.log(`   Email Type: ${result.emailType}`);
    console.log(`   Components: ${result.components}`);
    console.log(`   Colors Preserved: ${result.colors}`);
    console.log(`   Images Preserved: ${result.images}`);
    console.log(`   Template: ${result.templatePath}`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });