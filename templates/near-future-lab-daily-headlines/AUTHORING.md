# Daily Headlines authoring guide

Use `template: near-future-lab-daily-headlines` and `newsletterFormat: speculative` for Tomorrow's News Today. Issue IDs use `nfl-dh-w##-yYY`, such as `nfl-dh-w43-y26`.

## Source and ownership

- Edit `/Users/julian/Code/nfl-backoffice/public/outbox/data/<year>/<issue-id>.md`.
- Maizzle owns the schema, template, typography, link rendering, and HTML generation.
- Backoffice owns edition selection, preview outputs, publication preparation, and build receipts.
- [newsletter.schema.json](newsletter.schema.json) is the field contract. [README.md](README.md) describes the remaining section types and style controls.

Keep each prose paragraph on one physical source line inside a YAML `|-` block. Preserve intentional paragraph breaks, existing copy, and tracked-link metadata when changing nearby fields.

## Articles and normal follow-up links

A `section_article_group` contains `articles`, with each article carrying its own `headline`, optional primary `link`, `lede`, optional `body_blocks`, and optional `more_link`.

| Field | Location | Behavior |
| --- | --- | --- |
| `link` | Inside an article | Primary destination for the article's image and copy. |
| `more_link` | Inside an article | Normal underlined text after that article's complete body. It can have a separate destination. |
| `more_link` | Alongside a section's `articles` | Normal follow-up text after the complete article group. |
| `cta_label` | Inside an article | Existing button-style CTA using the primary destination. Use `more_link` for normal text links. |

This complete section demonstrates an article-level normal text link:

```yaml
- type: section_article_group
  section_label: Books From An Adjacent Now
  articles:
  - headline: The Agricultural Machine
    article_layout: feature
    link:
      href: https://nearfuturelaboratory.com/library/2010/11/the-architecture-machine/
      label: nfl-dh-w43-y26 | The Agricultural Machine | library | Nicholas Negroponte
      category: books-writing
      intent: read
      role: primary
    lede: |-
      <p>Opening paragraph of the book review.</p>

      <p>The review continues in another paragraph.</p>
    more_link:
      label: The Agricultural Machine →
      link:
        href: https://nearfuturelaboratory.com/library/2010/11/the-architecture-machine/
        label: nfl-dh-w43-y26 | The Agricultural Machine | library | Nicholas Negroponte
        category: books-writing
        intent: read
        role: primary
  show_bottom_rule: false
```

Indent `more_link` alongside the article's `lede`. Indent its `label` and `link` beneath it, then the tracked destination fields beneath `link`. A second `link` at article level is a duplicate YAML key. Merely placing an empty `more_link:` before it does not establish nesting.

Each `more_link` needs a visible nonempty `label` and an explicit `link` or legacy `href`. Keep metadata identical when the primary and follow-up links have the same destination and click intent. To give each article a follow-up, put one `more_link` in each article and remove any obsolete section-level duplicate.

## Paragraphs and photographs

`lede` accepts plain text or paragraph HTML. The template keeps rich text inside a block container so paragraph markup retains its typography. Keep photographs in `image_src` or image body blocks; do not embed them in prose HTML.

Both article layouts preserve the complete image at its natural aspect ratio: `feature` puts it above the copy; the default `row` puts it beside the copy on desktop and above it on mobile.

For photographs between paragraphs, keep the lead image in `image_src` and add ordered `body_blocks`:

```yaml
    body_blocks:
    - type: text
      html: |-
        <p>Paragraph before the photograph.</p>
    - type: image
      src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/eb19c79c-cd36-4d0b-35eb-42ffec7e0400/full?format=webp
      alt: A man uses a light pen beside a CRT showing a combine harvester design.
    - type: text
      html: |-
        <p>Paragraph after the photograph.</p>
```

Article and intro `body_blocks` both accept ordinary inventory-backed ads between text or images. Keep the ad in its own block and resume the article with a text block:

```yaml
    body_blocks:
    - type: ad-block
      show_top_rule: false
      show_bottom_rule: false
      items:
      - adId: interstitial-qwentin-kimmel-watch-tonight
        adRenderMode: snapshot
        adSnapshotPreset: native
    - type: text
      html: |-
        <p>The article continues after the advertisement.</p>
```

Indent `body_blocks` alongside the article's `lede`, `kicker`, and `headline`. Its text blocks belong inside the article; `text` is not a top-level section type. The article's `more_link` renders after its complete body and before the next article. Ads use the same hydration, snapshot, image validation, and tracking path as standalone ad blocks.

## Typography

Intro prose, article ledes, continuation text, and article follow-up links share Georgia at 18px with 26px line height on desktop. At widths up to 599px, they share 17px with 1.3 line height. Normal article follow-up links have an underline and no button border, background, or padding. Headings, kickers, captions, ads, and footer text retain their own styles.

Inventory ads use the shared newsletter ad card, matching `npm run ads:preview`
in `nfl-editorial`: a thin gray border, 12px inner padding, a subtle shadow,
and a monospaced label. The complete image remains visible. Standalone ads and
ads inside `intro_statement.body_blocks` use the same card. Section headings
and optional top/bottom dividers sit outside the frame.

Keep rendering styles in the template or its supported style fields. Preserve the shared body typography across parallel editorial sections.

## Preview and release checks

From `/Users/julian/Code/nfl-backoffice`, rebuild the review editions with:

```sh
npm run newsletter:preview -- nfl-dh-w43-y26 --edition both
```

Review HTML lives in `/Users/julian/Code/nfl-backoffice/output/newsletter-editions/2026/` as `nfl-dh-w43-y26__public.html` and `nfl-dh-w43-y26__full.html`. Preview mode preserves publication status and deployable archive HTML. A preview is an editing output; the final newsletter gate uses the Backoffice build and receipt check:

```sh
npm run newsletter:build -- nfl-dh-w43-y26 --edition both
npm run newsletter:check-build -- nfl-dh-w43-y26 --edition both
```

Follow `/Users/julian/Code/nfl-backoffice/docs/newsletter-build-completion-policy.md` for completion requirements. Public View Online and sharing URLs must come from the active publication registry and pass live validation.

## MCP workflow and limitations

Use `newsletter_get` to inspect an existing draft and `newsletter_get_section_schema(section_type="section_article_group", template="near-future-lab-daily-headlines")` for its current field shapes.

- Maizzle `get_template_authoring_guide(name="near-future-lab-daily-headlines")` returns this guide.
- Maizzle `get_template_schema(name="near-future-lab-daily-headlines")` returns the complete field contract.

The generic Backoffice item tools currently target `items`, not Daily Headlines' `articles`. Do not use them to add, remove, or change photographs on an article. `newsletter_update_section` can replace the complete `articles` array, but it performs a shallow section update and rewrites the newsletter source. It has no expected-source-hash parameter. Use a narrow source patch when preserving a hand-edited draft requires it.

Maizzle's `build_newsletter` renders HTML through its canonical pipeline. It does not run Backoffice's edition selection or issue receipt gate. Maizzle's lint tool also has a known mismatch for compact `speculative-job` entries that hydrate from `jobRef`. See the [MCP coverage audit](../../docs/mcp-coverage-audit-2026-10-19.md) for verified findings and proposed fixes.
