#!/usr/bin/env node

// Decompile an existing HTML email into a reusable component palette:
// emits a Maizzle template (components/, layout, newsletter.html, schema,
// section-styles.json) plus a starter Markdown skeleton that reconstructs
// the source email using its own discovered components.
//
// Usage:
//   node scripts/decompile-email.mjs <input.html> [template-name] [flags]
//
// Flags:
//   --dry-run         deterministic pass only (segmenter + style harvester),
//                     no LLM, no template files. Writes a report you can inspect.
//   --classify-only   run segmenter + classifier and save the raw LLM envelope,
//                     but do NOT emit a Maizzle template / skeleton yet.
//                     Use this to inspect classifier quality before committing
//                     to a template directory.
//   --from-cache      reuse generated/<name>-classifier-output.json from a
//                     previous run — no API call.
//   --model=<id>      override the classifier model for this run only.
//                     Defaults to DECOMPILER_MODEL from .env, then to
//                     claude-opus-4-7. See lib/decompiler/config.mjs.

import fs from 'fs';
import path from 'path';
import { config } from '../lib/decompiler/config.mjs';
import { segment } from '../lib/decompiler/segmenter.mjs';
import { harvest } from '../lib/decompiler/styles.mjs';
import { classify } from '../lib/decompiler/classifier.mjs';
import { emit } from '../lib/decompiler/emitter.mjs';

const args = process.argv.slice(2);
if (args.length < 1 || args[0].startsWith('-')) {
  console.error('Usage: node scripts/decompile-email.mjs <input.html> [template-name] [--dry-run|--classify-only]');
  process.exit(1);
}

const inputFile = args[0];
let templateName = null;
let dryRun = false;
let classifyOnly = false;
let fromCache = false;
let modelOverride = null;
for (const a of args.slice(1)) {
  if (a === '--dry-run') dryRun = true;
  else if (a === '--classify-only') classifyOnly = true;
  else if (a === '--from-cache') fromCache = true;
  else if (a.startsWith('--model=')) modelOverride = a.split('=')[1];
  else if (!a.startsWith('-') && !templateName) templateName = a;
}
if (!templateName) {
  templateName = path.basename(inputFile, path.extname(inputFile));
}

if (!fs.existsSync(inputFile)) {
  console.error(`Input file "${inputFile}" not found`);
  process.exit(1);
}

const html = fs.readFileSync(inputFile, 'utf8');
const { root, candidates } = segment(html);

console.log(`Source: ${inputFile}`);
console.log(`Template name: ${templateName}`);
console.log(`Layout root: <${root.tagName.toLowerCase()}${root.getAttribute('class') ? '.' + root.getAttribute('class').split(/\s+/).join('.') : ''}>`);
console.log(`Candidate sections: ${candidates.length}`);
console.log('');

const sections = candidates.map((c) => ({
  index: c.index,
  tag: c.tag,
  className: c.className,
  id: c.id,
  textSnippet: c.textSnippet,
  textLength: c.textLength,
  imageCount: c.imageCount,
  linkCount: c.linkCount,
  headings: c.headings,
  images: c.images,
  links: c.links,
  styles: harvest(c),
  outerHTMLLength: c.outerHTML.length,
}));

