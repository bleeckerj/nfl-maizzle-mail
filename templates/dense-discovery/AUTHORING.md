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
