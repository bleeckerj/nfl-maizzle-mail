#!/usr/bin/env node

/**
 * Email Template Factory v2.0
 * 
 * A robust, multi-model email decomposition tool that transforms HTML emails
 * into reusable Maizzle template systems.
 * 
 * Features:
 * - Multi-stage analysis pipeline
 * - Support for multiple LLM providers (OpenAI, Anthropic)
 * - Chain-of-thought prompting with structured outputs
 * - Deep component extraction with style preservation
 * - Dynamic section-type discovery
 * - Validation pipeline with build testing
 * 
 * Usage:
 *   node scripts/email-template-factory/index.mjs <html-file> <template-name> [options]
 * 
 * Options:
 *   --provider=openai|anthropic   LLM provider (default: anthropic)
 *   --model=<model-name>          Specific model to use
 *   --validate                    Run validation after generation
 *   --verbose                     Show detailed output
 *   --verify                      Test API connection and exit
 *   --list-models                 Show available models for provider
 */

import { EmailTemplateFactory } from './lib/factory.mjs';
import { LLMClient } from './lib/llm-client.mjs';
import { Validator } from './lib/validator.mjs';
import { parseArgs } from './lib/cli.mjs';
import path from 'path';

function showHelp() {
  console.log(`
📧 Email Template Factory v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transform HTML emails into reusable Maizzle template systems.

Usage:
  node scripts/email-template-factory/index.mjs <html-file> <template-name> [options]

  # Validate existing template
  node scripts/email-template-factory/index.mjs --validate-only <template-name>

Arguments:
  <html-file>       Path to the HTML email file to decompose
  <template-name>   Name for the generated template

Options:
  --provider=<name>    LLM provider: openai, anthropic (default: anthropic)
  --model=<name>       Specific model to use
  --validate           Run build validation after generation
  --validate-only      Validate an existing template (no generation)
  --keep-test-files    Keep validation test files for debugging
  --verbose, -v        Show detailed analysis output
  --verify             Test API connection and exit
  --list-models        Show available models for the selected provider
  --help, -h           Show this help message

Environment Variables:
  OPENAI_API_KEY       Required for --provider=openai
  ANTHROPIC_API_KEY    Required for --provider=anthropic

Examples:
  # Basic usage with Anthropic (default)
  node scripts/email-template-factory/index.mjs emails/newsletter.html my-newsletter

  # Generate and validate
  node scripts/email-template-factory/index.mjs emails/newsletter.html my-newsletter --validate

  # Validate an existing template
  node scripts/email-template-factory/index.mjs --validate-only dense-discovery

  # Use OpenAI GPT-4o
  node scripts/email-template-factory/index.mjs emails/promo.html promo --provider=openai

  # Verify API connection
  node scripts/email-template-factory/index.mjs --verify --provider=anthropic

  # List available models
  node scripts/email-template-factory/index.mjs --list-models --provider=openai
`);
}

async function listModels(provider) {
  console.log(`\\n📋 Available models for ${provider}:\\n`);
  const client = new LLMClient(provider);
  const models = client.getAvailableModels();
  
  for (const model of models) {
    console.log(`  ${model.id}`);
    console.log(`     ${model.description}\\n`);
  }
}

async function verifyConnection(provider, model) {
  console.log(`\n🔌 Verifying ${provider} API connection...`);
  
  const client = new LLMClient(provider, model);
  
  try {
    await client.initialize();
    console.log(`   ✓ Client initialized with model: ${client.modelName}`);
    
    console.log('   Testing API call...');
    const result = await client.verifyConnection();
    
    if (result.success) {
      console.log(`   ✓ API connection successful!\n`);
      return true;
    } else {
      console.error(`   ✗ API test failed: ${result.error}\n`);
      return false;
    }
  } catch (error) {
    console.error(`   ✗ Initialization failed: ${error.message}\n`);
    return false;
  }
}

async function validateExistingTemplate(templateName, keepTestFiles = false) {
  const templateDir = path.resolve(`templates/${templateName}`);
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           🧪 Template Validation                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📁 Template: ${templateName}`);
  console.log(`📂 Path: ${templateDir}`);
  console.log('');

  const validator = new Validator();
  const result = await validator.validate(templateDir, templateName);
  
  // Save validation report
  const reportPath = path.join(templateDir, 'validation-report.json');
  validator.saveReport(reportPath);
  
  // Cleanup unless --keep-test-files
  if (!keepTestFiles) {
    await validator.cleanup();
  } else {
    console.log('   📝 Test files kept for debugging');
  }
  
  return result.passed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  // Handle --list-models
  if (args.listModels) {
    await listModels(args.provider);
    process.exit(0);
  }
  
  // Handle --verify
  if (args.verify) {
    const success = await verifyConnection(args.provider, args.model);
    process.exit(success ? 0 : 1);
  }
  
  // Handle --validate-only
  if (args.validateOnly) {
    if (args._.length < 1) {
      console.error('Error: Template name required for --validate-only');
      console.error('Usage: --validate-only <template-name>');
      process.exit(1);
    }
    const templateName = args._[0];
    const passed = await validateExistingTemplate(templateName, args.keepTestFiles);
    process.exit(passed ? 0 : 1);
  }
  
  // Handle --help or missing arguments for generation
  if (args.help || args._.length < 2) {
    showHelp();
    process.exit(args.help ? 0 : 1);
  }

  const [htmlFile, templateName] = args._;
  
  const factory = new EmailTemplateFactory({
    provider: args.provider || 'anthropic',
    model: args.model,
    validate: args.validate || false,
    verbose: args.verbose || false,
    keepTestFiles: args.keepTestFiles || false
  });

  try {
    const result = await factory.process(htmlFile, templateName);
    
    console.log('\n✅ Template generation complete!');
    console.log(`📁 Output: ./templates/${templateName}/`);
    
    if (result.validation) {
      console.log(`🧪 Validation: ${result.validation.passed ? 'PASSED' : 'FAILED'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
