# AGENTS.md

## Purpose

This file documents the canonical structure and workflow for `nfl-maizzle-mail` so template path drift and duplicate trees do not reappear.

## Canonical Layout (Source of Truth)

Managed-artifact View Online and sharing URLs must be resolved from the active
publication registry and validated live. Never infer those destinations from
content file paths, source refs, slugs, titles, or route patterns. Preserve the
registry's exact published URL, including publication suffixes. Missing or inactive
records, HTTP 404/410, and network failures block the public email build; do not
treat them as warnings or substitute a guessed URL. Explicit local previews may
use their provisioned server URL and must not be sent.

- `content/` — Legacy/local newsletter inputs. Adjacency job-email drafts belong in sibling `nfl-editorial/emails/jobs/<job-id>/<job-id>.email.md`; generated HTML and manifests belong beside that source.
- Job-email templates, schemas, preparation, and rendering remain here. The editorial `mail:build:job-email` command invokes this renderer with an explicit source and adjacent output directory.
- `data/` — Build input JSON (`data/newsletter.json`) generated from content or copied from a JSON source.
- `templates/<template-name>/` — **Only canonical template location**.
  - `newsletter.html`
  - `layouts/`
  - `components/`
  - `section-styles.json`
  - `newsletter.schema.json`
- `scripts/` — Build and tooling (`build-newsletter.mjs`, `quick-build.mjs`, factory scripts).
- `build_production/` — Final HTML outputs.

## Critical Path Rules

1. **Do not create or use `src/templates/` mirrors.**
   - `templates/<name>/` is canonical.
   - Any workflow that copies templates into `src/templates` is out-of-band and should not be reintroduced.

2. **Build from the active template directory.**
   - Config resolves `newsletterData.template` and compiles from:
     - `templates/<templateName>`
     - `templates/<templateName>/components`

3. **Template include paths must match per-template compilation mode.**
   - Use template-local paths where expected by that template (e.g., `layouts/main.html`, `components/...`) or consistently use absolute template paths if the template is authored for that.
   - Do not mix assumptions from multi-template root compilation.

4. **Do not persist build-only injected fields to source JSON.**
   - Build-time style augmentation keys (e.g., derived section style helpers) are runtime artifacts.
   - `scripts/build-newsletter.mjs` restores `data/newsletter.json` to clean source state after build.

5. **Use the newsletter template operating process for new templates.**
   - Before scaffolding or revising a production newsletter template, read `docs/newsletter-template-operating-process.md`.
   - New templates should carry forward the dense-discovery-derived workflow for tracked link objects, `ad-block` hydration from `nfl-editorial` ad ids, deterministic build-injected view-online links, per-template schemas, and canonical build verification.

6. **Treat mobile typography approvals as append-only records.**
   - `config/mobile-typography-locks.jsonl` is the canonical mobile-size ledger.
   - Never edit or remove an existing record. Explicitly approved changes append a new hash-chained record.
   - Canonical builds must verify template CSS, section-style tokens, and rendered HTML, then write the mobile typography verification sidecar.

## Expected Build Flow

1. Input Markdown or JSON is normalized into `data/newsletter.json`.
2. `scripts/build-newsletter.mjs` applies style preprocessing for rendering.
3. Maizzle builds from canonical `templates/<templateName>`.
4. Output is written to `build_production/<output>.html`.
5. Source JSON is restored to non-injected state.

## Validation Commands

- Primary build:
  - `node scripts/build-newsletter.mjs content/<file>.md`
  - `node scripts/build-newsletter.mjs data/newsletter.json <output-name> --no-open`
- Quick build:
  - `npm run quick <template-name> content/<file>.md`

## Change Checklist (Before Shipping)

## HARD RULE: Schema Parity

Any change to a schema-backed value or behavior must update its canonical schema in the same change.

- This covers new, renamed, removed, defaulted, normalized, validated, or rendered fields, plus changes to an existing field's allowed values or semantic behavior.
- Update the owning schema first, then its types, normalization/data-access code, renderer, authoring documentation or sample data, and focused tests as applicable.
- Do not rely on permissive `additionalProperties`, inferred renderer behavior, or undocumented fields to bypass the schema contract.
- Before committing, inspect the staged diff to confirm the canonical schema file is included alongside the implementation. Validate the schema and run a representative build or focused runtime check.
- A change to schema-backed behavior without a corresponding schema update is incomplete.

- If template files changed: run at least one focused build for that template.
- If schema/content model changed: rebuild a representative real newsletter.
- Confirm no new `src/templates` directory or sync logic exists.
- Confirm output renders and lands in `build_production/`.

## Operator-readable scripts

Every script must include plain-language comments explaining its purpose, inputs, outputs, and important processing steps. No script should be pure uncommented code. Explain configuration choices, side effects, and non-obvious behavior so an operator can make small adjustments without reverse-engineering the implementation. Keep comments accurate when behavior changes; avoid comments that merely repeat individual statements.

Use semantically relevant, lucid variable and function names. Separate logical phases with reasonable whitespace. Keep scripts focused and reasonably sized; extract distinct responsibilities into small named modules instead of growing monolithic files. Apply these rules to new scripts and scripts being modified.

Job-email sources use `nfl-editorial/emails/jobs/<job-id>/<job-id>.email.md`. The directory and all output filename prefixes use that same job ID. Generic `email.md` is not an authoritative job-email source name.
