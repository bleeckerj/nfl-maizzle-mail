#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

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
 * Convert hex color to ANSI RGB background color
 */
function hexToAnsiBackground(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Return ANSI RGB background color code
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * Generate dynamic CSS classes for section styles
 */
function generateSectionStylesCSS(sectionStyles, theme) {
  if (!sectionStyles || !sectionStyles.sectionStyles) return '';
  
  let cssOutput = '\n    /* Dynamic section styles generated from configuration */\n';
  
  Object.entries(sectionStyles.sectionStyles).forEach(([sectionType, config]) => {
    const className = `${sectionType}-section`;
    
    // Generate container styles
    cssOutput += `    .${className} {\n`;
    if (config.containerStyles) {
      Object.entries(config.containerStyles).forEach(([property, value]) => {
        if (value !== null) {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value};\n`;
        }
      });
    }
    cssOutput += `    }\n\n`;
    
    // Generate content styles (applies to all child elements)
    cssOutput += `    .${className}, .${className} * {\n`;
    if (config.contentStyles) {
      Object.entries(config.contentStyles).forEach(([property, value]) => {
        if (value !== null && value !== 'inherit') {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value} !important;\n`;
        }
      });
    }
    cssOutput += `    }\n\n`;
    
    // Generate link-specific styles
    if (config.linkStyles) {
      cssOutput += `    .${className} a, .${className} a * {\n`;
      Object.entries(config.linkStyles).forEach(([property, value]) => {
        if (value !== null) {
          if (value === 'inherit') {
            // For inherit values, use the theme color if available
            if (property === 'color' && theme && theme.linkAccent) {
              cssOutput += `      color: ${theme.linkAccent} !important;\n`;
            }
          } else {
            const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            cssOutput += `      ${cssProp}: ${value} !important;\n`;
          }
        }
      });
      cssOutput += `    }\n\n`;
    }
    
    // Generate heading-specific styles
    if (config.headingStyles) {
      cssOutput += `    .${className} h1, .${className} h2, .${className} h3, .${className} h4, .${className} h5, .${className} h6 {\n`;
      Object.entries(config.headingStyles).forEach(([property, value]) => {
        if (value !== null && value !== 'inherit') {
          const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssOutput += `      ${cssProp}: ${value} !important;\n`;
        }
      });
      cssOutput += `    }\n\n`;
    }
  });
  
  return cssOutput;
}

/**
 * Display color theme in ASCII format with actual colors
 */
function displayColorTheme(newsletterData) {
  const colorThemeName = newsletterData.colorTheme || 'current';
  
  // Load color themes
  let colorThemes = {};
  try {
    const themesData = fs.readFileSync('data/color-themes.json', 'utf8');
    colorThemes = JSON.parse(themesData);
  } catch (error) {
    console.log('⚠️  No color themes found, using defaults');
    return;
  }

  const theme = colorThemes.themes[colorThemeName];
  if (!theme) {
    console.log(`⚠️  Theme "${colorThemeName}" not found, using defaults`);
    return;
  }

  console.log(`🎨 Color Theme: "${theme.name}" (${colorThemeName})`);
  console.log(`📝 ${theme.description}`);
  console.log('');
  console.log('🎨 Section Colors:');
  
  // Create ASCII color swatches with actual colors
  const colors = theme.colors;
  const sectionNames = Object.keys(colors);
  const reset = '\x1b[0m'; // Reset color
  
  sectionNames.forEach(sectionName => {
    const color = colors[sectionName];
    const displayName = sectionName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Create colored ASCII block
    const bgColor = hexToAnsiBackground(color);
    const colorBlock = `${bgColor}        ${reset}`; // 8 spaces with background color
    
    console.log(`  ${colorBlock} ${displayName.padEnd(20)} ${color}`);
  });
  
  if (theme.linkAccent) {
    const bgColor = hexToAnsiBackground(theme.linkAccent);
    const colorBlock = `${bgColor}        ${reset}`;
    console.log(`  ${colorBlock} ${'Link Accent'.padEnd(20)} ${theme.linkAccent}`);
  }
  
  console.log('');
}

/**
 * Catalog all sections in the newsletter data for debugging
 */
