// MCP Resources surface: lets LLM clients address template-related files by
// stable URI rather than burning a tool call. Per template installed under
// templates/, we expose:
//
//   nfl-maizzle-mail://template/<name>/authoring-guide  → AUTHORING.md (or fallback)
//   nfl-maizzle-mail://template/<name>/section-styles   → section-styles.json
//   nfl-maizzle-mail://template/<name>/schema           → newsletter.schema.json
//   nfl-maizzle-mail://template/<name>/decompilation-report → generated/<name>-decompilation-report.json
//
// resources/list lists what's available; resources/read returns the body.

import fs from 'fs';
import path from 'path';
import { config } from '../decompiler/config.mjs';

const URI_SCHEME = 'nfl-maizzle-mail';

function listInstalledTemplates(repoRoot) {
  const templatesRoot = path.join(repoRoot, config.templatesDir);
  if (!fs.existsSync(templatesRoot)) return [];
  return fs
    .readdirSync(templatesRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(templatesRoot, name, 'newsletter.html')));
}

export function listResources({ repoRoot }) {
  const templates = listInstalledTemplates(repoRoot);
  const resources = [];
  for (const name of templates) {
    const dir = path.join(repoRoot, config.templatesDir, name);
    const reportDir = path.join(repoRoot, config.reportDir);
    const authoringPath = path.join(dir, 'AUTHORING.md');
    const stylesPath = path.join(dir, 'section-styles.json');
    const schemaPath = path.join(dir, 'newsletter.schema.json');
    const reportPath = path.join(reportDir, `${name}-decompilation-report.json`);

    // Always expose authoring-guide — the get_template_authoring_guide tool
    // synthesizes a fallback when AUTHORING.md doesn't exist, so the resource
    // is always meaningful.
    resources.push({
      uri: `${URI_SCHEME}://template/${name}/authoring-guide`,
      name: `${name} — authoring guide`,
      description: fs.existsSync(authoringPath)
        ? `Per-template authoring guide for the "${name}" newsletter template.`
        : `Synthesized authoring summary for "${name}" (AUTHORING.md not yet generated — Phase A pending).`,
      mimeType: 'text/markdown',
    });

    if (fs.existsSync(stylesPath)) {
      resources.push({
        uri: `${URI_SCHEME}://template/${name}/section-styles`,
        name: `${name} — section styles`,
        description: `Design tokens (containerStyles/contentStyles/linkStyles/headingStyles) per discovered component type, plus global mobile font overrides.`,
        mimeType: 'application/json',
      });
    }

    if (fs.existsSync(schemaPath)) {
      resources.push({
        uri: `${URI_SCHEME}://template/${name}/schema`,
        name: `${name} — JSON schema`,
        description: `JSON Schema describing the data shape a newsletter Markdown file must follow for this template.`,
        mimeType: 'application/json',
      });
    }

    if (fs.existsSync(reportPath)) {
      resources.push({
        uri: `${URI_SCHEME}://template/${name}/decompilation-report`,
        name: `${name} — decompilation report`,
        description: `Raw analysis report from the decompiler: discovered component types, confidences, section assignments, model + cost.`,
        mimeType: 'application/json',
      });
    }
  }
  return { resources };
}

export function readResource({ repoRoot }, uri) {
  const parsed = parseUri(uri);
  if (!parsed) {
    throw new Error(`unrecognized URI: ${uri}`);
  }
  const { template, kind } = parsed;
  const dir = path.join(repoRoot, config.templatesDir, template);
  if (!fs.existsSync(dir)) {
    throw new Error(`template not found: ${template}`);
  }

  switch (kind) {
    case 'authoring-guide': {
      const authoringPath = path.join(dir, 'AUTHORING.md');
      if (fs.existsSync(authoringPath)) {
        return contentText(uri, fs.readFileSync(authoringPath, 'utf8'), 'text/markdown');
      }
      // Fall back to the synthesized guide. We could call the tool's handler
      // here, but to keep the module self-contained we inline the synthesis.
      return contentText(uri, synthesizeAuthoringGuide(repoRoot, template), 'text/markdown');
    }
    case 'section-styles': {
      const p = path.join(dir, 'section-styles.json');
      if (!fs.existsSync(p)) throw new Error(`section-styles.json not found for ${template}`);
      return contentText(uri, fs.readFileSync(p, 'utf8'), 'application/json');
    }
    case 'schema': {
      const p = path.join(dir, 'newsletter.schema.json');
      if (!fs.existsSync(p)) throw new Error(`newsletter.schema.json not found for ${template}`);
      return contentText(uri, fs.readFileSync(p, 'utf8'), 'application/json');
    }
    case 'decompilation-report': {
      const p = path.join(repoRoot, config.reportDir, `${template}-decompilation-report.json`);
      if (!fs.existsSync(p)) throw new Error(`decompilation report not found for ${template}`);
      return contentText(uri, fs.readFileSync(p, 'utf8'), 'application/json');
    }
    default:
      throw new Error(`unknown resource kind: ${kind}`);
  }
}

function parseUri(uri) {
  // nfl-maizzle-mail://template/<name>/<kind>
  const m = uri.match(/^nfl-maizzle-mail:\/\/template\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { template: decodeURIComponent(m[1]), kind: m[2] };
}

function contentText(uri, text, mimeType) {
  return { contents: [{ uri, mimeType, text }] };
}

// Mirror of the fallback synthesizer in tools.mjs so this module can serve
// resources without depending on the tool handler.
function synthesizeAuthoringGuide(repoRoot, name) {
  const dir = path.join(repoRoot, config.templatesDir, name);
  const reportPath = path.join(repoRoot, config.reportDir, `${name}-decompilation-report.json`);
  const stylesPath = path.join(dir, 'section-styles.json');
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
  const styles = fs.existsSync(stylesPath) ? JSON.parse(fs.readFileSync(stylesPath, 'utf8')) : null;
  const lines = [
    `# ${name} — authoring guide (fallback)`,
    '',
    '> AUTHORING.md has not been generated for this template yet (Phase A pending).',
    '> This is a minimal summary derived from the schema and decompilation report.',
    '',
  ];
  if (report?.components) {
    lines.push('## Section types', '');
    for (const c of report.components) {
      lines.push(`### \`${c.type}\` — ${c.displayName || c.type}`);
      if (c.description) lines.push('', c.description);
      if (c.slots) lines.push('', 'Slots: ' + c.slots.map((s) => `\`${s}\``).join(', '));
      if (typeof c.confidence === 'number')
        lines.push('', `Confidence: ${(c.confidence * 100).toFixed(0)}%`);
      lines.push('');
    }
  }
  if (styles?.globalOverrides?.mobileAdjustments) {
    lines.push(
      '## Mobile font lock',
      '',
      `Bumps body type larger on screens ≤ ${styles.globalOverrides.mobileBreakpoint}.`,
      ''
    );
  }
  lines.push(
    '## How to author',
    '',
    `1. Copy the source-rebuilt skeleton: \`content/${name}-source.md\` (full reconstruction of the original email).`,
    `2. Edit the \`sections:\` array in frontmatter to reorder/duplicate/remove sections.`,
    `3. Build: \`node scripts/build-newsletter.mjs content/your-issue.md <campaign-name> --template=${name}\`.`
  );
  return lines.join('\n');
}
