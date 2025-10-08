#!/usr/bin/env node

import { program } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Email Template Workflow Manager
 * Orchestrates the complete email decomposition and template creation process
 */

const WORKFLOWS = {
  'quick': 'Fast heuristic analysis (good for simple emails)',
  'smart': 'GPT-4o analysis (best for complex emails)', 
  'interactive': 'Guided manual process',
  'compare': 'Run both heuristic and GPT analysis for comparison'
};

class WorkflowManager {
  constructor() {
    this.workingDir = process.cwd();
  }

  /**
   * Quick workflow using enhanced heuristic analysis
   */
  async runQuickWorkflow(inputFile, templateName) {
    console.log('🚀 Quick Workflow: Enhanced Heuristic Analysis');
    console.log('─'.repeat(50));

    try {
      // Run enhanced decomposition
      execSync(`node scripts/decompose_email_advanced.mjs "${inputFile}" "${templateName}" -s heuristic`, 
        { stdio: 'inherit' });

      console.log('\n✅ Quick workflow completed!');
      this.showNextSteps(templateName);
      
    } catch (error) {
      console.error('❌ Quick workflow failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Smart workflow using GPT-4o analysis
   */
  async runSmartWorkflow(inputFile, templateName) {
    console.log('🤖 Smart Workflow: GPT-4o Analysis');
    console.log('─'.repeat(50));

    try {
      // Step 1: Generate GPT prompts
      console.log('📝 Step 1: Generating GPT-4o prompts...');
      execSync(`node scripts/gpt_email_analyzer.mjs "${inputFile}"`, { stdio: 'inherit' });

      // Find the generated prompt files
      const promptFiles = fs.readdirSync('gpt-prompts')
        .filter(f => f.includes('email-analysis') && f.endsWith('-combined.json'))
        .sort()
        .pop(); // Get the latest

      if (!promptFiles) {
        throw new Error('No GPT prompt files generated');
      }

      const promptPath = path.join('gpt-prompts', promptFiles);
      const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf8'));

      console.log('\n🎯 Step 2: GPT-4o Analysis Required');
      console.log('─'.repeat(30));
      console.log('Please complete the GPT-4o analysis:');
      console.log(`\n📋 Copy this prompt to GPT-4o or your preferred AI tool:\n`);
      
      console.log('SYSTEM:', promptData.messages[0].content.substring(0, 200) + '...');
      console.log('\nUSER:', promptData.messages[1].content.substring(0, 200) + '...');
      
      console.log(`\n📄 Full prompts saved in: gpt-prompts/`);
      console.log(`🔗 API-ready format: ${promptPath}`);

      console.log('\n⚡ Quick options:');
      console.log('1. Use ChatGPT: Copy system + user prompts');
      console.log('2. Use API: POST the combined.json to OpenAI API');
      console.log('3. Use Claude: Copy prompts to Claude interface');

      console.log('\n💾 Next: Save GPT response as "gpt-analysis.json" and run:');
      console.log(`   node scripts/apply_gpt_analysis.mjs gpt-analysis.json ${templateName}`);

    } catch (error) {
      console.error('❌ Smart workflow failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Interactive workflow with user guidance
   */
  async runInteractiveWorkflow(inputFile, templateName) {
    console.log('👥 Interactive Workflow: Guided Analysis');
    console.log('─'.repeat(50));

    console.log('This workflow will guide you through email analysis step by step.\n');

    // First show the email structure
    try {
      const htmlContent = fs.readFileSync(inputFile, 'utf8');
      const elementCount = (htmlContent.match(/<[^>]+>/g) || []).length;
      const tableCount = (htmlContent.match(/<table/g) || []).length;
      const imageCount = (htmlContent.match(/<img/g) || []).length;

      console.log('📊 Email Analysis:');
      console.log(`   Elements: ${elementCount}`);
      console.log(`   Tables: ${tableCount} ${tableCount > 5 ? '(table-based layout)' : '(modern layout)'}`);
      console.log(`   Images: ${imageCount}`);

      console.log('\n🎯 Recommended approach:');
      if (tableCount > 10 && elementCount > 100) {
        console.log('   Complex email → Use Smart Workflow (GPT-4o)');
        console.log(`   Run: node scripts/email_workflow.mjs "${inputFile}" "${templateName}" --workflow=smart`);
      } else {
        console.log('   Simple email → Use Quick Workflow');
        console.log(`   Run: node scripts/email_workflow.mjs "${inputFile}" "${templateName}" --workflow=quick`);
      }

      console.log('\n🔄 For now, running Quick Workflow...');
      await this.runQuickWorkflow(inputFile, templateName);

    } catch (error) {
      console.error('❌ Interactive workflow failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Comparison workflow - run both methods
   */
  async runCompareWorkflow(inputFile, templateName) {
    console.log('⚖️  Compare Workflow: Heuristic vs GPT Analysis');
    console.log('─'.repeat(50));

    try {
      // Run heuristic analysis first
      console.log('1️⃣ Running heuristic analysis...');
      const heuristicTemplate = `${templateName}-heuristic`;
      execSync(`node scripts/decompose_email_advanced.mjs "${inputFile}" "${heuristicTemplate}" -s heuristic`, 
        { stdio: 'inherit' });

      console.log('\n2️⃣ Generating GPT-4o analysis prompts...');
      execSync(`node scripts/gpt_email_analyzer.mjs "${inputFile}"`, { stdio: 'inherit' });

      console.log('\n📊 Comparison Results:');
      console.log(`✅ Heuristic template: templates/${heuristicTemplate}/`);
      console.log('🤖 GPT prompts: gpt-prompts/ (run with GPT-4o)');

      console.log('\n🎯 Next Steps:');
      console.log('1. Review heuristic results');
      console.log('2. Run GPT-4o analysis using generated prompts');
      console.log('3. Compare both approaches');
      console.log(`4. Choose the best template or combine elements`);

    } catch (error) {
      console.error('❌ Compare workflow failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show next steps after template creation
   */
  showNextSteps(templateName) {
    console.log('\n🎯 Next Steps:');
    console.log('─'.repeat(20));
    console.log(`1. Review template: templates/${templateName}/`);
    console.log(`2. Edit sample content: content/${templateName}-sample.md`);
    console.log(`3. Test the template:`);
    console.log(`   ./workflow.sh content/${templateName}-sample.md ${templateName}`);
    console.log(`4. Build and preview:`);
    console.log(`   npm run build:data && open build_production/newsletter.html`);

    console.log('\n🔧 Customization:');
    console.log(`   • Edit components: templates/${templateName}/components/`);
    console.log(`   • Modify schema: templates/${templateName}/schema.json`);
    console.log(`   • Update layout: templates/${templateName}/layouts/main.html`);
  }

  /**
   * Validate template after creation
   */
  async validateTemplate(templateName) {
    const templateDir = path.join('templates', templateName);
    
    if (!fs.existsSync(templateDir)) {
      console.error(`❌ Template ${templateName} not found`);
      return false;
    }

    console.log(`🔍 Validating template: ${templateName}`);
    
    const required = [
      'newsletter.html',
      'schema.json',
      'layouts/main.html'
    ];

    const missing = required.filter(file => 
      !fs.existsSync(path.join(templateDir, file))
    );

    if (missing.length > 0) {
      console.error(`❌ Missing required files: ${missing.join(', ')}`);
      return false;
    }

    const componentCount = fs.readdirSync(path.join(templateDir, 'components')).length;
    console.log(`✅ Template valid: ${componentCount} components`);
    
    return true;
  }
}

// CLI setup
program
  .name('email-workflow')
  .description('Complete email decomposition workflow manager')
  .version('1.0.0');

program
  .argument('<input>', 'HTML email file to decompose')
  .argument('<template>', 'Template name to create')
  .option('-w, --workflow <type>', 'Workflow type', 'quick')
  .option('--validate', 'Validate template after creation')
  .action(async (input, template, options) => {
    
    if (!fs.existsSync(input)) {
      console.error(`❌ Input file not found: ${input}`);
      process.exit(1);
    }

    if (fs.existsSync(path.join('templates', template))) {
      console.error(`❌ Template "${template}" already exists`);
      process.exit(1);
    }

    console.log('🎨 Email Template Workflow Manager');
    console.log('═'.repeat(50));
    console.log(`📧 Input: ${input}`);
    console.log(`🏗️  Template: ${template}`);
    console.log(`⚡ Workflow: ${options.workflow} - ${WORKFLOWS[options.workflow] || 'Unknown'}`);
    console.log('');

    const manager = new WorkflowManager();

    try {
      switch (options.workflow) {
        case 'quick':
          await manager.runQuickWorkflow(input, template);
          break;
        case 'smart':
          await manager.runSmartWorkflow(input, template);
          break;
        case 'interactive':
          await manager.runInteractiveWorkflow(input, template);
          break;
        case 'compare':
          await manager.runCompareWorkflow(input, template);
          break;
        default:
          console.error(`❌ Unknown workflow: ${options.workflow}`);
          console.log(`Available workflows: ${Object.keys(WORKFLOWS).join(', ')}`);
          process.exit(1);
      }

      if (options.validate && fs.existsSync(path.join('templates', template))) {
        console.log('');
        await manager.validateTemplate(template);
      }

    } catch (error) {
      console.error('❌ Workflow failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-workflows')
  .description('List available workflows')
  .action(() => {
    console.log('📋 Available Workflows:');
    console.log('');
    Object.entries(WORKFLOWS).forEach(([name, desc]) => {
      console.log(`  ${name.padEnd(12)} ${desc}`);
    });
    console.log('');
    console.log('Usage: node scripts/email_workflow.mjs input.html template-name --workflow=<name>');
  });

program.parse();