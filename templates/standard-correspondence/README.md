# Standard Correspondence Template

`standard-correspondence` is for one-off HTML email correspondence generated with the Maizzle toolchain. It intentionally omits newsletter-only affordances: no unsubscribe link, no view-online link, no public archive URL, no ad hydration, and no link-tracking manifest.

The body renders as general correspondence first. An optional shared-items block can appear below the signature with either two or four link items.
The default type stack is monospace-first, with common Nerd Font faces first when available.

## Build

```bash
npm run build:correspondence -- examples/correspondence/sample.md
```

Local working drafts can live in the ignored `correspondence/` directory:

```bash
npm run build:correspondence -- correspondence/client-note.md client-note
```

Output is written to `build_correspondence/<output-name>.html`.
The build command opens the generated HTML preview by default. Add `--no-open` for scripted runs.

## Send Test

```bash
npm run build:correspondence -- correspondence/client-note.md client-note --send-test
```

The `--send-test` flag validates links and sends the rendered HTML through the shared SES test sender. It uses `SES_FROM`, `SES_TO`, optional `SES_SUBJECT`, and optional `AWS_REGION`.

## Author-Owned Fields

- `subject` - email subject and HTML title.
- `preheader` - hidden inbox preview text.
- `from` - optional preview header metadata, shown only when `showFromHeader: true`.
- `signature` - optional signature name plus `lines` rendered after the Markdown body. The name is not bolded; `lines` may contain Markdown links and render after a visible pause.
- `sharedItems` - optional `{ heading, items }` block rendered below the signature as a grid. The item count must be either two or four. Items may include `image: { src, alt }`, `imageUrl`, or `imageSrc`.
- `footerNote` / `footerLinks` - optional short contact note, kept minimal.
- Markdown body - the correspondence content.

The Markdown converter supports paragraphs, `#` through `###` headings, unordered and ordered lists, blockquotes, horizontal rules, links, bold, italic, and inline code.
