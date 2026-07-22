#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const PROJECT_ROOT = process.cwd();

/**
 * Simple CLI usage helper.
 */
function usage() {
  console.log('Usage: node scripts/lint-template.mjs <content-file.md|data-file.json> [--template=<name>]');
  console.log('Example: node scripts/lint-template.mjs content/dense-discovery-test.md --template=dense-discovery');
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0 || rawArgs.includes('--help')) {
  usage();
}

let templateOverride;
const fileArgs = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--template' && rawArgs[i + 1]) {
    templateOverride = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith('--template=')) {
    templateOverride = arg.split('=')[1];
    continue;
  }
  if (arg.startsWith('--')) {
    continue;
  }
  fileArgs.push(arg);
}

if (fileArgs.length === 0) {
  usage();
}

const inputArg = fileArgs[0];
const resolvedInputPath = path.isAbsolute(inputArg)
  ? inputArg
  : path.resolve(PROJECT_ROOT, inputArg);
const isMarkdown = resolvedInputPath.toLowerCase().endsWith('.md');
const isJson = resolvedInputPath.toLowerCase().endsWith('.json');

if (!isMarkdown && !isJson) {
  console.error(`Unsupported file type: ${inputArg}`);
  usage();
}

let lintData;
try {
  if (isMarkdown) {
    const markdown = fs.readFileSync(resolvedInputPath, 'utf8');
    const { data: frontmatter } = matter(markdown);
    lintData = frontmatter || {};
  } else {
    const raw = fs.readFileSync(resolvedInputPath, 'utf8');
    lintData = JSON.parse(raw);
  }
} catch (error) {
  console.error(`Failed to read ${resolvedInputPath}: ${error.message}`);
  process.exit(1);
}

const normalizedTemplate = (templateOverride || lintData.template || 'wirecutter').toString();

const issues = {
  errors: [],
  warnings: [],
};

function report(level, context, message) {
  issues[level].push({ context, message });
}

function resolveSectionStylesPath(customPath) {
  const normalizedPaths = [];
  if (customPath) {
    const resolvedCustom = path.isAbsolute(customPath)
      ? customPath
      : path.resolve(PROJECT_ROOT, customPath);
    normalizedPaths.push(resolvedCustom);
  }
  const templateStyles = path.resolve(PROJECT_ROOT, 'templates', normalizedTemplate, 'section-styles.json');
  normalizedPaths.push(templateStyles);
  normalizedPaths.push(path.resolve(PROJECT_ROOT, 'data', 'section-styles.json'));
  return normalizedPaths.find(p => fs.existsSync(p)) || null;
}

function loadSectionStyles() {
  const candidatePath = resolveSectionStylesPath(lintData.sectionStylesFile);
  if (!candidatePath) {
    if (lintData.sectionStylesFile) {
      report('warnings', 'sectionStylesFile', `Specified file "${lintData.sectionStylesFile}" could not be found`);
    }
    return null;
  }
  try {
    const payload = fs.readFileSync(candidatePath, 'utf8');
    const parsed = JSON.parse(payload);
    const types = new Set();
    if (parsed.sectionStyles && typeof parsed.sectionStyles === 'object') {
      Object.keys(parsed.sectionStyles).forEach((key) => {
        key
          .split(',')
          .map(entry => entry.trim())
          .filter(Boolean)
          .forEach(entry => types.add(entry));
      });
    }
    return { path: candidatePath, types };
  } catch (error) {
    report('warnings', 'sectionStyles', `Unable to parse section styles at ${candidatePath}: ${error.message}`);
    return null;
  }
}

const sectionStyles = loadSectionStyles();
const recognizedSectionTypes = sectionStyles ? sectionStyles.types : new Set(['default']);

