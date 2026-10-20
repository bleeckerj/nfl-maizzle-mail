/**
 * Reject incomplete newsletter card schemas before generating authoring source.
 * Both public newsletter families share Dense Discovery's maintained controls.
 * Read that contract on every invocation so an existing MCP connection cannot
 * retain an older, incomplete schema. No draft or renderer output is written.
 */
import { readFileSync } from 'node:fs';
import { projectAuthoringSchema } from './authoring-contract.mjs';

const families = new Set(['dense-discovery', 'near-future-lab-daily-headlines']);
const sharedPath = new URL('../../templates/dense-discovery/newsletter.schema.json', import.meta.url);

export function requiresCompleteSocialCard(templateName) {
  return families.has(templateName);
}

export function assertSocialCardStarterSchema(schema, templateName) {
  templateName ||= schema.properties?.template?.const;
  if (!families.has(templateName)) return;
  const actual = schema.properties?.socialCard;
  if (!actual?.properties) throw new Error(`${templateName}: starter schema is missing the socialCard contract`);
  const shared = projectAuthoringSchema(JSON.parse(readFileSync(sharedPath, 'utf8'))).properties.socialCard;
  if (!shared?.properties) throw new Error('Shared starter schema is missing the socialCard contract');

  function check(fragment, reference, location) {
    for (const [key, field] of Object.entries(reference.properties || {})) {
      if (!Object.hasOwn(fragment?.properties || {}, key)) {
        throw new Error(`${templateName}: starter schema is missing ${location}.${key}`);
      }
      if (field.properties) check(fragment.properties[key], field, `${location}.${key}`);
    }
  }
  check(actual, shared, 'socialCard');
}
