# Link Tracking Metadata Beta Brief

`nfl-newsletter-email-soup-to-nuts` reads `data-link-label` and `data-link-category` from final campaign HTML when it prepares tracked deliveries. `nfl-maizzle-mail` is responsible for carrying meaningful author-supplied link metadata from newsletter Markdown into those final anchor attributes before the 1,000-recipient beta send.

## Authoring Convention

Use object-valued links in Markdown or JSON sources that are consumed directly by `nfl-maizzle-mail` whenever the click should have a deliberate analytics label or category:

```yaml
link:
  href: https://example.com/story
  label: "Meaningful analytics label"
  category: "research"
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

Keep labels readable and specific enough for campaign reports. Keep categories stable and lower-case when practical, for example `research`, `product`, `sponsor`, `event`, `jobs`, `archive`, or `operations`.

Do not use this object-valued link style in shared `nfl-editorial` article or popup MDX unless that repo has explicitly been updated to accept it. `nfl-editorial` has its own Astro/Zod frontmatter schemas and web/popup renderers; many article fields still require plain URL strings and may fail validation or render incorrectly if given an object.

## Build Behavior

The newsletter build normalizes object-valued links back to plain URL strings before Maizzle renders templates, so existing templates can continue to use expressions such as `{{ item.link }}` and `{{ footer.footerCta.primaryAction.url }}`.

After Maizzle renders HTML, the build enriches matching `<a href="...">` tags with:

- `data-link-label`
- `data-link-category`

Legacy string links still work. When label or category metadata is missing, the build infers fallback values and prints a visible link-tracking metadata notice. Treat those notices as beta-readiness warnings: acceptable for low-value operational links, but editorial and sponsor links should be made explicit.

When duplicate URLs provide conflicting explicit metadata, the first mapping wins and the build warns about the ignored later mapping.

Each successful build also writes a generated sidecar manifest next to the final HTML:

```text
<output-name>.link-tracking-manifest.json
```

The manifest records every collected tracked URL, the effective label/category, the source path and frontmatter path, whether each metadata field was explicit or defaulted, and any default/conflict warnings. Use this manifest as the durable build artifact for auditing link metadata before a send.

## Beta Verification

Before sending the 1,000-recipient beta:

1. Run `npm run test:newsletter-core` in `/Users/julian/Code/nfl-maizzle-mail`.
2. Build a representative newsletter that includes at least one explicit object-valued editorial link and one object-valued CTA link.
3. Inspect the generated HTML and confirm rendered anchors include `data-link-label` and `data-link-category`.
4. Inspect `<output-name>.link-tracking-manifest.json` and resolve unexpected `defaulted` or `conflicts` entries.
5. Prepare or test-send that generated HTML through `nfl-newsletter-email-soup-to-nuts`.
6. Confirm the prepared tracked links persist meaningful `urlLabel` and `urlCategory`.

The delivery platform remains responsible for rewriting URLs, generating tracking tokens, and recording click/open events. Maizzle should only emit useful metadata into the final HTML.
