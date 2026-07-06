import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { validateRenderedHtmlLinks } from '../newsletter-core/index.mjs';

export function resolveSesTestConfig({ subjectLine } = {}) {
  const fromAddress = process.env.SES_FROM;
  const toAddresses = process.env.SES_TO?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [];
  const region = process.env.AWS_REGION || 'us-west-2';
  const resolvedSubject = process.env.SES_SUBJECT || subjectLine || 'Newsletter Test from Maizzle Workflow';

  if (!fromAddress || toAddresses.length === 0) {
    throw new Error('Missing SES_FROM or SES_TO environment variables.');
  }

  return {
    fromAddress,
    toAddresses,
    region,
    subjectLine: resolvedSubject,
  };
}

export async function sendSesTestEmail({
  htmlPath,
  subjectLine,
  dryRun = false,
  validateLinks = true,
  logger = console,
} = {}) {
  if (!htmlPath) {
    throw new Error('htmlPath is required for SES test sends.');
  }

  const config = resolveSesTestConfig({ subjectLine });
  const htmlBody = await readFile(htmlPath, 'utf8');
  if (validateLinks) {
    await validateRenderedHtmlLinks(htmlBody);
  }

  if (dryRun) {
    logger.log(
      `✓ Dry run: ${htmlPath} is ready to send to ${config.toAddresses.join(', ')} via SES (${config.region}) with subject "${config.subjectLine}".`,
    );
    return { ...config, htmlPath, dryRun: true };
  }

  const clientConfig = { region: config.region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new SESClient(clientConfig);
  const command = new SendEmailCommand({
    Source: config.fromAddress,
    Destination: {
      ToAddresses: config.toAddresses,
    },
    Message: {
      Subject: {
        Data: config.subjectLine,
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
  logger.log(`✓ Sent ${htmlPath} to ${config.toAddresses.join(', ')} via SES (${config.region}).`);
  return { ...config, htmlPath, dryRun: false };
}
