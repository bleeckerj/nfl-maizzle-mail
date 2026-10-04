# Newsletter color themes

## Source of truth

The shared newsletter palette registry is [`data/color-themes.json`](../data/color-themes.json). Its `themes` object is the sole definition of theme IDs, display names, descriptions, section colors, and link accents.

The registry is deliberately exempted from the repository's otherwise ignored `data/` workspace files. A project-wide VS Code search for a theme ID such as `winter` must therefore return this file. Do not create another executable palette registry in a template, issue, or build script.

## Selecting a theme

Set `colorTheme` in an issue's YAML frontmatter to a key under `themes`:

```yaml
colorTheme: winter
```

When `colorTheme` is omitted, the canonical newsletter build selects `current`.

The current theme IDs are listed here for quick operator reference; the JSON registry remains authoritative:

- `spring`
- `autumn`
- `winter`
- `professional`
- `current`
- `monochrome`
- `midweek`
- `vivid`

## What the build provides

`scripts/build-newsletter.mjs` reads the selected entry and exposes two build-time objects to the template:

- `themeColors`: the selected `colors` map plus `linkAccent`.
- `theme`: the complete selected entry, including its name, description, colors, accent, and link accent.

Set `themeColors` in YAML frontmatter to override selected palette values for one email:

```yaml
colorTheme: current
themeColors:
  header: "#ffffff"
  footer: "#ffffff"
  introAside: "#ffffff"
  linkAccent: "#0a0a0a"
```

`colorTheme` is optional and defaults to `current`. Authored `themeColors` values take precedence over the registry. Omitted keys retain their palette defaults. The resolved link accent is used by both template links and generated link CSS. Explicit section `linkStyles.color` values still take precedence for that section.

The complete resolved `theme` object is generated during rendering; do not persist it into author-facing Markdown or source JSON.

Template `section-styles.json` files define layout and per-section style rules. They may override a palette value for a particular issue or section; they do not define the shared theme IDs.

## Maintaining the registry

1. Add or revise the palette only in `data/color-themes.json`.
2. Keep every theme's `name`, `description`, `colors`, `accent`, and `linkAccent` complete.
3. Update the ID list above when a theme is added, renamed, or removed.
4. Build a representative issue with `node scripts/build-newsletter.mjs content/<issue>.md <output-name> --no-open` and inspect the output in `build_production/`.

Use a theme key from the registry exactly. The build warns when it cannot find the requested key.
