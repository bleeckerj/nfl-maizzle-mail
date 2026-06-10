# HTML Email Decompiler Current State

Last reviewed: 2026-05-26.

This document captures the decompiler as it exists today, separate from the broader product vision in `docs/PRODUCT.md`. The product vision is still the north star; this file is the implementation snapshot for continuing the work without re-discovering the same context.

## Intention

The decompiler is meant to turn an existing production HTML email into a reusable newsletter workflow for this repository's canonical Maizzle pipeline.

The desired end state is:

1. An operator provides one source HTML email.
2. The system discovers that email's own component vocabulary rather than forcing it into a fixed taxonomy.
3. The system emits a new template under `templates/<name>/`, source-rebuild Markdown under `content/`, and machine-readable reports under `generated/`.
4. The operator or an LLM can then author future issues by editing Markdown sections and building with `scripts/build-newsletter.mjs`.

The decompiler is not intended to replace existing hand-built templates such as `dense-discovery`. It generates new templates alongside the existing canonical `templates/<name>/` tree.

## Main Entry Points

- `scripts/decompile-email.mjs`: CLI for local decompilation.
- `lib/decompiler/segmenter.mjs`: deterministic HTML segmentation.
- `lib/decompiler/styles.mjs`: deterministic inline-style harvesting.
- `lib/decompiler/classifier.mjs`: Anthropic-backed component-palette classifier.
- `lib/decompiler/emitter.mjs`: deterministic artifact emitter.
- `scripts/decompiler-roundtrip-diff.mjs`: structural comparison between source HTML and rebuilt output.
- `scripts/mcp-server.mjs`, `lib/mcp/tools.mjs`, and `lib/mcp/resources.mjs`: MCP wrapper around decompilation, template listing, authoring context, validation, and canonical builds.

There is no `npm run decompile` script today. The CLI is run directly:

```bash
node scripts/decompile-email.mjs <input.html> [template-name] [--dry-run|--classify-only|--from-cache|--model=<id>]
```

## Pipeline

The CLI currently runs four phases.

### 1. Segment

`segment(html)` parses the source with JSDOM and finds a layout root whose direct children approximate the visible top-level email sections.

The root finder starts at the last `<body>` and descends through dominant wrapper elements while one structural child carries at least 70 percent of visible text. This handles email wrapper chains such as `table -> tbody -> tr -> td`.

Each candidate section records:

- source order index
- tag, class, and id
- visible text snippet and text length
- image metadata
- link metadata, capped to the first 10 links in the candidate object
- heading metadata
- full `outerHTML`
- the original DOM element for deterministic style harvesting

### 2. Harvest Styles

`harvest(candidate)` extracts dominant inline style declarations for each section. It buckets styles into:

- `containerStyles`
- `contentStyles`
- `linkStyles`
- `headingStyles`

The harvester is mode-based: for each relevant CSS property, it counts observed values across sampled elements and chooses the most common value. It is intentionally approximate; it gives the emitter a starting palette, not a precise CSS reconstruction.

### 3. Classify

`classify(candidates, options)` calls the Anthropic Messages API using tool-use mode. The classifier prompt asks the model to discover an open-vocabulary component palette and return a structured `submit_decompilation` tool call.

The classifier is responsible for:

- grouping repeated visual structures into component types
- naming each type in snake case
- generating a Maizzle-ish HTML template with `{{slot}}` placeholders
- defining slots and slot kinds
- assigning every input section to a component type
- extracting literal per-section `itemValues`
- assigning confidence scores and notes

Important behavior:

- `ANTHROPIC_API_KEY` is required and loaded from `.env` by `lib/decompiler/config.mjs`.
- The default model is `claude-opus-4-7`.
- `DECOMPILER_MODEL` can override the model without affecting other Anthropic tools in the repo.
- `claude-sonnet-4-6` has a known successful run on `new-yorker-sample`.
- `claude-sonnet-4-20250514` is documented as unreliable for this workload because streams terminate mid-tool-input on large real emails.
- Output streams are monitored by character count so the CLI and MCP tool can report progress.
- `config.maxSectionHtmlChars` defaults to 6000, so large section HTML may be truncated before classification. The prompt tells the model not to truncate extracted content, but if the source evidence itself was truncated, fidelity can still suffer.

### 4. Emit

`emit(...)` writes the generated artifacts. Emission is deterministic once classifier output exists, so `--from-cache` is the intended iteration path when improving the emitter.

