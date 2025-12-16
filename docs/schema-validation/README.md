# Schema Validation (Deferred)

This repo currently has a generic `newsletter.schema.json`, but it is not yet specific enough to reliably validate the data shape for the `dense-discovery` template.

We want a robust way to flag typos/unexpected keys in source content (Markdown → JSON) like `intro.foobarcontent`, without hardcoding “known misspellings”.

## Proposed approach

- Maintain **template-specific JSON Schemas** (e.g. `templates/dense-discovery/newsletter.schema.json`) that describe the exact `locals` shape used by that template (`intro`, `header`, `sections[*]`, per-`section.type` item shapes, etc.).
- Use JSON Schema validation (Ajv) after `scripts/md_to_json.mjs` writes `data/newsletter.json` and before `maizzle build`.
- Add `additionalProperties: false` (and/or `unevaluatedProperties: false`) to the objects we want to protect against typos so any unknown key is reported with a path.
- Default behavior: **warn and continue**; optional `--strict` (or env var) to fail the build on schema errors.

## Implementation sketch

- Add a step in `scripts/build-newsletter.mjs`:
  - Load the schema for the current `template` (fallback to generic schema when missing).
  - Validate `data/newsletter.json` using Ajv.
  - Print a concise list of “unknown key” violations with JSON pointers/paths.
- (Optional) allow an escape hatch (like `meta` or `extra`) where freeform keys are allowed without warnings.

## Why this is deferred

- `newsletter.schema.json` needs to be brought into alignment with the actual template usage, and likely split into per-template schemas to avoid false positives/negatives.