function validateSections(sections) {
  if (sections == null) {
    report('warnings', 'sections', 'No sections array found - section-specific litters are skipped');
    return;
  }
  if (!Array.isArray(sections)) {
    report('errors', 'sections', 'Sections must be defined as an array');
    return;
  }
  if (sections.length === 0) {
    report('warnings', 'sections', 'Sections array is empty; there will be no dynamic content rendered');
    return;
  }

  const contentFields = ['description', 'content', 'quote', 'text', 'html', 'note', 'details'];
  const mediaFields = ['image', 'images', 'gif'];

  sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    if (!section || typeof section !== 'object') {
      report('errors', sectionPath, 'Invalid section object');
      return;
    }

    const { type, title, items } = section;
    if (!type) {
      report('errors', `${sectionPath}.type`, 'Section is missing a type');
    } else if (typeof type !== 'string') {
      report('errors', `${sectionPath}.type`, 'Section type must be a string');
    } else if (!recognizedSectionTypes.has(type) && type !== 'default') {
      report('warnings', `${sectionPath}.type`, `Unknown section type "${type}" (not defined in section-styles.json)`);
    }

    const compactRegistrySection = type === 'ad-block' || type === 'short-take';
    const placeholderSlotSection = type === 'ad-slot' || type === 'short-take-slot';
    if (!title && !compactRegistrySection && !placeholderSlotSection) {
      report('warnings', `${sectionPath}.title`, 'Section title is empty');
    }

    if (placeholderSlotSection) {
      return;
    }

    if (!Array.isArray(items)) {
      report('warnings', `${sectionPath}.items`, 'Section has no items array');
      return;
    }
    if (items.length === 0) {
      report('warnings', `${sectionPath}.items`, 'Section items array is empty');
    }

    items.forEach((item, itemIndex) => {
      const itemPath = `${sectionPath}.items[${itemIndex}]`;
      if (!item || typeof item !== 'object') {
        report('errors', itemPath, 'Item must be an object');
        return;
      }

      if (
        (section.type === 'ad-block' && typeof item.adId === 'string' && item.adId.trim()) ||
        (section.type === 'short-take' && typeof item.shortTakeId === 'string' && item.shortTakeId.trim())
      ) {
        return;
      }

      const hasContent = contentFields.some(key => {
        const value = item[key];
        return typeof value === 'string' && value.trim().length > 0;
      });
      const hasMedia = mediaFields.some((field) => {
        const value = item[field];
        if (field === 'images' && Array.isArray(value)) {
          return value.some(img => checkMediaString(img));
        }
        return checkMediaString(value);
      });

      if (!hasContent && !hasMedia) {
        report('errors', itemPath, 'Item lacks descriptive text or media (images, gifs, description, etc.)');
      }

      if (section.type === 'classifieds') {
        const hasClassifiedCopy = ['content', 'description'].some(key => typeof item[key] === 'string' && item[key].trim().length > 0);
        if (!hasClassifiedCopy) {
          report('errors', itemPath, 'Classifieds items should include copy in `content` or `description`');
        }
      }

      if (section.type === 'animated-image') {
        const hasAnimatedMedia = checkMediaString(item.image) || (Array.isArray(item.images) && item.images.length);
        if (!hasAnimatedMedia) {
          report('errors', itemPath, 'Animated-image items require at least one image URL');
        }
      }

      if (section.type === 'gif' && !checkMediaString(item.gif) && !checkMediaString(item.image)) {
        report('errors', itemPath, 'GIF items should provide either `gif` or `image`');
      }

      // Basic type verification for common fields
      ['link', 'url', 'imageLink', 'readMoreLink'].forEach((field) => {
        if (field in item && !isLinkLike(item[field])) {
          report('warnings', `${itemPath}.${field}`, `${field} should be a URL string or tracked-link object`);
        }
      });

      if ('image' in item && typeof item.image === 'object' && !item.image?.src) {
        report('warnings', `${itemPath}.image`, 'Image objects should include a src property');
      }

      if ('images' in item && item.images && !Array.isArray(item.images)) {
        report('errors', `${itemPath}.images`, 'Images should be listed as an array');
      }
      if (Array.isArray(item.images)) {
        item.images.forEach((media, mediaIndex) => {
          const imagePath = `${itemPath}.images[${mediaIndex}]`;
          if (!checkMediaString(media)) {
            report('warnings', imagePath, 'Image entry should be a non-empty string or object with src');
          }
        });
      }
    });
  });
}

function checkMediaString(media) {
  if (!media) return false;
  if (typeof media === 'string') return media.trim().length > 0;
  if (typeof media === 'object' && media.src) {
    return typeof media.src === 'string' && media.src.trim().length > 0;
  }
  return false;
}

function isLinkLike(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return typeof value.href === 'string' || typeof value.url === 'string';
}

function validateSchema() {
  const templateDir = path.resolve(PROJECT_ROOT, 'templates', normalizedTemplate);
  const schemaPath = [
    path.join(templateDir, 'newsletter.schema.json'),
    path.join(templateDir, 'schema.json'),
  ].find((candidate) => fs.existsSync(candidate));
  if (!fs.existsSync(schemaPath)) return;

  let schemaContent;
  try {
    schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    report('warnings', 'schema', `Unable to parse schema for template "${normalizedTemplate}": ${error.message}`);
    return;
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  let validate;
  try {
    validate = ajv.compile(schemaContent);
  } catch (error) {
    report('warnings', 'schema', `Schema compile failed for "${normalizedTemplate}": ${error.message}`);
    return;
  }

  const valid = validate(lintData);
  if (!valid && validate.errors) {
    validate.errors.forEach((errorEntry) => {
      const instancePath = errorEntry.instancePath.replace(/^\//, '').replace(/\//g, '.');
      const context = instancePath || 'root';
      report('errors', `schema:${context}`, `${errorEntry.message} (${errorEntry.schemaPath})`);
    });
  }
}

function summarize() {
  const relativePath = path.relative(PROJECT_ROOT, resolvedInputPath);
  console.log(`\nTemplate lint: ${relativePath} (${normalizedTemplate})`);

  if (issues.errors.length === 0 && issues.warnings.length === 0) {
    console.log('No issues detected');
    return;
  }

  if (issues.errors.length > 0) {
    console.log('Errors:');
    issues.errors.forEach(({ context, message }) => {
      console.log(`  - ${context}: ${message}`);
    });
  }

  if (issues.warnings.length > 0) {
    console.log('Warnings:');
    issues.warnings.forEach(({ context, message }) => {
      console.log(`  - ${context}: ${message}`);
    });
  }
}

// Execute validation pipeline
validateSections(lintData.sections);
validateSchema();
summarize();

if (issues.errors.length > 0) {
  process.exit(1);
}