Current emitted artifacts:

- `templates/<name>/components/<TypePascal>.html`
- `templates/<name>/layouts/main.html`
- `templates/<name>/newsletter.html`
- `templates/<name>/section-styles.json`
- `templates/<name>/newsletter.schema.json`
- `content/<name>-source.md`
- `generated/<name>-decompilation-report.json`

The component files are reference artifacts only. Render-time dispatch is inline in `templates/<name>/newsletter.html`, where an `<each loop="section in sections">` block contains one `<if condition="section.type === '<type>'">` branch per discovered component type.

The emitter rewrites slots from `{{slot}}` to `{{ section.slot }}`. Slots of kind `rich_text` are rendered with triple mustache as `{{{ section.slot }}}`; other slot kinds use escaped double mustache. Empty `class=""` attributes are stripped to avoid Maizzle/posthtml failures.

The generated layout includes a mobile font-size lock with `.mob-text`, `.mob-title`, `.mob-subtitle`, and `.mob-caption` media-query rules. The emitter also adds `mob-text` to each inline branch's first opening tag.

## CLI Modes

`--dry-run`

Runs segmentation and style harvesting only. It writes `generated/<name>-decompiler-report.json` and does not call the LLM or emit a template.

`--classify-only`

Runs segmentation, style harvesting, and classifier. It writes `generated/<name>-classifier-output.json` but skips template emission.

`--from-cache`

Loads `generated/<name>-classifier-output.json` and re-runs emission without making an API call. This is the safest path when changing `lib/decompiler/emitter.mjs`.

`--model=<id>`

Overrides the classifier model for that run only.

## Report Files

There are two similarly named JSON reports. This is intentional in the current code but easy to confuse.

- `generated/<name>-decompiler-report.json`: segmentation/style-harvest report written before classification.
- `generated/<name>-decompilation-report.json`: final emitted run summary written by `emit(...)`, including component types, section assignments, model, usage, and confidence notes.

`generated/<name>-classifier-output.json` is the raw cached classifier result used by `--from-cache`.

## MCP Surface

The MCP server exposes the decompiler and the canonical build pipeline to MCP-aware clients.

Current decompiler-related tools/resources:

- `decompile_email`: runs the full pipeline, supports `model` and `from_cache`, and emits progress notifications.
- `list_templates`: lists installed templates under `templates/`, with palette data from decompilation reports or `section-styles.json`.
- `get_template_schema`: returns `newsletter.schema.json`.
- `get_template_authoring_guide`: returns `AUTHORING.md` if present, otherwise synthesizes a fallback from schema/report/style files.
- `nfl-maizzle-mail://template/<name>/authoring-guide`: resource form of the same guide/fallback.
- `nfl-maizzle-mail://template/<name>/section-styles`
- `nfl-maizzle-mail://template/<name>/schema`
- `nfl-maizzle-mail://template/<name>/decompilation-report`

The MCP docs describe a "complete authoring kit." Today that phrase is aspirational: fallback authoring context exists, but generated `AUTHORING.md`, `REPORT.md`, and `content/<name>-starter.md` are not emitted by the decompiler yet.

## Current Generated Example

`new-yorker-sample` is the clearest current emitted example.

Key files:

- `templates/new-yorker-sample/newsletter.html`
- `templates/new-yorker-sample/components/*.html`
- `templates/new-yorker-sample/layouts/main.html`
- `templates/new-yorker-sample/section-styles.json`
- `templates/new-yorker-sample/newsletter.schema.json`
- `content/new-yorker-sample-source.md`
- `generated/new-yorker-sample-classifier-output.json`
- `generated/new-yorker-sample-decompiler-report.json`
- `generated/new-yorker-sample-decompilation-report.json`
- `generated/new-yorker-sample-roundtrip-diff.json`

The final report records:

- source: `templates/new-yorker/new-yorker-sample.html`
- model: `claude-sonnet-4-6`
- section count: 8
- discovered component types: `masthead`, `section_header`, `editorial_intro`, `article_card_pair`, `archive_cta_banner`, `colophon`
- repeated type: `article_card_pair`, used by sections 3, 4, and 5

The stored round-trip diff for `new-yorker-sample` reports:

- images preserved: 7 of 8 source images, missing the open/log tracking pixel
- links preserved: 24 of 25 source links, missing one intro/body link
- headings preserved: 0 of 0

