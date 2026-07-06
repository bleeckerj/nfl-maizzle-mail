#!/usr/bin/env node
import { resolve } from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';

import { sendSesTestEmail } from '../lib/email-send/ses-test-mailer.mjs';

dotenv.config({ quiet: true });

const DEFAULT_HTML_PATH = 'workflow-test.html';
if (process.argv.includes('--allow-broken-links-for-visual-test')) {
  console.error(
    'Refusing to send: --allow-broken-links-for-visual-test is not permitted for outbound email sends.'
  );
  process.exit(1);
}
if (process.argv.includes('--skip-link-validation') && !process.argv.includes('--dry-run')) {
  console.error('--skip-link-validation is only allowed with --dry-run.');
  process.exit(1);
}

const htmlArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const htmlPath = resolve(process.cwd(), htmlArg ?? DEFAULT_HTML_PATH);

async function main() {
  await sendSesTestEmail({
    htmlPath,
    dryRun: process.argv.includes('--dry-run'),
    validateLinks: !process.argv.includes('--skip-link-validation'),
  });
}

main().catch((error) => {
  console.error('Failed to send test email via SES:', error.message || error);
  process.exit(1);
});
