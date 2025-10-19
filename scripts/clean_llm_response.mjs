#!/usr/bin/env node

// clean_llm_response.mjs
// Read an LLM response file that may contain markdown fences (```json ... ```)
// and write a cleaned JSON file suitable for downstream scripts like apply_gpt_analysis.mjs

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let input = null;
let output = 'gpt-analysis.json';

for (const arg of args) {
  if (arg.startsWith('--input=')) input = arg.split('=')[1];
  if (arg.startsWith('--output=')) output = arg.split('=')[1];
}

if (!input) {
  console.error('Usage: node scripts/clean_llm_response.mjs --input=llm-response.json [--output=gpt-analysis.json]');
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`❌ Input file not found: ${input}`);
  process.exit(1);
}

const raw = fs.readFileSync(input, 'utf8');

function extractJson(text) {
  // Try to extract a fenced JSON block first
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = text.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  // If no fence, try to find first { and last }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1).trim();
  }

  return null;
}

const candidate = extractJson(raw);
if (!candidate) {
  console.error('❌ Could not find JSON in the input file');
  process.exit(1);
}

// Validate JSON
try {
  const parsed = JSON.parse(candidate);
  fs.writeFileSync(output, JSON.stringify(parsed, null, 2));
  console.log(`✅ Cleaned JSON written to ${output}`);
} catch (err) {
  console.error('❌ Failed to parse JSON extracted from the file:');
  console.error(err.message);
  // Write raw candidate for debugging
  const debugPath = path.basename(output, path.extname(output)) + '.raw.json';
  fs.writeFileSync(debugPath, candidate);
  console.error(`🔎 Wrote extracted content to ${debugPath} for inspection`);
  process.exit(1);
}
