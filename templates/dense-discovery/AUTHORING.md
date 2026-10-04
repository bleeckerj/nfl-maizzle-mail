# dense-discovery campaign authoring

Use `campaign-starter.md` when an email should be rendered for a campaign
handoff rather than published as a regular newsletter issue. Declare
`publicationMode: campaign` and `template: dense-discovery` in the source.

Registry-backed sections reference inventory IDs:

```yaml
sections:
  - type: short-take
    items:
      - shortTakeId: stable-editorial-id
  - type: ad-block
    items:
      - adId: stable-ad-id
```

Maizzle hydrates those IDs from `nfl-editorial`. Campaign builds suppress the
view-online, share, archive, subscribe, and public issue footer block while
retaining the `[unsubscribe]` placeholder.

For an ad placement, `items[].title` sets the small heading above its image:

```yaml
- type: ad-block
  title: "Today's Sponsor"
  items:
    - adId: stable-ad-id
      title: Hello
```

Here `Hello` replaces the inventory label, such as `Advertisement`. The section's
`title` controls the larger heading outside the card. Omit the item title or set it
to `null` to use `items[].label` or the inventory label. Set it to `""` to hide
the heading above the image.

## Jobs dispatch lists

For `adjacency-job-posting`, write each list once under `lists[].items`:

```yaml
lists:
  - id: key-responsibilities
    title: What you'll do
    items:
      - Build **working prototypes** with colleagues.
      - Document the [investigation](https://example.com/investigation).
```

The builder converts inline Markdown to HTML and applies the email styles.
`itemsHtml` is generated during preparation and does not belong in new editable
sources. When `items` is present, it controls the rendered list, including an empty
array; older HTML-only sources remain supported when `items` is absent.

## Email color overrides

The base palette is selected with `colorTheme`, which defaults to `current`.
Override colors for one email with `themeColors` in its frontmatter:

```yaml
themeColors:
  linkAccent: "#0a0a0a"
  header: "#ffffff"
  footer: "#ffffff"
  introAside: "#ffffff"
```

These values override the selected palette for template links and generated CSS.
Omitted keys keep their palette defaults. A section with an explicit
`linkStyles.color` retains its own link color. See [color themes](../../docs/color-themes.md)
for the palette registry and selection rules.
