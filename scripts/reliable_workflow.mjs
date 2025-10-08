#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import ReliableEmailDecomposer from './reliable_email_decomposer.mjs';
import AutomatedGPTAnalyzer from './automated_gpt_analyzer.mjs';

/**
 * Consistently Reliable Email Decomposition Workflow
 * Multi-strategy approach with validation and fallbacks
 */

class ReliableWorkflow {
  constructor() {
    this.decomposer = null;
    this.gptAnalyzer = new AutomatedGPTAnalyzer();
    this.results = {};
  }

  async decompose(htmlFile, templateName, options = {}) {
    console.log('🚀 Starting Reliable Email Decomposition Workflow');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📧 Input: ${htmlFile}`);
    console.log(`🏗️  Template: ${templateName}`);
    console.log(`⚙️  Options: ${JSON.stringify(options)}`);

    if (!fs.existsSync(htmlFile)) {
      throw new Error(`Email file not found: ${htmlFile}`);
    }

    this.decomposer = new ReliableEmailDecomposer(htmlFile);
    
    // Step 1: Enhanced heuristic analysis (always runs)
    console.log('\n📊 Step 1: Enhanced Heuristic Analysis');
    console.log('─────────────────────────────────────────');
    const heuristicResult = await this.decomposer.decompose();
    
    console.log(`✅ Heuristic analysis complete`);
    console.log(`📧 Email type: ${heuristicResult.emailType}`);
    console.log(`🎯 Confidence: ${Math.round(heuristicResult.confidence * 100)}%`);
    console.log(`🔧 Components found: ${Object.keys(heuristicResult.components).length}`);

    this.results.heuristic = heuristicResult;

    // Step 2: GPT-4o analysis (if available and needed)
    let gptResult = null;
    const shouldUseGPT = options.forceGPT || 
                        heuristicResult.confidence < 0.7 || 
                        options.strategy === 'comprehensive';

    if (shouldUseGPT) {
      console.log('\n🤖 Step 2: GPT-4o Analysis');
      console.log('─────────────────────────────');
      
      const apiStatus = await this.gptAnalyzer.checkAPIStatus();
      
      if (apiStatus.available) {
        try {
          const htmlContent = fs.readFileSync(htmlFile, 'utf8');
          gptResult = await this.gptAnalyzer.analyzeEmail(htmlContent, {
            source: htmlFile,
            heuristicType: heuristicResult.emailType
          });
          
          console.log('✅ GPT-4o analysis complete');
          console.log(`🎯 GPT confidence: ${Math.round((gptResult.confidence || 0.8) * 100)}%`);
          
          this.results.gpt = gptResult;
        } catch (error) {
          console.log(`⚠️  GPT-4o analysis failed: ${error.message}`);
          console.log('📊 Continuing with heuristic results only');
        }
      } else {
        console.log(`⚠️  GPT-4o not available: ${apiStatus.reason}`);
        if (apiStatus.reason.includes('API key')) {
          console.log('💡 Set OPENAI_API_KEY environment variable to enable GPT analysis');
        }
      }
    } else {
      console.log('\n⏭️  Skipping GPT-4o Analysis (high confidence heuristic result)');
    }

    // Step 3: Combine and validate results
    console.log('\n🔧 Step 3: Combining & Validating Results');
    console.log('──────────────────────────────────────────');
    
    const finalResult = this.combineResults(heuristicResult, gptResult);
    const validation = this.validateResults(finalResult);
    
    console.log(`✅ Final confidence: ${Math.round(finalResult.confidence * 100)}%`);
    console.log(`🏗️  Components: ${Object.keys(finalResult.components).length}`);
    console.log(`📊 Validation: ${validation.score * 100}% reliable`);

    // Step 4: Generate template files
    console.log('\n🏗️  Step 4: Generating Template Structure');
    console.log('─────────────────────────────────────────');
    
    await this.generateTemplate(finalResult, templateName, validation);
    
    console.log('\n🎉 Reliable Decomposition Complete!');
    console.log('════════════════════════════════════');
    console.log(`📧 Template: ${templateName}`);
    console.log(`🎯 Strategy: ${this.getUsedStrategy()}`);
    console.log(`📊 Reliability: ${Math.round(validation.score * 100)}%`);
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      validation.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    return {
      template: templateName,
      strategy: this.getUsedStrategy(),
      confidence: finalResult.confidence,
      reliability: validation.score,
      components: Object.keys(finalResult.components),
      warnings: validation.warnings,
      recommendations: validation.recommendations
    };
  }

  combineResults(heuristicResult, gptResult) {
    if (!gptResult) {
      // Use heuristic only
      return {
        ...heuristicResult,
        strategy: 'heuristic-only',
        source: 'enhanced-heuristic'
      };
    }

    // Combine both results, prioritizing higher confidence
    const combinedComponents = {};
    const heuristicComponents = heuristicResult.components || {};
    const gptComponents = gptResult.components || {};

    // Merge components, choosing highest confidence
    const allComponentNames = new Set([
      ...Object.keys(heuristicComponents),
      ...Object.keys(gptComponents)
    ]);

    allComponentNames.forEach(name => {
      const heuristic = heuristicComponents[name];
      const gpt = gptComponents[name];

      if (heuristic && gpt) {
        // Both have this component, choose higher confidence
        combinedComponents[name] = heuristic.confidence > (gpt.confidence || 0.7) ? 
          { ...heuristic, source: 'heuristic', validated: true } :
          { ...gpt, source: 'gpt', validated: true };
      } else if (heuristic) {
        combinedComponents[name] = { ...heuristic, source: 'heuristic' };
      } else if (gpt) {
        combinedComponents[name] = { ...gpt, source: 'gpt' };
      }
    });

    // Calculate combined confidence
    const avgConfidence = (heuristicResult.confidence + (gptResult.confidence || 0.8)) / 2;
    const agreementBonus = this.calculateAgreement(heuristicComponents, gptComponents) * 0.1;
    
    return {
      emailType: gptResult.emailType || heuristicResult.emailType,
      confidence: Math.min(avgConfidence + agreementBonus, 1.0),
      components: combinedComponents,
      strategy: 'hybrid',
      sources: ['heuristic', 'gpt'],
      agreement: this.calculateAgreement(heuristicComponents, gptComponents)
    };
  }

  calculateAgreement(components1, components2) {
    const names1 = new Set(Object.keys(components1));
    const names2 = new Set(Object.keys(components2));
    const intersection = new Set([...names1].filter(x => names2.has(x)));
    const union = new Set([...names1, ...names2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  validateResults(result) {
    const validation = {
      score: 0,
      warnings: [],
      recommendations: []
    };

    const components = result.components || {};
    const componentCount = Object.keys(components).length;

    // Base validation scoring
    if (result.confidence > 0.8) validation.score += 0.4;
    else if (result.confidence > 0.6) validation.score += 0.2;

    if (componentCount >= 4) validation.score += 0.3;
    else if (componentCount >= 2) validation.score += 0.2;

    // Required components check
    const hasHeader = components.header || components.headerContent;
    const hasContent = components.articles || components.content || components.hero;
    const hasFooter = components.footer;

    if (hasHeader && hasContent && hasFooter) {
      validation.score += 0.3;
    } else {
      if (!hasHeader) validation.warnings.push('No header component detected');
      if (!hasContent) validation.warnings.push('No main content component detected');
      if (!hasFooter) validation.warnings.push('No footer component detected');
    }

    // Strategy-specific validation
    if (result.strategy === 'hybrid') {
      validation.score += 0.1; // Bonus for using multiple strategies
      if (result.agreement > 0.7) {
        validation.score += 0.1;
        validation.recommendations.push('High agreement between analysis methods - reliable result');
      } else {
        validation.warnings.push('Low agreement between analysis methods - manual review recommended');
      }
    }

    // Email type specific validation
    if (result.emailType === 'newsletter') {
      if (components.articles) validation.score += 0.1;
      if (components.miscellany) validation.score += 0.05;
      if (!components.articles) {
        validation.warnings.push('Newsletter detected but no article components found');
      }
    }

    // Confidence warnings
    if (result.confidence < 0.5) {
      validation.warnings.push('Low confidence result - consider manual review');
    }

    // Final score normalization
    validation.score = Math.min(validation.score, 1.0);

    return validation;
  }

  async generateTemplate(result, templateName, validation) {
    const templateDir = path.join('templates', templateName);
    
    // Create template directory
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const componentsDir = path.join(templateDir, 'components');
    const layoutsDir = path.join(templateDir, 'layouts');
    
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(layoutsDir, { recursive: true });

    // Generate components
    const componentNames = Object.keys(result.components);
    componentNames.forEach(name => {
      const component = result.components[name];
      this.generateComponent(name, component, componentsDir);
    });

    // Generate main template
    this.generateMainTemplate(componentNames, templateName, templateDir);

    // Generate layout
    this.generateLayout(templateDir);

    // Generate schema
    this.generateSchema(result, validation, templateDir);

    // Generate sample data
    this.generateSampleData(result, templateDir);

    // Generate analysis report
    this.generateAnalysisReport(result, validation, templateDir);

    console.log(`✅ Generated ${componentNames.length} components`);
    console.log(`📄 Template files created in: ${templateDir}`);
  }

  generateComponent(name, component, componentsDir) {
    const componentFile = path.join(componentsDir, `${this.capitalize(name)}.html`);
    
    let content = `<!-- ${this.capitalize(name)} Component -->\n`;
    content += `<table class="wrapper" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">\n`;
    content += `  <tr>\n`;
    content += `    <td class="content-block" style="padding: 20px;">\n`;
    
    if (component.element && component.element.outerHTML) {
      // Extract and parameterize the actual HTML
      let html = component.element.outerHTML;
      html = this.parameterizeContent(html, name);
      content += `      ${html}\n`;
    } else {
      // Generate placeholder component
      content += `      <div class="${name}">\n`;
      content += `        {{ ${name}.content }}\n`;
      content += `      </div>\n`;
    }
    
    content += `    </td>\n`;
    content += `  </tr>\n`;
    content += `</table>`;

    fs.writeFileSync(componentFile, content);
  }

