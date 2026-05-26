// MCP tool implementations. Each export is a {definition, handler} pair the
// server registers. The definitions follow MCP's tool spec (name, description,
// input JSON schema). Handlers return { content: [{type:'text', text:'...'}] }
// or throw to surface a structured error.
//
// All file paths in arguments are interpreted relative to the configured repo
// root (lib/mcp/server.mjs sets this from import.meta.url so cwd doesn't
// matter when the server is launched from an arbitrary location).

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import matter from 'gray-matter';
import { config } from '../decompiler/config.mjs';
import { segment } from '../decompiler/segmenter.mjs';
import { harvest } from '../decompiler/styles.mjs';
import { classify } from '../decompiler/classifier.mjs';
import { emit } from '../decompiler/emitter.mjs';

const execFileP = promisify(execFile);

// ---------- helpers ----------

function resolveInRepo(repoRoot, p) {
  if (!p) throw new Error('path argument required');
  return path.isAbsolute(p) ? p : path.join(repoRoot, p);
}

function ok(text) {
  return { content: [{ type: 'text', text }] };
}

function json(obj) {
  return ok(JSON.stringify(obj, null, 2));
}

function templateDir(repoRoot, name) {
  return path.join(repoRoot, config.templatesDir, name);
}

function ensureTemplateExists(repoRoot, name) {
  const dir = templateDir(repoRoot, name);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `template "${name}" not found at ${dir}. Run decompile_email first, or check list_templates.`
    );
  }
  return dir;
}

// ---------- decompile_email ----------

