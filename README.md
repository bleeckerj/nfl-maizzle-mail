# nfl-maizzle-mail

A self-hosted newsletter production system that turns one of your existing branded HTML emails into a reusable, LLM-augmented authoring workflow. Built on [Maizzle](https://maizzle.com/) for the rendering layer; extended with a decompiler that derives a working template from an existing email, and an MCP server that lets your team author and build issues through natural-language chat with Claude or any MCP-aware tool.

This repository is the operational backbone for the Near Future Laboratory newsletters and is being productized so other operators can bring their own brand and run their own newsletter pipelines on the same infrastructure.

---

## Who this is for

A technical email marketing specialist who:

- Owns or operates one or more recurring email newsletters and wants to reduce per-issue production time without losing brand fidelity.
- Has an existing branded HTML email design that has been validated across email clients and wants to keep using it as the structural template — not start over inside a SaaS templating tool.
- Wants a Markdown-based authoring surface so writers and editors can ship issues without touching HTML.
- Wants the option to author issues through chat with an LLM ("add an article card pair for this URL") rather than only by hand.
- Cares about deliverability, mobile rendering, link-level analytics, audit trail, and not being locked into a single ESP or platform.
- Is comfortable with a terminal and a YAML editor but does not want to maintain a custom Maizzle template by hand.

This is not a hosted SaaS. It runs on your machine or your server, against ESPs of your choice (Sendy, Mailchimp, Campaign Monitor, AWS SES, ConvertKit, Klaviyo, etc.).

---

## Key value (and why this is different from "another templating system")

### Your brand is the template, not an approximation of it

Most email tools force you to start from their design language and bend your brand to fit. This system inverts that. You point the decompiler at an HTML email you and your team already approve of — last issue, your designer's reference, a competitor's email you admire — and get back a production-ready template that reproduces that design as a reusable component palette. The first-pass template is yours from the start.

### Issue authoring goes from hours to minutes

Once a template exists, a new issue is a Markdown file with YAML frontmatter. Reorder, duplicate, or remove sections by editing the list. No HTML table wrangling, no Outlook-specific debugging, no waiting on a designer for a routine layout change.

### LLM-augmented authoring through chat

The system ships with a Model Context Protocol (MCP) server. Once configured against Claude Desktop, Claude Code, or any MCP-aware client, your team can author issues through natural language:

> "List my newsletter templates."
> "Decompile the wirecutter HTML email."
> "Add an article card pair for this URL with the title 'Foo Bar' and the byline 'By Anyone'."
> "Validate and build the issue as the weekly-12 campaign."

The LLM calls the right tools without anyone typing shell commands. The chat-driven workflow is the product surface for non-technical contributors; the CLI is still available for power users.

### Production-grade output, not preview HTML

Every build runs through a canonical pipeline that applies:

- Mobile font-size lock — body type is bumped to 23px on small screens for readability, regardless of the desktop spec.
- Link tracking metadata — every outbound link gets a structured manifest entry that downstream tracking systems can consume.
- Schema validation against the per-template `newsletter.schema.json` — you cannot ship a broken issue.
- Image URL validation against the live web (catches 404s before send).
- Outlook-safe table-based markup with VML fallbacks where needed.
- CSS inlining for client compatibility.

### Audit trail and version control by default

Every newsletter issue is a Markdown file you commit to git. Every build is reproducible from that file plus a pinned template. Every link goes into a tracking manifest you can diff between issues. Rolling back is a `git revert`. Comparing two issues is `git diff`. Reproducing a six-month-old issue exactly is a `git checkout`.

### ESP-agnostic and self-hosted

Output is a single production-ready HTML file you can paste into any email service provider or feed to a delivery pipeline (AWS SES integration is included). No SaaS lock-in, no per-send fees, no proprietary data formats, no data-export complications when you switch providers.

### Multi-brand from one repository

Decompile multiple source emails; each becomes its own template under `templates/<name>/`. Run multiple newsletter products — different brands, different cadences, different design languages — from one repository with one toolchain.

### Open-vocabulary component classification

The decompiler does not force your design into a fixed taxonomy of "header / hero / footer". It discovers the component vocabulary that fits the source email — `article_card_pair`, `editorial_intro`, `archive_cta_banner`, `colophon` — whatever your brand actually uses. Two newsletters by the same operator can have completely different palettes.

### Per-decompilation cost is trivial

A first-pass template setup runs $0.05 with Claude Sonnet 4.6 or $0.30 with Claude Opus 4.7. After that, the template is yours forever — every subsequent issue costs nothing extra. Compare to the cost of a designer day-rate to recreate a template from scratch in HTML.

---

## How it works

The product is structured as a three-phase workflow.

```
        +-----------------+       +------------------+       +------------------+
        |    DECOMPILE    |  -->  |      REFINE      |  -->  |      AUTHOR      |
        |                 |       |                  |       |                  |
existing HTML            template files +         renamed types,            one Markdown
email file               per-template guide       tweaked styles,           file per issue
                         + report + samples       slot defaults             -> built email
                                                                            (canonical pipeline)
```

### Phase 1 — Decompile (one time per brand)

You point the decompiler at an HTML email. It runs:

1. **Deterministic segmentation** — JSDOM walks the email and identifies its top-level structural sections.
2. **Deterministic style harvesting** — inline styles per section are extracted into a structured token map (containerStyles, contentStyles, linkStyles, headingStyles).
3. **LLM-driven classification** — Claude (Opus 4.7 by default, Sonnet 4.6 for cheaper runs) groups similar sections into reusable component types, names them in snake_case, and emits a Maizzle component template with mustache slots for everything that varies.
4. **Artifact emission** — a complete Maizzle template gets written to `templates/<name>/`, along with the source-rebuild as a Markdown file under `content/`, a JSON schema, a section-styles file with mobile font lock baked in, and an analysis report.

Output: a directory of templates and content files that immediately round-trips through the canonical build to produce the source email.

### Phase 2 — Refine (iterative, lightweight)

The auto-generated template is a starting point, not a finished product. Operators (or their LLM assistants) typically iterate to:

- Rename component types from machine-readable names to brand-readable ones (`article_card_pair` to `feature_pair`, `editorial_intro` to `letter`).
- Adjust default styles in `section-styles.json`.
- Add or tweak slot defaults for fields that should be the same across most issues.
- Add custom layout for component types the classifier didn't quite capture.

This phase is mostly editing two files: `templates/<name>/section-styles.json` and (if needed) the component HTML. An LLM with the MCP server connected can drive most of these edits through chat.

### Phase 3 — Author (every issue forever)

A new issue is a Markdown file you write (or generate via LLM chat) and build:

```bash
node scripts/build-newsletter.mjs content/your-issue.md campaign-name --template=your-template
```

The build produces `build_production/campaign-name.html` and `build_production/campaign-name.link-tracking-manifest.json`. Drop the HTML into your ESP and send.

For LLM-augmented authoring, see the MCP integration section below.

---

## Quick start

### Requirements

- Node.js 20.6 or higher (uses the built-in `--env-file` flag and modern ESM modules).
- An Anthropic API key for the decompiler (`ANTHROPIC_API_KEY`).
- Optional: AWS SES credentials for test sends.

### Install

```bash
git clone <this-repo>
cd nfl-maizzle-mail
npm install
```

### Configure

Create a `.env` file in the repo root. Minimum:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...

# Recommended model pinning for the decompiler
DECOMPILER_MODEL=claude-opus-4-7
# Lower-cost alternative: claude-sonnet-4-6
```

Optional (for test sending and other workflows):

```env
OPENAI_API_KEY=sk-...
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SES_FROM=you@yourdomain.com
SES_TO=test@example.com
```

### First-pass: decompile an email and build it

```bash
# Sample emails are pre-loaded under emails-to-templatize/
node scripts/decompile-email.mjs emails-to-templatize/the-atlantic.html --model=claude-sonnet-4-6

# Build the rebuild through the canonical pipeline
node scripts/build-newsletter.mjs content/the-atlantic-source.md round-trip-test \
  --template=the-atlantic --no-open

# Open the result
open build_production/round-trip-test.html
```

Total time: 1-5 minutes for the LLM call, plus a few seconds for the build. Total cost: $0.05-0.30 in API tokens depending on the model.

### Subsequent issues

Once a template is set up, every new issue is:

```bash
cp content/the-atlantic-source.md content/2026-05-28-issue.md
# edit content/2026-05-28-issue.md
node scripts/build-newsletter.mjs content/2026-05-28-issue.md issue-2026-05-28 \
  --template=the-atlantic
```

### LLM-augmented authoring through MCP

The repository ships with an MCP server at `scripts/mcp-server.mjs`. Wire it into Claude Desktop or Claude Code (see [docs/MCP-SETUP.md](docs/MCP-SETUP.md) for the config snippets) and then drive the workflow conversationally:

> "List my newsletter templates and show me the authoring guide for the-atlantic."
> "Add an article_card_pair to content/2026-05-28-issue.md with these values..."
> "Validate the issue and build it as the may-28 campaign."

The LLM invokes the right tools. No shell access required for the operator.

---

## Usage

### Decompile a new branded email

```bash
node scripts/decompile-email.mjs <input.html> [template-name] [flags]
```

Flags:

| Flag | Purpose |
|---|---|
| `--dry-run` | Run only the deterministic segmenter and style harvester. No LLM call, no template files written. Useful for previewing what sections the system found. |
| `--classify-only` | Run the LLM classifier and save its output, but do not emit template files. Useful for inspecting classifier quality before committing to a template directory. |
| `--from-cache` | Re-emit template files from a previously cached classifier output. No LLM call. Useful after changes to the emitter or after editing the cached output by hand. |
| `--model=<id>` | Override the classifier model for this run (e.g. `--model=claude-sonnet-4-6`). |
| `--no-dark-mode-flatten` | Emit a light-only template without the default defensive dark-mode flatten scaffold. |

The template name defaults to the input filename stem. If a template already exists at `templates/<name>/`, it is overwritten — back it up first if you want to preserve a prior iteration.

### Author an issue

Each issue is a Markdown file with YAML frontmatter. The minimum shape:

```yaml
---
template: the-atlantic
title: "Issue #42 — Memorial Day reading"
preheader: "Three stories to spend a long weekend with."
sectionStylesFile: templates/the-atlantic/section-styles.json
sections:
  - type: masthead_logo
    logo_src: https://cdn.example.com/logo.png
    logo_alt: The Daily
  - type: issue_date
    date: "May 24, 2026"
  - type: editorial_intro
    body_html: |
      <p>It's nearly Memorial Day...</p>
  - type: article_card_pair
    left_title: "First story"
    left_body_html: "<p>...</p>"
    right_title: "Second story"
    right_body_html: "<p>...</p>"
  - type: footer
    publication_name: "The Daily"
    unsubscribe_href: "#"
---
```

The component types and slot names are specific to each template. To see what is available for a template:

- Look at `content/<template>-source.md` (the source-rebuild generated during decompilation).
- Look at `templates/<template>/newsletter.schema.json`.
- Run the MCP tool `get_template_authoring_guide` for an explanatory summary.

### Override styles per-section in an issue

You can override the template's default styles for one instance of a section without changing the template itself:

```yaml
  - type: editorial_intro
    body_html: "<p>This week's intro.</p>"
    containerStyles:
      backgroundColor: '#fff7e6'
      padding: '24px'
      borderRadius: '8px'
    contentStyles:
      fontSize: '20px'
      lineHeight: '1.5'
```

The four override buckets are `containerStyles`, `contentStyles`, `linkStyles`, and `headingStyles`. Properties are written in camelCase (`backgroundColor`, `fontSize`, `lineHeight`). See [docs/AUTHORING-A-NEWSLETTER.md](docs/AUTHORING-A-NEWSLETTER.md) for full details.

### Build a newsletter

```bash
node scripts/build-newsletter.mjs content/<your-issue>.md <campaign-name> \
  --template=<template-name>
```

Flags:

| Flag | Purpose |
|---|---|
| `--template=<name>` | Override the `template:` value in frontmatter. |
| `--no-open` | Do not auto-open the resulting HTML in a browser. |
| `--output-dir=<path>` | Write to a directory other than `build_production/`. |
| `--no-dark-mode-flatten` | Disable the default defensive dark-mode flatten layer for this build. |

Output:

- `build_production/<campaign-name>.html` — the production-ready email.
- `build_production/<campaign-name>.link-tracking-manifest.json` — every outbound link with its metadata for downstream tracking.

### Validate before building

```bash
node scripts/lint-template.mjs content/<your-issue>.md --template=<template-name>
```

Or via MCP: `validate_newsletter_markdown`.

### Send a test through AWS SES

```bash
npm run send:test -- build_production/<campaign-name>.html
```

Requires the `SES_*` environment variables to be set. See the test-send section in [docs/AUTHORING-A-NEWSLETTER.md](docs/AUTHORING-A-NEWSLETTER.md).

### Inspect the decompilation analysis

The decompiler writes a structured analysis report to `generated/<template>-decompilation-report.json`. It lists each discovered component type, its slot definitions, its confidence score, and which source-email sections were assigned to it. Useful for understanding the system's judgement before committing to a refinement pass.

---

## Project structure

```
nfl-maizzle-mail/
|
+-- content/                          # Issue Markdown files (one per issue)
|   +-- the-atlantic-source.md        # Source-rebuild generated by the decompiler
|   +-- new-yorker-sample-source.md
|   +-- ...
|
+-- templates/                        # One directory per template
|   +-- the-atlantic/
|   |   +-- newsletter.html           # Maizzle entry point
|   |   +-- layouts/main.html         # Base layout with mobile font lock
|   |   +-- components/               # Component palette reference
|   |   +-- section-styles.json       # Design tokens per component type
|   |   +-- newsletter.schema.json    # JSON schema for the data shape
|   +-- new-yorker-sample/
|   +-- dense-discovery/              # Hand-built template (reference / production)
|   +-- ...
|
+-- emails-to-templatize/             # Source HTML emails to decompile
|   +-- the-atlantic.html
|   +-- wirecutter.html
|   +-- ...
|
+-- build_production/                 # Final HTML output (commit-friendly or .gitignored)
|
+-- generated/                        # Decompilation reports, classifier caches, diff reports
|
+-- lib/
|   +-- decompiler/                   # Decompiler engine
|   |   +-- segmenter.mjs             # JSDOM section detection
|   |   +-- styles.mjs                # Inline-style harvester
|   |   +-- classifier.mjs            # Claude tool-use classifier
|   |   +-- emitter.mjs               # Template artifact writer
|   |   +-- config.mjs                # Centralized configuration
|   +-- mcp/                          # MCP server tools and resources
|   +-- newsletter-core/              # Build-pipeline support (hardening, link tracking)
|   +-- adjacency-mail/               # Theme tokens
|
+-- scripts/
|   +-- decompile-email.mjs           # CLI entry for decompilation
|   +-- build-newsletter.mjs          # CANONICAL build pipeline (do not bypass)
|   +-- mcp-server.mjs                # MCP server entry point
|   +-- decompiler-roundtrip-diff.mjs # Structural fidelity diff tool
|   +-- lint-template.mjs             # Schema validator
|   +-- md_to_json.mjs                # Markdown frontmatter to JSON
|   +-- send-ses-test.mjs             # SES test send
|
+-- docs/                             # Documentation
|   +-- PRODUCT.md                    # Three-phase product vision
|   +-- AUTHORING-A-NEWSLETTER.md     # How to write a newsletter issue
|   +-- MCP-SETUP.md                  # Wiring MCP into Claude Desktop / Code
|   +-- MCP-TOOL-REFERENCE.md         # Full MCP tool surface reference
|   +-- TROUBLESHOOTING.md            # Consolidated FAQ of known gotchas
|   +-- decompiler-current-state.md   # Implementation reference
|
+-- data/                             # Build pipeline transient artifacts
+-- .env                              # API keys and config (gitignored)
+-- README.md                         # You are here
```

---

## Toolchain summary

| Tool | Role |
|---|---|
| [Maizzle](https://maizzle.com/) | Email templating, CSS inlining, output for Outlook / Gmail / Apple Mail |
| [JSDOM](https://github.com/jsdom/jsdom) | HTML parsing for the decompiler's deterministic segmentation pass |
| [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) | Streaming tool-use calls to Claude for classification |
| [Model Context Protocol SDK](https://modelcontextprotocol.io/) | Exposes the decompiler and build pipeline as a chat-driven tool surface |
| [Ajv](https://ajv.js.org/) + [ajv-formats](https://github.com/ajv-validator/ajv-formats) | JSON schema validation |
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | YAML frontmatter parsing |
| [dotenv](https://github.com/motdotla/dotenv) | Environment configuration |
| AWS SES (optional) | Test sends through your existing SES setup |

---

## Documentation map

| Document | Read this when |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | You want to understand the product vision and three-phase workflow at a strategic level. |
| [docs/AUTHORING-A-NEWSLETTER.md](docs/AUTHORING-A-NEWSLETTER.md) | You are about to write an issue and want the full reference for slots, section types, inline style overrides, validation, and building. |
| [docs/MCP-SETUP.md](docs/MCP-SETUP.md) | You want to wire the MCP server into Claude Desktop, Claude Code, or Codex so you can drive the workflow through chat. |
| [docs/MCP-TOOL-REFERENCE.md](docs/MCP-TOOL-REFERENCE.md) | You want the full reference for the 7 MCP tools and 4 resource URI patterns the server exposes. Useful as LLM context. |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Something is broken and you want the consolidated FAQ of known gotchas with symptoms, causes, and fixes. |
| [docs/decompiler-current-state.md](docs/decompiler-current-state.md) | You want to understand the decompiler implementation in detail (segmenter, harvester, classifier, emitter). |

---

## FAQ

### What ESPs does this work with?

The build pipeline produces standard HTML email. Any ESP that accepts pasted HTML works — Sendy, Mailchimp, Campaign Monitor, Klaviyo, ConvertKit, ActiveCampaign, AWS SES (with built-in integration), HubSpot, Iterable, Customer.io. The link-tracking manifest is ESP-agnostic and can feed any downstream analytics or attribution system.

### Will the output render correctly in Outlook?

Yes. The decompiler-generated templates and the canonical build pipeline use table-based markup with conditional VML fallbacks where needed (e.g. for `border-radius`). The included mobile font lock works in Outlook for Mac, Outlook for Windows, Outlook.com, Apple Mail, Gmail, and the major mobile clients. Cross-client testing in Litmus or Email on Acid is still recommended before shipping a new template into production.

### How does an LLM "know" my brand?

It does not need to. The decompiler classifies what is structurally present in YOUR source HTML — your colors, your fonts, your section types, your layout patterns. The LLM names what it sees; it does not invent. As long as your source email is on-brand, the resulting template is on-brand by construction.

### What happens if my brand evolves?

Two paths. If the change is minor (color tweak, font size, copy of a button), edit `templates/<name>/section-styles.json` or the relevant component file directly. If the brand is substantially redesigned, decompile a new representative email — the new template lives alongside the old one and you can keep both running in parallel during a transition.

### Can a non-technical writer use this?

Yes, in two ways. Either they edit Markdown files directly (the YAML frontmatter is the only thing they touch) and run a single build command; or they interact entirely through chat with an LLM connected to the MCP server, and never see a terminal. The MCP path is the natural one for non-technical authors — the LLM handles the file edits, the validation, and the build commands.

### What is the per-issue LLM cost?

Authoring an issue with LLM assistance through MCP uses tokens proportional to the conversation length. A typical "add a section, validate, build" cycle is well under a dollar. Decompilation itself (the one-time setup per template) is $0.05 with Sonnet 4.6 or $0.30 with Opus 4.7. The build pipeline itself uses no LLM tokens.

### Can I A/B test issues?

The Markdown-based authoring makes A/B variants natural. Duplicate an issue file, change the variant (subject line, hero section, CTA copy), build both, and dispatch them to the relevant audience segments through your ESP. The link-tracking manifest distinguishes the variants at the URL level.

### How do I add UTM parameters to every link?

The link-tracking metadata system supports per-link tagging. Include a `tracking:` block alongside any link slot in your frontmatter to control its UTM and category metadata. The link tracking manifest collects all of these into a single JSON artifact next to the built HTML. A future enhancement will auto-apply UTM defaults per campaign; today the metadata is captured and you can apply it downstream.

### What about deliverability?

The system produces standards-compliant HTML email with inline CSS and table-based layout. Deliverability is governed by your sending infrastructure (SPF, DKIM, DMARC, sender reputation, list hygiene), not by the markup. If you send through SES with verified domains and reasonable sending patterns, deliverability is excellent.

### Can I commit this to version control?

Yes. The repository is designed to live in git. Every template, every issue, every section-style override is a file you can review, diff, and roll back. `build_production/` can be either committed (for full historical record of shipped artifacts) or ignored (if you only care about source). The link-tracking manifests are JSON and diff cleanly.

### Does it support dark mode?

Yes, as a defensive fallback. By default, dense-discovery builds and newly decompiled templates declare `light dark` support and include a `prefers-color-scheme: dark` flatten layer: dark gray surfaces, off-white text, muted borders/captions, and blue links. This keeps dark-mode clients that honor the media query from inventing their own high-risk color treatment.

Use `--no-dark-mode-flatten` when you need a light-only build, for example when shipping an urgent issue and you want the previous output behavior. Browser screenshots with an emulated dark color scheme are useful for checking this CSS path, but Gmail and Outlook can still apply their own email-specific rewriting. For production-critical templates, spot-check a small real-client matrix when time allows.

### Multilingual?

The system is language-agnostic — Markdown content is just UTF-8 text. Right-to-left layouts (Hebrew, Arabic) work but may need template-level adjustments to alignment. Multi-language issues from one source file are not directly supported; the operational pattern is one issue file per language.

### How do I migrate from Mailchimp or Klaviyo?

Export an HTML email from your current ESP (most platforms have an "export HTML" or "view source" option), drop it into `emails-to-templatize/`, and run the decompiler against it. The result is a template that reproduces the design, plus a source-rebuild Markdown that gives you a clean authoring starting point. You can then keep sending through the same ESP — just paste the HTML into the new-campaign form — or move to SES via the included test-send integration.

### How do I host images?

Bring your own image hosting. The decompiler preserves whatever image URLs are in your source email; the build pipeline does not rehost. Common choices: Cloudflare Images, S3 with a CloudFront distribution, Bunny CDN, your existing CMS, or your ESP's image hosting. The system validates image URLs at build time and warns on 404s.

### Can I extend the system with my own components?

Yes. After decompiling, edit `templates/<name>/components/*.html` directly or add new ones. Update `section-styles.json` with the matching design tokens and `newsletter.schema.json` with the data shape. Any LLM that knows about the MCP server's `get_template_schema` tool can be brought up to speed on the new components by re-reading the schema.

### What about CAN-SPAM, GDPR, unsubscribe links, postal addresses?

The decompiler preserves whatever footer / colophon / unsubscribe / postal-address slots existed in the source email. The build pipeline does not enforce CAN-SPAM or GDPR; that is your responsibility as the operator. The recommended pattern is to template the footer once (with valid unsubscribe link, postal address, sender identity) and reference it in every issue.

### What is the licensing situation?

This repository is currently designed as a self-hosted system for the operator. Refer to the LICENSE file for the canonical terms.

### How do I report a bug or request a feature?

File an issue on the repository's GitHub page. For decompiler-specific quirks (e.g. "decompilation failed on email X"), include the source HTML and the error output, plus the model name used.

---

## Status and roadmap

The system is in production use at Near Future Laboratory and is being productized for general use. Current state:

| Capability | Status |
|---|---|
| Decompiler — segmentation, style harvesting, LLM classification, artifact emission | Production |
| Canonical build pipeline — schema validation, link tracking, mobile font hardening, image URL validation, CSS inlining, Outlook-safe markup | Production |
| MCP server — 7 tools and 4 resource URI patterns over stdio, validated against Claude Code and Claude Desktop | Production |
| Per-template authoring guide (`AUTHORING.md` generator) | Planned (Phase A) |
| Per-template human-readable analysis report (`REPORT.md` generator) | Planned (Phase A) |
| Lorem-ipsum starter Markdown generator (per-template "blank canvas") | Planned (Phase A) |
| Per-section inline style override end-to-end validation | Partial — the pattern works for hand-built templates; needs verification on decompiler-generated templates |
| One-command setup (`npm run init -- --from-email=path/to.html`) | Planned (Phase C) |
| Top-level README rewrite for the three-phase workflow | Done (this document) |
| Example fork-and-go newsletter project repository | Planned (Phase C) |

See [docs/PRODUCT.md](docs/PRODUCT.md) for the full phase breakdown and rationale.

---

## Provenance

Built on top of [Maizzle](https://maizzle.com/) (the email build system) by the Near Future Laboratory team. The decompiler and MCP layer are this repository's own contribution and are designed to be useful to any operator with a branded HTML email they want to keep using.

For questions, contributions, or operational support: refer to the documentation in `docs/`, or use the MCP-driven chat workflow with Claude to navigate the codebase.
