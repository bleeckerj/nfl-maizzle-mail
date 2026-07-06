#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import MaizzleFramework from '@maizzle/framework';

import {
  DEFAULT_CORRESPONDENCE_TEMPLATE,
  loadCorrespondenceEmailSource,
  resolveCorrespondenceInputPath,
  slugifyOutputName,
  validateCorrespondenceEmailData,
} from '../lib/correspondence-email/index.mjs';
import { hardenEmailHtmlForMobile } from '../lib/newsletter-core/email-html-hardening.mjs';

const { build: maizzleBuild } = MaizzleFramework;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..');

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

function getOptionValue(args, name) {
  const prefix = `--${name}=`;
  const arg = args.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function printUsage(repoRoot) {
  console.log('📧 Correspondence Email Builder');
  console.log('Usage: node scripts/build-correspondence.mjs <file.md|file.json> [output-name] [options]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/build-correspondence.mjs examples/correspondence/sample.md');
  console.log('  node scripts/build-correspondence.mjs correspondence/client-note.md client-note');
  console.log('');
  console.log('Options:');
  console.log('  --template=<name>     Template name (default: standard-correspondence)');
  console.log('  --output-dir=<path>   Output directory (default: build_correspondence)');
  console.log('  --repo-root=<path>    Repository root override');
  console.log('  --strict-schema       Fail on schema validation warnings');
  console.log('');
  console.log(`Current Repo Root: ${repoRoot}`);
}

function normalizeInlineStyleAttributeWhitespace(html) {
  if (typeof html !== 'string' || html.length === 0) return html;

  return html.replace(/style=(["'])([\s\S]*?)\1/gi, (_match, quote, styleValue) => {
    const normalized = String(styleValue)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return `style=${quote}${normalized}${quote}`;
  });
}

function resolveBuiltTemplatePath(baseDir, templateName) {
  const directPath = path.join(baseDir, 'newsletter.html');
  const nestedPath = path.join(baseDir, templateName, 'newsletter.html');

  if (fs.existsSync(directPath)) return directPath;
  if (fs.existsSync(nestedPath)) return nestedPath;
  return null;
}

async function buildCorrespondence() {
  const args = process.argv.slice(2);
  const repoRoot = path.resolve(getOptionValue(args, 'repo-root') || process.env.NFL_MAIZZLE_MAIL_ROOT || DEFAULT_REPO_ROOT);
  const fileArgs = args.filter((arg) => !arg.startsWith('--'));

  if (fileArgs.length < 1) {
    printUsage(repoRoot);
    process.exit(1);
  }

  const inputFile = fileArgs[0];
  const inputPath = resolveCorrespondenceInputPath(inputFile, { repoRoot });
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const outputName = slugifyOutputName(fileArgs[1] || path.basename(inputPath, path.extname(inputPath)));
  const outputDir = path.resolve(getOptionValue(args, 'output-dir') || path.join(repoRoot, 'build_correspondence'));
  const templateName = getOptionValue(args, 'template') || DEFAULT_CORRESPONDENCE_TEMPLATE;
  const finalOutputPath = path.join(outputDir, `${outputName}.html`);
  const tempBuildDirName = `.tmp_correspondence_build_${process.pid}_${Date.now()}`;
  const tempBuildDir = path.join(repoRoot, tempBuildDirName);

  log('Building correspondence email');
  log(`Input: ${inputPath}`);
  log(`Template: ${templateName}`);
  log(`Output: ${finalOutputPath}`);

  const data = loadCorrespondenceEmailSource(inputPath, {
    inputPath,
    outputName,
  });
  data.template = templateName;

  validateCorrespondenceEmailData(data, templateName, {
    repoRoot,
    strict: args.includes('--strict-schema'),
  });

  const templateDir = path.join(repoRoot, 'templates', templateName);
  if (!fs.existsSync(path.join(templateDir, 'newsletter.html'))) {
    throw new Error(`Template not found: ${templateDir}`);
  }

  fs.rmSync(tempBuildDir, { recursive: true, force: true });

  const originalCwd = process.cwd();
  try {
    process.chdir(repoRoot);
    log('Rendering with Maizzle');
    await maizzleBuild('production', {
      build: {
        command: 'build',
        templates: {
          source: `templates/${templateName}`,
          destination: {
            path: tempBuildDirName,
          },
        },
        components: {
          source: `templates/${templateName}/components`,
        },
      },
      inlineCSS: true,
      removeUnusedCSS: {
        enabled: true,
        whitelist: [
          '.correspondence-shell',
          '.correspondence-card',
          '.correspondence-body',
          '.correspondence-p',
          '.correspondence-heading',
          '.correspondence-list',
          '.correspondence-li',
          '.correspondence-link',
          '.correspondence-quote',
          '.correspondence-rule',
          '.correspondence-code',
          '.correspondence-shared-image-link',
          '.correspondence-shared-image',
        ],
      },
      prettify: true,
      minify: {
        removeUnusedCSS: false,
      },
      locals: data,
    });
  } finally {
    process.chdir(originalCwd);
  }

  const builtTemplatePath = resolveBuiltTemplatePath(tempBuildDir, templateName);
  if (!builtTemplatePath) {
    throw new Error(`Maizzle build failed: newsletter.html was not created in ${tempBuildDir}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const builtHtml = normalizeInlineStyleAttributeWhitespace(fs.readFileSync(builtTemplatePath, 'utf8'));
  const hardened = hardenEmailHtmlForMobile(builtHtml, { longTokenThreshold: 35 });
  if (hardened.breakInsertions > 0) {
    log(`Inserted ${hardened.breakInsertions} mobile break marker(s) in visible content`);
  }

  fs.writeFileSync(finalOutputPath, hardened.html, 'utf8');
  fs.rmSync(tempBuildDir, { recursive: true, force: true });

  log('Correspondence email built');
  log(`HTML: ${finalOutputPath}`);
  log('No archive URL, view-online link, unsubscribe link, or newsletter manifest was generated.');
}

buildCorrespondence().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
