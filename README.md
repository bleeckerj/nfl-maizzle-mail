# nfl-maizzle-mail

A Maizzle-based newsletter production system for authoring Markdown issues, validating template-specific data, and building production HTML email.

The repository is organized around reusable newsletter templates in `templates/<template-name>/`, author-facing issues in `content/`, normalized build input in `data/`, and final HTML output in `build_production/`.

## Features

- Markdown issue authoring with YAML frontmatter and template-specific `sections`.
- Canonical Markdown/JSON to Maizzle build pipeline through `scripts/build-newsletter.mjs`.
- Per-template schemas through `templates/<template-name>/newsletter.schema.json`.
- Per-template style tokens through `templates/<template-name>/section-styles.json`.
- Section-level style overrides through `containerStyles`, `contentStyles`, `headingStyles`, and `linkStyles`.
- Link tracking metadata extraction and HTML enrichment.
- Content slot manifests for reviewing rendered content positions.
- Image and link validation during focused builds.
- Calendar event normalization and `.ics` event output for calendar-enabled sections.
- Ad block hydration for `dense-discovery` from the sibling `nfl-editorial` ad inventory.
- Commerce ad lockup snapshot support for email-safe ad rendering.
- Defensive dark-mode fallback CSS, with `--no-dark-mode-flatten` available for a light-only build.
- Mobile readability and long-token HTML compatibility processing.
- Template discovery, schema generation, skeleton generation, linting, normalized JSON export, and AWS SES test sends.
- MCP server support for chat-driven template inspection, issue editing, validation, and builds.
- Dense Discovery section guide that renders every supported section type from real Markdown through the actual build pipeline.

## Repository Layout

```text
nfl-maizzle-mail/
  content/                         Markdown newsletter issues
  data/                            Build input JSON and shared data files
  templates/<template-name>/        Canonical Maizzle templates
    newsletter.html                 Template entry point
    layouts/                        Template-local layouts
    components/                     Template-local components
    section-styles.json             Section style configuration
    newsletter.schema.json          Template data schema
  lib/
    newsletter-core/                Shared normalization and build helpers
    decompiler/                     HTML email decompiler support
    mcp/                            MCP tool/resource definitions
    adjacency-mail/                 Adjacency mail theme tokens
  scripts/                          CLI tools and automation
  tests/newsletter-core/            Node test coverage for build helpers
  build_production/                 Generated HTML, manifests, and guide output
```

Template source of truth lives under `templates/<template-name>/`. Do not create or use `src/templates/` mirrors. Build-time injected fields are runtime artifacts and should stay out of author-facing source files.

Before scaffolding or revising a production newsletter template, read `docs/newsletter-template-operating-process.md`.

## Setup

```bash
npm install
```

Useful environment values live in `.env`. Do not commit `.env` files or secrets.

Common optional values:

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM=
SES_TO=
```

## Build Workflow

The primary build command is:

```bash
node scripts/build-newsletter.mjs content/<issue>.md <output-name> --no-open
```

The command accepts Markdown or JSON input:

```bash
node scripts/build-newsletter.mjs content/w41-y25.md w41-y25 --no-open
node scripts/build-newsletter.mjs data/newsletter.json latest --no-open
node scripts/build-newsletter.mjs content/w41-y25.md preview --template=dense-discovery --no-open
node scripts/build-newsletter.mjs content/w41-y25.md preview --output-dir=/tmp/newsletter-preview --no-open
```

The canonical build does this work:

1. Resolves the input file and output name.
2. Converts Markdown frontmatter to `data/newsletter.json` through `scripts/md_to_json.mjs`, or copies JSON input into the author-facing build path.
3. Resolves the active template from frontmatter or `--template=<name>`.
4. Runs newsletter-core normalization for schema validation, ad blocks, calendar sections, intro sections, commerce snapshots, link tracking, and template-specific compatibility fields.
5. Loads template section styles and merges issue-level style overrides.
6. Applies style preprocessing for email-compatible HTML.
7. Validates the newsletter data against `newsletter.schema.json`.
8. Checks image and link references.
9. Runs Maizzle in production mode from the canonical template directory.
10. Writes the final HTML, link tracking manifest, content slot manifest, and calendar files into the output directory.
11. Restores `data/newsletter.json` to its prior author-facing state.

Typical outputs:

```text
build_production/<output-name>.html
build_production/<output-name>.link-tracking-manifest.json
build_production/<output-name>.content-slots.json
```

## Package Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run build` | `maizzle build production` | Raw Maizzle production build. Use the canonical build script for issue work. |
| `npm run build:data` | `maizzle build production` | Alias for raw Maizzle production build. |
| `npm run dev` | `maizzle serve` | Maizzle development server. |
| `npm run build:newsletter` | `node scripts/build-newsletter.mjs` | Canonical newsletter build entry. |
| `npm run build:correspondence` | `node scripts/build-correspondence.mjs` | Build local one-off correspondence email HTML. |
| `npm run export:normalized-newsletter` | `node scripts/export-normalized-newsletter.mjs` | Emit normalized newsletter JSON for downstream tooling. |
| `npm run quick` | `node scripts/quick-build.mjs` | Convenience wrapper for building a content file with a chosen template. |
| `npm run factory` | `node scripts/email-template-factory/index.mjs` | Generate or refine templates through the email template factory. |
| `npm run factory:anthropic` | `node scripts/email-template-factory/index.mjs --provider=anthropic` | Run the factory with Anthropic. |
| `npm run factory:openai` | `node scripts/email-template-factory/index.mjs --provider=openai` | Run the factory with OpenAI. |
| `npm run templates:list` | `node scripts/template_manager.mjs list` | List available template directories. |
| `npm run templates:info` | `node scripts/template_manager.mjs info` | Inspect template metadata. |
| `npm run schema:generate` | `node scripts/generate-template-schema.mjs` | Generate a schema from a template entry file. |
| `npm run lint:content` | `node scripts/lint-template.mjs` | Validate Markdown or JSON content against template rules. |
| `npm run test:newsletter-core` | `node --test tests/newsletter-core/*.test.mjs` | Run focused build-helper tests. |
| `npm run send:test` | `node scripts/send-ses-test.mjs` | Send a built HTML file through AWS SES. |
| `npm run send:correspondence:test` | `node scripts/send-correspondence-test.mjs` | Compatibility wrapper for building and sending a correspondence email through AWS SES. |

