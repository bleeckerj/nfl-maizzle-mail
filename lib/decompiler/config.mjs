// Single source of truth for decompiler configuration.
//
// Layering (highest priority wins):
//   1. Per-call overrides (CLI flag, function argument)
//   2. Decompiler-namespaced env vars (DECOMPILER_*) — set in .env
//   3. Shared env vars (ANTHROPIC_API_KEY) — set in .env
//   4. Hardcoded defaults below
//
// The DECOMPILER_* namespace exists so this pipeline doesn't collide with
// other tools in the repo that also read ANTHROPIC_MODEL (notably
// scripts/email-template-factory/). Set DECOMPILER_MODEL to point this
// pipeline at a specific model without disturbing the rest.

import dotenv from 'dotenv';

// override: true — some launching environments (e.g. the Claude Code desktop
// app) inject an empty ANTHROPIC_API_KEY into the subprocess env, which
// dotenv would otherwise refuse to replace.
// quiet: true — dotenv@17 prints a startup tip to stdout, which corrupts the
// MCP stdio JSON-RPC channel when this module is loaded by scripts/mcp-server.mjs.
dotenv.config({ override: true, quiet: true });

const DEFAULTS = Object.freeze({
  // Opus 4.7 is the validated default. Sonnet 4.0 (the value currently in
  // .env's shared ANTHROPIC_MODEL) reliably terminates the stream
  // mid-tool-input on real emails. Sonnet 4.6 works (tested on new-yorker).
  classifierModel: 'claude-opus-4-7',
  classifierMaxTokens: 64000,
  // Per-section HTML cap when sending evidence to the LLM. Sections rarely
  // exceed this in real emails; the truncation marker tells the model the
  // section was abbreviated for prompt size, not for output content.
  maxSectionHtmlChars: 6000,
  // Output locations (relative to repo root / cwd).
  templatesDir: 'templates',
  contentDir: 'content',
  reportDir: 'generated',
});

function intEnv(name) {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

// Read DECOMPILER_* env var, falling back to legacy DECOMPOSER_* if set
// (transitional — older .env files used the previous spelling).
function envWithLegacy(primary, legacy) {
  return process.env[primary] || process.env[legacy] || '';
}
function intEnvWithLegacy(primary, legacy) {
  return intEnv(primary) ?? intEnv(legacy);
}

export const config = Object.freeze({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  classifierModel: envWithLegacy('DECOMPILER_MODEL', 'DECOMPOSER_MODEL') || DEFAULTS.classifierModel,
  classifierMaxTokens:
    intEnvWithLegacy('DECOMPILER_MAX_TOKENS', 'DECOMPOSER_MAX_TOKENS') || DEFAULTS.classifierMaxTokens,
  maxSectionHtmlChars:
    intEnvWithLegacy('DECOMPILER_MAX_SECTION_HTML_CHARS', 'DECOMPOSER_MAX_SECTION_HTML_CHARS') ||
    DEFAULTS.maxSectionHtmlChars,
  templatesDir:
    envWithLegacy('DECOMPILER_TEMPLATES_DIR', 'DECOMPOSER_TEMPLATES_DIR') || DEFAULTS.templatesDir,
  contentDir:
    envWithLegacy('DECOMPILER_CONTENT_DIR', 'DECOMPOSER_CONTENT_DIR') || DEFAULTS.contentDir,
  reportDir: envWithLegacy('DECOMPILER_REPORT_DIR', 'DECOMPOSER_REPORT_DIR') || DEFAULTS.reportDir,
});

export const defaults = DEFAULTS;

export function withOverrides(overrides) {
  return { ...config, ...(overrides || {}) };
}