  parameterizeContent(html, componentName) {
    // Replace text content with template variables
    html = html.replace(/>[^<]+</g, (match) => {
      const text = match.slice(1, -1).trim();
      if (text && text.length > 0 && !text.includes('{{')) {
        return `>{{ ${componentName}.content }}<`;
      }
      return match;
    });

    // Replace image sources
    html = html.replace(/src="[^"]*"/g, `src="{{ ${componentName}.image.src }}"`);
    
    // Replace hrefs
    html = html.replace(/href="[^"]*"/g, `href="{{ ${componentName}.url }}"`);

    return html;
  }

  generateMainTemplate(componentNames, templateName, templateDir) {
    const templateFile = path.join(templateDir, 'newsletter.html');
    
    let content = `---\ntitle: "{{ title }}"\n---\n\n`;
    content += `<extends src="templates/${templateName}/layouts/main.html">\n`;
    content += `  <block name="template">\n    \n`;

    componentNames.forEach(name => {
      content += `    <component src="templates/${templateName}/components/${this.capitalize(name)}.html"></component>\n    \n`;
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
<body>
  <block name="template"></block>
</body>
</html>`;

    fs.writeFileSync(layoutFile, content);
  }

  generateSchema(result, validation, templateDir) {
    const schemaFile = path.join(templateDir, 'schema.json');
    
    const schema = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": `${this.capitalize(path.basename(templateDir))} Template Schema`,
      "description": `Generated by reliable decomposer (${result.strategy}, confidence: ${Math.round(result.confidence * 100)}%)`,
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Newsletter title"
        }
      },
      "required": ["title"],
      "meta": {
        "emailType": result.emailType,
        "confidence": result.confidence,
        "reliability": validation.score,
        "strategy": result.strategy,
        "generatedAt": new Date().toISOString()
      }
    };

    // Add properties for each component
    Object.keys(result.components).forEach(name => {
      schema.properties[name] = {
        "type": "object",
        "description": `${this.capitalize(name)} component data`,
        "properties": {
          "content": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "image": {
            "type": "object",
            "properties": {
              "src": { "type": "string", "format": "uri" },
              "alt": { "type": "string" }
            }
          }
        }
      };
    });

    fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
  }

  generateSampleData(result, templateDir) {
    const dataFile = path.join(templateDir, 'sample-data.json');
    
    const sampleData = {
      "$schema": "./schema.json",
      "template": path.basename(templateDir),
      "title": `Sample ${this.capitalize(result.emailType)} - ${path.basename(templateDir)}`
    };

    // Generate sample data for each component
    Object.keys(result.components).forEach(name => {
      sampleData[name] = {
        "content": `Sample ${name} content`,
        "url": `https://example.com/${name}`,
        "image": {
          "src": "https://via.placeholder.com/300x200",
          "alt": `Sample ${name} image`
        }
      };
    });