## Direct Scripts

Some useful scripts are not exposed as package aliases.

| Script | Purpose |
| --- | --- |
| `scripts/build-newsletter.mjs` | Canonical Markdown/JSON to production HTML build. |
| `scripts/md_to_json.mjs` | Converts Markdown frontmatter into normalized JSON for Maizzle. |
| `scripts/build-dense-discovery-section-guide.mjs` | Builds the Dense Discovery source guide and schematic HTML page. |
| `scripts/export-normalized-newsletter.mjs` | Loads Markdown, JSON, or a backoffice issue id and prints normalized newsletter JSON. |
| `scripts/quick-build.mjs` | Resolves a content file, runs the canonical build, and can copy the result to a requested output path. |
| `scripts/lint-template.mjs` | Checks content shape, section fields, media fields, and schema compatibility. |
| `scripts/generate-template-schema.mjs` | Reads Maizzle template expressions and emits a starter JSON schema. |
| `scripts/generate-newsletter-skeleton.py` | Generates Dense Discovery skeleton Markdown. |
| `scripts/generate-skeleton-from-schema.mjs` | Builds a skeleton from a template schema. |
| `scripts/generate_md_from_template.mjs` | Generates Markdown scaffolding from template data. |
| `scripts/template_manager.mjs` | Lists, creates, copies, and inspects template directories. |
| `scripts/decompile-email.mjs` | Runs deterministic segmentation, style harvesting, LLM classification, and template artifact emission for source HTML emails. |
| `scripts/decompiler-roundtrip-diff.mjs` | Compares source and rebuilt email structure. |
| `scripts/mcp-server.mjs` | Exposes repository operations through Model Context Protocol. |
| `scripts/send-ses-test.mjs` | Sends a built HTML file through SES using configured credentials. |

## Dense Discovery Section Guide

The Dense Discovery template has a generated section guide that shows authored Markdown frontmatter, authored element paths, and rendered HTML output for every section branch.

Files:

```text
templates/dense-discovery/section-guide.md
scripts/build-dense-discovery-section-guide.mjs
build_production/dense-discovery-section-guide.html
build_production/dense-discovery-section-guide-schematic.html
```

Regenerate the guide with:

```bash
node scripts/build-dense-discovery-section-guide.mjs
```

The generator:

1. Builds `templates/dense-discovery/section-guide.md` through `scripts/build-newsletter.mjs`.
2. Reads the compiled email HTML from `build_production/dense-discovery-section-guide.html`.
3. Extracts each rendered section fragment from the compiled email body.
4. Writes `build_production/dense-discovery-section-guide-schematic.html`.

The schematic page contains one card per section type. Each card shows:

- The authored YAML for one `sections` entry.
- The leaf field paths used by that section.
- The rendered HTML result inside a 640px email table iframe.

The guide source uses hosted FPOIMG image URLs and FPO editorial copy sized to exercise longer text fields, especially fields named `description`.

Current Dense Discovery section guide coverage:

