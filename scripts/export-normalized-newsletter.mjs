#!/usr/bin/env node

import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  loadNewsletterSource,
} from '../lib/newsletter-core/index.mjs';

function printHelp() {
  console.log(
    [
      'Export normalized newsletter JSON for downstream tooling.',
      '',
      'Usage:',
      '  node scripts/export-normalized-newsletter.mjs --issue-id <issue-id> [options]',
      '  node scripts/export-normalized-newsletter.mjs --input <path> [options]',
      '',
      'Options:',
      '  --issue-id <id>         Resolve source from sibling nfl-backoffice outbox data.',
      '  --input <path>          Explicit markdown or JSON source path.',
      '  --backoffice-root <p>   Override sibling nfl-backoffice root.',
      '  --repo-root <p>         Override nfl-maizzle-mail root.',
      '  --strict-schema         Fail on schema warnings.',
      '  --pretty                Pretty-print output JSON.',
      '  --help                  Show this help.',
    ].join('\n'),
  );
}

const { values } = parseArgs({
  allowPositionals: false,
  options: {
    'issue-id': { type: 'string' },
    input: { type: 'string' },
    'backoffice-root': { type: 'string' },
    'repo-root': { type: 'string' },
    'strict-schema': { type: 'boolean', default: false },
    pretty: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  printHelp();
  process.exit(0);
}

if (!values['issue-id'] && !values.input) {
  printHelp();
  process.exit(1);
}

const repoRoot = values['repo-root'] ? path.resolve(values['repo-root']) : process.cwd();

try {
  const result = loadNewsletterSource({
    repoRoot,
    inputPath: values.input,
    issueId: values['issue-id'],
    backofficeRoot: values['backoffice-root'],
    strictSchema: values['strict-schema'],
    args: values['strict-schema'] ? ['--strict-schema'] : [],
    logger: { log: (...args) => console.error(...args) },
  });

  const payload = {
    issueId: result.issueId,
    inputPath: result.sourcePath,
    sourceKind: result.sourceKind,
    template: result.templateName,
    newsletter: result.newsletterData,
  };

  const spacing = values.pretty ? 2 : 0;
  process.stdout.write(`${JSON.stringify(payload, null, spacing)}\n`);
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
