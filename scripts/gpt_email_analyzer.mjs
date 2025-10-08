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
   * Generate a structured prompt for GPT-4o analysis
   */
  generateAnalysisPrompt() {
    const structure = this.extractStructuralInfo();
    
    return {
      system: `You are an expert email template analyst. Analyze HTML email code and identify reusable components for a template system. Focus on:

1. **Component Identification**: Identify distinct sections (header, hero, content blocks, footer, etc.)
2. **Template Variables**: Suggest what content should be dynamic (text, images, links)
3. **Schema Generation**: Define the data structure needed for each component
4. **Best Practices**: Recommend email-safe HTML patterns and improvements

Respond with a JSON structure containing your analysis.`,

      user: `Please analyze this HTML email and help me convert it into a reusable template system.

**Email Structure Info:**
- Total elements: ${structure.totalElements}
- Tables: ${structure.tableCount} (suggests ${structure.tableCount > 5 ? 'table-based' : 'modern'} layout)
- Images: ${structure.imageCount}
- Links: ${structure.linkCount}
- Text blocks: ${structure.textBlocks}

**HTML Content:**
\`\`\`html
${this.cleanHtmlForAnalysis()}
\`\`\`

**Required Output Format:**
\`\`\`json
{
  "analysis": {
    "emailType": "newsletter|promotional|transactional|digest",
    "layoutType": "table-based|div-based|hybrid",
    "complexity": "simple|moderate|complex",
    "brandElements": ["logo", "colors", "fonts"]
  },
  "components": [
    {
      "name": "header",
      "confidence": 0.9,
      "selector": "table:first-child",
      "description": "Email header with logo",
      "templateVars": ["logo.src", "logo.alt", "logo.href"],
      "html": "<extracted-html-with-variables>"
    }
  ],
  "schema": {
    "properties": {
      "header": {
        "type": "object",
        "properties": {
          "logo": {
            "type": "object",
            "properties": {
              "src": {"type": "string", "format": "uri"},
              "alt": {"type": "string"},
              "href": {"type": "string", "format": "uri"}
            }
          }
        }
      }
    }
  },
  "recommendations": [
    "Consider using semantic HTML elements",
    "Add responsive media queries",
    "Optimize image dimensions"
  ]
}
\`\`\`

Please provide a comprehensive analysis that would help create a robust, reusable email template.`
    };
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
   * Generate prompt for component extraction
   */
  generateComponentPrompt(componentName, htmlSection) {
    return {
      system: `You are an expert at converting HTML email components into template-ready code. Your task is to:

1. Clean up the HTML to be more template-friendly
2. Replace dynamic content with template variables
3. Ensure email client compatibility
4. Suggest the data structure needed`,

      user: `Convert this HTML section into a reusable email template component:

**Component Type:** ${componentName}

**HTML Section:**
\`\`\`html
${htmlSection}
\`\`\`

**Output Format:**
\`\`\`json
{
  "cleanedHtml": "<template-ready HTML with variables>",
  "variables": {
    "text": "Description of text content to replace",
    "image": "Description of image to replace", 
    "links": "Description of links to replace"
  },
  "dataStructure": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "content": {"type": "string"}
    }
  },
  "improvements": [
    "Suggestions for better email compatibility"
  ]
}
\`\`\`

Focus on making the component reusable while preserving the visual structure.`
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