```text
feature
sponsor
dispatch
signals-adjacent-now
ad-block
calendar_event
adjacency-job-posting
microdrop-product-launch
adjacency-feature
apps-sites
apps-sites-single-column
callout
quote
indie-mag
indie-mag-single-column
books-accessories
food-for-thought
aesthetically-pleasing
classifieds
animated-image
image
```

Generated files in `build_production/` are build artifacts. Regenerate them from the source Markdown and script when reviewing the guide.

## Dense Discovery Authoring Notes

The Dense Discovery template is in `templates/dense-discovery/`.

Important files:

```text
templates/dense-discovery/newsletter.html
templates/dense-discovery/layouts/main.html
templates/dense-discovery/components/
templates/dense-discovery/section-styles.json
templates/dense-discovery/newsletter.schema.json
templates/dense-discovery/README.md
templates/dense-discovery/section-guide.md
```

Template-specific notes in `templates/dense-discovery/README.md` cover:

- `feature` subtitle styling.
- `sponsor` as a legacy alias rendered through the feature branch.
- `ad-block` frontmatter, hydration, analytics categories, and render hierarchy.
- `food-for-thought` multi-CTA rows.
- `indie-mag-single-column` image precedence.

Dense Discovery issues usually include:

```yaml
---
template: dense-discovery
title: "Issue title"
preheader: "Preview text"
sectionStylesFile: templates/dense-discovery/section-styles.json
sections:
- type: feature
  title: Feature Section
  items:
  - title: Item title
    description: <p>Body copy.</p>
---
```

Use the section guide for exact section shapes and rendered outcomes.

## Authoring Workflow

1. Start from an existing issue in `content/`, a template skeleton, or the Dense Discovery section guide.
2. Set `template` and `sectionStylesFile` in frontmatter.
3. Add entries to `sections`.
4. Run a focused build:

```bash
node scripts/build-newsletter.mjs content/<issue>.md <output-name> --no-open
```

5. Review the generated HTML and manifests in `build_production/`.
6. Run focused tests when changing shared code:

```bash
npm run test:newsletter-core
```

## Template Development

Every production template should keep this shape:

```text
templates/<template-name>/
  newsletter.html
  layouts/
  components/
  section-styles.json
  newsletter.schema.json
```

Useful commands:

```bash
npm run templates:list
npm run templates:info -- <template-name>
node scripts/generate-template-schema.mjs --entry templates/<template-name>/newsletter.html --output templates/<template-name>/newsletter.schema.json
node scripts/lint-template.mjs content/<issue>.md --template=<template-name>
```

When template files change, rebuild at least one representative issue for that template.

## Decompiler And Factory

The repository includes tooling for deriving templates from existing HTML email.

```bash
node scripts/decompile-email.mjs emails-to-templatize/<source>.html <template-name>
npm run factory
```

The decompiler pipeline uses:

- JSDOM section segmentation.
- Inline style harvesting.
- LLM-assisted component classification.
- Template, schema, style, source Markdown, and report emission.

Decompiler output should still be reviewed and refined by an operator before production use.

## MCP Workflow

The MCP server entry point is:

```bash
node scripts/mcp-server.mjs
```

The MCP layer exposes template, content, validation, and build operations to MCP-aware clients. See:

- `docs/MCP-SETUP.md`
- `docs/MCP-TOOL-REFERENCE.md`

## Verification

Use the smallest useful verification for the change:

```bash
npm run test:newsletter-core
node scripts/build-newsletter.mjs content/dense-discovery-test.md dense-discovery-test --no-open
node scripts/build-dense-discovery-section-guide.mjs
node scripts/lint-template.mjs content/<issue>.md --template=<template-name>
```

Image validation depends on network access. In restricted environments, hosted image checks can warn while local build generation still succeeds.

## Documentation Map

| Document | Use |
| --- | --- |
| `docs/AUTHORING-A-NEWSLETTER.md` | Full authoring reference for issues, slots, styles, validation, and builds. |
| `docs/MCP-SETUP.md` | MCP client setup. |
| `docs/MCP-TOOL-REFERENCE.md` | MCP tool and resource reference. |
| `docs/TROUBLESHOOTING.md` | Known build, template, and environment issues. |
| `docs/decompiler-current-state.md` | Decompiler implementation notes. |
| `docs/newsletter-template-operating-process.md` | Required operating process for production template work. |
| `docs/schema-validation/README.md` | Schema validation details. |
| `scripts/README.md` | Older script notes, mainly useful for skeleton generation history. |
| `templates/dense-discovery/README.md` | Dense Discovery template-specific behavior. |

## Git And Build Artifact Notes

- Commit source Markdown, templates, scripts, schemas, tests, and docs.
- Keep secrets in `.env` or approved secret storage.
- Build outputs under `build_production/` are reproducible artifacts.
- Stage task files explicitly. Avoid staging unrelated working-tree changes.
