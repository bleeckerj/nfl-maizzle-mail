#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import matter from 'gray-matter';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { LLMClient } from './email-template-factory/lib/llm-client.mjs';
import { buildMicrodropAssemblyPrompt, MICRODROP_ASSEMBLY_PROMPT_VERSION } from './microdrop-email-assembly/prompt.mjs';
import { MICRODROP_ASSEMBLY_SCHEMA } from './microdrop-email-assembly/schema.mjs';

const REPO_ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const TEMPLATE_NAME = 'microdrop-faithful';
const SUPPORTED_SECTION_TYPES = [
  'infra-product',
  'infra-image-heading',
  'infra-copy',
  'infra-subscribe',
  'infra-exposure',
  'infra-definition',
  'infra-pairing',
  'infra-compatibility',
  'infra-legal',
  'infra-about',
];

function printHelp() {
  console.log(`Usage: node scripts/assemble-microdrop-email.mjs --source-packet <path> --output-dir <path> [options]

Options:
  --source-packet <path>    Editorial source packet JSON.
  --output-dir <path>       Output bundle directory.
  --source-markdown <path>  Durable working Markdown path.
  --draft-only              Generate/reuse Markdown without a build.
  --regenerate              Generate a fresh agent draft without replacing email.md.
  --build-from-draft        Reuse email.md and skip the LLM.
  --provider <name>         LLM provider override: anthropic or openai.
  --model <name>            LLM model override.
  --fallback-only           Use the deterministic source-backed draft without an LLM call.
  --no-fallback              Fail instead of using deterministic source-backed Markdown.
  --help                    Show this help.`);
}

const { values } = parseArgs({
  options: {
    'source-packet': { type: 'string' },
    'output-dir': { type: 'string' },
    'source-markdown': { type: 'string' },
    'draft-only': { type: 'boolean', default: false },
    regenerate: { type: 'boolean', default: false },
    'build-from-draft': { type: 'boolean', default: false },
    provider: { type: 'string' },
    model: { type: 'string' },
    'fallback-only': { type: 'boolean', default: false },
    'no-fallback': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  printHelp();
  process.exit(0);
}

if (!values['source-packet'] || !values['output-dir']) {
  printHelp();
  process.exit(1);
}

const sourcePacketPath = path.resolve(values['source-packet']);
const outputDir = path.resolve(values['output-dir']);
const generatedMarkdownPath = path.join(outputDir, 'email.agent.md');
const workingMarkdownPath = values['source-markdown']
  ? path.resolve(values['source-markdown'])
  : path.join(outputDir, 'email.md');
const assemblyPlanPath = path.join(outputDir, 'assembly-plan.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readOptional(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function templatePacket() {
  const templateDir = path.join(REPO_ROOT, 'templates', TEMPLATE_NAME);
  return {
    name: TEMPLATE_NAME,
    schema: readJson(path.join(templateDir, 'newsletter.schema.json')),
    authoringGuide: readOptional(path.join(templateDir, 'AUTHORING.md')) || readOptional(path.join(templateDir, 'README.md')),
    sampleMarkdown: readOptional(path.join(templateDir, 'sample-content.md')),
    sectionStyles: readOptional(path.join(templateDir, 'section-styles.json')),
    supportedSectionTypes: SUPPORTED_SECTION_TYPES,
    compatibility: [
      'Use table-safe rendering through the existing Maizzle template.',
      'Use hosted HTTPS image URLs only.',
      'Preserve natural image aspect ratios.',
      'Do not emit JavaScript or interactive browser controls.',
    ],
  };
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function collectUrls(value, urls = new Set()) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) urls.add(value);
  if (Array.isArray(value)) value.forEach((item) => collectUrls(item, urls));
  if (value && typeof value === 'object') Object.values(value).forEach((item) => collectUrls(item, urls));
  return urls;
}

function validateDraft(markdown, sourcePacket, schema) {
  const parsed = matter(markdown);
  const errors = [];
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(parsed.data)) {
    errors.push(...(validate.errors || []).map((error) => `${error.instancePath || '/'} ${error.message}`));
  }
  if (/<[a-z][^>]*>/i.test(markdown)) {
    errors.push('Markdown contains HTML tags; emit YAML/frontmatter content only.');
  }
  if (parsed.data.template !== TEMPLATE_NAME) {
    errors.push(`template must be ${TEMPLATE_NAME}`);
  }
  const allowedUrls = collectUrls(sourcePacket);
  for (const url of collectUrls(parsed.data)) {
    if (!allowedUrls.has(url) && url !== '[unsubscribe]') {
      errors.push(`URL is not present in the source packet: ${url}`);
    }
  }
  return { valid: errors.length === 0, errors, data: parsed.data };
}

