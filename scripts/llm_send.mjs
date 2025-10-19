#!/usr/bin/env node

// llm_send.mjs
// CLI utility to send a combined prompt to OpenAI and save the response
// Usage: node llm_send.mjs --prompt=gpt-prompts/email-analysis-20251015T1254-combined.json [--output=llm-response.json]

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load .env config
dotenv.config();

const args = process.argv.slice(2);
let promptPath = null;
let outputPath = process.env.OUTPUT_FILE || 'llm-response.json';

for (const arg of args) {
  if (arg.startsWith('--prompt=')) {
    promptPath = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    outputPath = arg.split('=')[1];
  }
}

if (!promptPath) {
  console.error('❌ Please specify --prompt=path/to/combined.json');
  process.exit(1);
}


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Debug: Print API key (partially masked)
if (OPENAI_API_KEY) {
  const masked = OPENAI_API_KEY.slice(0, 6) + '...' + OPENAI_API_KEY.slice(-4);
  console.log(`🔑 Loaded OPENAI_API_KEY: ${masked}`);
} else {
  console.error('❌ OPENAI_API_KEY not set in .env');
  process.exit(1);
}

async function main() {
  // Load prompt
  const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
  const messages = promptData.messages || [];

  // Prepare OpenAI API request
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: OPENAI_MODEL,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: 0.2
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ OpenAI API error:', errText);
    console.error('🔎 Request body:', JSON.stringify(body, null, 2));
    console.error('🔎 Used API key:', OPENAI_API_KEY.slice(0, 6) + '...' + OPENAI_API_KEY.slice(-4));
    process.exit(1);
  }

  const result = await response.json();
  const llmResponse = result.choices?.[0]?.message?.content || '';

  fs.writeFileSync(outputPath, llmResponse);
  console.log(`✅ LLM response saved to ${outputPath}`);
}

main();
