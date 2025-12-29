#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function jsonPointerToDotPath(pointer) {
  if (!pointer || pointer === '/') return '$';
  const parts = pointer
    .split('/')
    .slice(1)
    .map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map(p => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`));
  return '$' + parts.join('');
}

function describeSchemaLocation(instancePath, newsletterData) {
  const match = /^\/sections\/(\d+)(?:\/items\/(\d+))?/.exec(instancePath || '');
  if (!match) return null;

  const sectionIndex = Number(match[1]);
  const itemIndex = match[2] !== undefined ? Number(match[2]) : null;

  const section = Array.isArray(newsletterData?.sections) ? newsletterData.sections[sectionIndex] : null;
  const sectionType = section?.type ? String(section.type) : 'unknown-type';
  const sectionTitle = section?.title ? String(section.title) : null;

  const sectionLabel = sectionTitle
    ? `sections[${sectionIndex}] (${sectionType} / "${sectionTitle}")`
    : `sections[${sectionIndex}] (${sectionType})`;

  if (itemIndex === null) return sectionLabel;

  const item = Array.isArray(section?.items) ? section.items[itemIndex] : null;
  const itemTitle = item?.title ? String(item.title) : null;
  const itemLabel = itemTitle
    ? `${sectionLabel} → items[${itemIndex}] ("${itemTitle}")`
    : `${sectionLabel} → items[${itemIndex}]`;

  return itemLabel;
}

function validateNewsletterDataAgainstSchema(newsletterData, templateName, args) {
  const strict = args.includes('--strict-schema') || process.env.SCHEMA_STRICT === '1';
  const schemaCandidates = [
    templateName ? path.resolve(`templates/${templateName}/newsletter.schema.json`) : null,
    path.resolve('newsletter.schema.json'),
  ].filter(Boolean);

  const schemaPath = schemaCandidates.find(p => fs.existsSync(p));
  if (!schemaPath) return;

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read schema at ${schemaPath}: ${err.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(newsletterData);
  if (valid) {
    console.log(`✅ Schema validation passed (${path.relative(process.cwd(), schemaPath)})`);
    return;
  }

  const errors = validate.errors || [];
  console.log(`\n⚠️  Schema validation found ${errors.length} issue(s) (${path.relative(process.cwd(), schemaPath)})`);

  errors
    .filter(err => err.keyword !== 'if') // if/then wrappers are noisy; show the underlying errors instead
    .slice(0, 50)
    .forEach(err => {
    const context = describeSchemaLocation(err.instancePath, newsletterData);
    const contextPrefix = context ? `${context}: ` : '';
    if (err.keyword === 'additionalProperties') {
      const base = jsonPointerToDotPath(err.instancePath);
      const extra = err.params?.additionalProperty ? `.${err.params.additionalProperty}` : '';
      console.log(`   • ${contextPrefix}Unknown key: ${base}${extra}`);
      return;
    }
    console.log(`   • ${contextPrefix}${jsonPointerToDotPath(err.instancePath)}: ${err.message}`);
    });

  if (errors.length > 50) {
    console.log(`   • …and ${errors.length - 50} more`);
  }

  if (strict) {
    throw new Error('Schema validation failed (strict mode)');
  }
}

function normalizeNewsletterForSchemaValidation(newsletterData) {
  if (!newsletterData || typeof newsletterData !== 'object') return;
  if (!Array.isArray(newsletterData.sections)) return;

  newsletterData.sections.forEach(section => {
    if (!section || typeof section !== 'object') return;

    // Some content sources use a convenience `backgroundColor` at the section level.
    // The templates read `section.containerStyles.backgroundColor`, so normalize and
    // remove the convenience key to keep schema validation (and rendering) aligned.
    if (typeof section.backgroundColor === 'string' && section.backgroundColor.trim().length) {
      section.containerStyles = (section.containerStyles && typeof section.containerStyles === 'object' && !Array.isArray(section.containerStyles))
        ? section.containerStyles
        : {};
      if (section.containerStyles.backgroundColor == null) {
        section.containerStyles.backgroundColor = section.backgroundColor.trim();
      }
      delete section.backgroundColor;
    }

    // Normalize classifieds content fields for validation:
    // - Schema for classifieds is keyed off what the template reads (`item.content`).
    // - Content sources may provide `description` instead; accept it by copying.
    // - Drop the extra field during validation to avoid per-type "unknown key" noise;
    //   the later build normalization will re-hydrate both directions as needed.
    if (section.type === 'classifieds' && Array.isArray(section.items)) {
      section.items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!item.content && typeof item.description === 'string') item.content = item.description;
        if (item.content && typeof item.description === 'string') delete item.description;
      });
    }
  });
}

function checkHttpUrl(url) {
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

    const lowercase = trimmed.toLowerCase();
    if (!lowercase.startsWith('https:') && !lowercase.startsWith('http:')) {
      resolve({ valid: false, error: 'Unsupported protocol' });
      return;
    }

    const client = lowercase.startsWith('https:') ? https : http;
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
  return checkHttpUrl(url);
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

// Convert hex to RGB and RGB to HSL for lightweight color adjustments.
const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const cleaned = hex.replace('#', '').trim();
  if (![3, 6].includes(cleaned.length)) return null;
  const normalized = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const int = parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHex = ({ r, g, b }) => {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h /= 6;
  }
  return { h, s, l };
};

const hslToRgb = ({ h, s, l }) => {
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
};

const adjustHexColor = (hex, { lightness = 0, saturation = 0 } = {}) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const adjusted = {
    h: hsl.h,
    s: clamp(hsl.s + saturation / 100),
    l: clamp(hsl.l + lightness / 100),
  };
  return rgbToHex(hslToRgb(adjusted));
};

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

function logSectionBackgroundOverrides(sections = [], theme) {
  if (!Array.isArray(sections)) return;

  const overrides = sections.map(section => {
    const color = section?.containerStyles?.backgroundColor;
    if (!color) return null;
    return {
      type: section.type || 'unknown',
      title: section.title,
      color,
      fallbackColor: theme?.colors?.[section.type]
    };
  }).filter(Boolean);

  if (overrides.length === 0) return;

  console.log('');
  console.log('🟣 Section background overrides detected:');
  const reset = '\x1b[0m';

  overrides.forEach(({ type, title, color, fallbackColor }) => {
    const normalizedType = type.replace(/-/g, ' ');
    const labelParts = [normalizedType];
    if (title) {
      labelParts.push(`"${title}"`);
    }
    const fallbackNote =
      fallbackColor && fallbackColor.toLowerCase() !== color.toLowerCase()
        ? ` (theme default ${fallbackColor})`
        : '';
    const bgColor = hexToAnsiBackground(color);
    const colorBlock = `${bgColor}        ${reset}`;
    console.log(`  ${colorBlock} ${labelParts.join(' / ')}: ${color}${fallbackNote}`);
  });
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

const LINK_FIELD_CANDIDATES = new Set([
  'link',
  'readmorelink',
  'imagelink',
  'logolink',
  'sponsorlink',
  'bylinelink',
  'authorlink',
  'viewonlinelink',
  'newslettersubscribelink',
  'unsubscribelink',
  'url'
]);

function isHttpLink(value) {
  return /^https?:/i.test(value);
}

function isPlaceholderLink(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === '#' ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized === 'javascript:void(0)' ||
    normalized === 'javascript:;'
  );
}

function formatLinkPath(path = []) {
  if (!path.length) return 'root';
  return path.reduce((acc, segment, index) => {
    if (typeof segment === 'number' || /^\d+$/.test(segment)) {
      return `${acc}[${segment}]`;
    }
    return index === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

function collectLinkCandidates(value, path = []) {
  const entries = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(...collectLinkCandidates(item, [...path, index]));
    });
    return entries;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const nextPath = [...path, key];
      if (typeof child === 'string' && LINK_FIELD_CANDIDATES.has(key.toLowerCase())) {
        entries.push({ path: nextPath, url: child });
      }
      if (Array.isArray(child) || (child && typeof child === 'object')) {
        entries.push(...collectLinkCandidates(child, nextPath));
      }
    });
  }

  return entries;
}

async function validateLinks(data) {
  const entries = collectLinkCandidates(data);
  if (entries.length === 0) {
    console.log('🔍 No hyperlink candidates found for validation');
    return;
  }

  console.log('🔍 Validating hyperlinks...');
  const errors = [];
  const warnings = [];
  let validLinks = 0;

  for (const entry of entries) {
    const rawUrl = entry.url;
    const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const pathLabel = formatLinkPath(entry.path);

    if (!trimmed) {
      errors.push(`❌ ${pathLabel}: link is empty`);
      continue;
    }

    if (isPlaceholderLink(trimmed)) {
      errors.push(`❌ ${pathLabel}: placeholder link value "${trimmed}"`);
      continue;
    }

    if (isHttpLink(trimmed)) {
      const result = await checkHttpUrl(trimmed);
      if (result.valid) {
        validLinks++;
      } else {
        const reason = result.error ? result.error : `HTTP ${result.status}`;
        if (result.status === 403 || result.status === 999) {
          warnings.push(`⚠️  ${pathLabel}: ${trimmed} (${reason})`);
          validLinks++;
        } else {
          errors.push(`❌ ${pathLabel}: ${trimmed} (${reason})`);
        }
      }
    } else {
      validLinks++; // Non-HTTP links (mailto, tel, relative) are assumed acceptable
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    console.log(`\n⚠️  Link Validation Results: ${validLinks}/${entries.length} links passed`);
    errors.forEach(error => console.log(`   ${error}`));
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  } else {
    console.log(`✅ All ${entries.length} links validated successfully`);
  }
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
          const singleImageUrl = resolveImageEntryUrl(item.image);
          if (singleImageUrl) {
            totalImages++;
            const result = await checkImageUrl(singleImageUrl);
            if (result.valid) {
              validImages++;
            } else {
              errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1} "${item.title}": ${singleImageUrl} (${result.error || result.status})`);
            }
          } else if (item.image) {
            totalImages++;
            errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1} "${item.title}": ${JSON.stringify(item.image)} (URL missing)`);
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
                  errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1}, image ${imgIndex + 1}: ${imageUrl} (${result.error || result.status})`);
                }
              } else {
                totalImages++;
                errors.push(`❌ Section "${section.title}" (${section.type}), item ${itemIndex + 1}, image ${imgIndex + 1}: ${JSON.stringify(imageEntry)} (URL missing)`);
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
        
        // If template was provided via CLI, enforce it. Otherwise respect what's in the JSON (from frontmatter)
        if (templateArg) {
          newsletterData.template = templateName;
        } else if (newsletterData.template) {
          templateName = newsletterData.template;
        }
        
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

    // Validate source JSON against a template-specific schema if one exists.
    // Default behavior is warn-and-continue; pass `--strict-schema` (or set `SCHEMA_STRICT=1`)
    // to fail the build on schema errors.
    normalizeNewsletterForSchemaValidation(newsletterData);
    validateNewsletterDataAgainstSchema(newsletterData, templateName, args);
    
    // Catalog sections for debugging
    catalogSections(newsletterData);
    
    // Normalize item fields for templates that expect different field names.
    // Known mapping: classifieds templates expect `item.content`, while content sources
    // may provide either `description` (common in Markdown frontmatter) or `content`.
    // We normalize BOTH ways so downstream styling and templates behave consistently:
    // - Ensure `item.content` exists for templates that render `content`
    // - Ensure `item.description` exists for the style-preprocessor (it targets `description`)
    if (newsletterData.sections && Array.isArray(newsletterData.sections)) {
      newsletterData.sections.forEach(section => {
        if (!section || !section.items) return;
        if (section.type === 'classifieds') {
          section.items.forEach(item => {
            if (!item.content && typeof item.description === 'string') item.content = item.description;
            if (!item.description && typeof item.content === 'string') item.description = item.content;
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
      console.log('🔁 Normalized item fields for classifieds (description ↔ content)');
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
    let sectionStylesSourceReason = 'default repository styles';
    
    // Check if newsletter data specifies a custom section styles file
    if (newsletterData.sectionStylesFile) {
      sectionStylesPath = newsletterData.sectionStylesFile;
      sectionStylesSourceReason = 'specified via sectionStylesFile';
      console.log(`📋 Using custom section styles file: ${sectionStylesPath}`);
    } else if (templateName) {
      // Auto-detect template-specific section styles file
      const templateSpecificPath = `templates/${templateName}/section-styles.json`;
      if (fs.existsSync(templateSpecificPath)) {
        sectionStylesPath = templateSpecificPath;
        sectionStylesSourceReason = `auto-detected for template "${templateName}"`;
        console.log(`📋 Auto-detected template section styles: ${templateSpecificPath}`);
      }
    }

    const resolvedSectionStylesPath = fs.existsSync(sectionStylesPath)
      ? fs.realpathSync(sectionStylesPath)
      : path.resolve(sectionStylesPath);
    console.log(`🗂  Section styles source: ${resolvedSectionStylesPath} (${sectionStylesSourceReason})`);
    
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
      const baseMessage = `Failed to load section styles from ${sectionStylesPath}`;
      if (sectionStylesSourceReason === 'specified via sectionStylesFile') {
        throw new Error(`${baseMessage} (your newsletter data explicitly set sectionStylesFile): ${error.message}`);
      }
      console.log(`⚠️  ${baseMessage}, skipping style processing (${error.message})`);
    }

    // Apply section styles through preprocessing (more reliable for email compatibility)
    if (sectionStyles.sectionStyles && newsletterData.sections) {
      console.log('🎨 Applying section styles through preprocessing...');
      console.log('');

      const sanitizeHtmlFragment = (html) => {
        if (!html || typeof html !== 'string') return html;
        let out = html;

        // Remove empty paragraphs that can get default/global styling inlined later.
        out = out.replace(/<p\b[^>]*>\s*<\/p>/gi, '');

        // Unwrap nested paragraphs like <p ...><p ...>...</p></p>.
        // We apply this a few times to handle repeated nesting from upstream converters.
        for (let i = 0; i < 3; i++) {
          const next = out
            .replace(/<p\b[^>]*>\s*(<p\b[^>]*>)/gi, '$1')
            .replace(/<\/p>\s*<\/p>/gi, '</p>');
          if (next === out) break;
          out = next;
        }

        return out;
      };
      
      let processedItems = 0;
      let totalItems = 0;
      const sectionSummary = [];
      let sectionsWithMatchedConfig = 0;
      let sectionsUsingDefaultConfig = 0;
      let sectionsWithInjectedContentStyles = 0;
      
      newsletterData.sections.forEach((section, sIndex) => {
          if (section && section.type !== undefined && section.type !== null) {
            section.type = String(section.type).trim();
          }

          // Helper to convert style objects into inline CSS strings with camelCase to kebab-case conversion
          const toCssString = (styles = {}, theme) => {
            return Object.entries(styles)
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([prop, val]) => {
                const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                // Special handling: if color is "inherit", prefer theme link accent when available
                if (cssProp === 'color' && val === 'inherit' && theme?.linkAccent) {
                  return `color: ${theme.linkAccent}`;
                }
                return `${cssProp}: ${val}`;
              })
              .join('; ');
          };

          const sectionConfig = sectionStyles.sectionStyles[section.type];
          const fallbackConfig = sectionStyles.sectionStyles.default || {};
          const usedConfig = sectionConfig || fallbackConfig;
          const safeUsedConfig = usedConfig && typeof usedConfig === 'object' ? usedConfig : {};
          if (sectionConfig) {
            sectionsWithMatchedConfig++;
          } else {
            sectionsUsingDefaultConfig++;
          }
          const incomingContainerStyles = section.containerStyles && typeof section.containerStyles === 'object'
            ? { ...section.containerStyles }
            : {};
          // --- PATCH: Apply descriptionStyles/contentStyles/linkStyles to section.description ---
          if (section.description && typeof section.description === 'string') {
            section.description = sanitizeHtmlFragment(section.description);
            let desc = section.description;
            let wasModified = false;
            // Apply descriptionStyles if provided, otherwise fall back to contentStyles
            const descStyles = (safeUsedConfig.descriptionStyles && Object.keys(safeUsedConfig.descriptionStyles).length > 0)
              ? safeUsedConfig.descriptionStyles
              : safeUsedConfig.contentStyles;
            if (descStyles && Object.keys(descStyles).length > 0) {
              const contentStyles = descStyles;
              let cssProperties = [];
              if (contentStyles.fontFamily) cssProperties.push(`font-family: ${contentStyles.fontFamily} !important`);
              if (contentStyles.fontSize) cssProperties.push(`font-size: ${contentStyles.fontSize} !important`);
              if (contentStyles.lineHeight) cssProperties.push(`line-height: ${contentStyles.lineHeight} !important`);
              if (contentStyles.color) cssProperties.push(`color: ${contentStyles.color} !important`);
              if (contentStyles.textAlign) cssProperties.push(`text-align: ${contentStyles.textAlign} !important`);
              const newCSSString = cssProperties.join('; ');
              desc = desc.replace(/<p(\s[^>]*)?>/gi, (match, attrs) => {
                attrs = attrs || '';
                const styleMatch = attrs.match(/style="([^"]*)"/i);
                if (styleMatch) {
                  let existingStyle = styleMatch[1];
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
            // Apply linkStyles
            if (safeUsedConfig.linkStyles && Object.keys(safeUsedConfig.linkStyles).length > 0) {
              const linkStyles = safeUsedConfig.linkStyles;
              let linkCSSProperties = [];
              if (linkStyles.fontFamily) linkCSSProperties.push(`font-family: ${linkStyles.fontFamily} !important`);
              if (linkStyles.fontSize) linkCSSProperties.push(`font-size: ${linkStyles.fontSize} !important`);
              if (linkStyles.fontWeight) linkCSSProperties.push(`font-weight: ${linkStyles.fontWeight} !important`);
              if (linkStyles.textDecoration) linkCSSProperties.push(`text-decoration: ${linkStyles.textDecoration} !important`);
              if (linkStyles.color === 'inherit' && theme?.linkAccent) {
                linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
              } else if (linkStyles.color && linkStyles.color !== 'inherit') {
                linkCSSProperties.push(`color: ${linkStyles.color} !important`);
              } else if (theme?.linkAccent) {
                linkCSSProperties.push(`color: ${theme.linkAccent} !important`);
              }
              const linkCSSString = linkCSSProperties.join('; ');
              desc = desc.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
                attrs = attrs || '';
                const styleMatch = attrs.match(/style="([^"]*)"/i);
                if (styleMatch) {
                  let existingStyle = styleMatch[1];
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
              desc = desc.replace(/<a(\s[^>]*)?>/gi, (match, attrs) => {
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
              section.description = desc;
            }
          }

          // Inject containerStyles into the section for template access
          // Normalize and provide sensible defaults so templates can reference
          // `section.containerStyles.borderRadius`, `padding`, and `backgroundColor`.
          const baseContainerStyles = (safeUsedConfig.containerStyles && typeof safeUsedConfig.containerStyles === 'object')
            ? { ...safeUsedConfig.containerStyles }
            : { backgroundColor: null, padding: '15px 20px', borderRadius: '0px' };
          section.containerStyles = { ...baseContainerStyles, ...incomingContainerStyles };
          // Ensure values are strings and have defaults
          section.containerStyles.borderRadius = section.containerStyles.borderRadius ? String(section.containerStyles.borderRadius).trim() : '0px';
          section.containerStyles.padding = section.containerStyles.padding ? String(section.containerStyles.padding).trim() : '15px 20px';
          // keep explicit null for backgroundColor when not set so templates can fallback to themeColors
          section.containerStyles.backgroundColor = section.containerStyles.backgroundColor == null ? null : String(section.containerStyles.backgroundColor).trim();

          // Expose contentStyles so templates can use configured typography instead of hardcoded values
          section.contentStyles = (safeUsedConfig.contentStyles && typeof safeUsedConfig.contentStyles === 'object')
            ? { ...safeUsedConfig.contentStyles }
            : {};
          if (section.contentStyles && Object.keys(section.contentStyles).length > 0) {
            sectionsWithInjectedContentStyles++;
          }
          // Expose descriptionStyles with fallback to contentStyles for section.description rendering
          section.descriptionStyles = (safeUsedConfig.descriptionStyles && typeof safeUsedConfig.descriptionStyles === 'object')
            ? { ...safeUsedConfig.descriptionStyles }
            : { ...section.contentStyles };
          // Compute a spacer background derived from the section background color.
          const baseBackground =
            section.containerStyles.backgroundColor ||
            theme?.colors?.[section.type] ||
            null;
          const spacerAdjust = safeUsedConfig.spacerBackgroundAdjust && typeof safeUsedConfig.spacerBackgroundAdjust === 'object'
            ? safeUsedConfig.spacerBackgroundAdjust
            : { lightness: -6, saturation: 4 };
          section.spacerBackgroundColor = baseBackground
            ? adjustHexColor(baseBackground, spacerAdjust)
            : null;

          // Expose headingStyles/linkStyles for template use with sane defaults
          const defaultHeading = { fontFamily: "'Ubuntu', sans-serif", fontSize: '18px', lineHeight: '23px', fontWeight: '600', color: '#000000' };
          const defaultLink = { textDecoration: 'underline', fontWeight: '400', color: theme?.linkAccent || '#707070' };
          section.headingStyles = safeUsedConfig.headingStyles && typeof safeUsedConfig.headingStyles === 'object' ? { ...safeUsedConfig.headingStyles } : {};
          section.linkStyles = safeUsedConfig.linkStyles && typeof safeUsedConfig.linkStyles === 'object' ? { ...safeUsedConfig.linkStyles } : {};
          section.headingStylesInline = toCssString({ ...defaultHeading, ...section.headingStyles });
          section.linkStylesInline = toCssString({ ...defaultLink, ...section.linkStyles }, theme);
        const usingFallback = !sectionConfig;
        
        let sectionProcessedItems = 0;
        let sectionTotalItems = 0;
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        
        if (sectionItems.length > 0) {
          sectionTotalItems = sectionItems.filter(item => item.description && typeof item.description === 'string').length;
          totalItems += sectionTotalItems;
          
          // Show section header with styling info
          if (sectionTotalItems > 0) {
            const statusIcon = usingFallback ? '⚠️ ' : '✅';
            const configInfo = usingFallback ? `using "default" styles` : `using "${section.type}" styles`;
            const fontInfo = safeUsedConfig?.contentStyles?.fontFamily ? ` (${safeUsedConfig.contentStyles.fontFamily})` : '';
            
            console.log(`${statusIcon} Section ${sIndex + 1}: "${section.type}" - ${configInfo}${fontInfo}`);
            
            if (usingFallback) {
              console.log(`   ℹ️  No specific styles found for "${section.type}", falling back to default`);
            }
          }
          
          sectionItems.forEach((item, iIndex) => {
            if (item.description && typeof item.description === 'string') {
              item.description = sanitizeHtmlFragment(item.description);
              let originalDescription = item.description;
              let wasModified = false;
              
              // Apply all contentStyles properties
              if (safeUsedConfig.contentStyles && Object.keys(safeUsedConfig.contentStyles).length > 0) {
                const contentStyles = safeUsedConfig.contentStyles;
                
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
              
              const inlineStyleMatches = item.description.match(/style="[^"]*"/gi) || [];
              const inlineFontFamilies = [];
              const normalizeFontFamily = (value) =>
                value
                  .replace(/!important/gi, '')
                  .replace(/['"]/g, '')
                  .split(',')
                  .map((font) => font.trim())
                  .filter(Boolean)[0] || '';
              inlineStyleMatches.forEach((styleMatch) => {
                const fontMatch = styleMatch.match(/font-family\s*:\s*([^;"]+)/i);
                if (fontMatch) {
                  const normalized = normalizeFontFamily(fontMatch[1]);
                  if (normalized) {
                    inlineFontFamilies.push(normalized);
                  }
                }
              });
              const uniqueInlineFonts = Array.from(new Set(inlineFontFamilies));
              const inlineStyleSummary = [];
              if (inlineStyleMatches.length) {
                inlineStyleSummary.push(`${inlineStyleMatches.length} inline style${inlineStyleMatches.length > 1 ? 's' : ''}`);
              }
              if (uniqueInlineFonts.length) {
                inlineStyleSummary.push(`inline font-family: ${uniqueInlineFonts.join(', ')}`);
              }
              const configFontFamily = usedConfig?.contentStyles?.fontFamily
                ? normalizeFontFamily(usedConfig.contentStyles.fontFamily)
                : '';
              const descriptionFontFamily = usedConfig?.descriptionStyles?.fontFamily
                ? normalizeFontFamily(usedConfig.descriptionStyles.fontFamily)
                : '';
              const descriptionColor = usedConfig?.descriptionStyles?.color || '';
              if (configFontFamily && uniqueInlineFonts.some((font) => font !== configFontFamily)) {
                inlineStyleSummary.push(`overrides section font (${usedConfig.contentStyles.fontFamily})`);
              }
              if (descriptionFontFamily && uniqueInlineFonts.some((font) => font !== descriptionFontFamily)) {
                inlineStyleSummary.push(`overrides description font (${usedConfig.descriptionStyles.fontFamily})`);
              }
              if (descriptionColor) {
                inlineStyleSummary.push(`description color override (${descriptionColor})`);
              }

              if (wasModified) {
                processedItems++;
                sectionProcessedItems++;
                console.log(`   📝 Item ${iIndex + 1}: Styled content`);
              } else {
                console.log(`   📄 Item ${iIndex + 1}: No styles applied (no content to process)`);
              }

              if (inlineStyleSummary.length > 0) {
                console.log(`   🧷 Item ${iIndex + 1}: ${inlineStyleSummary.join('; ')}`);
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

      console.log('🧩 Section styles injection summary:');
      console.log(`   - Sections: ${newsletterData.sections.length}`);
      console.log(`   - Matched config: ${sectionsWithMatchedConfig}`);
      console.log(`   - Default config: ${sectionsUsingDefaultConfig}`);
      console.log(`   - Injected contentStyles: ${sectionsWithInjectedContentStyles}`);
      
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
      logSectionBackgroundOverrides(newsletterData.sections, theme);
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
    await validateLinks(newsletterData);

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
