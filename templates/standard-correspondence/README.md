# Standard Correspondence Template

`standard-correspondence` is for one-off HTML email correspondence generated with the Maizzle toolchain. It intentionally omits newsletter-only affordances: no unsubscribe link, no view-online link, no public archive URL, no ad hydration, and no link-tracking manifest.

The body renders as general correspondence first. An optional shared-items block can appear below the signature with either two or four link items.
The default type stack is `Courier New, Courier, monospace`, applied to the email's
text and table cells. Explicit `theme.fontFamily` overrides remain supported.

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
- `footerNote` - optional explicitly authored personal note; empty by default. Do not add generic reply instructions.
- `footerLinks` - optional personal links, each `{ href, label, icon?: { src, alt } }`. Icons use a compact, left-aligned 24px row, adapted from Dense Discovery. Icons8 assets retain a small attribution line. No divider is added.

This template is for **personal one-on-one correspondence, not mass newsletters**.
Never add an unsubscribe link, subscription CTA, mailing-list boilerplate, or
archive/view-online controls to its footer or authoring examples. Signature links
stay clickable but use the text color without underlines; body links retain their
underlines. Individual email clients may restyle detected contact links.
- Markdown body - the correspondence content.

The Markdown converter supports paragraphs, `#` through `###` headings, unordered and ordered lists, blockquotes, horizontal rules, links, bold, italic, and inline code.

## Numbered register lists

Markdown bullet and ordered lists use the reading-list treatment introduced in
`nfl-backoffice` commit `7ae54141d` (`src/styles/numbered-register.css`): blue
`01`, `02`, `03` labels, compact 8px top / 8px bottom row spacing, and a 50px number
gutter that becomes 36px below 600px. Labels are 14px on desktop and 12px on
mobile. Text stays at 16px; wrapping aligns with the text column.

The email renderer emits literal numbers in table cells with `list` / `listitem`
roles. It does not depend on CSS counters, absolute positioning, or generated
pseudo-element content. Ordered Markdown preserves its starting number and then
increments sequentially; each bullet list starts at `01`. Existing Markdown
support is limited to flat lists with one source line per item.

Explicit `bodyHtml` remains author-controlled and is not rewritten into this
register. The legacy `serifFontFamily` theme field remains accepted, but this
template uses `fontFamily` throughout. Inline code retains its monospace face.

Review the saved gallery with `npm run gallery:build -- --template=standard-correspondence`
and `npm run gallery`.
