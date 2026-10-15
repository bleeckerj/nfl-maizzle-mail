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

## Dark mode

`darkModePolicy.flatten` defaults to `true`. Set it to `false` to preserve the authored palette and omit the renderer's dark-mode CSS. The direct Maizzle `--no-dark-mode-flatten` flag takes precedence over the frontmatter. Email clients may still apply their own color conversion.

With flattening enabled, the renderer releases inline text, WebKit text-fill and background-color `!important` priorities on its managed surfaces after CSS inlining. Light-mode colors and typography priorities stay intact; the dark palette reaches description wrappers, ordered and unordered lists, and table-cell text.

The intro content and aside panels are managed dark surfaces. When dark mode is active, their authored backgrounds switch to `#1b1f27` with `#f2f4f8` text. Their light-mode backgrounds, padding, and typography stay as authored. Regression tests build white intro and aside panels and require at least 4.5:1 text contrast in both modes.

Dark-mode coverage follows the rendered HTML: all text descendants receive the shared foreground, with separate link and muted-text rules that also cover nested markup. Elements with inline backgrounds or `bgcolor` attributes receive the shared surface; this includes footer share panels, callouts, quotations, classifieds panels, and paywall badges. Authored gradients switch to solid dark surfaces. Editorial image pixels and photographic background-image assets are preserved. Footer brand artwork and social icons receive a white CSS filter in dark mode, scoped to `dm-footer-artwork`; their URLs, dimensions and light-mode appearance remain unchanged. Text-fill overrides follow the active foreground, including button labels.

Canonical Dense Discovery builds check each visible text run against its effective dark background after inlining. A ratio below 4.5:1 blocks saving the output. The check includes inherited backgrounds, translucent paint and WebKit text fill; gradients, image-backed text and element opacity are reported for visual review. This CSS check does not replace email-client rendering or responsive layout inspection.

Production CSS cleanup preserves dark-mode classes and the nested caption/link hooks. The build also rejects footer logos/icons missing their dark treatment. The contrast gate rejects invalid dark selector lists so cleanup cannot silently discard a palette rule.
