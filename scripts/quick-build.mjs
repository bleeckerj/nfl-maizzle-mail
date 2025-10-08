#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Quick build shortcuts for common workflows
 * Usage: 
 *   npm run quick:build
 *   npm run quick:wirecutter content/my-file.md
 */

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const file = args[1];

// Available templates
const templates = {
  'wirecutter': 'wirecutter',
  'brain-dead': 'brain-dead-template', 
  'sentiers': 'sentiers-llm',
  'sentiers-reliable': 'sentiers-reliable',
  'atlantic': 'atlantic-complete'
};

function listContentFiles() {
  const contentDir = 'content/';
  if (!fs.existsSync(contentDir)) {
    console.log('❌ No content directory found');
    return [];
  }
  
  return fs.readdirSync(contentDir)
    .filter(file => file.endsWith('.md'))
    .sort();
}

function selectFile() {
  const files = listContentFiles();
  
  if (files.length === 0) {
    console.log('❌ No markdown files found in content/');
    process.exit(1);
  }
  
  if (files.length === 1) {
    return `content/${files[0]}`;
  }
  
  console.log('📄 Available content files:');
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  
  // For now, just use the first one (in a real CLI you'd prompt user)
  console.log(`\n🎯 Using: ${files[0]}`);
  return `content/${files[0]}`;
}

// Handle different commands
switch (command) {
  case 'wirecutter':
  case 'brain-dead':
  case 'sentiers':
  case 'sentiers-reliable':
  case 'atlantic':
    const template = templates[command];
    const inputFile = file || selectFile();
    const outputName = path.basename(inputFile, '.md');
    
    console.log(`🚀 Quick Build: ${command} template`);
    console.log(`📄 File: ${inputFile}`);
    console.log(`🎨 Template: ${template}`);
    
    try {
      execSync(`node scripts/build-newsletter.mjs ${inputFile} ${outputName} --template=${template}`, { 
        stdio: 'inherit' 
      });
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
    break;
    
  case 'list':
    console.log('📄 Available content files:');
    const files = listContentFiles();
    files.forEach(file => console.log(`  - ${file}`));
    break;
    
  default:
    console.log('🚀 Quick Build Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npm run quick wirecutter [file]        # Build with wirecutter template');
    console.log('  npm run quick brain-dead [file]        # Build with brain-dead template');  
    console.log('  npm run quick sentiers [file]          # Build with sentiers template');
    console.log('  npm run quick sentiers-reliable [file] # Build with enhanced sentiers template');
    console.log('  npm run quick atlantic [file]          # Build with atlantic-complete template');
    console.log('  npm run quick list                     # List available content files');
    console.log('');
    console.log('Examples:');
    console.log('  npm run quick wirecutter                           # Auto-select file');
    console.log('  npm run quick wirecutter content/my-article.md     # Specific file');
    console.log('  npm run quick atlantic content/atlantic-future-work.md # Build Atlantic newsletter');
    console.log('  npm run quick sentiers-reliable                    # Test enhanced template');
    console.log('');
    process.exit(1);
}