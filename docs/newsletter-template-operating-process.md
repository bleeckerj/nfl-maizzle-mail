# Newsletter Template Operating Process

This is the Maizzle-side operating contract for creating and maintaining Near Future Laboratory newsletter templates. It records the cross-repo workflow established while building the `dense-discovery` template and build chain.

Use this document before scaffolding a new template under `templates/<template-name>/`, and read it alongside `/Users/julian/Code/nfl-backoffice/docs/newsletter-template-operating-process.md` when creating a new Backoffice draft.

## Adjacency job-email workflow

For employer-specific recruiting emails, read [Adjacency job-email production](adjacency-job-emails.md). Their editable Markdown and adjacent canonical HTML belong in `nfl-editorial/emails/jobs/<company>/<job-id>/`; Maizzle owns the templates and renderer. This is separate from the Backoffice newsletter-issue workflow below.

## Cross-Repo Contract

- `nfl-backoffice` owns author-facing drafts at `/Users/julian/Code/nfl-backoffice/public/outbox/data/<year>/<issue-id>.md`.
- `nfl-maizzle-mail` owns template rendering, schema validation, build-time field injection, ad hydration, link metadata enrichment, image/link validation, and final HTML.
- `nfl-editorial` owns ad inventory at `/Users/julian/Code/nfl-editorial/src/content/ads.json`.
- `nfl-editorial` owns the Short Take registry at `/Users/julian/Code/nfl-editorial/src/content/shortTakes.json`.
- `nfl-newsletter-email-soup-to-nuts` consumes rendered HTML and link metadata for tracked delivery.

## New Template Required Files

A production newsletter template should live under:

```text
templates/<template-name>/
```

Include:

- `newsletter.html`
- `layouts/main.html`
- `components/` for reusable email components
- `newsletter.schema.json`
- `section-styles.json`
- `README.md` or `AUTHORING.md` with authoring examples
- `sample-data.json` or a sample Markdown issue when useful

The template README should state the author-owned fields, build-owned fields, supported section types, and verification command.

## Canonical Build Path

Use the canonical build script for real verification:

```text
npm run build:newsletter <issue-id> -- --no-open
```

The build should resolve issue ids such as `w23-y26`, `mw23-y26`, or `nfl-dh-w23-y26` to the Backoffice outbox draft when possible. Avoid raw `maizzle build` for production checks because it bypasses the workflow that adds schema validation, link tracking, ad hydration, image/link validation, dark-mode policy, and output manifests.

## Schema Contract

Every new production template should have `templates/<template-name>/newsletter.schema.json`.

The schema should describe:

- top-level metadata such as `template`, `issueId`, `title`, `preheader`, `pubDate`, `ogImage`, `ogImageAltText`, `webPublicationStatus` (`draft` or `published`), and `socialCard` when supported
- each supported section type
- the editor-owned fields for each section
- object-valued tracked links
- build-injected fields, clearly marked as generated/runtime fields
- `ad-block` as an ad-id-driven section
- `short-take` as a Short Take registry-id-driven section when supported

Tracked link fields should accept the evolved object shape:

```json
{
  "href": "https://example.com/story",
  "label": "w23-y26 | Story Name | primary | Relevant Entity",
  "category": "speculative-practice"
}
```

Where an existing field is named `url`, the object still carries `href`, `label`, and `category`.

## Schema-Derived Starters

The Backoffice MCP starter tools generate from the selected template's current schema on every invocation. `newsletter_start`, `create_newsletter_from_skeleton`, and `campaign_email_start` share the resolver and `scripts/generate-skeleton-from-schema.mjs`; static starter Markdown and legacy skeleton paths are not starter sources. The generator must emit YAML that validates against the selected schema, including discriminator-driven sections, local `$ref` branches, nullable objects, and nested arrays. Authoring roles and explicit examples live in that schema; Backoffice consumes the shared JSON contract. Ordinary saves preserve omitted optional controls. See [schema validation](schema-validation/README.md).

## View Online Link

Managed-artifact View Online and sharing destinations come from the active publication registry. Preserve its exact published URL, including publication suffixes, and validate it live. Missing or inactive records, HTTP 404/410, and network failures block a public email build. Never infer a public destination from an issue ID, content path, slug, or route pattern.

Explicit local previews may use their provisioned server URL and must not be sent. Campaign builds suppress automatic public issue navigation. The shared `view-online-link.mjs` and publication-link validation modules own this behavior.

Current template targets are Dense Discovery's `intro.viewOnlineLink` and Daily Headlines' `newsletter_masthead.viewOnlineLink`. A new target requires a schema declaration, injection behavior, and focused tests.

## Link Tracking Contract

`nfl-maizzle-mail` enriches final anchors with:

- `data-content-id`
- `data-content-label`
- `data-content-category`
- `data-content-tags`
- `data-link-role`
- `data-section-label`
- `data-content-provenance`
- `data-link-label`
- `data-link-category` as a compatibility alias

