# Product vision: HTML email decompiler → newsletter workflow bootstrapper

**One sentence:** a non-technical newsletter operator should be able to point at an HTML email they already like, and end up with a working LLM-assisted authoring workflow purpose-built around this repo's Maizzle pipeline — without writing code.

For the implementation snapshot, known gaps, and continuation notes, see [`docs/decompiler-current-state.md`](decompiler-current-state.md).

## Audience

Two operators interact with the product, often the same person:

1. **The brand operator.** Has a designer-built HTML email they want to keep using as a structural template. Wants automation but does not want to lose the brand. Does not necessarily write code.
2. **An LLM agent** the operator works with (Claude Code, Claude Desktop, Codex, or any MCP-aware chat tool). Reads the per-template authoring guide, writes Markdown for new issues, and edits styles when asked.

Every artifact the decompiler produces should serve both audiences: human-readable AND dense enough for an LLM to load as context without burning tool calls.

## The three-phase workflow

```
        ┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
        │    DECOMPILE    │  ───▶ │      REFINE      │  ───▶ │      AUTHOR      │
        │                 │       │                  │       │                  │
existing HTML            template files +         renamed types,            one Markdown
email file               per-template guide       tweaked styles,           file per issue
                         + REPORT + samples       slot defaults             → built email
                                                                            (canonical pipeline)
```

### Phase 1 — Decompile

Run `node scripts/decompile-email.mjs <input.html>`. Produces, under `templates/<name>/` and `content/`:

| Artifact | Purpose | Audience |
|---|---|---|
| `templates/<name>/components/*.html` | Maizzle palette (reference) | LLM / dev |
| `templates/<name>/layouts/main.html` | Email-safe layout with mobile font lock | Maizzle build |
| `templates/<name>/newsletter.html` | Inline dispatch for the discovered palette | Maizzle build |
| `templates/<name>/section-styles.json` | Design tokens per discovered component type + global mobile overrides | User edits |
| `templates/<name>/newsletter.schema.json` | JSON schema describing the data shape | LLM / validator |
| `templates/<name>/AUTHORING.md` | **Per-template authoring guide** — vocabulary, slot reference, inline style override patterns, common gotchas | Operator + LLM |
| `templates/<name>/REPORT.md` | **Human-readable decompilation report** — palette + confidences + ambiguities flagged for review | Operator |
| `content/<name>-source.md` | Exact rebuild of source as Markdown | Operator (reference) |
| `content/<name>-starter.md` | Lorem-ipsum example with same vocabulary | Operator (blank canvas) |
| `generated/<name>-decompilation-report.json` | Raw analysis report | LLM / tooling |
| `generated/<name>-classifier-output.json` | Raw LLM output (cache for `--from-cache`) | tooling |

### Phase 2 — Refine

The operator iterates on the generated template, typically in chat with their LLM. Examples:

- "Rename `article_card_pair` to `feature_pair` everywhere."
- "Bump the headline font size in `editorial_intro` by 2px."
- "Add a default `Read more →` label to `archive_cta_banner`."

This phase is mostly editing `section-styles.json` and `AUTHORING.md`. Component HTML edits are rare and require a code-aware operator (or LLM).

### Phase 3 — Author

The operator (or their LLM) writes one Markdown file per issue under `content/`, using the vocabulary the AUTHORING.md defines. They build with:

```
node scripts/build-newsletter.mjs content/<your-issue>.md <campaign-name> --template=<name>
```

This is the canonical pipeline — link tracking, mobile font hardening, schema validation, image URL checks, all included.

## Productization phases

### Phase A — Authoring-kit deliverables (current)

The decompiler's per-run output bundle must include everything in the artifact table above. Specifically:

- `AUTHORING.md` is the load-bearing piece. It must teach a non-technical user how to write a newsletter Markdown file from scratch, including how to override styles per-section in frontmatter (dense-discovery's pattern).
- `content/<name>-starter.md` is the cold-start: lorem-ipsum content using the same vocabulary so the user can edit in their own copy without staring at a blank file.
- `REPORT.md` surfaces confidence and ambiguities so the operator knows where to scrutinize the auto-generated template.
- Per-section inline style overrides must work — the user can put `contentStyles: { fontSize: '20px' }` in their issue Markdown and have it override the template default for that section instance.

### Phase B — MCP server

Wrap the decompiler + canonical build pipeline as an MCP server so any MCP-aware LLM tool (Claude Code, Claude Desktop, Codex, etc.) can drive it. Proposed tools:

| Tool | Purpose |
|---|---|
| `decompile_email(html_path \| url, name?)` | Run a full decompilation. Returns artifact paths + report summary. |
| `list_templates()` | Installed decompiled templates with palette overview. |
| `get_template_authoring_guide(name)` | Returns AUTHORING.md so the LLM has the vocabulary in context. |
| `get_template_schema(name)` | Returns newsletter.schema.json for validation. |
| `validate_newsletter_markdown(content_md_path)` | Schema + structural check before building. |
| `build_newsletter(content_md_path, campaign_name)` | Runs the canonical pipeline. Returns the built HTML path + link tracking manifest. |
| `add_section(content_md_path, type, slots, after_index?)` | LLM-driven authoring helper. Validates against schema. |

Resources should expose `templates/*/AUTHORING.md` and `templates/*/section-styles.json` so an LLM client can read them as cached resources rather than burning a tool call.

### Phase C — Onboarding polish

- Top-level `README.md` rewrite framing the three-phase workflow as the canonical entry point.
- One-command setup script: `npm run init -- --from-email=path/to.html`.
- An example "newsletter project" repo someone can fork to see a complete real-world setup.

## Non-goals

- Replacing dense-discovery or any existing in-repo template. The decompiler generates **new** templates alongside them.
- Generic Maizzle scaffolding. This is specifically wired to `scripts/build-newsletter.mjs`, not raw `maizzle build`.
- WYSIWYG editing. The product expects Markdown authoring (by hand or via LLM); the only "visual" surface is the rendered email preview.
- Multi-tenant SaaS. This is a self-hosted, repo-cloning workflow.

## Design principles

- **Every artifact must work for an LLM agent as well as a human.** That's why AUTHORING.md exists alongside REPORT.md alongside the schema.
- **Don't break what works.** Canonical pipeline integration (`build-newsletter.mjs`) is non-negotiable. Mobile font lock is non-negotiable.
- **Cheap to re-run.** `--from-cache` exists for a reason. Decompilation is expensive (Opus 4.7 API call); emit, AUTHORING regeneration, etc. should be deterministic given the cached classifier output.
- **Open vocabulary, always.** The classifier discovers component types per-email. Never coerce into a fixed taxonomy. The same operator may have brand-X-newsletter using one palette and brand-Y-newsletter using a completely different one.

## Where this lives

- This file (`docs/PRODUCT.md`) is the canonical statement of the vision.
- Implementation memory: `.claude/projects/.../memory/project_decompiler_product_vision.md` (a pointer to this file).
- Build/integration memory: `.claude/projects/.../memory/project_email_decompiler.md` (technical detail).
