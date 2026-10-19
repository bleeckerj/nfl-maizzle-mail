# Newsletter MCP coverage audit — October 19, 2026

Scope: the connected Maizzle tools, Backoffice's connected newsletter catalog, and their owning implementations. The catalog exposed nine Maizzle tools and 22 tools in Backoffice's newsletter category. This audit covers Daily Headlines authoring and preview production.

## Documentation and cleanup completed

- Added the [Daily Headlines authoring guide](../templates/near-future-lab-daily-headlines/AUTHORING.md) covering article and section `more_link`, nesting, tracked destinations, typography, body blocks, and edition builds.
- Linked it from the repository, template, and operating-process documentation.
- Removed two empty leftover directories: `output/` and `tests/newsletter-core/helpers/`. Local input, dependencies, generated HTML, and unrelated Backoffice edits were preserved.
- The authoring-guide tool and resource already load `AUTHORING.md` on each call. Adding the guide closes the stale Daily Headlines fallback without changing the tool registration.

## Existing coverage

| Operation | Existing capability | Limits |
| --- | --- | --- |
| Template and field discovery | Maizzle `list_templates`, `get_template_schema`, `get_template_authoring_guide`; Backoffice `get_section_types`, `newsletter_get_section_schema` | Article `more_link` is declared in the current schema and renders after the complete article body. |
| Draft loading and validation | Backoffice `newsletter_get`, `newsletter_validate` | Both return build evidence separately from schema validation. Duplicate-key parsing differs from the renderer. |
| Whole-section edits | Backoffice `newsletter_update_section` | Shallow update; no individual article patch or expected source fingerprint. |
| Renderer build | Maizzle `build_newsletter` | Runs the Maizzle pipeline, with optional output directory. It does not run the Backoffice edition wrapper. |
| Receipt inspection | Backoffice `newsletter_get` and `newsletter_validate` expose `build_evidence` | Inspection is available; preview/build/check execution is still CLI-only. |

## Confirmed defects and missing capabilities

| Priority | Gap | Evidence and effect | Recommended implementation |
| --- | --- | --- | --- |
| P1 | Article-aware mutations | `newsletter_add_item`, `newsletter_remove_item`, and `newsletter_set_item_image` target `section.items`. Daily Headlines renders `section.articles` and uses `image_src` / `image_alt`. A scratch add returned success and valid schema while adding a non-rendered `items` array. | Resolve the collection and media fields from the selected template contract. Add focused article update, image, body-block, and follow-up-link operations with schema validation. |
| P1 | Duplicate YAML keys accepted by Backoffice | `parse_newsletter_markdown` uses `yaml.safe_load`, which kept the second duplicate title in a scratch fixture. The renderer's `gray-matter` parser rejected the same bytes. A save can discard the overwritten value. | Reject duplicate mapping keys in the shared Backoffice loader and return the source line, column, and field context before validation or saving. |
| P1 | Lint/build disagreement and missing error status | Connected Maizzle validation rejects the live issue's compact `jobRef` item for lacking prose/media, although the canonical renderer hydrates that item. Its adapter catches nonzero lint exits and returns `ok(...)` containing error text. | Use a hydration-aware preflight contract. Preserve the process exit result and return explicit structured validation status, errors, warnings, and `isError` for failed calls. |
| P1 | No Backoffice newsletter preview/build/check tools | The connected newsletter catalog and local registry have no counterpart to `newsletter:preview`, `newsletter:build`, or `newsletter:check-build`. `build_newsletter` accepts no edition or preview controls and runs only Maizzle. `preview_site` publishes a site preview and serves a different workflow. | Wrap the existing Backoffice commands with edition controls and return output paths, receipt path, source/schema fingerprints, validation results, and exit status. Keep preview and publication preparation distinct. |
| P2 | Source-preserving nested edits and concurrency checks | `newsletter_update_section` calls `section.update(patch)` and saves the complete YAML document. No newsletter mutation accepts an expected source SHA-256 or revision. Updating an article requires replacing the whole array or using a general file editor. | Add schema-aware nested patches with an expected source fingerprint, a preview diff, atomic write, and explicit conflict response. Preserve comments and untouched source lines. |

The five findings remain open.

## Verification performed

The parser and item-mutation experiments used a temporary newsletter root and disabled digest sources.

The duplicate-key fixture was:

```yaml
---
template: near-future-lab-daily-headlines
title: First title
title: Second title
sections: []
---
```

Observed results:

```text
Backoffice parse_newsletter_markdown: title = "Second title"
Maizzle gray-matter parser: duplicated mapping key at line 4, column 1
```

The article fixture initially had one article and no `items`. Calling the existing composer backend's `newsletter_add_item` with `section_type="section_article_group"`, a second article, and `auto_save=true` produced:

```text
success = true
validation.valid = true
articles = 1
items = 1
rendered article collection still contains only "Existing article"
```

The connected `validate_newsletter_markdown` call on `nfl-dh-w43-y26` reported:

```text
sections[9].items[0]: Item lacks descriptive text or media
```

Its call result contained ordinary text content rather than an error flag. The earlier preview build of the same corrected issue completed with both editions, six renderer-validated images, and 32/32 hyperlinks passing per edition. Preview status remains distinct from final release certification.

## Implementation pointers

Line numbers describe the audited versions and can move after later edits.

- Maizzle authoring guide loading: `lib/mcp/tools.mjs:354` and `lib/mcp/resources.mjs:94`.
- Maizzle lint adapter and error handling: `lib/mcp/tools.mjs:434`; item-content heuristics: `scripts/lint-template.mjs:193`.
- Maizzle build arguments and text result: `lib/mcp/tools.mjs:459`.
- Backoffice parser and full-document writer: `../nfl-backoffice/mcp/tools/newsletter_composer_io.py:53` and `:62`.
- Backoffice shallow section patch: `../nfl-backoffice/mcp/tools/newsletter_composer_tools.py:722`.
- Backoffice item/image collection assumptions: the same file at `:999`, `:1351`, and `:1388`.
- Backoffice public tool contract: `../nfl-backoffice/mcp/tool_registry.py:600` and `:670`. The validation description still names Dense Discovery even though the implementation selects the source template.
- Backoffice commands and completion requirements: `../nfl-backoffice/package.json:50` and `../nfl-backoffice/docs/newsletter-build-completion-policy.md`.
