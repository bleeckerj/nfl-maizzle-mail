# Campaign email builds

Campaign emails are source Markdown handoffs for Soup-to-Nuts. Keep the source
outside the public issue tree, declare `publicationMode: campaign`, and select
the template explicitly. The canonical builder writes HTML, link-tracking
metadata, and content-slot metadata to the caller-provided output directory.

The source uses `adId` and `shortTakeId` only. Maizzle hydrates those values from
the Editorial `ads.json` and `shortTakes.json` registries. Unknown IDs fail the
build before HTML is emitted.

Use `build_newsletter` for the regular issue lane. Use the dedicated
`build_campaign_email` MCP operation for campaign builds so the output directory
and mode are explicit.

For local CLI convenience, the Backoffice repository also exposes the same
campaign path through `build:campaign`:

```sh
cd /Users/julian/Code/nfl-backoffice
npm run build:campaign -- office-hours-break
```

That wrapper reads `email-campaigns/<slug>.md`, invokes this builder with
`--publication-mode=campaign` and strict schema validation, and writes the HTML,
link-tracking manifest, and content-slot manifest under
`nfl-backoffice/output/email-campaigns/<slug>/`. Add `--send-test` to pass the
HTML to the SES test sender, or `--send-test --dry-run` to validate without
sending. The Backoffice guide documents the complete option set and test-send
behavior.
