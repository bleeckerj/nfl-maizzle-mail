#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Apply GPT-4o Analysis Results
 * Takes GPT-4o JSON analysis and creates template structure
 */

if (process.argv.length < 4) {
  console.log('Usage: node scripts/apply_gpt_analysis.mjs <gpt-analysis.json> <template-name>');
  console.log('Example: node scripts/apply_gpt_analysis.mjs gpt-analysis.json my-template');
  process.exit(1);
}

const analysisFile = process.argv[2];
const templateName = process.argv[3];

if (!fs.existsSync(analysisFile)) {
  console.error(`❌ Analysis file not found: ${analysisFile}`);
  process.exit(1);
}

const templateDir = path.join('templates', templateName);

if (fs.existsSync(templateDir)) {
  console.error(`❌ Template "${templateName}" already exists`);
  process.exit(1);
}

console.log(`🤖 Applying GPT-4o analysis from: ${analysisFile}`);
console.log(`📧 Creating template: ${templateName}`);

try {
  const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
  
  // Create template directories
  fs.mkdirSync(path.join(templateDir, 'components'), { recursive: true });
  fs.mkdirSync(path.join(templateDir, 'layouts'), { recursive: true });

  console.log('📁 Created template directories');

  // Process components from GPT analysis
  if (analysisData.components && Array.isArray(analysisData.components)) {
    console.log(`📄 Processing ${analysisData.components.length} components...`);
    
    analysisData.components.forEach(component => {
      const componentName = component.name;
      const componentFile = path.join(templateDir, 'components', `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}.html`);
      
      // Use GPT-provided HTML or wrap the component
      let html = component.html || component.cleanedHtml || `<!-- ${componentName} component -->
<div class="${componentName}">
  {{ ${componentName}.content }}
</div>`;

      // Wrap in email-safe table structure
      const wrappedHtml = `<!-- ${componentName.charAt(0).toUpperCase() + componentName.slice(1)} Component -->
<!-- GPT-4o Analysis Confidence: ${component.confidence || 'N/A'} -->
<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td class="content-block" style="padding: 20px;">
      ${html}
    </td>
  </tr>
</table>`;

      fs.writeFileSync(componentFile, wrappedHtml);
      console.log(`✅ Created component: ${componentName} (confidence: ${component.confidence || 'N/A'})`);
    });
  }

  // Create layout file
  const layoutHtml = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>{{ title }}</title>
  
  <style>
    /* Email-safe CSS based on GPT analysis */
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
    
    /* GPT-recommended responsive styles */
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
  <!-- GPT Analysis: ${analysisData.analysis?.emailType || 'Unknown'} email, ${analysisData.analysis?.layoutType || 'Unknown'} layout -->
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

  fs.writeFileSync(path.join(templateDir, 'layouts', 'main.html'), layoutHtml);
  console.log('✅ Created layout file');

  // Create main template file
  const componentNames = analysisData.components?.map(c => c.name) || [];
  const componentIncludes = componentNames
    .map(name => `    <!-- ${name} -->
    <component src="templates/${templateName}/components/${name.charAt(0).toUpperCase() + name.slice(1)}.html"></component>`)
    .join('\n\n');

  const templateHtml = `---
title: "{{ title }}"
# GPT-4o Analysis: ${analysisData.analysis?.emailType || 'Unknown'} email template
---

<extends src="templates/${templateName}/layouts/main.html">
  <block name="template">
    
${componentIncludes || '    <!-- No components identified -->'}
    
  </block>
</extends>`;

  fs.writeFileSync(path.join(templateDir, 'newsletter.html'), templateHtml);
  console.log('✅ Created template file');

  // Create schema from GPT analysis
  const schema = analysisData.schema || {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": `${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Template Schema`,
    "description": `Generated from GPT-4o analysis`,
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Newsletter title"
      }
    },
    "required": ["title"]
  };

  // Enhance schema with component info
  if (analysisData.components) {
    analysisData.components.forEach(component => {
      if (component.dataStructure) {
        schema.properties[component.name] = component.dataStructure;
      }
    });
  }

  fs.writeFileSync(path.join(templateDir, 'schema.json'), JSON.stringify(schema, null, 2));
  console.log('✅ Created schema file');

  // Create sample content
  const sampleSections = componentNames.map(name => 
    `${name}:
  content: "Sample ${name} content"
  title: "Sample ${name} Title"
  url: "https://example.com/${name}"
  image:
    src: "https://via.placeholder.com/300x200"
    alt: "Sample ${name} image"`
  ).join('\n');

  const sampleContent = `---
template: "${templateName}"
title: "Sample Newsletter - ${templateName}"
# Generated from GPT-4o analysis
${sampleSections}
---

Sample content for the ${templateName} template.
Created using GPT-4o intelligent analysis.`;

  fs.writeFileSync(path.join('content', `${templateName}-sample.md`), sampleContent);
  console.log('✅ Created sample content');

  // Save full analysis report
  const report = {
    templateName,
    sourceAnalysis: analysisFile,
    gptAnalysis: analysisData,
    componentsCreated: componentNames,
    recommendations: analysisData.recommendations || [],
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(templateDir, 'gpt-analysis-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n🎉 GPT-4o analysis applied successfully!');
  console.log(`📧 Template created: ${templateName}`);  
  console.log(`📄 Components: ${componentNames.length}`);
  console.log(`🤖 Analysis type: ${analysisData.analysis?.emailType || 'Unknown'}`);
  console.log(`📊 Layout: ${analysisData.analysis?.layoutType || 'Unknown'}`);
  
  if (analysisData.recommendations && analysisData.recommendations.length > 0) {
    console.log(`\n💡 GPT-4o Recommendations:`);
    analysisData.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  console.log(`\n🚀 Test the template:`);
  console.log(`   node scripts/md_to_json.mjs content/${templateName}-sample.md --template=${templateName}`);
  console.log(`   npm run build:data`);

} catch (error) {
  console.error('❌ Error processing GPT analysis:', error.message);
  console.error('\n💡 Make sure the GPT analysis file contains valid JSON with the expected structure');
  process.exit(1);
}