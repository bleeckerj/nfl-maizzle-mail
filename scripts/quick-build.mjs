#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

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
const outputFile = args[2]; // Third arg: optional output file path

// Debug: show parsed arguments when DEBUG_QUICK_BUILD environment variable is set
if (process.env.DEBUG_QUICK_BUILD === '1') {
  console.log('DEBUG quick-build args:', { args, command, file, outputFile });
}

// Parse optional --outdir argument (legacy support)
let outDir = null;
for (const arg of args) {
  if (arg.startsWith('--outdir=')) {
    outDir = arg.split('=')[1];
  }
}

// Available templates: infer from directories under `templates/`.
// Quick-build will accept the directory-name as the template command.
const templates = {};
try {
  // Resolve templates directory relative to this file without relying on __dirname
  const templatesDir = path.resolve(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
  if (fs.existsSync(templatesDir)) {
    const dirs = fs.readdirSync(templatesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    dirs.forEach(dir => {
      templates[dir] = dir;
    });
  }
} catch (err) {
  if (process.env.DEBUG_QUICK_BUILD === '1') console.error('Template discovery failed:', err.message);
}

/**
 * Normalize an image entry to an HTTP(S) URL string if possible.
 */
function resolveImageEntryUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof entry === 'object') {
    if (typeof entry.src === 'string' && entry.src.trim().length) {
      return entry.src.trim();
    }
    if (typeof entry.image === 'string' && entry.image.trim().length) {
      return entry.image.trim();
    }
  }
  return null;
}

/**
 * Check if an image URL exists and is accessible
 */
function checkImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve({ valid: false, error: 'URL missing' });
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      resolve({ valid: false, error: 'URL empty' });
      return;
    }

    const client = trimmed.startsWith('https:') ? https : http;
    
    const req = client.request(trimmed, { method: 'HEAD', timeout: 5000 }, (res) => {
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

  const formatSectionReference = (section, sectionIndex) => {
    const sectionType = section?.type ? String(section.type) : 'unknown-type';
    const sectionTitle = section?.title ? String(section.title) : null;
    return sectionTitle
      ? `Section "${sectionTitle}" (${sectionType})`
      : `Section ${sectionIndex + 1} (${sectionType})`;
  };

  const formatItemReference = (item, itemIndex) => {
    const itemTitle = item?.title ? String(item.title) : null;
    return itemTitle
      ? `item ${itemIndex + 1} "${itemTitle}"`
      : `item ${itemIndex + 1}`;
  };

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
          const singleImageUrl = resolveImageEntryUrl(item.image);
          if (singleImageUrl) {
            totalImages++;
            const result = await checkImageUrl(singleImageUrl);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, ${formatItemReference(item, itemIndex)}: ${singleImageUrl} (${result.error || result.status})`);
            }
          } else if (item.image) {
            totalImages++;
            errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, ${formatItemReference(item, itemIndex)}: ${JSON.stringify(item.image)} (URL missing)`);
          }
          
          // Check multiple images (for aesthetically-pleasing section)
          if (item.images && Array.isArray(item.images)) {
            for (let imgIndex = 0; imgIndex < item.images.length; imgIndex++) {
              const imageEntry = item.images[imgIndex];
              const imageUrl = resolveImageEntryUrl(imageEntry);
              if (imageUrl) {
                totalImages++;
                const result = await checkImageUrl(imageUrl);
                if (result.valid) {
                  validImages++;
                } else {
                  errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1}, image ${imgIndex + 1}: ${imageUrl} (${result.error || result.status})`);
                }
              } else {
                totalImages++;
                errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1}, image ${imgIndex + 1}: ${JSON.stringify(imageEntry)} (URL missing)`);
              }
            }
          }
          
          // Check GIF
          if (item.gif) {
            totalImages++;
            console.log('Checking GIF URL:', item.gif);
            const result = await checkImageUrl(item.gif);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ ${formatSectionReference(section, sectionIndex)}, item ${itemIndex + 1} GIF: ${item.gif} (${result.error || result.status})`);
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

// Resolve directory of *this* script reliably
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note: we intentionally avoid importing build-newsletter.mjs here because importing
// it will execute its top-level code with the current process.argv. Instead we call
// it via a separate node process below (execSync) so argument parsing runs in that
// subprocess and doesn't interfere with quick-build's flow.

// Handle different commands
// Command dispatch: allow 'list' and discovered template names
if (command === 'list') {
  console.log('📄 Available content files:');
  const files = listContentFiles();
  files.forEach(file => console.log(`  - ${file}`));

} else if (command && templates[command]) {
  const template = templates[command];
  const inputFile = resolveInputPath(file);
  const outputName = path.basename(inputFile, '.md');

  console.log(`🚀 Quick Build: ${command} template`);
  console.log(`📄 File: ${inputFile}`);
  console.log(`🎨 Template: ${template}`);
  if (outputFile) {
    console.log(`💾 Output file: ${outputFile}`);
  } else if (outDir) {
    console.log(`📂 Output directory: ${outDir}`);
  }

  try {
    const repoRoot = path.resolve(__dirname, '..');
    const templateStylesPath = path.join(repoRoot, 'templates', template, 'section-styles.json');
    if (fs.existsSync(templateStylesPath)) {
      console.log(`🗂  Template-specific section styles detected: ${templateStylesPath}`);
    } else {
      const defaultStyles = path.join(repoRoot, 'data', 'section-styles.json');
      console.log(`🗂  Using default section styles unless overridden in content: ${defaultStyles}`);
    }

    const buildNewsletterPath = join(__dirname, 'build-newsletter.mjs');
    // For markdown files, don't force template - let frontmatter take precedence
    // For JSON files, force the template
    const isMd = inputFile.endsWith('.md');
    const templateArg = isMd ? '' : `--template=${template}`;
    const execCmd = `node ${buildNewsletterPath} ${inputFile} ${outputName} ${templateArg}`.trim();
    console.log(`\nExecuting: ${execCmd}\n`);
    execSync(execCmd, {
      stdio: 'inherit',
      cwd: repoRoot
    });

    // Handle output file path (third argument takes precedence)
    const srcPath = path.join(repoRoot, 'build_production', `${outputName}.html`);
    
    if (outputFile) {
      // Third argument: treat as output file path or directory relative to CWD
      let destPath = path.resolve(process.cwd(), outputFile);
      
      // If output path ends with / or is an existing directory, append the filename
      if (outputFile.endsWith('/') || outputFile.endsWith(path.sep) || 
          (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory())) {
        destPath = path.join(destPath, `${outputName}.html`);
      }
      
      const destDir = path.dirname(destPath);
      
      if (process.env.DEBUG_QUICK_BUILD === '1') {
        console.log('DEBUG output paths:', { 
          srcPath, 
          destPath, 
          destDir,
          cwd: process.cwd(),
          outputFile 
        });
      }
      
      if (!fs.existsSync(destDir)) {
        console.log(`Creating directory: ${destDir}`);
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Output file saved to: ${destPath}`);
    } else if (outDir) {
      // Legacy --outdir support
      const destDir = path.resolve(outDir);
      const destPath = path.join(destDir, `${outputName}.html`);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Output file copied to: ${destPath}`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }

} else {
  console.log('🚀 Quick Build Tool');
  console.log('');
  console.log('Usage:');
  console.log('  npm run quick <template-dir> [file]   # Build using a template directory under templates/');
  console.log('  npm run quick list                    # List available content files');
  console.log('');
  console.log('Available templates:');
  Object.keys(templates).forEach(t => console.log(`  - ${t}`));
  console.log('');
  console.log('File Path Support:');
  console.log('  • Absolute paths: /full/path/to/content.md');
  console.log('  • Relative paths: ../other-project/content.md');
  console.log('  • Local content: content/my-file.md');
  console.log('');
  console.log('Examples:');
  console.log('  npm run quick dense-discovery generated/dense-discovery-sample.md');
  console.log('  npm run quick wirecutter content/my-article.md');
  console.log('');
  process.exit(1);
}
