// LLM-driven classification of segmented email sections into a discovered
// component palette. Open-vocabulary: the model invents the type names that
// best fit the source email — it does NOT map into an existing taxonomy.
//
// Input:  array of { index, tag, className, textSnippet, imageCount, linkCount,
//                    headings, images, links, outerHTML, styles }
// Output: {
//   components: [
//     {
//       type: "masthead",            // snake-case identifier
//       displayName: "Masthead",     // human-readable
//       description: "...",
//       sectionIndexes: [0],         // which input sections belong to this type
//       template: "...",             // Maizzle component HTML with {{slots}}
//       slots: [ { name, kind, description } ],
//       confidence: 0.95,
//       notes: "..."
//     },
//     ...
//   ],
//   sectionAssignments: [             // one entry per input section, in order
//     { index, type, confidence, itemValues: { slot: value } }
//   ]
// }

import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.mjs';

const SYSTEM_PROMPT = `You are a careful HTML-email decompiler. You are given an ordered list of structural sections extracted from one real email newsletter. Your job is to discover the email's component palette — the small set of reusable "component types" that, in combination, compose the whole email — and return a structured plan for emitting Maizzle template partials and a data skeleton.

CORE RULES
1. OPEN VOCABULARY. Invent component-type names that fit THIS email. Do NOT map to any pre-existing taxonomy. Use snake-case identifiers (e.g. \`masthead\`, \`byline\`, \`lead_story\`, \`article_card\`, \`link_list\`, \`promo_banner\`, \`colophon\`, \`footer\`).
2. GROUP, DON'T MULTIPLY. If two or three sections look like the same kind of thing (e.g. three article cards with the same shape), assign them the same \`type\` — that is the whole point. A component appearing only once is fine; many should repeat.
3. SLOTS REFLECT WHAT VARIES. For each component type, identify which parts of the HTML are content (text, image src, link href, label) vs. chrome (fixed layout/structure). The content parts become {{mustache}} slots. Slot names are snake-case (e.g. \`title\`, \`image_src\`, \`image_alt\`, \`cta_href\`, \`cta_label\`, \`body_html\`). The chrome stays literal in the template.
4. TEMPLATE FAITHFULNESS. The \`template\` field must be valid HTML that, when its slots are filled with the values from \`itemValues\`, reproduces the original section as closely as possible. Keep email-safe table structure. Do NOT inline the original raw text; replace it with mustache slots.
5. NEVER SUMMARIZE, TRUNCATE, OR PARAPHRASE CONTENT. \`itemValues\` must contain the LITERAL text, HTML, URLs, and attributes from the source section, verbatim and complete. Do NOT write things like "[content truncated for brevity]", "[Contains multiple items...]", "..." (ellipsis), "(see source)", or any other placeholder, summary, or shortening. If a slot value is long HTML, return ALL of it. If a section contains five linked items, return all five — not a paraphrase. The output is meant to round-trip back into a buildable email; abridged content breaks the round-trip.
6. SAFE STRING ENCODING. JSON string values containing HTML must be properly escaped (especially \\" and \\\\). Long HTML values are expected and fine.
7. CONFIDENCE. For each component type and each assignment, give a 0-1 confidence. Flag low-confidence cases in \`notes\`.
8. ORDER. \`sectionAssignments\` MUST be in the same order as the input sections, one entry per input section.

OUTPUT FORMAT
Call the \`submit_decompilation\` tool with the structured result. Do not emit any prose outside the tool call.

SLOT KINDS: text | rich_text (HTML allowed) | image_url | image_alt | link_url | link_label | date | label

The HTML in each section is already cleaned for you and includes inline style attributes that you should preserve in the template.`;

const DECOMPILATION_TOOL = {
  name: 'submit_decompilation',
  description: 'Submit the discovered component palette and per-section assignments for the email.',
  input_schema: {
    type: 'object',
    properties: {
      components: {
        type: 'array',
        description: 'Discovered component types. Each type may be used by one or more sections.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'snake_case identifier' },
            displayName: { type: 'string' },
            description: { type: 'string' },
            sectionIndexes: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Input section indexes that belong to this type.',
            },
            template: {
              type: 'string',
              description: 'Maizzle-style HTML with {{slot}} placeholders. Preserve inline styles.',
            },
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  kind: {
                    type: 'string',
                    enum: ['text', 'rich_text', 'image_url', 'image_alt', 'link_url', 'link_label', 'date', 'label'],
                  },
                  description: { type: 'string' },
                },
                required: ['name', 'kind'],
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            notes: { type: 'string' },
          },
          required: ['type', 'displayName', 'description', 'sectionIndexes', 'template', 'slots', 'confidence'],
        },
      },
      sectionAssignments: {
        type: 'array',
        description: 'One entry per input section, in input order. Maps each section to a component type with literal slot values from the source.',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            type: { type: 'string', description: 'must match a component type above' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            itemValues: {
              type: 'object',
              description: 'Slot name → literal value from the source. Use VERBATIM source content; never summarize or truncate.',
              additionalProperties: true,
            },
            notes: { type: 'string' },
          },
          required: ['index', 'type', 'confidence', 'itemValues'],
        },
      },
    },
    required: ['components', 'sectionAssignments'],
  },
};

