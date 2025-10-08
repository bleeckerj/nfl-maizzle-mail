#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { program } from 'commander';

/**
 * Template Management Script
 * Handles creating, listing, and managing email templates
 */

const TEMPLATES_DIR = 'templates';
const DEFAULT_TEMPLATE = 'wirecutter';

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

/**
 * List all available templates
 */
function listTemplates() {
  const templates = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log('📧 Available Templates:');
  templates.forEach(template => {
    const isDefault = template === DEFAULT_TEMPLATE;
    console.log(`  ${isDefault ? '✅' : '📄'} ${template}${isDefault ? ' (default)' : ''}`);
  });
  
  if (templates.length === 0) {
    console.log('  No templates found. Create one with: npm run templates:create <name>');
  }
}

/**
 * Create a new blank template
 */
function createTemplate(name) {
  const templateDir = path.join(TEMPLATES_DIR, name);
  
  if (fs.existsSync(templateDir)) {
    console.error(`❌ Template "${name}" already exists`);
    process.exit(1);
  }
  
  // Create directory structure
  fs.mkdirSync(path.join(templateDir, 'components'), { recursive: true });
  fs.mkdirSync(path.join(templateDir, 'layouts'), { recursive: true });
  
  // Create basic main layout
  const mainLayout = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  <style>
    /* Add your email-safe CSS here */
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; }
    .content { padding: 20px; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
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
  
  // Create basic newsletter template
  const newsletterTemplate = `---
title: "{{ title }}"
---

<extends src="templates/${name}/layouts/main.html">
  <block name="template">
    
    <!-- Add your components here -->
    <div class="content">
      <h1>{{ title }}</h1>
      <p>Template: ${name}</p>
    </div>
    
  </block>
</extends>`;
  
  fs.writeFileSync(path.join(templateDir, 'newsletter.html'), newsletterTemplate);
  
  // Create basic schema
  const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": `${name.charAt(0).toUpperCase() + name.slice(1)} Template Schema`,
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Newsletter title"
      }
    },
    "required": ["title"]
  };
  
  fs.writeFileSync(path.join(templateDir, 'schema.json'), JSON.stringify(schema, null, 2));
  
  console.log(`✅ Created template "${name}"`);
  console.log(`📁 Location: ${templateDir}`);
  console.log(`🔧 Edit: ${path.join(templateDir, 'newsletter.html')}`);
}

/**
 * Copy an existing template
 */
function copyTemplate(from, to) {
  const fromDir = path.join(TEMPLATES_DIR, from);
  const toDir = path.join(TEMPLATES_DIR, to);
  
  if (!fs.existsSync(fromDir)) {
    console.error(`❌ Source template "${from}" not found`);
    process.exit(1);
  }
  
  if (fs.existsSync(toDir)) {
    console.error(`❌ Destination template "${to}" already exists`);
    process.exit(1);
  }
  
  // Recursively copy directory
  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDir(fromDir, toDir);
  console.log(`✅ Copied template "${from}" → "${to}"`);
}

/**
 * Get template info
 */
function getTemplateInfo(name) {
  const templateDir = path.join(TEMPLATES_DIR, name);
  
  if (!fs.existsSync(templateDir)) {
    console.error(`❌ Template "${name}" not found`);
    process.exit(1);
  }
  
  const schemaPath = path.join(templateDir, 'schema.json');
  const hasSchema = fs.existsSync(schemaPath);
  
  console.log(`📧 Template: ${name}`);
  console.log(`📁 Path: ${templateDir}`);
  console.log(`📋 Schema: ${hasSchema ? '✅' : '❌'}`);
  
  if (hasSchema) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    console.log(`📊 Title: ${schema.title || 'Unknown'}`);
  }
}

// CLI setup
program
  .name('template-manager')
  .description('Manage email templates');

program
  .command('list')
  .description('List all available templates')
  .action(listTemplates);

program
  .command('create <name>')
  .description('Create a new blank template')
  .action(createTemplate);

program
  .command('copy <from> <to>')
  .description('Copy an existing template')
  .action(copyTemplate);

program
  .command('info <name>')
  .description('Show template information')
  .action(getTemplateInfo);

program.parse();