# Brain Dead Content Template

This template is prepared for a direct sales email with a Brain Dead-style black, white, mono, and acid-highlight layout. It builds from the canonical `templates/brain-dead-template` directory and validates with `newsletter.schema.json`.

## Author-Owned Fields

Use `sections` for repeatable content blocks. Each section has `type`, `label`, and `items`.

Supported section types:

- `dual-column` - image and copy sit side by side on wide screens, then stack on mobile.
- `single-column` - each item stays full width on wide screens and mobile.
- `calendar_event` - a generated add-to-calendar card. The build writes an `.ics` file and injects `calendarLink`.

For `calendar_event`, author event metadata directly on the section:

```yaml
sections:
  - type: calendar_event
    id: dubai-future-horizons-human-by-design
    eyebrow: Live Zoom Conversation
    title: Dubai Future Horizons
    subtitle: "Human by Design: Who Will We Become?"
    startsAt: "2026-06-30T10:00:00-04:00"
    durationMinutes: 60
    timezone: America/New_York
    location: Zoom
    description: A live conversation with Julian Bleecker and Professor John E. Katsos.
    url:
      href: https://zoom.us/meeting/register/example
      label: issue | event | registration
      category: events
      intent: attend-event
```

Each content item supports:

- `title`
- `subtitle`
- `body`
- `image`
- `imageAlt`
- `price`
- `link`
- `ctaText`

Use tracked link objects for `brand.logoLink`, `hero.ctaLink`, each `sections[].items[].link`, `offer.ctaLink`, and footer/social links:

```yaml
sections:
  - type: dual-column
    label: Included in the set
    items:
      - title: Item title
        link:
          href: https://example.com/?item=one
          label: content | item one
          category: commerce
          interest: products
          intent: purchase
  - type: single-column
    label: Featured separately
    items:
      - title: Full-width item
        body: A single-column item can carry more copy or a larger image.
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

- Keep content images hosted outside this repository, for example Photarium or another approved image host.
- The template preserves the full image aspect ratio. It does not crop item images or hero art.
- `schema.json` is retained only as a legacy alias for tools that still look for that filename. The current build validates `newsletter.schema.json`.