export async function classify(candidates, options = {}) {
  if (!config.apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set. Add it to .env (dotenv is loaded by lib/decompiler/config.mjs).'
    );
  }
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = options.model || config.classifierModel;
  const maxTokens = options.maxTokens || config.classifierMaxTokens;

  const userPayload = {
    source: options.sourceLabel || 'unknown',
    sectionCount: candidates.length,
    sections: candidates.map((c) => ({
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
      harvestedStyles: c.styles,
      html: truncateHtml(c.outerHTML, config.maxSectionHtmlChars),
    })),
  };

  // Tool use mode — the model returns structured arguments through the SDK,
  // which validates them against the input_schema. This eliminates the
  // pathological "unescaped quote inside long HTML string" failure mode that
  // plain JSON-in-text suffers from. Streaming because 64K output may exceed
  // the SDK's 10-minute non-streaming ceiling.
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    tools: [DECOMPILATION_TOOL],
    tool_choice: { type: 'tool', name: DECOMPILATION_TOOL.name },
    messages: [
      {
        role: 'user',
        content: `Decompile this email into its reusable component palette. Call the submit_decompilation tool with the result.\n\n${JSON.stringify(
          userPayload,
          null,
          2
        )}`,
      },
    ],
  });

  if (typeof options.onProgress === 'function') {
    let chars = 0;
    stream.on('inputJson', (partial) => {
      chars += (partial || '').length;
      options.onProgress(chars);
    });
  }

  const message = await stream.finalMessage();

  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      `Classifier hit max_tokens cap mid-response. Raise max_tokens or split the request.`
    );
  }

  const toolBlock = message.content.find(
    (b) => b.type === 'tool_use' && b.name === DECOMPILATION_TOOL.name
  );
  if (!toolBlock) {
    throw new Error(
      `Classifier did not call ${DECOMPILATION_TOOL.name}. Got blocks: ${message.content
        .map((b) => b.type)
        .join(', ')}`
    );
  }

  const parsed = normalizeToolInput(toolBlock.input);
  try {
    validate(parsed, candidates.length);
  } catch (err) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dumpDir = 'generated';
      if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });
      const dumpPath = path.join(dumpDir, 'classifier-raw-failure.json');
      fs.writeFileSync(
        dumpPath,
        JSON.stringify(
          {
            stop_reason: message.stop_reason,
            usage: message.usage,
            input: parsed,
          },
          null,
          2
        )
      );
      err.message += ` — raw tool input dumped to ${dumpPath} (stop_reason: ${message.stop_reason}, output tokens: ${message.usage?.output_tokens})`;
    } catch {}
    throw err;
  }
  return { result: parsed, usage: message.usage, model };
}

function parseJson(raw) {
  // The model may wrap output in ```json fences despite instructions. Strip them.
  let s = raw.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  // Sometimes it adds a leading "Here is..." sentence — find the first {.
  const firstBrace = s.indexOf('{');
  if (firstBrace > 0) s = s.slice(firstBrace);
  try {
    return JSON.parse(s);
  } catch (err) {
    throw new Error(
      `Classifier output was not valid JSON: ${err.message}\nFirst 400 chars:\n${s.slice(0, 400)}`
    );
  }
}

function normalizeToolInput(input) {
  // Large tool inputs occasionally come back with array/object args wrapped as
  // JSON strings (an LLM-side serialization quirk). Re-parse any string values
  // where we expect a structured value.
  const out = { ...input };
  for (const key of ['components', 'sectionAssignments']) {
    if (typeof out[key] === 'string') {
      try {
        out[key] = JSON.parse(out[key]);
      } catch {
        // leave as-is; validate() will throw a clearer error
      }
    }
  }
  // itemValues inside each assignment may also be a string.
  if (Array.isArray(out.sectionAssignments)) {
    out.sectionAssignments = out.sectionAssignments.map((a) => {
      if (typeof a.itemValues === 'string') {
        try {
          return { ...a, itemValues: JSON.parse(a.itemValues) };
        } catch {
          return a;
        }
      }
      return a;
    });
  }
  return out;
}

function validate(parsed, expectedSectionCount) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Classifier output: not an object');
  }
  if (!Array.isArray(parsed.components) || parsed.components.length === 0) {
    throw new Error('Classifier output: components[] missing or empty');
  }
  if (!Array.isArray(parsed.sectionAssignments)) {
    throw new Error('Classifier output: sectionAssignments[] missing');
  }
  if (parsed.sectionAssignments.length !== expectedSectionCount) {
    throw new Error(
      `Classifier output: expected ${expectedSectionCount} sectionAssignments, got ${parsed.sectionAssignments.length}`
    );
  }
  const known = new Set(parsed.components.map((c) => c.type));
  for (const a of parsed.sectionAssignments) {
    if (!known.has(a.type)) {
      throw new Error(
        `Classifier output: assignment for section ${a.index} references unknown type "${a.type}"`
      );
    }
  }
}

function truncateHtml(html, max) {
  if (html.length <= max) return html;
  return html.slice(0, max) + `\n<!-- truncated, original ${html.length} chars -->`;
}
