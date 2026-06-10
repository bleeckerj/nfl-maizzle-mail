# MCP tool reference — `nfl-maizzle-mail` server

Full reference for every tool and resource the `nfl-maizzle-mail` MCP server exposes. Use this as context when prompting an LLM that has the server connected, or when calling the server directly via JSON-RPC.

This doc describes the server at `scripts/mcp-server.mjs` (version 0.2.0). For client setup (Claude Desktop, Claude Code, Codex), see [MCP-SETUP.md](MCP-SETUP.md). For the underlying workflow, see [PRODUCT.md](PRODUCT.md).

---

## Server identity

- **Name:** `nfl-maizzle-mail`
- **Version:** 0.2.0
- **Transport:** stdio
- **Capabilities:** `tools`, `resources`
- **Repo root:** auto-resolved from `import.meta.url` (cwd-independent)
- **Requires:** `ANTHROPIC_API_KEY` in repo `.env` for `decompile_email`

---

## Tools

7 tools total. All paths in arguments are resolved relative to the repo root (where `scripts/mcp-server.mjs` lives) unless absolute.

### `decompile_email`

Decompile a source HTML email into a complete Maizzle template + Markdown skeleton. Discovers component types using an LLM (open vocabulary — invents type names that fit *this* email rather than coercing into a fixed taxonomy). Long-running (1-5 minutes); emits `notifications/progress` updates when the client supplies a `progressToken`.

**Input schema:**

| Param | Required | Type | Description |
|---|---|---|---|
| `html_path` | yes | string | Source HTML file path (relative or absolute) |
| `name` | no | string | Template name to use under `templates/<name>/`. Defaults to the input filename stem. |
| `model` | no | string | Override classifier model (e.g. `claude-sonnet-4-6`). Defaults to `DECOMPILER_MODEL` in `.env`. |
| `from_cache` | no | boolean | If true, re-emit from a prior `generated/<name>-classifier-output.json` instead of calling the API. Default `false`. |

**Returns:** JSON envelope with `templateName`, `model`, `usage`, `sectionCount`, `componentTypes[]` (each with `type`, `displayName`, `sections[]`, `slots[]`, `confidence`), `assignments[]`, `artifacts{}` (paths to every emitted file), and `nextSteps[]`.

**Example call:**

```json
{
  "name": "decompile_email",
  "arguments": {
    "html_path": "emails-to-templatize/the-atlantic.html",
    "model": "claude-sonnet-4-6"
  }
}
```

**Example return (abbreviated):**

```json
{
  "templateName": "the-atlantic",
  "model": "claude-sonnet-4-6",
  "usage": { "input_tokens": 33629, "output_tokens": 19342 },
  "sectionCount": 11,
  "componentTypes": [
    { "type": "masthead_logo", "displayName": "Masthead Logo",
      "sections": [0], "slots": ["logo_src", "logo_alt"], "confidence": 0.95 },
    { "type": "feature_story", "displayName": "Feature Story Section",
      "sections": [4, 5, 7], "slots": ["heading_html", "image_block_html", "body_html"], "confidence": 0.85 }
  ],
  "artifacts": {
    "templateDir": "templates/the-atlantic",
    "newsletter": "templates/the-atlantic/newsletter.html",
    "sourceSkeleton": "content/the-atlantic-source.md",
    "report": "generated/the-atlantic-decompilation-report.json"
  }
}
```

**Common errors:**

| Error | Meaning | Fix |
|---|---|---|
| `ANTHROPIC_API_KEY not set` | Key missing from `.env` | Add it; restart the server |
| `from_cache requested but no cache at ...` | No prior classifier output | Run without `from_cache` first to populate the cache |
| `Classifier failed: terminated` | Model issue (Sonnet 4.0 specifically) | Set `DECOMPILER_MODEL=claude-opus-4-7` or pass `model: "claude-sonnet-4-6"` |

---

### `list_templates`

List all templates installed under `templates/` with each template's component palette overview. Useful before authoring — tells the LLM which templates are available and what types each supports.

**Input schema:** No parameters.

**Returns:** `{ templates: [{ name, dir, hasReport, hasAuthoringGuide, palette: [{ type, displayName, sectionIndexes?, confidence? }] }] }`

**Palette field:**
- `null` if no metadata could be derived (the template has no schema or report)
- `[]` if metadata exists but no component types were derivable
- Populated array for decompiler-generated templates AND hand-built templates with a `section-styles.json`

**Example return (abbreviated, real call):**

```json
{
  "templates": [
    { "name": "dense-discovery", "dir": "templates/dense-discovery", "hasReport": false,
      "hasAuthoringGuide": false,
      "palette": [
        { "type": "sponsor", "displayName": "Sponsor Section" },
        { "type": "dispatch", "displayName": "Dispatch Section" }
      ] },
    { "name": "new-yorker-sample", "dir": "templates/new-yorker-sample", "hasReport": true,
      "hasAuthoringGuide": false,
      "palette": [
        { "type": "article_card_pair", "displayName": "Article Card Pair",
          "sectionIndexes": [3, 4, 5], "confidence": 0.97 }
      ] }
  ]
}
```