That makes the sample useful as a proof of concept, but not yet proof of exact reconstruction.

## Current Strengths

- The architecture is cleanly separated into deterministic segmentation, deterministic style harvesting, LLM classification, and deterministic emission.
- The classifier uses tool calling rather than prose JSON, avoiding many invalid JSON failures with long HTML strings.
- `--from-cache` supports cheap emitter iteration after an expensive classifier run.
- The emitted template follows the repo's canonical `templates/<name>/` layout rather than creating `src/templates` mirrors.
- The generated skeleton is build-pipeline shaped: frontmatter includes `template`, `title`, `sectionStylesFile`, and ordered `sections`.
- The MCP wrapper already exposes progress updates for long-running decompilation.
- `scripts/decompiler-roundtrip-diff.mjs` gives a concrete structural fidelity signal.

## Known Gaps And Risks

### Authoring Kit Gaps

The product vision calls for:

- `templates/<name>/AUTHORING.md`
- `templates/<name>/REPORT.md`
- `content/<name>-starter.md`

These are not emitted today. MCP works around the missing `AUTHORING.md` by generating a fallback summary, but that is not a full authoring guide.

### Style Token Wiring

The emitter generates `section-styles.json`, and the canonical build pipeline can load and merge section style configs. However, generated decompiler templates mostly preserve literal inline styles from the classifier's template HTML. They do not systematically read `section.containerStyles`, `section.contentStyles`, `section.linkStylesInline`, or `section.headingStylesInline` in the way hand-built templates such as `dense-discovery` do.

This means `section-styles.json` is currently more useful as reference metadata and mobile override context than as a fully live design-token layer for decompiled templates.

### Fidelity Is Not Exact

The New Yorker round-trip diff misses one tracking pixel image and one link. The classifier can also lose details when section HTML is truncated before being sent to the model.

The round-trip diff only checks structural inventories: image URLs, link URLs, headings, tag counts, and text length. It does not compare visual rendering, table geometry, CSS fidelity, or mobile behavior.

### Classifier Output Is Model-Sensitive

The classifier performs open-vocabulary extraction and long literal content copying. Quality depends on the selected model, prompt compliance, and source complexity. The code validates high-level structure, but it does not deeply validate that every declared slot appears in every assignment or that every source URL/text fragment is preserved.

### Report Naming Drift

The code uses both "decompiler report" and "decompilation report" naming. The split has a practical meaning, but future work should keep the terms explicit or consolidate them with a migration plan.

### Reference Components Are Not Rendered

`components/*.html` are useful for review, but the emitted `newsletter.html` inlines all render branches. Editing a component file will not affect builds unless the corresponding inline branch is also updated.

This was chosen because auto-generating Maizzle component prop extractors was more boilerplate than the initial implementation needed.

### Generated Schema Is Permissive

The generated schema makes each section type require only `type`; slot fields are described but not required. `additionalProperties` is true. This helps early iteration but gives weak authoring validation.

## Practical Continuation Notes

When continuing this line of work, the highest-leverage next steps are:

1. Add deterministic `AUTHORING.md`, `REPORT.md`, and `content/<name>-starter.md` emission from cached classifier output.
2. Decide whether generated templates should remain literal inline reconstructions or be rewritten to consume `section-styles.json` as live style tokens.
3. Improve fidelity validation beyond URL inventories, likely with a rendered HTML/screenshot comparison workflow plus the existing structural diff.
4. Add deeper post-classifier validation: missing slot values, undeclared slot values, unpreserved source links/images, and low-confidence sections.
5. Clarify report naming in docs and tool output so operators understand `*-decompiler-report.json` versus `*-decompilation-report.json`.
6. Consider adding a package script for the decompiler once the authoring-kit outputs are complete.

## Safe Iteration Workflow

For emitter-only changes:

```bash
node scripts/decompile-email.mjs <source.html> <name> --from-cache
```

For classifier prompt/model changes:

```bash
node scripts/decompile-email.mjs <source.html> <name> --classify-only --model=<model-id>
node scripts/decompile-email.mjs <source.html> <name> --from-cache
```

For a round-trip check after building the emitted skeleton:

```bash
node scripts/decompiler-roundtrip-diff.mjs <source.html> build_production/<rebuilt>.html --report=generated/<name>-roundtrip-diff.json
```

Use the canonical newsletter build path for generated skeletons. Do not introduce `src/templates` mirrors.