The source of truth is object-valued link metadata in the draft or build-injected tracked link objects. The rendered link manifest is written to:

```text
build_production/<issue-id>.link-tracking-manifest.json
```

Target state for send-ready templates:

- all important editorial, sponsor, service, community, social, jobs, and operational links are explicit
- `defaulted` totals are expected and understood
- `conflicts` is zero
- duplicate URL usages that represent the same click intent share the same label/category

Keep `docs/link-tracking-metadata-beta-brief.md` aligned with this contract when link metadata behavior changes.

## Ad Block Contract

Use the dense-discovery `ad-block` workflow for new ad placements.

Author-facing source:

```yaml
- type: ad-block
  title: "Tomorrow's Ads Today"
  show_bottom_rule: true
  description: |
    Optional setup copy.
  items:
    - adId: the-manual-pb-interstitial-01
```

The draft should not include ad URLs or ad media URLs. `lib/newsletter-core/hydrate-ad-blocks.mjs` hydrates ad content from `/Users/julian/Code/nfl-editorial/src/content/ads.json`.
Set `show_bottom_rule: false` when a specific ad placement should omit the light divider after the ad.

Hydrated ad-block links carry `linkRole: advertisement`. They receive a content category only when the ad inventory or authored content supplies one; `ad-block` is a rendering type and is never emitted as a semantic category. To provide semantic metadata for a specific placement, author the item content and link as:

```yaml
- type: ad-block
  title: "Tomorrow's Ads Today"
  items:
    - adId: the-manual-pb-interstitial-01
      content:
        id: the-manual-pb-interstitial-01
        label: A field guide to speculative products
        category: speculative-products
      link:
        href: https://example.com/speculative-product
        role: advertisement
```

Use the same object shape for `readMoreLink` when the visible CTA should point somewhere different from the primary ad link. Keep the `href` aligned with the intended destination; use `content` for content identity and category.

Templates should render the hydrated item fields:

- `item.link`
- `item.image`
- `item.imageAlt`
- `item.label`
- `item.title`
- `item.description`
- `item.sponsor`
- `item.readMoreLink`
- `item.readMoreText`

If the same ad URL is used by image, title, and CTA anchors, the metadata should remain consistent so the manifest has no conflicts.

## Short Take Contract

Supported templates use this compact source shape anywhere in `sections[]`:

```yaml
- type: short-take
  items:
    - shortTakeId: dhl-autonomous-catapult-delivery-trials
```

Authors supply one registry id and no issue-level content overrides. `lib/newsletter-core/hydrate-short-takes.mjs` validates and resolves the record from `nfl-editorial/src/content/shortTakes.json`. The hydrated card includes the Photarium image, alt text, headline, caption, optional destination, optional edge metadata, and tracking category `short-take`.

Each section contains exactly one item. Multiple cards use multiple `short-take` sections in the required issue order. Email rendering preserves the complete source image and uses the available template column width.

Registry records may include `lockup.brandRail` (boolean), `lockup.mediaSizing`
(`natural` or `copy-first`), and `lockup.imageAlignment` (`top`, `center`, or
`bottom`). These settings control page and social lockups. Maizzle validates
them while preserving the complete, natural-height image in email. Unknown
lockup keys and invalid values remain build errors. The mail contract tests
also load the current sibling Editorial inventory to catch cross-repository drift.

The inventory is loaded only when an issue contains `short-take`. Path resolution follows this precedence:

1. `NFL_EDITORIAL_SHORT_TAKES_PATH` — direct path to `shortTakes.json`.
2. `NFL_EDITORIAL_ROOT` — editorial repository root; the build appends `src/content/shortTakes.json`.
3. Sibling fallback at `../nfl-editorial/src/content/shortTakes.json`.

The canonical registry accepts HTTPS and site-relative destinations. The mail build expands site-relative destinations against `https://nearfuturelaboratory.com` before link validation and tracking normalization.

## Authoring Surface

Each new template should define an editor-friendly introductory field or section when the newsletter format needs an opening note. Use a named section type when that keeps the authoring model legible; for example, `near-future-lab-daily-headlines` uses `intro_statement`.

Do not infer section shapes from unrelated templates. Dense-discovery provides the process contract; each template still owns its section vocabulary and HTML structure.

## Verification Checklist

For each new template or boilerplate issue:

1. Run focused unit tests for new build helpers.
2. Run the canonical build command for a Backoffice outbox issue.
3. Confirm schema validation passes.
4. Confirm managed-artifact links match the active publication registry and pass live validation.
5. Confirm `ad-block` hydrates from `ads.json` using only `adId` in source.
6. When supported, confirm `short-take` hydrates from `shortTakes.json` using only `shortTakeId` in source.
7. Confirm rendered HTML includes `data-link-label` and `data-link-category` on expected anchors.
8. Confirm the link manifest has no unexpected defaults or conflicts.
9. Confirm generated build-only fields are pruned from normalized author-facing exports.
10. Document verification limits. Managed public-link failures block completion.