---

### `get_template_schema`

Return the JSON Schema describing the data shape a newsletter Markdown file must follow for the given template. Use to validate before building or to feed authoring context to an LLM.

**Input schema:**

| Param | Required | Type |
|---|---|---|
| `name` | yes | string (template name) |

**Returns:** JSON Schema (Draft-07) for the template. Sections array uses `oneOf` over each discovered component type with required `type` const and per-slot field definitions.

**Common errors:**

| Error | Meaning |
|---|---|
| `template "X" not found` | No directory at `templates/X/`. Check `list_templates`. |
| `schema not found for template "X"` | Template exists but has no `newsletter.schema.json` (hand-built templates often don't) |

---

### `get_template_authoring_guide`

Return the per-template authoring guide. Returns `templates/<name>/AUTHORING.md` if present (Phase A deliverable). Falls back to a synthesized markdown summary derived from the schema and decompilation report — usable, but less opinionated than the full AUTHORING.md will be.

**Input schema:**

| Param | Required | Type |
|---|---|---|
| `name` | yes | string |

**Returns:** Markdown text. Always meaningful even without AUTHORING.md — the fallback includes section types, slot definitions, confidence scores, mobile font lock note, and authoring instructions.

**Example fallback return (abbreviated):**

```markdown
# new-yorker-sample — authoring guide (fallback)

> AUTHORING.md has not been generated for this template yet (Phase A pending).
> This is a minimal summary derived from the schema and decompilation report.

## Section types

### `article_card_pair` — Article Card Pair

Slots: `left_section_label`, `left_image_href`, `left_image_src`, ...

Confidence: 97%
...

## Mobile font lock
Bumps body type larger on screens ≤ 599px.

## How to author
1. Copy the source-rebuilt skeleton: content/new-yorker-sample-source.md
2. Edit the sections: array...
```

---

### `validate_newsletter_markdown`

Schema-validate a newsletter Markdown file before building. Wraps `scripts/lint-template.mjs`.

**Input schema:**

| Param | Required | Type | Description |
|---|---|---|---|
| `content_md_path` | yes | string | Path to the Markdown file |
| `template` | no | string | Template name override (otherwise read from `template:` frontmatter) |

**Returns:** Lint output as a single text block. Includes both real errors and stylistic warnings.

**Warnings that are usually noise:**

- "Section title is empty"
- "Section has no items array"

These come from a legacy linter that assumes the dense-discovery `title+items[]` convention. Decompiler-generated templates use flat slots and produce these warnings for every section — safe to ignore. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

### `build_newsletter`

Run the canonical newsletter build pipeline against a content Markdown file. **This is the canonical path** — do not bypass with raw `maizzle build`, since the canonical pipeline adds link tracking, mobile font hardening, schema validation, image URL checks, and section-style preprocessing.

**Input schema:**

| Param | Required | Type | Description |
|---|---|---|---|
| `content_md_path` | yes | string | Path to the newsletter Markdown |
| `campaign_name` | no | string | Output filename label → `build_production/<campaign>.html` |
| `template` | no | string | Template override |

**Returns:** Build pipeline stdout (typically a multi-stage progress log ending in `✅ Newsletter Built Successfully!`).

**Side effects:**

- Writes `build_production/<campaign>.html`
- Writes `build_production/<campaign>.link-tracking-manifest.json` (every link with metadata for downstream tracking)
- Updates `data/newsletter.json` as a transient artifact

**Common errors:**

| Error | Meaning |
|---|---|
| Schema validation failure | Markdown shape doesn't match the template's schema. Run `validate_newsletter_markdown` first to see details. |
| Image URL validation failure | One or more image URLs in the markdown 404 or aren't reachable. The pipeline lists them. |
| Build error in Maizzle | Usually a template HTML issue. The error message includes a posthtml stack trace pointing at the offending element. |

---

### `add_section`

Insert a new section into an existing newsletter Markdown file. LLM-driven authoring helper — validates the type against the template palette, warns on missing/unknown slots, writes back valid YAML frontmatter.

**Input schema:**

| Param | Required | Type | Description |
|---|---|---|---|
| `content_md_path` | yes | string | Target markdown file |
| `type` | yes | string | Section type (must exist in the template's palette) |
| `item_values` | yes | object | Slot name → value map |
| `position` | no | `"start"` \| `"end"` \| integer | Where to insert. `"end"` (default), `"start"`, or insert AFTER the section at the given 0-based index. |
| `template` | no | string | Template override (otherwise read from frontmatter) |

**Returns:**

```json
{
  "file": "content/your-issue.md",
  "template": "new-yorker-sample",
  "sectionType": "article_card_pair",
  "insertedAtIndex": 4,
  "totalSections": 5,
  "warnings": ["missing slot \"left_image_href\" (link_url) — ..."],
  "recommendation": "Run validate_newsletter_markdown to confirm the file is buildable."
}
```

**Slot validation behavior:**

- If the template was decompiled (classifier output available), each missing slot triggers a warning AND each unknown slot triggers a warning. Authoring proceeds either way — warnings don't block insertion.
- For hand-built templates without a classifier output, slot validation is skipped (the slot manifest isn't known).

**Common errors:**

| Error | Meaning | Fix |
|---|---|---|
| `cannot resolve template` | No `template:` in frontmatter and no `template` arg | Pass `template` explicitly |
| `unknown section type "X" for template "Y". Available: ...` | Type isn't in the template palette | Pick from the available list |
| `no palette found for template "X"` | Template has neither classifier output nor section-styles.json | The template might be incomplete or non-decompiler — check with `list_templates` |

---

## Resources

The server registers resources for every template installed under `templates/`. URIs follow a consistent scheme so an LLM client can cache them as static context.

### URI scheme

```
nfl-maizzle-mail://template/<name>/<kind>
```

`<kind>` is one of:

| Kind | MIME | What you get |
|---|---|---|
| `authoring-guide` | `text/markdown` | `AUTHORING.md` if present; otherwise the synthesized fallback (same as `get_template_authoring_guide`) |
| `section-styles` | `application/json` | `templates/<name>/section-styles.json` |
| `schema` | `application/json` | `templates/<name>/newsletter.schema.json` |
| `decompilation-report` | `application/json` | `generated/<name>-decompilation-report.json` (only present for decompiler-generated templates) |

### Listing

`resources/list` returns every available resource across all installed templates. On a typical setup with 14 templates, this returns 30+ entries (some templates lack a schema or section-styles, so not every kind exists for every template).

### Reading

`resources/read` with the URI returns `{ contents: [{ uri, mimeType, text }] }`. The text body is the raw file content (or the synthesized fallback for `authoring-guide`).

### When to use resources vs tools

- **Resources** are for static, cacheable context the LLM should have always-available. Best for the authoring guide and schema, which an LLM often references multiple times within a session.
- **Tools** are for actions that change state or query live state. `list_templates` (action: query), `build_newsletter` (action: build), `add_section` (action: mutate).

---

## Progress notifications

For long-running tools (currently only `decompile_email`), the server emits `notifications/progress` with the client-supplied `progressToken`. Example sequence for a `from_cache: true` run:

```
{ progress: 1,   total: 100, message: "segmenting new-yorker-sample.html" }
{ progress: 10,  total: 100, message: "found 8 candidate sections" }
{ progress: 50,  total: 100, message: "reusing cached classifier output" }
{ progress: 90,  total: 100, message: "emitting template artifacts" }
{ progress: 100, total: 100, message: "done — 6 component types" }
```

For a live (non-cached) decompilation, additional `classifier streaming (N chars)` updates appear between 15-80% as the LLM streams its output. The total token count isn't known up-front; the server uses a heuristic of "~40K typical" to interpolate progress between the milestones.

If your client doesn't pass a `progressToken`, no notifications are emitted (no error — they're optional).

---

## Configuration via environment

The MCP server inherits its configuration from `lib/decompiler/config.mjs`, which reads the repo's `.env` with `dotenv` (`override: true`, `quiet: true`). All `DECOMPILER_*` vars apply.

| Env var | Default | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | (unset) | **Required** for `decompile_email` |
| `DECOMPILER_MODEL` | `claude-opus-4-7` | Classifier model |
| `DECOMPILER_MAX_TOKENS` | 64000 | Max output tokens for classifier |
| `DECOMPILER_MAX_SECTION_HTML_CHARS` | 6000 | Per-section HTML cap sent to classifier |
| `DECOMPILER_TEMPLATES_DIR` | `templates` | Where templates live (relative to repo root) |
| `DECOMPILER_CONTENT_DIR` | `content` | Where newsletter Markdown lives |
| `DECOMPILER_REPORT_DIR` | `generated` | Where reports + caches go |

Legacy `DECOMPOSER_*` env vars are still honored as a transitional fallback for `.env` files predating the rename.

---

## Smoke testing the server outside an LLM client

A bare JSON-RPC handshake + tool call, for confirming the server is alive:

```bash
cat <<'EOF' | node scripts/mcp-server.mjs
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_templates","arguments":{}}}
{"jsonrpc":"2.0","id":4,"method":"resources/list"}
EOF
```

Expected: stderr shows `[nfl-maizzle-mail MCP] ready. repo_root=..., tools=7`, then four JSON-RPC responses on stdout.

---

## See also

- [docs/MCP-SETUP.md](MCP-SETUP.md) — wiring the server into Claude Desktop / Claude Code / Codex
- [docs/PRODUCT.md](PRODUCT.md) — three-phase product vision the tools serve
- [docs/AUTHORING-A-NEWSLETTER.md](AUTHORING-A-NEWSLETTER.md) — what to do AFTER `decompile_email` succeeds
- [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) — known gotchas
- [docs/decompiler-current-state.md](decompiler-current-state.md) — implementation reference (segmenter, harvester, classifier, emitter)
