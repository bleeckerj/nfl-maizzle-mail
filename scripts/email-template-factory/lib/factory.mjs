/**
 * Email Template Factory - Core orchestrator
 * 
 * Manages the multi-stage decomposition pipeline
 */

import fs from 'fs';
import path from 'path';
import { HTMLPreprocessor } from './preprocessor.mjs';
import { LLMClient } from './llm-client.mjs';
import { TemplateGenerator } from './template-generator.mjs';
import { Validator } from './validator.mjs';
import { ReferenceAnalyzer } from './reference-analyzer.mjs';
import { SectionTypeReconciler } from './section-type-reconciler.mjs';

export class EmailTemplateFactory {
  constructor(options = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model;
    this.validate = options.validate || false;
    this.verbose = options.verbose || false;
    
    this.llm = null;
    this.preprocessor = new HTMLPreprocessor();
    this.generator = new TemplateGenerator();
    this.validator = new Validator();
    this.referenceAnalyzer = new ReferenceAnalyzer();
    this.reconciler = new SectionTypeReconciler();
    
    // Convention context from reference templates
    this.conventions = null;
  }

  log(message, level = 'info') {
    if (level === 'verbose' && !this.verbose) return;
    console.log(message);
  }

  async process(htmlFile, templateName) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           📧 Email Template Factory v2.0                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📄 Source:   ${htmlFile}`);
    console.log(`🏷️  Template: ${templateName}`);
    console.log(`🤖 Provider: ${this.provider}`);
    console.log('');

    // Initialize LLM client
    this.llm = new LLMClient(this.provider, this.model);
    await this.llm.initialize();

    // Analyze existing templates to learn conventions
    this.conventions = await this.referenceAnalyzer.analyze();
    const conventionsSummary = this.referenceAnalyzer.generateConventionsSummary();

    // Read and preprocess HTML
    const htmlContent = this.readHTML(htmlFile);
    const preprocessed = this.preprocessor.process(htmlContent);
    
    this.log(`📊 HTML Stats: ${preprocessed.stats.elements} elements, ${preprocessed.stats.tables} tables, ${preprocessed.stats.images} images`);
    this.log('');

    // Run multi-stage analysis with conventions context
    const analysis = await this.runAnalysisPipeline(preprocessed, conventionsSummary);

    // Generate template files
    const templateDir = await this.generator.generate(templateName, analysis, preprocessed);

    // Validate if requested
    let validationResult = null;
    if (this.validate) {
      validationResult = await this.validator.validate(templateDir, templateName);
      
      // Save validation report
      const reportPath = path.join(templateDir, 'validation-report.json');
      this.validator.saveReport(reportPath);
      
      // Cleanup test files
      await this.validator.cleanup();
    }

    // Save analysis report
    this.saveAnalysisReport(templateDir, analysis, preprocessed);

    return {
      templateDir,
      analysis,
      validation: validationResult
    };
  }

  readHTML(htmlFile) {
    if (!fs.existsSync(htmlFile)) {
      throw new Error(`File not found: ${htmlFile}`);
    }
    return fs.readFileSync(htmlFile, 'utf8');
  }

  async runAnalysisPipeline(preprocessed, conventionsSummary) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    ANALYSIS PIPELINE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Stage 1: Visual Design Analysis
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STAGE 1: Visual Design Analysis                            │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    const visualDesign = await this.llm.analyzeVisualDesign(preprocessed);
    console.log(`   ✓ Colors: ${visualDesign.colorPalette?.allColors?.length || 0} extracted`);
    console.log(`   ✓ Fonts: ${visualDesign.typography?.headingFont || 'detected'}`);
    console.log(`   ✓ Images: ${visualDesign.images?.length || 0} catalogued`);
    console.log('');

    // Stage 2: Structural Analysis
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STAGE 2: Structural Analysis                               │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    const structure = await this.llm.analyzeStructure(preprocessed, visualDesign);
    console.log(`   ✓ Sections: ${structure.sections?.length || 0} identified`);
    console.log(`   ✓ Repeating patterns: ${structure.repeatingSections?.length || 0}`);
    console.log(`   ✓ Section types: ${structure.sectionTypes?.map(s => s.name).join(', ') || 'discovered'}`);
    console.log('');

    // Stage 2.5: Section Type Reconciliation
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STAGE 2.5: Section Type Reconciliation                     │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    this.reconciler.setKnownTypes(this.conventions);
    const reconciliation = this.reconciler.reconcile(structure);
    console.log(`   ✓ ${reconciliation.summary.message}`);
    if (reconciliation.novelTypes.length > 0) {
      console.log(`   📦 Novel types to create: ${reconciliation.novelTypes.map(t => t.name).join(', ')}`);
    }
    console.log('');

    // Generate context for novel types
    const novelTypesContext = this.reconciler.generateNovelTypesContext();

    // Stage 3: Content Extraction
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STAGE 3: Content Extraction                                │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    const content = await this.llm.extractContent(preprocessed, structure);
    console.log(`   ✓ Email type: ${content.emailType}`);
    console.log(`   ✓ Sample data fields: ${Object.keys(content.sampleData || {}).length}`);
    console.log('');

    // Stage 4: Component Deep Extraction (with conventions + novel types)
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STAGE 4: Component Deep Extraction                         │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    const enrichedConventions = conventionsSummary + novelTypesContext;
    const components = await this.llm.extractComponents(preprocessed, structure, visualDesign, enrichedConventions);
    console.log(`   ✓ Components: ${components.components?.length || 0} extracted`);
    console.log(`   ✓ Layout: ${components.layout ? 'generated' : 'pending'}`);
    console.log('');

    return {
      visualDesign,
      structure,
      content,
      components,
      reconciliation,
      metadata: {
        analysisDate: new Date().toISOString(),
        provider: this.provider,
        model: this.llm.modelName
      }
    };
  }

  saveAnalysisReport(templateDir, analysis, preprocessed) {
    const report = {
      ...analysis,
      sourceStats: preprocessed.stats,
      generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(templateDir, 'analysis-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Also save a human-readable reconciliation summary
    if (analysis.reconciliation?.novelTypes?.length > 0) {
      const novelSummary = this.generateNovelTypesSummary(analysis.reconciliation);
      fs.writeFileSync(
        path.join(templateDir, 'novel-types.md'),
        novelSummary
      );
      this.log(`📝 Novel types documentation saved to ${templateDir}/novel-types.md`);
    }
    
    this.log(`💾 Analysis report saved to ${templateDir}/analysis-report.json`);
  }

  generateNovelTypesSummary(reconciliation) {
    let summary = `# Novel Section Types

This template contains section types that were not found in reference templates.
These components were created specifically for this email design.

## Summary
${reconciliation.summary.message}

`;

    for (const type of reconciliation.novelTypes) {
      summary += `## ${type.name}

- **Description**: ${type.description || 'Extracted from source email'}
- **Is Repeating**: ${type.isRepeating ? 'Yes' : 'No'}
${type.isVariant ? `- **Similar to**: ${type.variantOf}` : '- **Status**: Completely new pattern'}

### Variables
${type.variables?.map(v => `- \`${v.name}\` (${v.type}) - ${v.description || 'No description'}`).join('\n') || 'None defined'}

### HTML Structure
\`${type.containerStructure || 'See component file'}\`

---

`;
    }

    summary += `
## Usage

These novel types work the same as standard types in your content files:

\`\`\`yaml
sections:
- type: ${reconciliation.novelTypes[0]?.name || 'novel-type-name'}
  # ... section data
\`\`\`

If you want to reuse these types in other templates, copy the corresponding 
component files to your shared components directory.
`;

    return summary;
  }
}
