# Brain Dead Four-Book Sales Template

This template is prepared for a direct sales email with a Brain Dead-style black, white, mono, and acid-highlight layout. It now builds from the canonical `templates/brain-dead-template` directory and validates with `newsletter.schema.json`.

## Author-Owned Fields

Use `books` for the four sales items. Each book supports:

- `title`
- `subtitle`
- `body`
- `image`
- `imageAlt`
- `price`
- `link`
- `ctaText`

Use tracked link objects for `brand.logoLink`, `hero.ctaLink`, each `book.link`, `offer.ctaLink`, and footer/social links:

```yaml
link:
  href: https://example.com/?book=book-one
  label: four-books | book one
  category: commerce
  interest: books-writing
  intent: purchase
```

The build normalizes these objects into template-safe URL strings and adds `data-link-label` / `data-link-category` to the rendered anchors.

## Build-Owned Fields

This template does not render a view-online link. Set `footer.footerCta.enabled: false` in source content because this sales template has its own closing offer block. The build may still inject shared runtime fields such as `darkModePolicy`, link-tracking metadata, and content-slot manifests. Do not commit generated fields back into source Markdown.

## Starter Content

Use the tracked starter files:

```text
content/test-bd.md
templates/brain-dead-template/sample-content.md
```

Verification command:

```text
node scripts/build-newsletter.mjs content/test-bd.md brain-dead-four-books-sales --no-open
```

Direct JSON verification:

```text
node scripts/build-newsletter.mjs data/brain-dead-20251007.json brain-dead-four-books-sales-json --no-open
```

## Notes

- Keep book cover art hosted outside this repository, for example Photarium or another approved image host.
- The template preserves the full image aspect ratio. It does not crop book covers or hero art.
- `schema.json` is retained only as a legacy alias for tools that still look for that filename. The current build validates `newsletter.schema.json`.