function catalogSections(newsletterData) {
  console.log('📋 Section Catalog:');
  console.log('═══════════════════');
  
  if (!newsletterData.sections) {
    console.log('❌ No sections found in newsletter data');
    return;
  }
  
  if (!Array.isArray(newsletterData.sections)) {
    console.log('❌ Sections is not an array:', typeof newsletterData.sections);
    return;
  }
  
  console.log(`📊 Total sections: ${newsletterData.sections.length}`);
  console.log('');
  
  newsletterData.sections.forEach((section, index) => {
    const type = section.type || 'undefined';
    const title = section.title || 'No title';
    const itemCount = section.items ? section.items.length : 0;
    
    console.log(`${index + 1}. Type: "${type}" | Title: "${title}" | Items: ${itemCount}`);
    
    // Show item details for gif and animated-image sections specifically
    if ((type === 'gif' || type === 'animated-image') && section.items) {
      section.items.forEach((item, itemIndex) => {
        console.log(`   Item ${itemIndex + 1}:`);
        console.log(`     - image: ${item.image || 'none'}`);
        console.log(`     - gif: ${item.gif || 'none'}`);
        console.log(`     - description: ${item.description ? 'present' : 'none'}`);
      });
    }
  });
  
  console.log('');
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
            console.log('Checking GIF URL:', item.gif);
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

// Set up paths - handle both absolute and relative paths
let inputPath;
if (isMarkdown) {
  // If it's an absolute path, use it directly
  if (path.isAbsolute(inputFile)) {
    inputPath = inputFile;
  } else if (inputFile.startsWith('content/')) {
    // Already has content/ prefix
    inputPath = inputFile;
  } else {
    // Relative path, assume it's in content/ directory
    inputPath = path.join('content', inputFile);
  }
} else {
  // JSON files
  if (path.isAbsolute(inputFile)) {
    inputPath = inputFile;
  } else if (inputFile.startsWith('data/')) {
    inputPath = inputFile;
  } else {
    inputPath = path.join('data', inputFile);
  }
}

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  if (!path.isAbsolute(inputFile)) {
    console.error(`   Tried: ${path.resolve(inputPath)}`);
  }
  process.exit(1);
}

