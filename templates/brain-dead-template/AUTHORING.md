# Brain Dead template authoring

The complete operator guide is [Brain Dead template author reference](../../docs/brain-dead-template-author-reference.md). It includes every supported section, field tables, copyable recipes, styling limits, builds, and troubleshooting.

## Single-column image and link

Put this section in the source's existing `sections:` list. Replace the example URLs with a hosted image and the intended destination. The image, title, and CTA button all use the item's `link`.

```yaml
- type: single-column
  label: Featured
  items:
    - kicker: From the library
      title: Item title
      image: https://example.com/hosted/full-image.jpg
      imageAlt: Describe the complete image
      body: |
        <p>Your item description.</p>
      ctaText: Read more
      link:
        href: https://example.com/item
        label: campaign | featured item
        category: editorial
```

`image` is a URL string, not an `{src, alt}` object. Omit `link` for an unlinked image and title with no button. `link.label` is tracking metadata; `ctaText` supplies the visible button words. Generic items do not support a separate `imageLink` or a hide-button field. See the guide's [single-column recipes](../../docs/brain-dead-template-author-reference.md#single-column-recipes) for variations, and the [complete editable example](examples/single-column-image-and-link.md) for a source file you can copy.

## Campaign authoring

Use `campaign-starter.md` for a source-only campaign email. The required
frontmatter is `publicationMode: campaign`, an explicit `template`, `title`,
`preheader`, and `footer.unsubscribeLink: "[unsubscribe]"`.

Campaign source sections can contain empty send-time slots, or IDs for
registry-backed content:

```yaml
sections:
  - type: ad-slot
  - type: short-take-slot
  - type: short-take
    items:
      - shortTakeId: stable-editorial-id
  - type: ad-block
    items:
      - adId: stable-ad-id
```

Maizzle hydrates those IDs from the Editorial registries. Keep public issue
navigation fields out of campaign source. Build with:

Rendered placeholder and registry-backed sections declare send-time content
slots for Soup-to-Nuts imports:

| Section type | Slot key | Text marker |
|---|---|---|
| `ad-slot` | `ad-slot` | `[[content-slot:ad-slot]]` |
| `ad-block` | `ad-slot` | `[[content-slot:ad-slot]]` |
| `short-take-slot` | `short-take` | `[[content-slot:short-take]]` |
| `short-take` | `short-take` | `[[content-slot:short-take]]` |

```sh
node scripts/build-newsletter.mjs /path/to/email-campaigns/example.md example \
  --template=brain-dead-template \
  --publication-mode=campaign \
  --output-dir=/path/to/output/email-campaigns/example \
  --no-open
```

## Headline sizing

All headlines use 22px with 26px line height on phones up to 620px wide. Section, calendar-event, sponsor, short-take, and closing offer headlines also use 22px on desktop; the main hero headline uses 32px with 36px line height on desktop. This is the template default and requires no per-email setting. The legacy `hero.headlineSize` field remains accepted for existing sources, with both values using this scale. Check the rendered line breaks with the final copy at the intended phone width.
