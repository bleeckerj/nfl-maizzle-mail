# dense-discovery campaign authoring

Use `campaign-starter.md` when an email should be rendered for a campaign
handoff rather than published as a regular newsletter issue. Declare
`publicationMode: campaign` and `template: dense-discovery` in the source.

Registry-backed sections contain IDs only:

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