async function buildNewsletter() {
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
    
    console.log(`🎨 Template: "${templateName}"`);
    console.log(`📊 Newsletter: "${JSON.parse(fs.readFileSync('data/newsletter.json', 'utf8')).title}"`);

    // Load newsletter data and display color theme
    const newsletterData = JSON.parse(fs.readFileSync('data/newsletter.json', 'utf8'));
    
    // Catalog sections for debugging
    catalogSections(newsletterData);
    
    // Normalize item fields for templates that expect different field names
    // Known mapping: classifieds template expects `item.content` while Markdown
    // frontmatter commonly uses `description`. Copy over when missing.
    if (newsletterData.sections && Array.isArray(newsletterData.sections)) {
      newsletterData.sections.forEach(section => {
        if (!section || !section.items) return;
        if (section.type === 'classifieds') {
          section.items.forEach(item => {
            if (!item.content && item.description) {
              item.content = item.description;
            }
          });
        }
        // Normalize dispatch tags: accept either a comma-separated string or an array
        if (section.type === 'dispatch') {
          let tags = section.tags || (section.dispatch && section.dispatch.tags);
          if (tags) {
            if (typeof tags === 'string') {
              tags = tags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.toUpperCase());
            } else if (Array.isArray(tags)) {
              tags = tags.map(t => String(t).trim()).filter(Boolean).map(t => t.toUpperCase());
            }
            section.tags = tags;
          }
        }
      });
      console.log('🔁 Normalized item fields for classifieds (description → content)');
    }
    
    displayColorTheme(newsletterData);
    
    // Inject theme colors into newsletter data
    const colorThemeName = newsletterData.colorTheme || 'current';
    let colorThemes = {};
    try {
      const themesData = fs.readFileSync('data/color-themes.json', 'utf8');
      colorThemes = JSON.parse(themesData);
    } catch (error) {
      console.log('⚠️  No color themes found, using defaults');
    }
    
    const theme = colorThemes.themes && colorThemes.themes[colorThemeName];
    if (theme) {
      // Add theme colors to newsletter data for template access
      newsletterData.themeColors = {
        ...theme.colors,  // All section background colors
        linkAccent: theme.linkAccent  // Link accent color for all links
      };
      
      // Add the theme object itself for CSS class generation
      newsletterData.theme = theme;
    }

    // Load section styles configuration
    let sectionStyles = {};
    let sectionStylesPath = 'data/section-styles.json'; // Default path
    
    // Check if newsletter data specifies a custom section styles file
    if (newsletterData.sectionStylesFile) {
      sectionStylesPath = newsletterData.sectionStylesFile;
      console.log(`📋 Using custom section styles file: ${sectionStylesPath}`);
    } else if (templateName) {
      // Auto-detect template-specific section styles file
      const templateSpecificPath = `templates/${templateName}/section-styles.json`;
      if (fs.existsSync(templateSpecificPath)) {
        sectionStylesPath = templateSpecificPath;
        console.log(`📋 Auto-detected template section styles: ${templateSpecificPath}`);
      }
    }
    
    try {
      const sectionStylesData = fs.readFileSync(sectionStylesPath, 'utf8');
      sectionStyles = JSON.parse(sectionStylesData);

      // Normalize keys: allow comma-separated section type keys to map the same
      // config to multiple section types. E.g. "books-accessories, apps-sites": {...}
      if (sectionStyles && sectionStyles.sectionStyles) {
        const original = sectionStyles.sectionStyles;
        const normalized = {};

        Object.entries(original).forEach(([key, cfg]) => {
          // Split on comma and trim each entry
          const parts = key.split(',').map(k => k.trim()).filter(Boolean);
          // If there was only one part, keep the key as-is
          if (parts.length === 1) {
            normalized[parts[0]] = cfg;
          } else {
            // Map the same cfg object to each individual section type
            parts.forEach(p => {
              // If a key collision occurs, prefer the explicit key already present
              if (!normalized[p]) normalized[p] = cfg;
            });
          }
        });

        sectionStyles.sectionStyles = normalized;
      }

      newsletterData.sectionStyles = sectionStyles;
      console.log(`✅ Loaded section styles from ${sectionStylesPath}: ${Object.keys(sectionStyles.sectionStyles).length} section types (normalized)`);
    } catch (error) {
      console.log(`⚠️  No section styles found at ${sectionStylesPath}, skipping style processing`);
    }

    // Apply section styles through preprocessing (more reliable for email compatibility)
    if (sectionStyles.sectionStyles && newsletterData.sections) {
      console.log('🎨 Applying section styles through preprocessing...');
      console.log('');
      
      let processedItems = 0;
      let totalItems = 0;
      const sectionSummary = [];
      
      newsletterData.sections.forEach((section, sIndex) => {
          const sectionConfig = sectionStyles.sectionStyles[section.type];
          const fallbackConfig = sectionStyles.sectionStyles.default;
          const usedConfig = sectionConfig || fallbackConfig;

          // Inject containerStyles into the section for template access
          // Normalize and provide sensible defaults so templates can reference
          // `section.containerStyles.borderRadius`, `padding`, and `backgroundColor`.
          section.containerStyles = (usedConfig && usedConfig.containerStyles) ? { ...usedConfig.containerStyles } : { backgroundColor: null, padding: '15px 20px', borderRadius: '0px' };
          // Ensure values are strings and have defaults
          section.containerStyles.borderRadius = section.containerStyles.borderRadius ? String(section.containerStyles.borderRadius).trim() : '0px';
          section.containerStyles.padding = section.containerStyles.padding ? String(section.containerStyles.padding).trim() : '15px 20px';
          // keep explicit null for backgroundColor when not set so templates can fallback to themeColors
          section.containerStyles.backgroundColor = section.containerStyles.backgroundColor == null ? null : String(section.containerStyles.backgroundColor).trim();
        const usingFallback = !sectionConfig;
        
        let sectionProcessedItems = 0;
        let sectionTotalItems = 0;
        
        if (section.items) {
          sectionTotalItems = section.items.filter(item => item.description && typeof item.description === 'string').length;
          totalItems += sectionTotalItems;
          
          // Show section header with styling info
          if (sectionTotalItems > 0) {
            const statusIcon = usingFallback ? '⚠️ ' : '✅';
            const configInfo = usingFallback ? `using "default" styles` : `using "${section.type}" styles`;
            const fontInfo = usedConfig?.contentStyles?.fontFamily ? ` (${usedConfig.contentStyles.fontFamily})` : '';
            
            console.log(`${statusIcon} Section ${sIndex + 1}: "${section.type}" - ${configInfo}${fontInfo}`);
            
            if (usingFallback) {
              console.log(`   ℹ️  No specific styles found for "${section.type}", falling back to default`);
            }
          }
          
          section.items.forEach((item, iIndex) => {
            if (item.description && typeof item.description === 'string') {
              let originalDescription = item.description;
              let wasModified = false;
              
              // Apply all contentStyles properties
              if (usedConfig.contentStyles && Object.keys(usedConfig.contentStyles).length > 0) {
                const contentStyles = usedConfig.contentStyles;
                
                // Build CSS properties from contentStyles
                let cssProperties = [];
                if (contentStyles.fontFamily) {
                  cssProperties.push(`font-family: ${contentStyles.fontFamily} !important`);
                }
                if (contentStyles.fontSize) {
                  cssProperties.push(`font-size: ${contentStyles.fontSize} !important`);
                }
                if (contentStyles.lineHeight) {
                  cssProperties.push(`line-height: ${contentStyles.lineHeight} !important`);
                }
                if (contentStyles.color) {
                  cssProperties.push(`color: ${contentStyles.color} !important`);
                }
                if (contentStyles.textAlign) {
                  cssProperties.push(`text-align: ${contentStyles.textAlign} !important`);
                }
                
                const newCSSString = cssProperties.join('; ');
                
                // Process <p> tags
                item.description = item.description.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
                  attrs = attrs || '';
                  const styleMatch = attrs.match(/style="([^"]*)"/i);
                  if (styleMatch) {
                    let existingStyle = styleMatch[1];
                    // Remove existing properties that we're overriding
                    existingStyle = existingStyle
                      .replace(/font-family:[^;]*;?/gi, '')
                      .replace(/font-size:[^;]*;?/gi, '')
                      .replace(/line-height:[^;]*;?/gi, '')
                      .replace(/color:[^;]*;?/gi, '')
                      .replace(/text-align:[^;]*;?/gi, '');
                    const combinedStyle = `${existingStyle}; ${newCSSString}`.replace(/^;+|;+$/g, '');
                    return `<p${attrs.replace(/style="[^"]*"/i, `style="${combinedStyle}"`)}>`;
                  } else {
                    return `<p${attrs} style="${newCSSString}">`;
                  }
                });
                wasModified = true;
              }
              
              // Apply linkStyles properties to <a> tags
              if (usedConfig.linkStyles && Object.keys(usedConfig.linkStyles).length > 0) {
                const linkStyles = usedConfig.linkStyles;
                
                // Build CSS properties from linkStyles
                let linkCSSProperties = [];
                if (linkStyles.fontFamily) {
                  linkCSSProperties.push(`font-family: ${linkStyles.fontFamily} !important`);
                }
                if (linkStyles.fontSize) {
                  linkCSSProperties.push(`font-size: ${linkStyles.fontSize} !important`);
                }
                if (linkStyles.fontWeight) {
                  linkCSSProperties.push(`font-weight: ${linkStyles.fontWeight} !important`);
                }
                if (linkStyles.textDecoration) {
                  linkCSSProperties.push(`text-decoration: ${linkStyles.textDecoration} !important`);
                }
                if (linkStyles.color === 'inherit' && theme?.linkAccent) {
                  // Use theme color when linkStyles.color is 'inherit'
                  linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
                } else if (linkStyles.color && linkStyles.color !== 'inherit') {
                  // Use specific color from linkStyles
                  linkCSSProperties.push(`color: ${linkStyles.color} !important`);
                } else if (theme?.linkAccent) {
                  // Fallback to theme color if no linkStyles color specified
                  linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
                }
                
                const linkCSSString = linkCSSProperties.join('; ');
                
                // Process <a> tags
                item.description = item.description.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
                  attrs = attrs || '';
                  const styleMatch = attrs.match(/style="([^"]*)"/i);
                  if (styleMatch) {
                    let existingStyle = styleMatch[1];
                    // Remove existing properties that we're overriding
                    existingStyle = existingStyle
                      .replace(/font-family:[^;]*;?/gi, '')
                      .replace(/font-size:[^;]*;?/gi, '')
                      .replace(/font-weight:[^;]*;?/gi, '')
                      .replace(/text-decoration:[^;]*;?/gi, '')
                      .replace(/color:[^;]*;?/gi, '');
                    const combinedLinkStyle = `${existingStyle}; ${linkCSSString}`.replace(/^;+|;+$/g, '');
                    return `<a${attrs.replace(/style="[^"]*"/i, `style="${combinedLinkStyle}"`)}>`;
                  } else {
                    return `<a${attrs} style="${linkCSSString}">`;
                  }
                });
                wasModified = true;
              } else if (theme?.linkAccent) {
                // Fallback: apply theme link color if no linkStyles defined
                item.description = item.description.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
                  attrs = attrs || '';
                  if (!attrs.includes('style=')) {
                    return `<a${attrs} style="color: ${theme.linkAccent} !important; text-decoration: underline;">`;
                  } else {
                    return match.replace(/style="([^"]*)"/, (styleMatch, styles) => {
                      const cleanStyles = styles.replace(/color:[^;]*;?/gi, '');
                      return `style="${cleanStyles}; color: ${theme.linkAccent} !important; text-decoration: underline;"`;
                    });
                  }
                });
                wasModified = true;
              }
              
              if (wasModified) {
                processedItems++;
                sectionProcessedItems++;
                console.log(`   📝 Item ${iIndex + 1}: Styled content`);
              } else {
                console.log(`   📄 Item ${iIndex + 1}: No styles applied (no content to process)`);
              }
            }
          });
          
          // Section summary
          if (sectionTotalItems > 0) {
            const sectionStatus = sectionProcessedItems === sectionTotalItems ? '✅' : '⚠️ ';
            sectionSummary.push({
              type: section.type,
              processed: sectionProcessedItems,
              total: sectionTotalItems,
              hasConfig: !usingFallback,
              configName: usingFallback ? 'default' : section.type
            });
            console.log(`   ${sectionStatus} Section summary: ${sectionProcessedItems}/${sectionTotalItems} items styled`);
            console.log('');
          }
        }
      });
      
      // Overall summary
      console.log('📊 Style Processing Summary:');
      console.log('═══════════════════════════');
      sectionSummary.forEach((summary, index) => {
        const statusIcon = summary.hasConfig ? '✅' : '⚠️ ';
        const configText = summary.hasConfig ? `custom "${summary.type}" config` : 'fallback "default" config';
        console.log(`${statusIcon} ${summary.type}: ${summary.processed}/${summary.total} items (${configText})`);
      });
      
      const unconfiguredSections = sectionSummary.filter(s => !s.hasConfig);
      if (unconfiguredSections.length > 0) {
        console.log('');
        console.log('💡 Tip: Create specific configurations for these section types:');
        unconfiguredSections.forEach(s => {
          console.log(`   • "${s.type}" section type needs configuration`);
        });
      }
      
      console.log('');
      console.log(`✅ Total: ${processedItems}/${totalItems} items processed successfully`);
    }
    
    // Write updated newsletter data back to file
    // For templates that render `item.content` for classifieds, copy the
    // preprocessed/styled `item.description` into `item.content` so the
    // template receives the inlined styles. This intentionally overwrites
    // `item.content` for classifieds because the template expects `content`.
    if (newsletterData.sections && Array.isArray(newsletterData.sections)) {
      newsletterData.sections.forEach(section => {
        if (!section || !section.items) return;
        if (section.type === 'classifieds') {
          section.items.forEach(item => {
            if (item.description) {
              item.content = item.description;
            }
          });
        }
      });
    }

    fs.writeFileSync('data/newsletter.json', JSON.stringify(newsletterData, null, 2));
    console.log(`✅ Theme and section style data injected for Maizzle processing`);
    
    // Validate images in the newsletter data
    await validateImages(newsletterData);

    // Build the newsletter
    console.log('🔨 Building newsletter...');
    console.log('');
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
}

// Run the build
buildNewsletter();