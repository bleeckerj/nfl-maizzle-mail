#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('📧 Newsletter Builder');
  console.log('Usage: node scripts/build-newsletter.mjs <file> [output-name] [options]');
  console.log('');
  console.log('Examples:');
  console.log('  # From JSON data file:');
  console.log('  node scripts/build-newsletter.mjs brain-dead-20251007.json');
  console.log('  node scripts/build-newsletter.mjs sentiers-20251007.json sentiers-latest');
  console.log('');
  console.log('  # From Markdown content file:');
  console.log('  node scripts/build-newsletter.mjs content/2025-10-07.md');
  console.log('  node scripts/build-newsletter.mjs content/holiday-2025.md holiday-campaign --template=wirecutter');
  console.log('');
  console.log('Options:');
  console.log('  --template=<name>    Specify template (wirecutter, brain-dead-template, sentiers-llm)');
  console.log('  --no-open           Don\'t auto-open the built newsletter');
  console.log('');
  console.log('Available files:');
  
  // List available data files
  const dataDir = 'data/';
  const dataFiles = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('newsletter.json'))
    .sort();
  
  console.log('  📄 JSON Data Files:');
  dataFiles.forEach(file => {
    console.log(`    - ${file}`);
  });
  
  // List available markdown files
  const contentDir = 'content/';
  if (fs.existsSync(contentDir)) {
    const mdFiles = fs.readdirSync(contentDir)
      .filter(file => file.endsWith('.md'))
      .sort();
    
    if (mdFiles.length > 0) {
      console.log('  📝 Markdown Content Files:');
      mdFiles.forEach(file => {
        console.log(`    - content/${file}`);
      });
    }
  }
  
  process.exit(1);
}

// Filter out template arguments
const fileArgs = args.filter(arg => !arg.startsWith('--'));
const inputFile = fileArgs[0];
const outputName = fileArgs[1] || path.basename(inputFile, path.extname(inputFile));

// Determine if input is Markdown or JSON
const isMarkdown = inputFile.endsWith('.md');
const isJson = inputFile.endsWith('.json');

if (!isMarkdown && !isJson) {
  console.error(`❌ File must be .md or .json: ${inputFile}`);
  process.exit(1);
}

// Set up paths
let inputPath;
if (isMarkdown) {
  inputPath = inputFile.startsWith('content/') ? inputFile : path.join('content', inputFile);
} else {
  inputPath = inputFile.startsWith('data/') ? inputFile : path.join('data', inputFile);
}

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  process.exit(1);
}

console.log('📧 Building Newsletter');
console.log('════════════════════');
console.log(`📄 Input: ${inputPath}`);
console.log(`🏗️  Output: ${outputName}.html`);

try {
  let templateName = 'wirecutter'; // default
  
  if (isMarkdown) {
    // Handle Markdown workflow
    console.log('📝 Converting Markdown to JSON...');
    
    // Extract template from command line args or default
    const templateArg = args.find(arg => arg.startsWith('--template='));
    if (templateArg) {
      templateName = templateArg.split('=')[1];
    }
    
    // Run markdown to JSON conversion with error handling
    try {
      execSync(`node scripts/md_to_json.mjs ${inputPath} data/newsletter.json --template=${templateName}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Verify the conversion worked
      if (!fs.existsSync('data/newsletter.json')) {
        throw new Error('Markdown conversion failed - newsletter.json not created');
      }
      
      // After conversion, ensure the template is set correctly in the JSON
      const newsletterData = JSON.parse(fs.readFileSync('data/newsletter.json', 'utf8'));
      newsletterData.template = templateName;
      fs.writeFileSync('data/newsletter.json', JSON.stringify(newsletterData, null, 2));
      
      console.log('✅ Markdown converted successfully');
      
    } catch (conversionError) {
      console.error('❌ Markdown conversion failed:', conversionError.message);
      throw conversionError;
    }
    
  } else {
    // Handle JSON workflow
    console.log('📋 Using JSON data file...');
    
    // Read the data to get template info
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    templateName = data.template || 'wirecutter';
    
    // Copy data file to newsletter.json
    fs.copyFileSync(inputPath, 'data/newsletter.json');
  }
  
  console.log(`🎨 Template: ${templateName}`);
  console.log('');

  // Build the newsletter
  console.log('🔨 Building newsletter...');
  const buildResult = execSync('npm run build:data', { stdio: 'inherit' });

  // Verify the build worked
  if (!fs.existsSync('build_production/newsletter.html')) {
    throw new Error('Maizzle build failed - newsletter.html not created');
  }

  // Rename output file
  const outputPath = `build_production/${outputName}.html`;
  console.log(`📦 Saving as ${outputPath}...`);
  fs.copyFileSync('build_production/newsletter.html', outputPath);

  console.log('');
  console.log('✅ Newsletter Built Successfully!');
  console.log('═══════════════════════════════');
  console.log(`📧 File: ${outputPath}`);
  console.log(`🎨 Template: ${templateName}`);
  console.log(`📄 Source: ${inputPath}`);
  
  // Check for --no-open flag
  const noOpenFlag = args.includes('--no-open');
  if (!noOpenFlag) {
    console.log('');
    console.log('🌐 Opening newsletter...');
    try {
      execSync(`open ${outputPath}`, { stdio: 'ignore' });
    } catch (openError) {
      console.log('⚠️  Could not auto-open file (you can open it manually)');
    }
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}