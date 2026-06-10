# AGENTS.md

## Purpose

This file documents the canonical structure and workflow for `nfl-maizzle-mail` so template path drift and duplicate trees do not reappear.

## Canonical Layout (Source of Truth)

- `content/` — Author-facing Markdown newsletters (frontmatter + sections).
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

- If template files changed: run at least one focused build for that template.
- If schema/content model changed: rebuild a representative real newsletter.
- Confirm no new `src/templates` directory or sync logic exists.
- Confirm output renders and lands in `build_production/`.
