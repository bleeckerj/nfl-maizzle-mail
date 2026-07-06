#!/usr/bin/env node

import process from 'node:process';

import dotenv from 'dotenv';

import { sendSesTestEmail } from '../lib/email-send/ses-test-mailer.mjs';
import { buildCorrespondenceEmail } from './build-correspondence.mjs';

dotenv.config();

function printUsage() {
  console.log('📧 Correspondence Test Sender');
  console.log('Usage: node scripts/send-correspondence-test.mjs <file.md|file.json> [output-name] [options]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/send-correspondence-test.mjs correspondence/client-note.md');
  console.log('  node scripts/send-correspondence-test.mjs correspondence/client-note.md client-note --dry-run');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run                  Build and validate without sending');
  console.log('  --skip-link-validation     Skip link validation for dry runs only');
  console.log('  --no-open                  Accepted for parity with build:correspondence');
  console.log('  --template=<name>          Template name passed to the builder');
  console.log('  --output-dir=<path>        Output directory passed to the builder');
  console.log('  --repo-root=<path>         Repository root override');
  console.log('  --strict-schema            Fail on schema validation warnings');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipLinkValidation = args.includes('--skip-link-validation');

if (args.includes('--allow-broken-links-for-visual-test')) {
  console.error(
    'Refusing to send: --allow-broken-links-for-visual-test is not permitted for outbound email sends.',
  );
  process.exit(1);
}

if (skipLinkValidation && !dryRun) {
  console.error('--skip-link-validation is only allowed with --dry-run.');
  process.exit(1);
}

if (!args.some((arg) => !arg.startsWith('--'))) {
  printUsage();
  process.exit(1);
}

const builderArgs = args.filter((arg) => !['--dry-run', '--skip-link-validation', '--send-test'].includes(arg));
if (!builderArgs.includes('--no-open')) {
  builderArgs.push('--no-open');
}

async function main() {
  const result = await buildCorrespondenceEmail({
    args: builderArgs,
    openPreview: false,
  });

  await sendSesTestEmail({
    htmlPath: result.finalOutputPath,
    subjectLine: result.data.subject || result.outputName,
    dryRun,
    validateLinks: !skipLinkValidation,
  });
}

main().catch((error) => {
  console.error('Failed to send correspondence test email via SES:', error.message || error);
  process.exit(1);
});