function image(image) {
  return image ? { src: image.src, alt: image.alt, width: image.width, height: image.height } : undefined;
}

function section(type, fields) {
  return { type, ...fields };
}

function fallbackSectionType(block) {
  if (block.id === 'navigation') return 'header.navigation';
  if (block.id === 'product-stage' || block.id === 'product-stage-views') return 'infra-product';
  if (block.id === 'think-different' || block.kind === 'context-feature') return 'infra-image-heading';
  if (block.id === 'intro-band' || block.id === 'sensor-system') return 'infra-copy';
  if (block.id === 'subscription-fallback') return 'infra-subscribe';
  if (block.id === 'exposure-profile') return 'infra-exposure';
  if (block.id === 'worn-context') return 'infra-definition';
  if (block.id === 'pairing-products') return 'infra-pairing';
  if (block.id === 'compatibility-service') return 'infra-compatibility';
  if (block.id === 'legal-disclosures') return 'infra-legal';
  if (block.id === 'about-in-world') return 'infra-about';
  return 'unmapped';
}

function fallbackAudit(sourcePacket) {
  const assemblyPlan = sourcePacket.blocks.map((block) => {
    const selectedSectionType = fallbackSectionType(block);
    const isHeaderContent = selectedSectionType === 'header.navigation';
    return {
      sourceBlockId: block.id,
      action: 'include',
      selectedSectionType,
      rationale: isHeaderContent
        ? 'Rendered in the email header navigation rather than as a body section.'
        : 'Included in the deterministic source-backed fallback in page order.',
    };
  });
  const sourceCoverage = assemblyPlan.map(({ sourceBlockId, selectedSectionType }) => ({
    sourceBlockId,
    status: 'included',
    selectedSectionType,
  }));
  return { assemblyPlan, sourceCoverage };
}

function deterministicDraft(sourcePacket) {
  const page = sourcePacket.page;
  const entry = sourcePacket.entry;
  const stage = page.productStage;
  const sections = [
    section('infra-product', {
      brand: page.brand,
      productName: page.productName,
      breadcrumb: page.navigation.local.join(' / '),
      eyebrow: stage.eyebrow,
      headline: stage.headline || stage.headlineFallback,
      dek: stage.dek || entry.summary,
      views: page.productStageViews || page.slides || sourcePacket.page.slides || [],
      price: stage.price,
      priceNote: stage.priceNote,
      configuration: stage.configuration.map(([label, value]) => ({ label, value })),
      regionalContainment: stage.regionalContainment,
      panelNote: stage.panelNote,
      canonicalUrl: entry.canonicalUrl,
    }),
    section('infra-image-heading', {
      eyebrow: 'Feature',
      heading: page.thinkDifferent.heading,
      image: image(page.thinkDifferent.image),
    }),
    section('infra-copy', page.intro),
    section('infra-subscribe', page.subscribe),
    section('infra-exposure', {
      ...page.exposure,
      image: image(page.exposure.image),
      metrics: page.exposure.metrics.map(([label, value, unit, note]) => ({ label, value, unit, note })),
      ledger: page.exposure.ledger.map(([label, value]) => ({ label, value })),
    }),
    section('infra-definition', {
      ...page.worn,
      image: image(page.worn.image),
      definitions: page.worn.definitions.map(([label, body]) => ({ label, body })),
    }),
    section('infra-copy', {
      ...page.sensor,
      image: image(page.sensor.image),
    }),
    section('infra-pairing', {
      ...page.pairing,
      cards: page.pairing.cards.map((card) => ({ ...card, images: card.images.map(image) })),
    }),
    ...page.contexts.map((context) => section('infra-image-heading', { ...context, image: image(context.image) })),
    section('infra-compatibility', {
      ...page.compatibility,
      items: page.compatibility.items.map(([label, value, body]) => ({ label, value, body })),
    }),
    section('infra-legal', {
      ...page.legal,
      items: page.legal.items.map(([heading, body]) => ({ heading, body })),
    }),
    section('infra-about', page.about),
  ];
  const data = {
    template: TEMPLATE_NAME,
    title: `${entry.title} — ${entry.brand}`,
    preheader: entry.summary || `${entry.brand}: ${entry.title}`,
    canonicalUrl: entry.canonicalUrl,
    theme: page.theme,
    header: {
      brandName: 'The Adjacency',
      sectionName: page.productName,
      logoUrl: page.logo?.src,
      logoAlt: page.logo?.alt,
      sourceBrand: page.brand,
      sourceDescription: 'A product page from an adjacent world',
      homepageLink: entry.canonicalUrl,
      navigation: page.navigation,
    },
    sections,
    footer: {
      brandName: 'The Adjacency',
      unsubscribeText: 'You are receiving this because you subscribed to The Adjacency updates.',
      unsubscribeLink: '[unsubscribe]',
      companyAddress: 'Near Future Laboratory',
      footerCta: { enabled: false },
      legalLinks: [
        { text: 'The Adjacency', url: entry.canonicalUrl },
      ],
    },
  };
  return `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n`;
}

