#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { validateRenderedHtmlLinks } from '../lib/newsletter-core/index.mjs';

dotenv.config();

const DEFAULT_HTML_PATH = 'workflow-test.html';
if (process.argv.includes('--allow-broken-links-for-visual-test')) {
  console.error(
    'Refusing to send: --allow-broken-links-for-visual-test is not permitted for outbound email sends.'
  );
  process.exit(1);
}
const htmlArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const htmlPath = resolve(process.cwd(), htmlArg ?? DEFAULT_HTML_PATH);
const fromAddress = process.env.SES_FROM;
const toAddresses = process.env.SES_TO?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [];
const subjectLine = process.env.SES_SUBJECT || 'Newsletter Test from Maizzle Workflow';
const region = process.env.AWS_REGION || 'us-west-2';

if (!fromAddress || toAddresses.length === 0) {
  console.error('Missing SES_FROM or SES_TO environment variables.');
  process.exit(1);
}

async function main() {
  const htmlBody = await readFile(htmlPath, 'utf8');
  await validateRenderedHtmlLinks(htmlBody);

  const clientConfig = { region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new SESClient(clientConfig);
  const command = new SendEmailCommand({
    Source: fromAddress,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subjectLine,
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await client.send(command);
  console.log(`✓ Sent ${htmlPath} to ${toAddresses.join(', ')} via SES (${region}).`);
}

main().catch((error) => {
  console.error('Failed to send test email via SES:', error.message || error);
  process.exit(1);
});
