# brain-dead-template campaign authoring

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
| `ad-slot` | `ad_slot` | `[[content-slot:ad_slot]]` |
| `ad-block` | `ad_slot` | `[[content-slot:ad_slot]]` |
| `short-take-slot` | `short_take` | `[[content-slot:short_take]]` |
| `short-take` | `short_take` | `[[content-slot:short_take]]` |

```sh
node scripts/build-newsletter.mjs /path/to/email-campaigns/example.md example \
  --template=brain-dead-template \
  --publication-mode=campaign \
  --output-dir=/path/to/output/email-campaigns/example \
  --no-open
```
