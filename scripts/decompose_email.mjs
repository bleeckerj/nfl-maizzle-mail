#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

/**
 * Email Decomposition Tool
 * Analyzes existing HTML email and creates template structure
 * Usage: node scripts/decompose_email.mjs <input.html> <template-name>
 */

if (process.argv.length < 4) {
  console.log('Usage: node scripts/decompose_email.mjs <input.html> <template-name>');
  console.log('Example: node scripts/decompose_email.mjs emails/existing.html mynewtemplate');
  process.exit(1);
}

const inputFile = process.argv[2];
const templateName = process.argv[3];

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file "${inputFile}" not found`);
  process.exit(1);
}

const templateDir = path.join('templates', templateName);

if (fs.existsSync(templateDir)) {
  console.error(`❌ Template "${templateName}" already exists`);
  process.exit(1);
}

console.log(`🔍 Analyzing email: ${inputFile}`);
console.log(`📧 Creating template: ${templateName}`);

// Read and parse HTML
const htmlContent = fs.readFileSync(inputFile, 'utf8');
const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// Create template directories
fs.mkdirSync(path.join(templateDir, 'components'), { recursive: true });
fs.mkdirSync(path.join(templateDir, 'layouts'), { recursive: true });

console.log('📁 Created template directories');

/**
 * Analyze and extract components from HTML
 */
function analyzeAndExtract() {
  const components = {};
  const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": `${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Template Schema`,
    "type": "object",
    "properties": {},
    "required": []
  };
  
  // Extract title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    schema.properties.title = {
      "type": "string",
      "description": "Newsletter title"
    };
    schema.required.push('title');
    console.log('✅ Found title element');
  }
  
  // Look for common email sections
  const sections = [
    { name: 'header', selectors: ['header', '[role="banner"]', '.header', '#header'] },
    { name: 'logo', selectors: ['img[alt*="logo" i]', '.logo img', 'header img'] },
    { name: 'hero', selectors: ['.hero', '#hero', '[class*="hero"]', 'table[width="600"] tr:first-child'] },
    { name: 'content', selectors: ['main', '.content', '#content', '[role="main"]'] },
    { name: 'footer', selectors: ['footer', '[role="contentinfo"]', '.footer', '#footer'] }
  ];
  
  sections.forEach(section => {
    let element = null;
    
    for (const selector of section.selectors) {
      element = document.querySelector(selector);
      if (element) break;
    }
    
    if (element) {
      console.log(`✅ Found ${section.name} section`);
      
      // Extract HTML and clean it up
      let html = element.outerHTML;
      
      // Replace text content with template variables
      html = html.replace(/[A-Za-z][A-Za-z0-9\s,.'"-]+[A-Za-z0-9]/g, (match) => {
        if (match.length > 5 && !match.includes('http') && !match.includes('@') && !match.includes('.com')) {
          return `{{ ${section.name}.text }}`;
        }
        return match;
      });
      
      // Replace image sources
      html = html.replace(/src="[^"]+"/g, `src="{{ ${section.name}.image.src }}"`);
      html = html.replace(/alt="[^"]+"/g, `alt="{{ ${section.name}.image.alt }}"`);
      
      // Replace links
      html = html.replace(/href="[^"]+"/g, `href="{{ ${section.name}.url }}"`);
      
      components[section.name] = html;
      
      // Add to schema
      schema.properties[section.name] = {
        "type": "object",
        "properties": {
          "text": { "type": "string", "description": `${section.name} text content` },
          "url": { "type": "string", "format": "uri", "description": `${section.name} link URL` },
          "image": {
            "type": "object",
            "properties": {
              "src": { "type": "string", "format": "uri" },
              "alt": { "type": "string" }
            }
          }
        }
      };
    }
  });
  
  return { components, schema };
}

const { components, schema } = analyzeAndExtract();

// Create component files
Object.entries(components).forEach(([name, html]) => {
  const componentFile = path.join(templateDir, 'components', `${name.charAt(0).toUpperCase() + name.slice(1)}.html`);
  
  // Wrap in email-safe table structure
  const wrappedHtml = `<!-- ${name.charAt(0).toUpperCase() + name.slice(1)} Component -->
<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td class="content-block" style="padding: 20px;">
      ${html}
    </td>
  </tr>
</table>`;
  
  fs.writeFileSync(componentFile, wrappedHtml);
  console.log(`📄 Created component: ${name}`);
});

// Create main layout
const mainLayout = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>{{ title }}</title>
  
  <style>
    /* Email-safe CSS extracted from original */
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
      outline: none;
      text-decoration: none;
    }
    
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .content-block {
      padding: 20px;
    }
    
    @media screen and (max-width: 600px) {
      .wrapper {
        width: 100% !important;
      }
      
      .content-block {
        padding: 15px !important;
      }
    }
  </style>
</head>

<body style="margin: 0; padding: 0; width: 100%; background-color: #ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
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

fs.writeFileSync(path.join(templateDir, 'layouts', 'main.html'), mainLayout);

// Create newsletter template
const componentIncludes = Object.keys(components)
  .map(name => `    <!-- ${name.charAt(0).toUpperCase() + name.slice(1)} -->
    <component src="templates/${templateName}/components/${name.charAt(0).toUpperCase() + name.slice(1)}.html"></component>`)
  .join('\n\n');

const newsletterTemplate = `---
title: "{{ title }}"
---

<extends src="templates/${templateName}/layouts/main.html">
  <block name="template">
    
${componentIncludes}
    
  </block>
</extends>`;

fs.writeFileSync(path.join(templateDir, 'newsletter.html'), newsletterTemplate);

// Create schema file
fs.writeFileSync(path.join(templateDir, 'schema.json'), JSON.stringify(schema, null, 2));

// Create sample content file
const sampleContent = `---
template: "${templateName}"
title: "Sample Newsletter Title"
${Object.keys(components).map(name => `${name}:
  text: "Sample ${name} content"
  url: "https://example.com/${name}"
  image:
    src: "https://via.placeholder.com/300x200"
    alt: "Sample ${name} image"`).join('\n')}
---

This is sample content for the ${templateName} template.
You can write additional markdown content here.`;

fs.writeFileSync(path.join('content', `${templateName}-sample.md`), sampleContent);

console.log('\n🎉 Email decomposition complete!');
console.log(`📧 Template created: ${templateName}`);
console.log(`📄 Components: ${Object.keys(components).length}`);
console.log(`📋 Schema: templates/${templateName}/schema.json`);
console.log(`📝 Sample content: content/${templateName}-sample.md`);
console.log(`\n🚀 Try it out:`);
console.log(`   node scripts/md_to_json.mjs content/${templateName}-sample.md --template=${templateName}`);
console.log(`   npm run build -- --template=${templateName}`);