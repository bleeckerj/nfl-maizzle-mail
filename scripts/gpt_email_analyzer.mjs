#!/usr/bin/env node

import fs from 'fs';
import { JSDOM } from 'jsdom';

/**
 * GPT-4o Email Analysis Integration
 * Creates structured prompts for intelligent email decomposition
 */

class GPTEmailAnalyzer {
  constructor(htmlFile) {
    this.htmlFile = htmlFile;
    this.htmlContent = fs.readFileSync(htmlFile, 'utf8');
    this.dom = new JSDOM(this.htmlContent);
    this.document = this.dom.window.document;
  }

  /**
   * Extract structural information for analysis
   */
  extractStructuralInfo() {
    return {
      totalElements: this.document.querySelectorAll('*').length,
      tableCount: this.document.querySelectorAll('table').length,
      imageCount: this.document.querySelectorAll('img').length,
      linkCount: this.document.querySelectorAll('a').length,
      textBlocks: this.document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td').length
    };
  }

  /**
   * Clean HTML for GPT analysis (remove noise, keep structure)
   */
  cleanHtmlForAnalysis() {
    let html = this.htmlContent;
    
    // Remove comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Truncate very long attribute values but keep structure
    html = html.replace(/style="([^"]{200,})"/g, 'style="[long-style-truncated]"');
    html = html.replace(/src="([^"]{100,})"/g, 'src="[long-url-truncated]"');
    
    // If HTML is very long, truncate but keep key sections
    if (html.length > 10000) {
      const lines = html.split('\n');
      const important = lines.filter(line => {
        return line.includes('<table') || line.includes('<td') || 
               line.includes('<img') || line.includes('<a') ||
               line.includes('<h1') || line.includes('<h2') ||
               line.includes('header') || line.includes('footer') ||
               line.trim().length < 200; // Keep short lines
      });
      
      if (important.length < lines.length * 0.7) {
        html = important.join('\n') + '\n\n[... HTML truncated for analysis ...]';
      }
    }
    
    return html;
  }

  /**
   * Generate a structured prompt for GPT-4o analysis
   */
  generateAnalysisPrompt() {
    const structure = this.extractStructuralInfo();
    // Strong, JSON-only system prompt and a strict schema example to enforce safe output
    const strictSystem = `You are an expert email template analyst. You MUST return ONLY valid JSON (no commentary, no markdown fences, no extra text). The JSON must exactly match the schema described in the user prompt.\n\nImportant rules:\n1) Output strictly parseable JSON.\n2) Each component's 'html' field must contain ONLY inner markup suitable for inclusion inside a template table cell (NO <html>, <body>, or outer wrapper <table> elements).\n3) Do NOT include global inline styles that set background or color. Instead, provide color tokens in the 'colors' map.\n4) Use placeholders like {{var}} for dynamic values.\n5) Keep HTML minimal and email-safe.\n6) If a value is omitted, use null.`;

    const exampleJson = JSON.stringify({
      analysis: {
        emailType: 'promotional',
        layoutType: 'table-based',
        complexity: 'moderate',
        brandElements: ['logo', 'colors', 'fonts']
      },
      components: [
        {
          name: 'header',
          confidence: 0.95,
          selector: 'table:first-child',
          description: 'Top logo area',
          templateVars: ['logo.src', 'logo.alt', 'logo.href'],
          colors: { bg: '#D6F3FF' },
          html: '<td align="left"><a href="{{logo.href}}"><img src="{{logo.src}}" alt="{{logo.alt}}" width="65"/></a></td>'
        }
      ],
      schema: {},
      recommendations: ['Use table wrappers for email clients']
    }, null, 2);

    const userPrompt = [];
    userPrompt.push('Please analyze this HTML email and produce a JSON object that conforms to the exact schema described below. RETURN NOTHING ELSE.');
    userPrompt.push('Required keys: analysis, components (array), schema (object), recommendations (array).');
    userPrompt.push('Each component must include: name, confidence, selector, description, templateVars (array), optional colors (map), and html (INNER markup only).');
    userPrompt.push('Example output (for reference):');
    userPrompt.push(exampleJson);
    userPrompt.push('\nNow analyze the HTML and output the JSON. HTML to analyze:\n---HTML START---');
    userPrompt.push(this.cleanHtmlForAnalysis());
    userPrompt.push('---HTML END---');

    return {
      system: strictSystem,
      user: userPrompt.join('\n')
    };
  }

  /**
   * Save prompts to files for use with GPT-4o
   */
  savePromptsForGPT() {
    const analysisPrompt = this.generateAnalysisPrompt();
    const outputDir = 'gpt-prompts';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
    const baseName = `email-analysis-${timestamp}`;

    // Save system and user prompts separately for easy copy-paste
    fs.writeFileSync(
      `${outputDir}/${baseName}-system.txt`,
      analysisPrompt.system
    );

    fs.writeFileSync(
      `${outputDir}/${baseName}-user.txt`, 
      analysisPrompt.user
    );

    // Save combined prompt
    fs.writeFileSync(
      `${outputDir}/${baseName}-combined.json`,
      JSON.stringify({
        model: "gpt-4o",
        messages: [
          {"role": "system", "content": analysisPrompt.system},
          {"role": "user", "content": analysisPrompt.user}
        ],
        temperature: 0.1,
        max_tokens: 4000
      }, null, 2)
    );

    console.log(`📝 GPT-4o prompts saved to ${outputDir}/`);
    console.log(`📋 System prompt: ${baseName}-system.txt`);
    console.log(`👤 User prompt: ${baseName}-user.txt`);  
    console.log(`🔗 Combined API format: ${baseName}-combined.json`);
    console.log(`\n💡 Usage options:`);
    console.log(`   1. Copy prompts to ChatGPT/Claude interface`);
    console.log(`   2. Use API format with curl/Postman`);
    console.log(`   3. Process with your preferred AI tool`);

    return {
      systemPrompt: analysisPrompt.system,
      userPrompt: analysisPrompt.user,
      files: {
        system: `${outputDir}/${baseName}-system.txt`,
        user: `${outputDir}/${baseName}-user.txt`,
        combined: `${outputDir}/${baseName}-combined.json`
      }
    };
  }
}

// CLI usage
if (process.argv.length < 3) {
  console.log('Usage: node scripts/gpt_email_analyzer.mjs <email.html>');
  console.log('Example: node scripts/gpt_email_analyzer.mjs examples/newsletter.html');
  process.exit(1);
}

const htmlFile = process.argv[2];

if (!fs.existsSync(htmlFile)) {
  console.error(`❌ File not found: ${htmlFile}`);
  process.exit(1);
}

console.log(`🔍 Analyzing email: ${htmlFile}`);
const analyzer = new GPTEmailAnalyzer(htmlFile);
const prompts = analyzer.savePromptsForGPT();

console.log(`\n🚀 Next steps:`);
console.log(`   1. Use the generated prompts with GPT-4o`);
console.log(`   2. Save the JSON response as 'gpt-analysis.json'`);
console.log(`   3. Run: node scripts/apply_gpt_analysis.mjs gpt-analysis.json template-name`);