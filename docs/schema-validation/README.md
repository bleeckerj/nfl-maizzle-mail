# Schema Validation

This repo currently has a generic `newsletter.schema.json`, but it is not yet specific enough to reliably validate the data shape for the `dense-discovery` template.

We want a robust way to flag typos/unexpected keys in source content (Markdown → JSON) like `intro.foobarcontent`, without hardcoding “known misspellings”.

## Proposed approach

- Maintain **template-specific JSON Schemas** (e.g. `templates/dense-discovery/newsletter.schema.json`) that describe the exact `locals` shape used by that template (`intro`, `header`, `sections[*]`, per-`section.type` item shapes, etc.).
- Use JSON Schema validation (Ajv) after `scripts/md_to_json.mjs` writes `data/newsletter.json` and before `maizzle build`.
- Add `additionalProperties: false` (and/or `unevaluatedProperties: false`) to the objects we want to protect against typos so any unknown key is reported with a path.
- Default behavior: **warn and continue**; optional `--strict-schema` (or `SCHEMA_STRICT=1`) to fail the build on schema errors.

## Status: implemented (best-effort)

- Schema generation script: `scripts/generate-template-schema.mjs`
  - `npm run schema:generate -- --entry templates/dense-discovery/newsletter.html --output templates/dense-discovery/newsletter.schema.json`
- Build-time validation: `scripts/build-newsletter.mjs`
  - Automatically validates `data/newsletter.json` against `templates/<template>/newsletter.schema.json` when present (falls back to `newsletter.schema.json`).
  - Default: warns and continues.
  - Strict mode: pass `--strict-schema` or set `SCHEMA_STRICT=1`.
  - If you use `workflow.sh`, you can pass `--strict-schema` and/or `--regen-schema`.

## Creating `templates/dense-discovery/newsletter.schema.json` from templates

The goal is a schema that is:

- **Definitive** for `dense-discovery` (matches what the templates actually read at render time).
- **Defensive** (unknown keys get flagged via `additionalProperties: false`).
- **Maintainable** (stays in sync as templates change).

### Practical way to “derive from templates”

Maizzle templates use `posthtml-expressions`, where `{{ ... }}` and `<if condition="...">` contain JavaScript-like expressions, and `<each loop="x in y">` introduces loop variables.

A workable derivation pipeline is:

1. **Collect the template surface area**
   - Start from `templates/dense-discovery/newsletter.html`.
   - Resolve `<component src="...">` includes (e.g. `templates/dense-discovery/components/IntroSection.html`, `templates/dense-discovery/components/Header.html`, `templates/dense-discovery/components/Footer.html`).
   - Also include the layout file(s) used via `<extends ...>`.

2. **Extract data “reads”**
   - Find all moustache expressions: `{{ ... }}` and `{{{ ... }}}`.
   - Find all condition expressions: `<if condition="...">`.
   - Find all loops: `<each loop="item in section.items">` (creates variable bindings: `item`, `section`, etc.).

3. **Parse expressions to property paths**
   - For each expression, parse the JavaScript snippet and collect “member access” chains:
     - Example: `header.logoTop` → path `header.logoTop`
     - Example: `section.containerStyles.backgroundColor` → path `sections[*].containerStyles.backgroundColor` (once you know `section` is `sections[*]`)
     - Example: `item.authorLabel || section.authorLabel || 'Author'` → paths `sections[*].items[*].authorLabel`, `sections[*].authorLabel`
   - Current implementation is regex-driven and best-effort (it understands dotted access and `['computed']` access); upgrading to a real JS parser (e.g. `acorn`) is a likely next step.

4. **Infer shape from loops**
   - When you see `<each loop="section in sections">`, bind `section` → `sections[*]`.
   - When you see `<each loop="item in section.items">`, bind `item` → `sections[*].items[*]`.
   - When you see `<each loop="image in item.images">`, bind `image` → `sections[*].items[*].images[*]`.

5. **Infer required vs optional (heuristic)**
   - If a path is only ever used inside `<if condition="path">`, treat it as **optional**.
   - If a path is used outside guards, treat it as **required** (or at least “expected”).
   - Be conservative: schemas can start by marking most fields optional, but still use `additionalProperties: false` to catch typos.

6. **Emit JSON Schema**
   - Generate a base object with explicit `properties` for the collected paths.
   - Set `additionalProperties: false` for objects you want to protect (root, `intro`, `header`, each `section`, each `item`).
   - Model polymorphic section items using `oneOf` keyed by `section.type`, e.g.:
     - `"type": { "const": "books-accessories" }` then an `"items"` array of book items.

7. **Keep a small manual override layer**
   - Some things are hard to infer precisely (e.g. rich HTML strings, URLs, arrays of objects vs strings).
   - Let the generator merge in a hand-maintained “patch” file with:
     - formats (`uri`, `email`)
     - `oneOf` refinements (`images` array supports string or `{src, alt, link}`)
     - enums for `section.type`

### Output expectations

You should be able to validate `data/newsletter.json` and get errors like:

- unknown key: `intro.foobarcontent`
- unknown item key: `sections[3].items[0].autherName`
- wrong type: `sections[2].items[0].images` is not an array

### Limitations to accept up-front

- Template expressions can access arbitrary JS, so this is “best effort” derivation.
- Components can be conditionally included; derivation should include all possible component files for the template.
- Some variables are injected at build time (e.g. `themeColors`, `section.containerStyles`, `section.contentStyles`); the schema should include these if the template reads them from `locals`.

## Implementation sketch

- Add a step in `scripts/build-newsletter.mjs`:
  - Load the schema for the current `template` (fallback to generic schema when missing).
  - Validate `data/newsletter.json` using Ajv.
  - Print a concise list of “unknown key” violations with JSON pointers/paths.
- (Optional) allow an escape hatch (like `meta` or `extra`) where freeform keys are allowed without warnings.

## Why this is deferred

- `newsletter.schema.json` needs to be brought into alignment with the actual template usage, and likely split into per-template schemas to avoid false positives/negatives.