export function decompileEmail({ repoRoot }) {
  return {
    definition: {
      name: 'decompile_email',
      description:
        'Decompile an existing HTML email into a reusable Maizzle template + Markdown skeleton. Discovers component types (open vocabulary), extracts design tokens, and emits a complete authoring kit under templates/<name>/ and content/<name>-source.md. Long-running (1-5 min) — the classifier call dominates.',
      inputSchema: {
        type: 'object',
        properties: {
          html_path: {
            type: 'string',
            description: 'Path to the source HTML email file, relative to repo root or absolute.',
          },
          name: {
            type: 'string',
            description:
              'Template name to use under templates/. Defaults to the input filename stem.',
          },
          model: {
            type: 'string',
            description:
              'Override classifier model (e.g. "claude-sonnet-4-6"). Defaults to DECOMPILER_MODEL from .env.',
          },
          from_cache: {
            type: 'boolean',
            description:
              'Re-emit from a prior classifier output cache (generated/<name>-classifier-output.json) without re-calling the API. Use when you only changed the emitter.',
            default: false,
          },
        },
        required: ['html_path'],
      },
    },
    handler: async (args, ctx = {}) => {
      const { progress } = ctx;
      const htmlPath = resolveInRepo(repoRoot, args.html_path);
      if (!fs.existsSync(htmlPath)) throw new Error(`HTML file not found: ${htmlPath}`);
      const templateName = args.name || path.basename(htmlPath, path.extname(htmlPath));
      progress?.(1, 100, `segmenting ${path.basename(htmlPath)}`);
      const html = fs.readFileSync(htmlPath, 'utf8');
      const { root, candidates } = segment(html);
      progress?.(10, 100, `found ${candidates.length} candidate sections`);
      const sections = candidates.map((c) => ({
        index: c.index,
        tag: c.tag,
        className: c.className,
        textSnippet: c.textSnippet,
        textLength: c.textLength,
        imageCount: c.imageCount,
        linkCount: c.linkCount,
        styles: harvest(c),
      }));

      // Persist the segmentation report.
      const reportDir = path.join(repoRoot, config.reportDir);
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportDir, `${templateName}-decompiler-report.json`),
        JSON.stringify(
          { source: htmlPath, templateName, layoutRoot: root.tagName.toLowerCase(), sections },
          null,
          2
        )
      );

      // Classifier (cache or live)
      const classifierPath = path.join(reportDir, `${templateName}-classifier-output.json`);
      let classifierResult;
      if (args.from_cache) {
        if (!fs.existsSync(classifierPath)) {
          throw new Error(
            `from_cache requested but no cache at ${classifierPath} — run without from_cache first.`
          );
        }
        progress?.(50, 100, 'reusing cached classifier output');
        const cached = JSON.parse(fs.readFileSync(classifierPath, 'utf8'));
        classifierResult = { result: cached.result, usage: cached.usage, model: cached.model };
      } else {
        const enriched = candidates.map((c) => ({
          ...c,
          styles: harvest(c),
          element: undefined,
        }));
        const t0 = Date.now();
        progress?.(15, 100, `calling classifier (${args.model || 'default model'})`);
        // The classifier streams its tool-input incrementally; hook the
        // char-count callback to push progress updates back to the MCP client.
        // We don't know total upfront — cap the streamed-segment at 80% of
        // overall progress so emission has room (15%) to finish.
        let lastReportedChars = 0;
        classifierResult = await classify(enriched, {
          sourceLabel: htmlPath,
          model: args.model,
          onProgress: (chars) => {
            if (chars - lastReportedChars < 4000) return;
            lastReportedChars = chars;
            // Rough heuristic: assume ~40K output chars typical. Bound 15-80%.
            const pct = Math.min(80, 15 + Math.floor((chars / 40000) * 65));
            progress?.(pct, 100, `classifier streaming (${chars.toLocaleString()} chars)`);
          },
        });
        const elapsedMs = Date.now() - t0;
        progress?.(85, 100, `classifier complete (${classifierResult.usage.output_tokens} output tokens, ${elapsedMs}ms)`);
        fs.writeFileSync(
          classifierPath,
          JSON.stringify(
            {
              source: htmlPath,
              templateName,
              model: classifierResult.model,
              usage: classifierResult.usage,
              elapsedMs,
              result: classifierResult.result,
            },
            null,
            2
          )
        );
      }

      progress?.(90, 100, 'emitting template artifacts');
      const written = emit({
        repoRoot,
        templateName,
        sourcePath: htmlPath,
        segmentation: { sections, root },
        classifier: classifierResult,
      });

      const { components, sectionAssignments } = classifierResult.result;
      progress?.(100, 100, `done — ${components.length} component types`);
      return json({
        templateName,
        source: htmlPath,
        model: classifierResult.model,
        usage: classifierResult.usage,
        sectionCount: sections.length,
        componentTypes: components.map((c) => ({
          type: c.type,
          displayName: c.displayName,
          sections: c.sectionIndexes,
          slots: c.slots.map((s) => s.name),
          confidence: c.confidence,
        })),
        assignments: sectionAssignments.map((a) => ({
          index: a.index,
          type: a.type,
          confidence: a.confidence,
        })),
        artifacts: {
          templateDir: path.relative(repoRoot, written.templateDir),
          newsletter: path.relative(repoRoot, written.newsletterPath),
          layout: path.relative(repoRoot, written.layoutPath),
          sectionStyles: path.relative(repoRoot, written.sectionStylesPath),
          schema: path.relative(repoRoot, written.schemaPath),
          sourceSkeleton: path.relative(repoRoot, written.skeletonPath),
          report: path.relative(repoRoot, written.reportPath),
        },
        nextSteps: [
          `build_newsletter with content_md_path=${path.relative(repoRoot, written.skeletonPath)} to round-trip the source rebuild.`,
          'list_templates to see all installed templates.',
          'get_template_schema to retrieve the authoring schema.',
        ],
      });
    },
  };
}

// ---------- list_templates ----------

export function listTemplates({ repoRoot }) {
  return {
    definition: {
      name: 'list_templates',
      description:
        'List all newsletter templates installed under templates/ in this repo, with each template\'s component palette and confidence summary (when a decompilation report exists). Useful for an LLM to know which templates are available before authoring.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    handler: async () => {
      const templatesRoot = path.join(repoRoot, config.templatesDir);
      if (!fs.existsSync(templatesRoot)) return json({ templates: [] });
      const entries = fs.readdirSync(templatesRoot, { withFileTypes: true });
      const templates = [];
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const name = e.name;
        const dir = path.join(templatesRoot, name);
        if (!fs.existsSync(path.join(dir, 'newsletter.html'))) continue;
        const reportPath = path.join(
          repoRoot,
          config.reportDir,
          `${name}-decompilation-report.json`
        );
        const stylesPath = path.join(dir, 'section-styles.json');
        let palette = null;
        if (fs.existsSync(reportPath)) {
          const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          palette = (r.components || []).map((c) => ({
            type: c.type,
            displayName: c.displayName,
            sectionIndexes: c.sectionIndexes,
            confidence: c.confidence,
          }));
        } else if (fs.existsSync(stylesPath)) {
          const s = JSON.parse(fs.readFileSync(stylesPath, 'utf8'));
          palette = Object.entries(s.sectionStyles || {}).map(([type, def]) => ({
            type,
            displayName: def.name || type,
          }));
        }
        templates.push({
          name,
          dir: path.relative(repoRoot, dir),
          hasReport: fs.existsSync(reportPath),
          hasAuthoringGuide: fs.existsSync(path.join(dir, 'AUTHORING.md')),
          palette,
        });
      }
      return json({ templates });
    },
  };
}