for (const s of sections) {
  const tag = s.className ? `${s.tag}.${s.className.split(/\s+/).join('.')}` : s.tag;
  console.log(`[${String(s.index).padStart(2)}] <${tag}>  ${s.imageCount}img ${s.linkCount}link  ${s.textLength}c`);
  console.log(`     "${s.textSnippet.slice(0, 90)}${s.textSnippet.length > 90 ? '…' : ''}"`);
  const c = s.styles.contentStyles;
  if (c.fontFamily || c.fontSize || c.color) {
    const bits = [];
    if (c.fontFamily) bits.push(c.fontFamily.replace(/['"]/g, '').slice(0, 30));
    if (c.fontSize) bits.push(c.fontSize);
    if (c.color) bits.push(c.color);
    console.log(`     styles: ${bits.join(' / ')}`);
  }
}

const reportDir = config.reportDir;
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `${templateName}-decompiler-report.json`);
const report = {
  source: inputFile,
  templateName,
  layoutRoot: root.tagName.toLowerCase(),
  sectionCount: sections.length,
  sections,
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('');
console.log(`Segmentation report: ${reportPath}`);

if (dryRun) {
  console.log('Dry-run complete. Re-run without --dry-run to invoke the classifier.');
  process.exit(0);
}

// Pass the original candidate objects (which carry styles + element refs) to the classifier.
// We re-decorate them with the harvested styles so the LLM sees the same evidence.
const enrichedCandidates = candidates.map((c) => ({
  ...c,
  styles: harvest(c),
  element: undefined,
}));

const classifierPath = path.join(reportDir, `${templateName}-classifier-output.json`);
let classifierResult;

if (fromCache) {
  if (!fs.existsSync(classifierPath)) {
    console.error(`--from-cache: no cached classifier output at ${classifierPath}`);
    process.exit(3);
  }
  const cached = JSON.parse(fs.readFileSync(classifierPath, 'utf8'));
  classifierResult = { result: cached.result, usage: cached.usage, model: cached.model };
  console.log(`Reusing cached classifier output: ${classifierPath}`);
} else {
  const effectiveModel = modelOverride || config.classifierModel;
  console.log('');
  console.log(`Calling classifier (model: ${effectiveModel})...`);
  const t0 = Date.now();
  let lastReport = 0;
  try {
    classifierResult = await classify(enrichedCandidates, {
      sourceLabel: inputFile,
      model: modelOverride,
      onProgress: (chars) => {
        if (chars - lastReport >= 4000) {
          process.stderr.write(`  ${chars.toLocaleString()} chars streamed\r`);
          lastReport = chars;
        }
      },
    });
    process.stderr.write('\n');
  } catch (err) {
    console.error(`Classifier failed: ${err.message}`);
    process.exit(3);
  }
  const elapsedMs = Date.now() - t0;
  fs.writeFileSync(
    classifierPath,
    JSON.stringify(
      {
        source: inputFile,
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
  console.log(`Tokens: ${classifierResult.usage.input_tokens} in / ${classifierResult.usage.output_tokens} out  (${elapsedMs}ms)`);
}

const { components, sectionAssignments } = classifierResult.result;
console.log(`Classifier returned ${components.length} component type(s) for ${sectionAssignments.length} section(s).`);
for (const comp of components) {
  console.log(
    `  - ${comp.type} (${comp.displayName}) — used by sections [${comp.sectionIndexes.join(', ')}], confidence ${comp.confidence}`
  );
}
console.log(`Classifier output: ${classifierPath}`);

if (classifyOnly) {
  console.log('--classify-only set; skipping template emission.');
  process.exit(0);
}

// Re-segment the source to capture the styles per section that the emitter
// needs (the classifier doesn't echo the harvested styles back).
const segmentationForEmit = {
  sections,
  root,
};

console.log('');
console.log('Emitting template artifacts...');
const written = emit({
  repoRoot: process.cwd(),
  templateName,
  sourcePath: inputFile,
  segmentation: segmentationForEmit,
  classifier: classifierResult,
});

console.log(`Template:       ${path.relative(process.cwd(), written.templateDir)}/`);
console.log(`Components:     ${path.relative(process.cwd(), written.componentsDir)}/  (${Object.keys(classifierResult.result.components.reduce((a, c) => { a[c.type] = 1; return a; }, {})).length} files)`);
console.log(`Layout:         ${path.relative(process.cwd(), written.layoutPath)}`);
console.log(`Newsletter:     ${path.relative(process.cwd(), written.newsletterPath)}`);
console.log(`Section styles: ${path.relative(process.cwd(), written.sectionStylesPath)}`);
console.log(`Schema:         ${path.relative(process.cwd(), written.schemaPath)}`);
console.log(`Skeleton MD:    ${path.relative(process.cwd(), written.skeletonPath)}`);
console.log(`Report:         ${path.relative(process.cwd(), written.reportPath)}`);
console.log('');
console.log('Next step (round-trip): build the decompiled template against the skeleton, e.g.');
console.log(`  node scripts/md_to_json.mjs ${path.relative(process.cwd(), written.skeletonPath)} data/${templateName}.json --template=${templateName}`);
console.log(`  node scripts/build-template.mjs --template=${templateName}`);