async function assembleWithLlm(sourcePacket, template, repairContext = '') {
  const provider = values.provider || process.env.MICRODROP_EMAIL_PROVIDER || 'anthropic';
  const client = new LLMClient(provider, values.model || process.env.MICRODROP_EMAIL_MODEL || null);
  await client.initialize();
  return client.executeWithRetry(
    buildMicrodropAssemblyPrompt({ sourcePacket, templatePacket: template, repairContext }),
    MICRODROP_ASSEMBLY_SCHEMA,
    'Microdrop Email Assembly',
    2,
  );
}

async function generateDraft(sourcePacket, template, fallbackAllowed) {
  let repairContext = '';
  let lastResult;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await assembleWithLlm(sourcePacket, template, repairContext);
      lastResult = result;
      const validation = validateDraft(result.markdown, sourcePacket, template.schema);
      if (validation.valid) return { result, usedFallback: false };
      repairContext = `The previous draft failed deterministic validation. Repair it without changing sourced content. Errors:\n${validation.errors.join('\n')}\n\nPrevious draft:\n${result.markdown}`;
    } catch (error) {
      repairContext = `The previous attempt failed before producing a usable draft. Return a complete response. Error: ${error.message}`;
    }
  }
  if (!fallbackAllowed) {
    throw new Error(`Agent draft did not validate: ${JSON.stringify(lastResult?.warnings || [])}`);
  }
  const markdown = deterministicDraft(sourcePacket);
  const validation = validateDraft(markdown, sourcePacket, template.schema);
  if (!validation.valid) throw new Error(`Deterministic fallback did not validate: ${validation.errors.join('; ')}`);
  return {
    result: {
      ...fallbackAudit(sourcePacket),
      markdown,
      warnings: ['LLM assembly was unavailable or failed validation; used deterministic source-backed Markdown.'],
      promptVersion: MICRODROP_ASSEMBLY_PROMPT_VERSION,
    },
    usedFallback: true,
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const sourcePacket = readJson(sourcePacketPath);
  const template = templatePacket();

  if (values['build-from-draft']) {
    if (!fs.existsSync(workingMarkdownPath)) throw new Error(`Working Markdown not found: ${workingMarkdownPath}`);
    console.log(`Using existing microdrop Markdown: ${workingMarkdownPath}`);
    return;
  }

  if (fs.existsSync(workingMarkdownPath) && !values.regenerate) {
    console.log(`Reusing operator Markdown without inference: ${workingMarkdownPath}`);
    return;
  }

  console.log(`Assembling ${sourcePacket.entry.title} with ${template.name}...`);
  const { result, usedFallback } = values['fallback-only']
    ? (() => {
        const markdown = deterministicDraft(sourcePacket);
        return {
          result: {
            ...fallbackAudit(sourcePacket),
            markdown,
            warnings: ['Fallback-only mode.'],
            promptVersion: MICRODROP_ASSEMBLY_PROMPT_VERSION,
          },
          usedFallback: true,
        };
      })()
    : await generateDraft(sourcePacket, template, !values['no-fallback']);
  ensureParent(generatedMarkdownPath);
  fs.writeFileSync(generatedMarkdownPath, result.markdown, 'utf8');
  if (!fs.existsSync(workingMarkdownPath)) {
    ensureParent(workingMarkdownPath);
    fs.writeFileSync(workingMarkdownPath, result.markdown, 'utf8');
    console.log(`Initialized operator Markdown: ${workingMarkdownPath}`);
  } else {
    console.log(`Preserved operator Markdown: ${workingMarkdownPath}`);
  }
  fs.writeFileSync(assemblyPlanPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourcePacket: sourcePacketPath,
    template: TEMPLATE_NAME,
    promptVersion: result.promptVersion || MICRODROP_ASSEMBLY_PROMPT_VERSION,
    usedFallback,
    assemblyPlan: result.assemblyPlan,
    sourceCoverage: result.sourceCoverage,
    warnings: result.warnings,
    workingMarkdownPath,
    generatedMarkdownPath,
  }, null, 2)}\n`, 'utf8');
  console.log(`Agent draft: ${generatedMarkdownPath}`);
  console.log(`Working Markdown: ${workingMarkdownPath}`);
  if (values['draft-only']) return;
}

main().catch((error) => {
  console.error(`Microdrop email assembly failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
