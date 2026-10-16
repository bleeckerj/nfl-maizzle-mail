#!/usr/bin/env node

// Build the usual Maizzle HTML and a matching text alternative from one source.
// Inputs and output-directory options match build-correspondence.mjs. Both files
// use the same output name; the source file and Gmail drafts are not modified.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCorrespondenceEmail, openPreviewPath } from './build-correspondence.mjs';
import { renderCorrespondencePlainText } from '../lib/correspondence-email/plain-text.mjs';

export async function buildCorrespondenceOutputs({ args = process.argv.slice(2), logger = console } = {}) {
  if (args.includes('--send-test') || args.includes('send-test')) {
    throw new Error('This runner writes HTML and text files. Use build:correspondence for test sends.');
  }

  // Reuse validation, template selection, Maizzle compilation, and mobile
  // hardening. Open the preview only after both output files have been saved.
  const result = await buildCorrespondenceEmail({ args, openPreview: false, logger });
  const textOutputPath = path.join(result.outputDir, `${result.outputName}.txt`);
  fs.writeFileSync(textOutputPath, renderCorrespondencePlainText(result.data), 'utf8');
  logger.log(`Text: ${textOutputPath}`);
  if (!args.includes('--no-open')) openPreviewPath(result.finalOutputPath, { logger });
  return { ...result, textOutputPath };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  buildCorrespondenceOutputs().catch(error => {
    console.error(`Correspondence outputs failed: ${error.message}`);
    process.exitCode = 1;
  });
}
