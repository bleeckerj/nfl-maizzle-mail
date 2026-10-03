# Template update checklist

1. Update the owning `templates/<name>/newsletter.schema.json` first. Declare types, accepted values, actual defaults, and usable examples. Mark generated fields `readOnly` and retained legacy fields `deprecated`.
2. Update the responsible template component or normalizer. Keep the template under `templates/<name>/`; do not create a second template tree.
3. Generate a reference starter with `node scripts/generate-skeleton-from-schema.mjs --template <name> --output /tmp/<name>.md`. Review its fields against the renderer. The generator validates its output and performs no build.
4. Regenerate maintained reference Markdown and editor snippets when the authoring surface changes. The Python compatibility command and snippet command use the same generator. Do not add another field list.
5. Run `npm run test:newsletter-contracts` and focused tests that show changed values affecting output.
6. Build a snapshot of a representative real source through the canonical builder. Verify content, spacing, links, full images, and mobile typography. Preserve active drafts and unrelated worktree changes.

Template scanning is discovery only. Write scanner output to a separate file and review it; the scanner cannot overwrite a maintained schema. See [the schema contract](schema-validation/README.md) and [the template operating process](newsletter-template-operating-process.md).