// ---------- get_template_schema ----------

export function getTemplateSchema({ repoRoot }) {
  return {
    definition: {
      name: 'get_template_schema',
      description:
        'Return the JSON Schema describing the data shape a newsletter Markdown file must follow for the given template. Use this to validate your authoring before calling build_newsletter, or to feed the schema to an LLM as authoring context.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Template name (see list_templates).' },
        },
        required: ['name'],
      },
    },
    handler: async (args) => {
      const dir = ensureTemplateExists(repoRoot, args.name);
      const schemaPath = path.join(dir, 'newsletter.schema.json');
      if (!fs.existsSync(schemaPath))
        throw new Error(`schema not found for template "${args.name}" at ${schemaPath}`);
      return json(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));
    },
  };
}

// ---------- get_template_authoring_guide ----------

export function getTemplateAuthoringGuide({ repoRoot }) {
  return {
    definition: {
      name: 'get_template_authoring_guide',
      description:
        'Return the per-template authoring guide (AUTHORING.md) for the given template if it exists. Falls back to a generated summary from the schema + decompilation report if AUTHORING.md has not yet been produced (Phase A pending).',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
    handler: async (args) => {
      const dir = ensureTemplateExists(repoRoot, args.name);
      const authoringPath = path.join(dir, 'AUTHORING.md');
      if (fs.existsSync(authoringPath)) {
        return ok(fs.readFileSync(authoringPath, 'utf8'));
      }
      // Fallback: synthesize a brief guide from the schema + report.
      const reportPath = path.join(
        repoRoot,
        config.reportDir,
        `${args.name}-decompilation-report.json`
      );
      const schemaPath = path.join(dir, 'newsletter.schema.json');
      const stylesPath = path.join(dir, 'section-styles.json');
      const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
      const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : null;
      const styles = fs.existsSync(stylesPath) ? JSON.parse(fs.readFileSync(stylesPath, 'utf8')) : null;
      const lines = [
        `# ${args.name} — authoring guide (fallback)`,
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
        `1. Copy the source-rebuilt skeleton: \`content/${args.name}-source.md\` (full reconstruction of the original email).`,
        `2. Edit the \`sections:\` array in frontmatter to reorder/duplicate/remove sections.`,
        `3. Build: \`node scripts/build-newsletter.mjs content/your-issue.md <campaign-name> --template=${args.name}\`.`,
        '',
        '## Inline style overrides (Phase A — not yet wired)',
        '',
        'When AUTHORING.md is generated, this section will document the per-section `containerStyles` / `contentStyles` overrides supported by the canonical pipeline (the dense-discovery pattern).'
      );
      return ok(lines.join('\n'));
    },
  };
}

// ---------- validate_newsletter_markdown ----------

export function validateNewsletterMarkdown({ repoRoot }) {
  return {
    definition: {
      name: 'validate_newsletter_markdown',
      description:
        'Validate a newsletter Markdown file against its template schema before building. Returns errors and warnings. Run this before build_newsletter to catch issues early.',
      inputSchema: {
        type: 'object',
        properties: {
          content_md_path: { type: 'string' },
          template: {
            type: 'string',
            description:
              'Template name. If omitted, taken from the markdown frontmatter `template:` field.',
          },
        },
        required: ['content_md_path'],
      },
    },
    handler: async (args) => {
      const mdPath = resolveInRepo(repoRoot, args.content_md_path);
      if (!fs.existsSync(mdPath)) throw new Error(`Markdown file not found: ${mdPath}`);
      // Reuse the existing lint script — it already understands frontmatter +
      // template resolution + schema validation.
      const { stdout, stderr } = await execFileP(
        'node',
        [
          'scripts/lint-template.mjs',
          mdPath,
          ...(args.template ? [`--template=${args.template}`] : []),
        ],
        { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 }
      ).catch((e) => ({ stdout: e.stdout || '', stderr: e.stderr || e.message }));
      return ok(
        [stdout && `--- lint output ---\n${stdout}`, stderr && `--- stderr ---\n${stderr}`]
          .filter(Boolean)
          .join('\n\n')
      );
    },
  };
}

// ---------- build_newsletter ----------

export function buildNewsletter({ repoRoot }) {
  return {
    definition: {
      name: 'build_newsletter',
      description:
        'Run the canonical newsletter build pipeline (scripts/build-newsletter.mjs) against a content Markdown file. Produces the production HTML with link tracking, mobile font hardening, schema validation, and image URL checks. This is the canonical path — do not bypass with raw `maizzle build`.',
      inputSchema: {
        type: 'object',
        properties: {
          content_md_path: { type: 'string' },
          campaign_name: {
            type: 'string',
            description:
              'Optional campaign label used in the output filename (build_production/<campaign>.html).',
          },
          template: { type: 'string', description: 'Optional template override.' },
        },
        required: ['content_md_path'],
      },
    },
    handler: async (args) => {
      const mdPath = resolveInRepo(repoRoot, args.content_md_path);
      if (!fs.existsSync(mdPath)) throw new Error(`Markdown file not found: ${mdPath}`);
      const cliArgs = [
        'scripts/build-newsletter.mjs',
        mdPath,
        ...(args.campaign_name ? [args.campaign_name] : []),
        ...(args.template ? [`--template=${args.template}`] : []),
        '--no-open',
      ];
      const { stdout, stderr } = await execFileP('node', cliArgs, {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024,
      }).catch((e) => {
        const out = [e.stdout || '', e.stderr || ''].filter(Boolean).join('\n');
        throw new Error(`build-newsletter failed (exit ${e.code}):\n${out}`);
      });
      return ok(
        [
          stdout && `--- build output ---\n${stdout}`,
          stderr && `--- stderr ---\n${stderr}`,
        ]
          .filter(Boolean)
          .join('\n\n')
      );
    },
  };
}

// ---------- add_section ----------

function loadTemplatePalette(repoRoot, name) {
  // Prefer the classifier output (has full slot definitions per type with
  // kind + description). Fall back to the section-styles.json (which only
  // knows the types and display names) if no classifier output exists for
  // hand-built templates.
  const classifierPath = path.join(
    repoRoot,
    config.reportDir,
    `${name}-classifier-output.json`
  );
  if (fs.existsSync(classifierPath)) {
    const cached = JSON.parse(fs.readFileSync(classifierPath, 'utf8'));
    return {
      source: 'classifier',
      types: new Map(cached.result.components.map((c) => [c.type, c])),
    };
  }
  const stylesPath = path.join(repoRoot, config.templatesDir, name, 'section-styles.json');
  if (fs.existsSync(stylesPath)) {
    const styles = JSON.parse(fs.readFileSync(stylesPath, 'utf8'));
    const types = new Map();
    for (const [type, def] of Object.entries(styles.sectionStyles || {})) {
      types.set(type, {
        type,
        displayName: def.name || type,
        description: def.description || '',
        slots: [], // unknown — hand-built template, no slot manifest
      });
    }
    return { source: 'styles', types };
  }
  return null;
}

export function addSection({ repoRoot }) {
  return {
    definition: {
      name: 'add_section',
      description:
        'Insert a new section into an existing newsletter Markdown file. Validates the section type against the template palette, warns on unknown slots, and rewrites the file with the new section inserted at the requested position. Use this when an LLM is helping a user iteratively author a newsletter ("add an article_card_pair for this URL").',
      inputSchema: {
        type: 'object',
        properties: {
          content_md_path: {
            type: 'string',
            description: 'Path to the newsletter Markdown file to modify.',
          },
          type: {
            type: 'string',
            description:
              'Section type (must be present in the template palette — use list_templates or get_template_authoring_guide to discover).',
          },
          item_values: {
            type: 'object',
            description:
              'Slot name → value map. Slot names depend on the section type; use get_template_authoring_guide to see them.',
            additionalProperties: true,
          },
          position: {
            description:
              'Where to insert. "end" (default) appends. "start" prepends. A number inserts AFTER the section at that index (0-based).',
            anyOf: [{ type: 'string', enum: ['start', 'end'] }, { type: 'integer', minimum: -1 }],
            default: 'end',
          },
          template: {
            type: 'string',
            description:
              'Optional template override (otherwise read from frontmatter).',
          },
        },
        required: ['content_md_path', 'type', 'item_values'],
      },
    },
    handler: async (args) => {
      const mdPath = resolveInRepo(repoRoot, args.content_md_path);
      if (!fs.existsSync(mdPath)) throw new Error(`Markdown file not found: ${mdPath}`);
      const raw = fs.readFileSync(mdPath, 'utf8');
      const parsed = matter(raw);
      const frontmatter = parsed.data || {};
      const templateName = args.template || frontmatter.template;
      if (!templateName) {
        throw new Error(
          `cannot resolve template — provide template arg or add "template:" to frontmatter`
        );
      }
      const palette = loadTemplatePalette(repoRoot, templateName);
      if (!palette) {
        throw new Error(
          `no palette found for template "${templateName}" — neither classifier output nor section-styles.json exist`
        );
      }
      const compDef = palette.types.get(args.type);
      if (!compDef) {
        const available = [...palette.types.keys()].join(', ');
        throw new Error(
          `unknown section type "${args.type}" for template "${templateName}". Available: ${available}`
        );
      }
      // Slot validation (best-effort — only when classifier output is available).
      const warnings = [];
      if (palette.source === 'classifier' && Array.isArray(compDef.slots) && compDef.slots.length) {
        const knownSlots = new Set(compDef.slots.map((s) => s.name));
        const providedSlots = new Set(Object.keys(args.item_values || {}));
        for (const slot of compDef.slots) {
          if (!providedSlots.has(slot.name)) {
            warnings.push(`missing slot "${slot.name}" (${slot.kind}) — ${slot.description || ''}`);
          }
        }
        for (const provided of providedSlots) {
          if (!knownSlots.has(provided)) {
            warnings.push(
              `unknown slot "${provided}" — not in palette. Known slots: ${[...knownSlots].join(', ')}`
            );
          }
        }
      }

      // Build the new section object.
      const newSection = { type: args.type, ...args.item_values };

      // Insert at the right position.
      const sections = Array.isArray(frontmatter.sections) ? [...frontmatter.sections] : [];
      let insertAt;
      const pos = args.position ?? 'end';
      if (pos === 'end') insertAt = sections.length;
      else if (pos === 'start') insertAt = 0;
      else if (typeof pos === 'number') {
        if (pos < -1 || pos >= sections.length) {
          insertAt = sections.length;
        } else {
          insertAt = pos + 1;
        }
      } else {
        insertAt = sections.length;
      }
      sections.splice(insertAt, 0, newSection);

      // Write back. gray-matter handles YAML serialization.
      const updatedFrontmatter = { ...frontmatter, sections };
      const out = matter.stringify(parsed.content, updatedFrontmatter);
      fs.writeFileSync(mdPath, out);

      return json({
        file: path.relative(repoRoot, mdPath),
        template: templateName,
        sectionType: args.type,
        insertedAtIndex: insertAt,
        totalSections: sections.length,
        warnings,
        recommendation:
          warnings.length > 0
            ? 'Run validate_newsletter_markdown to confirm the file is buildable.'
            : 'Section inserted cleanly. Run build_newsletter to render.',
      });
    },
  };
}

// ---------- registration helper ----------

export function buildAllTools(opts) {
  return [
    decompileEmail(opts),
    listTemplates(opts),
    getTemplateSchema(opts),
    getTemplateAuthoringGuide(opts),
    validateNewsletterMarkdown(opts),
    buildNewsletter(opts),
    addSection(opts),
  ];
}