    fs.writeFileSync(dataFile, JSON.stringify(sampleData, null, 2));
  }

  generateAnalysisReport(result, validation, templateDir) {
    const reportFile = path.join(templateDir, 'analysis-report.json');
    
    const report = {
      "template": path.basename(templateDir),
      "strategy": result.strategy,
      "emailType": result.emailType,
      "confidence": result.confidence,
      "reliability": validation.score,
      "components": Object.keys(result.components).map(name => ({
        name,
        confidence: result.components[name].confidence,
        source: result.components[name].source
      })),
      "validation": {
        "score": validation.score,
        "warnings": validation.warnings,
        "recommendations": validation.recommendations
      },
      "timestamp": new Date().toISOString(),
      "results": this.results
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }

  getUsedStrategy() {
    if (this.results.gpt && this.results.heuristic) return 'hybrid';
    if (this.results.gpt) return 'gpt-only';
    return 'heuristic-only';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI Usage
if (process.argv.length < 4) {
  console.log('Usage: node scripts/reliable_workflow.mjs <email.html> <template-name> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --force-gpt     Always use GPT analysis regardless of heuristic confidence');
  console.log('  --strategy=comprehensive   Use all available analysis methods');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/reliable_workflow.mjs emails/newsletter.html my-template');
  console.log('  node scripts/reliable_workflow.mjs emails/complex.html advanced --force-gpt');
  console.log('  OPENAI_API_KEY=xxx node scripts/reliable_workflow.mjs emails/email.html template');
  process.exit(1);
}

const htmlFile = process.argv[2];
const templateName = process.argv[3];
const options = {
  forceGPT: process.argv.includes('--force-gpt'),
  strategy: process.argv.find(arg => arg.startsWith('--strategy='))?.split('=')[1] || 'adaptive'
};

const workflow = new ReliableWorkflow();

workflow.decompose(htmlFile, templateName, options)
  .then(result => {
    console.log('\n🎯 Workflow Summary:');
    console.log(`   Template: ${result.template}`);
    console.log(`   Strategy: ${result.strategy}`);
    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`   Reliability: ${Math.round(result.reliability * 100)}%`);
    console.log(`   Components: ${result.components.join(', ')}`);
  })
  .catch(error => {
    console.error('❌ Workflow failed:', error.message);
    process.exit(1);
  });