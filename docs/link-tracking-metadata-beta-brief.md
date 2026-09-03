# Link Tracking Metadata Beta Brief

`nfl-newsletter-email-soup-to-nuts` reads semantic attribution from final campaign HTML when it prepares tracked deliveries. `nfl-maizzle-mail` carries author-supplied content metadata into final anchor attributes before the 1,000-recipient beta send. `section.type` remains a rendering selector and has no analytics meaning.

## Authoring Convention

Use object-valued links in Markdown or JSON sources that are consumed directly by `nfl-maizzle-mail` whenever the click should have a deliberate analytics label or category:

```yaml
link:
  href: https://example.com/story
  label: "Meaningful analytics label"
  role: "read_more"

content:
  id: story-1
  label: "The story"
  category: "research"
  tags: [history, social]
```

The mail build also accepts `url` instead of `href` for shapes that already use `url`:

```yaml
footerCta:
  primaryAction:
    url:
      href: https://example.com/subscribe
      label: "Newsletter subscribe CTA"
      category: "operations"
```

Keep labels readable and specific enough for campaign reports. Keep content categories stable and lower-case when practical, for example `research`, `product`, `event`, `jobs`, or `archive`. Use `role` for `navigation`, `advertisement`, `share`, `footer`, or another link purpose.

Do not use this object-valued link style in shared `nfl-editorial` article or popup MDX unless that repo has explicitly been updated to accept it. `nfl-editorial` has its own Astro/Zod frontmatter schemas and web/popup renderers; many article fields still require plain URL strings and may fail validation or render incorrectly if given an object.

## Build Behavior

The newsletter build normalizes object-valued links back to plain URL strings before Maizzle renders templates, so existing templates can continue to use expressions such as `{{ item.link }}` and `{{ footer.footerCta.primaryAction.url }}`.

After Maizzle renders HTML, the build enriches matching `<a href="...">` tags with:

- `data-content-id`
- `data-content-label`
- `data-content-category` when a category is authored or comes from a trusted registry
- `data-content-tags`
- `data-link-role`
- `data-section-label`
- `data-content-provenance`
- `data-link-label`
- `data-link-category` as a compatibility alias for a canonical content category

Legacy string links still work. Labels may be inferred from item titles, link labels, or rendered anchor text. Missing categories remain null and never become a section type or layout name. The manifest records field-level provenance and confidence for every dimension.

Repeated URLs are matched by URL plus occurrence order, so separate placements retain their own metadata. When duplicate URLs provide conflicting explicit category metadata, the first manifest mapping wins and the build warns about the ignored later mapping.

Each successful build also writes a generated sidecar manifest next to the final HTML:

```text
<output-name>.link-tracking-manifest.json
```

The manifest records every collected tracked URL, canonical attribution dimensions, field-level provenance/confidence, the source path and frontmatter path, and any default/conflict warnings. Use this manifest as the durable build artifact for auditing link metadata before a send.

## Beta Verification

Before sending the 1,000-recipient beta:

1. Run `npm run test:newsletter-core` in `/Users/julian/Code/nfl-maizzle-mail`.
2. Build a representative newsletter that includes at least one explicit object-valued editorial link and one object-valued CTA link.
3. Inspect the generated HTML and confirm rendered anchors include the expected `data-content-*`, `data-link-role`, `data-section-label`, and `data-content-provenance` attributes.
4. Inspect `<output-name>.link-tracking-manifest.json` and resolve unexpected `defaulted` or `conflicts` entries.
5. Prepare or test-send that generated HTML through `nfl-newsletter-email-soup-to-nuts`.
6. Confirm the prepared tracked links persist canonical content fields. `urlLabel` and `urlCategory` remain compatibility aliases; a missing canonical category stays null.

The delivery platform remains responsible for rewriting URLs, generating tracking tokens, and recording click/open events. Maizzle should only emit useful metadata into the final HTML.
