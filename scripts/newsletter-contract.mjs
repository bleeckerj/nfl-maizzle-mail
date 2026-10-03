#!/usr/bin/env node
/**
 * Read-only JSON bridge for Backoffice and other authoring clients. Resolves the
 * maintained schema and returns the same authoring view and examples as the CLI
 * starter generator. No files, builds, network requests, or drafts are produced.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveTemplateContract } from '../lib/newsletter-core/authoring-contract.mjs';
import { generateSkeleton, validateStarter } from './generate-skeleton-from-schema.mjs';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const template = option('--template');
  const schemaPath = option('--schema') || (template && path.join(repoRoot, 'templates', template, 'newsletter.schema.json'));
  if (!schemaPath) throw new Error('Provide --schema <path> or --template <name>.');
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(raw);
  const contract = resolveTemplateContract(schema);
  const templateName = template || schema.properties?.template?.const || schema.properties?.template?.default || path.basename(path.dirname(schemaPath));
  const markdown = generateSkeleton(contract.authoringSchema, { templateName, allSectionFields: true, itemsPerSection: 1 });
  const examples = validateStarter(markdown, schema);
  process.stdout.write(JSON.stringify({ ...contract, template: templateName,
    schemaPath: path.resolve(schemaPath), schemaHash: createHash('sha256').update(raw).digest('hex'), examples,
  }));
} catch (error) {
  process.stderr.write(`Newsletter contract: ${error.message}\n`);
  process.exitCode = 1;
}
