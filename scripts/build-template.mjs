#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: node scripts/build-template.mjs --template=<template-name>');
  console.log('Or: npm run build:data -- --template=<template-name>');
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
let templateName;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--template=')) {
    templateName = a.split('=')[1];
  } else if (a === '--template') {
    templateName = args[i+1];
    i++;
  }
}

if (!templateName) usage();

const root = process.cwd();
const templateDir = path.join(root, 'templates', templateName);
const dataFile = path.join(root, 'data', `${templateName}.json`);

if (!fs.existsSync(templateDir)) {
  console.error(`❌ Template not found: templates/${templateName}`);
  process.exit(1);
}

if (!fs.existsSync(dataFile)) {
  console.error(`❌ Data file not found: data/${templateName}.json`);
  process.exit(1);
}

console.log(`🔨 Building template: ${templateName}`);
console.log(`📁 Template dir: ${templateDir}`);
console.log(`📄 Data file: ${dataFile}`);

// Run maizzle build with TEMPLATE in the env so config.production.js can read it
const env = { ...process.env, TEMPLATE: templateName };
try {
  execSync('maizzle build production', { stdio: 'inherit', env });
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(err.status || 1);
}
