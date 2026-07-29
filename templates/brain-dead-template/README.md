# Brain Dead Content Template

This template is prepared for a direct sales email with a Brain Dead-style black, white, mono, and acid-highlight layout. It builds from the canonical `templates/brain-dead-template` directory and validates with `newsletter.schema.json`.

## Author-Owned Fields

Use `sections` for repeatable content blocks. Each section has `type`, `label`, and `items`.

Supported section types:

- `dual-column` - image and copy sit side by side on wide screens, then stack on mobile.
- `single-column` - each item stays full width on wide screens and mobile.
- `ad-block` - one editorial ad hydrated from `nfl-editorial/src/content/ads.json` by `adId`.
- `short-take` - one registry-backed Short Take hydrated from `nfl-editorial/src/content/shortTakes.json` by `shortTakeId`.
- `calendar_event` - a generated add-to-calendar card. The build writes an `.ics` file and injects `calendarLink`.
- `inline_cta` - an edition-aware inline CTA block rendered in the authored section order before the closing offer/footer.

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

Registry-backed sections use compact source shapes and receive their image, copy, and links from the editorial inventories during the build:

```yaml
sections:
  - type: ad-block
    items:
      - adId: four-design-fiction-interstitial-01
  - type: short-take
    items:
      - shortTakeId: foucault-called-it
```

The build normalizes these objects into template-safe URL strings and adds `data-link-label` / `data-link-category` to the rendered anchors.

## Hero Image

The optional `hero.image` field renders the full supplied image at its natural aspect ratio. Add `hero.imageAlt` for accessible alternative text. When present, the image follows `hero.ctaLink`; legacy `shopLink` remains the fallback. Use `hero.imageLink` for an explicit image-only destination or to override the CTA link:

```yaml
hero:
  headline: A field kit for near-future thinking.
  image: https://example.com/hero.png
  imageAlt: A field kit laid out on a desk
  ctaLink:
    href: https://example.com/shop
    label: issue | hero CTA | shop
    category: commerce
  imageLink:
    href: https://example.com/hero-detail
    label: issue | hero image | detail
    category: commerce
```

Use `imageLink: none` to force an unlinked image. Tracked `imageLink` objects are normalized to their `href` during the build. If `imageLink` is omitted, the build uses `hero.ctaLink` and then legacy `shopLink`.

`inline_cta` uses the same tracked action shape for `primaryAction` and optional `secondaryAction`. Use `renderFor: public` or `preview` for the public edition only, `renderFor: full` for the full edition only, or omit it / use `both` for both editions. Its `font_family` can be `mono` or `sans`; colors, borders, spacing, button colors, and `border_radius` are configurable. The section has a full border on all four edges; specify `border_radius` in pixels, such as `12`, for rounded corners.

```yaml
sections:
  - type: inline_cta
    renderFor: public
    eyebrow: Public preview
    statement: "You’re reading the public preview. Subscribe for the full issue."
    font_family: mono
    background: '#000000'
    text_color: '#ffffff'
    eyebrow_color: '#f2ff3d'
    border_radius: 12
    primaryAction:
      label: Subscribe
      url:
        href: https://theadjacency.com/subscribe
        label: issue | inline CTA | subscribe
        category: newsletter
        intent: subscribe
```

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
