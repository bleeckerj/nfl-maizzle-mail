# brain-dead-template campaign authoring

Use `campaign-starter.md` for a source-only campaign email. The required
frontmatter is `publicationMode: campaign`, an explicit `template`, `title`,
`preheader`, and `footer.unsubscribeLink: "[unsubscribe]"`.

Campaign source sections contain IDs for registry-backed content:

```yaml
sections:
  - type: short-take
    items:
      - shortTakeId: stable-editorial-id
  - type: ad-block
    items:
      - adId: stable-ad-id
```

Maizzle hydrates those IDs from the Editorial registries. Keep public issue
navigation fields out of campaign source. Build with:

```sh
node scripts/build-newsletter.mjs /path/to/email-campaigns/example.md example \
  --template=brain-dead-template \
  --publication-mode=campaign \
  --output-dir=/path/to/output/email-campaigns/example \
  --no-open
```
