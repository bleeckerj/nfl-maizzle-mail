#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

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

// Parse optional --outdir argument
let outDir = null;
for (const arg of args) {
  if (arg.startsWith('--outdir=')) {
    outDir = arg.split('=')[1];
  }
}

// Available templates
const templates = {
  'wirecutter': 'wirecutter',
  'brain-dead': 'brain-dead-template', 
  'sentiers': 'sentiers-llm',
  'sentiers-reliable': 'sentiers-reliable',
  'atlantic': 'atlantic-complete',
  'dense-discovery': 'dense-discovery',
  'coda': 'coda'
};

/**
 * Check if an image URL exists and is accessible
 */
function checkImageUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      const isValid = res.statusCode >= 200 && res.statusCode < 400;
      resolve({ valid: isValid, status: res.statusCode });
    });
    
    req.on('error', (error) => {
      resolve({ valid: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, error: 'Request timeout' });
    });
    
    req.end();
  });
}

/**
 * Validate all images in newsletter data
 */
async function validateImages(data) {
  const errors = [];
  let totalImages = 0;
  let validImages = 0;

  console.log('🔍 Validating image URLs...');

  // Check header images
  if (data.header?.featuredImage) {
    totalImages++;
    const result = await checkImageUrl(data.header.featuredImage);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header featured image: ${data.header.featuredImage} (${result.error || result.status})`);
    }
  }

  if (data.header?.logoTop) {
    totalImages++;
    const result = await checkImageUrl(data.header.logoTop);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header logo top: ${data.header.logoTop} (${result.error || result.status})`);
    }
  }

  if (data.header?.logoBottom) {
    totalImages++;
    const result = await checkImageUrl(data.header.logoBottom);
    if (result.valid) {
      validImages++;
    } else {
      errors.push(`❌ Header logo bottom: ${data.header.logoBottom} (${result.error || result.status})`);
    }
  }

  // Check section images
  if (data.sections) {
    for (let sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex++) {
      const section = data.sections[sectionIndex];
      
      if (section.items) {
        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];
          
          // Check single image
          if (item.image) {
            totalImages++;
            const result = await checkImageUrl(item.image);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1} "${item.title}": ${item.image} (${result.error || result.status})`);
            }
          }
          
          // Check multiple images (for aesthetically-pleasing section)
          if (item.images && Array.isArray(item.images)) {
            for (let imgIndex = 0; imgIndex < item.images.length; imgIndex++) {
              const imageUrl = item.images[imgIndex];
              totalImages++;
              const result = await checkImageUrl(imageUrl);
              if (result.valid) {
                validImages++;
              } else {
                errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1}, image ${imgIndex + 1}: ${imageUrl} (${result.error || result.status})`);
              }
            }
          }
          
          // Check GIF
          if (item.gif) {
            totalImages++;
            const result = await checkImageUrl(item.gif);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1} GIF: ${item.gif} (${result.error || result.status})`);
            }
          }
        }
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.log(`\n⚠️  Image Validation Results: ${validImages}/${totalImages} images valid\n`);
    errors.forEach(error => console.log(error));
    console.log('');
  } else if (totalImages > 0) {
    console.log(`✅ All ${totalImages} images validated successfully`);
  }

  return { totalImages, validImages, errors };
}

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

/**
 * Resolve input file path - handles both absolute and relative paths
 */
function resolveInputPath(inputPath) {
  if (!inputPath) {
    return selectFile();
  }
  
  // If it's an absolute path, use it directly
  if (path.isAbsolute(inputPath)) {
    if (fs.existsSync(inputPath)) {
      return inputPath;
    } else {
      console.error(`❌ File not found: ${inputPath}`);
      process.exit(1);
    }
  }
  
  // If it's a relative path, resolve it relative to current directory
  const resolvedPath = path.resolve(inputPath);
  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }
  
  // Also try relative to content/ directory for backwards compatibility
  const contentPath = path.resolve(`content/${inputPath}`);
  if (fs.existsSync(contentPath)) {
    return contentPath;
  }
  
  console.error(`❌ File not found: ${inputPath}`);
  console.error(`   Tried: ${resolvedPath}`);
  console.error(`   Tried: ${contentPath}`);
  process.exit(1);
}

function selectFile() {
  const files = listContentFiles();
  
  if (files.length === 0) {
    console.log('❌ No markdown files found in content/');
    process.exit(1);
  }
  
  if (files.length === 1) {
    return path.resolve(`content/${files[0]}`);
  }
  
  console.log('📄 Available content files:');
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  
  // For now, just use the first one (in a real CLI you'd prompt user)
  console.log(`\n🎯 Using: ${files[0]}`);
  return path.resolve(`content/${files[0]}`);
}

// Handle different commands
switch (command) {
  case 'wirecutter':
  case 'brain-dead':
  case 'sentiers':
  case 'sentiers-reliable':
  case 'atlantic':
  case 'dense-discovery':
  case 'coda':
    const template = templates[command];
    const inputFile = resolveInputPath(file);
    const outputName = path.basename(inputFile, '.md');

    console.log(`🚀 Quick Build: ${command} template`);
    console.log(`📄 File: ${inputFile}`);
    console.log(`🎨 Template: ${template}`);
    if (outDir) {
      console.log(`📂 Output directory: ${outDir}`);
    }

    try {
      execSync(`node scripts/build-newsletter.mjs ${inputFile} ${outputName} --template=${template}`, {
        stdio: 'inherit'
      });

      // Move the built HTML file to the output directory if specified
      if (outDir) {
        const srcPath = path.join('build_production', `${outputName}.html`);
        const destDir = path.resolve(outDir);
        const destPath = path.join(destDir, `${outputName}.html`);

        // Ensure output directory exists
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Output file copied to: ${destPath}`);
      }
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
    console.log('  npm run quick dense-discovery [file]   # Build with modular dense-discovery template');
    console.log('  npm run quick coda [file]              # Build with coda template');
    console.log('  npm run quick list                     # List available content files');
    console.log('');
    console.log('File Path Support:');
    console.log('  • Absolute paths: /full/path/to/content.md');
    console.log('  • Relative paths: ../other-project/content.md');
    console.log('  • Local content: content/my-file.md');
    console.log('');
    console.log('Examples:');
    console.log('  npm run quick wirecutter                           # Auto-select file');
    console.log('  npm run quick wirecutter content/my-article.md     # Local content file');
    console.log('  npm run quick atlantic /Users/me/other/newsletter.md # Absolute path');
    console.log('  npm run quick dense-discovery ../cms/content/issue-79.md # Relative path');
    console.log('  npm run quick sentiers-reliable                    # Test enhanced template');
    console.log('');
    process.exit(1);
}