# Daily Headlines author and operator guide

Use this guide for Tomorrow's News Today: `template: near-future-lab-daily-headlines`, `newsletterFormat: speculative`, and an issue ID such as `nfl-dh-w43-y26`.

## Where to edit and what to copy

Edit the Markdown master at `/Users/julian/Code/nfl-backoffice/public/outbox/data/<year>/<issue-id>.md`. Maizzle owns the template, schema, styles, and rendering. Backoffice owns edition selection, build receipts, publication preparation, and archive output. The [schema](newsletter.schema.json) defines the supported fields; the [component reference](README.md) covers additional section types.

The first example is a complete Markdown document. Every later YAML example is a complete section, starting with `- type:`. Paste those sections beneath the document's existing `sections:` line, at the same indentation as neighboring sections. Replace the example prose with the intended copy. Keep existing metadata, footer copy, images, and links when editing an established issue.

| Task | Example |
| --- | --- |
| See the whole document structure | [Small complete issue](#small-complete-issue) |
| Add an intro lead image and caption | [Intro with text, an image, and an ad](#intro-with-text-an-image-and-an-ad) |
| Insert an ad in the middle of an article | [Article with an interstitial ad and continuation](#article-with-an-interstitial-ad-and-continuation) |
| Keep two book reviews and their separate links | [Two books with covers, an interior image, and follow-up links](#two-books-with-covers-an-interior-image-and-follow-up-links) |
| Place an ad between sections | [Standalone ad](#standalone-ad) |
| Add inline references with the normal link style | [Inline references and typography](#inline-references-and-typography) |
| Add a job using its canonical reference | [Job card](#job-card) |
| Preview, build, verify, or send a test | [Operator commands](#operator-commands) |
| Fix YAML or stale build errors | [Troubleshooting](#troubleshooting) |

## Indentation and field ownership

Use spaces. The examples use two spaces per mapping level. A list item may align with its owning list key, as `articles:` and `- headline:` do below; the fields belonging to that item sit two spaces farther in.

| Field or list | Typical leading spaces | Belongs to |
| --- | --- | --- |
| `- type: section_article_group` | 0 | `sections` |
| `section_label`, `articles`, section-level `more_link` | 2 | The article group |
| `- headline:` | 2 | The `articles` list |
| `kicker`, `lede`, `body_blocks`, article-level `more_link` | 4 | One article |
| `- type: text`, `- type: image`, `- type: ad-block` | 4 | That article's `body_blocks` |
| A text block's `html`, or an ad block's `items` | 6 | One body block |
| Paragraphs following that `html: |-` | 8 | The text block's HTML |
| `- adId:` inside that ad block | 6 | The ad's `items` list |
| That ad item's `adRenderMode`, `adSnapshotPreset` | 8 | One inventory ad placement |

Keep each prose paragraph on one physical source line, with a blank line between paragraphs. Use `|-` for a literal string without a final newline. Do not reflow prose or run a Markdown/YAML formatter over the issue. Quote short YAML values containing `: `, for example `headline: "Tonight: Qwentin"`.

A bare `- type: text` is a body block, not a supported top-level section. To resume an article after an ad, keep the text under that article's `body_blocks`. Its `headline`, `kicker`, and heading styles remain article fields. The complete interstitial example below shows all of these parents together.

## Small complete issue

This example shows the frontmatter delimiters, root metadata, `sections`, masthead, introductory paragraphs, and footer. It illustrates the document structure; use the established boilerplate's full footer and service links for a real issue. It is not a replacement for the current w43 source.

```yaml
---
template: near-future-lab-daily-headlines
newsletterFormat: speculative
issueId: nfl-dh-w43-y26
title: Tomorrow's News Today
preheader: Dispatches from an adjacent now.
pubDate: '2026-10-19 12:00:00-07:00'
webPublicationStatus: draft
ogImage: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/1acdd0f3-0d4c-4620-9a9d-256a99c38400/full?format=webp
ogImageAltText: Delegates gathered around a computer cart beneath a chandelier.
socialCard:
  title: Tomorrow's News Today
  subtitle: ''
  kicker: ''
  backgroundImage: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/1acdd0f3-0d4c-4620-9a9d-256a99c38400/full?format=webp
  logoUrl: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/e98285d8-5856-4005-6fbd-1c322688e700/full?format=webp
  logoPosition:
    side: left
    nudge:
      x: 0
      'y': 0
      east: 0
      west: 0
      north: 0
      south: 0
  titleFont: nfl-title-untitled
  titleFontScale: 0.7
  subtitleFont: nfl-subtitle
  subtitleFontScale: 0.9
  kickerFont: nfl-kicker
  kickerFontScale: 1
  footer: ''
  footerFont: null
  footerFontScale: 1
  backgroundOpacity: 0.5
  backgroundHueRotate: 0
  backgroundSaturation: 1
  overlayStrength: 0.5
  imageBrightness: 1
  textColor: '#111111'
  mutedTextColor: '#666666'
  kickerColor: '#111111'
  animation:
    mode: ''
    animeModule: ''
    durationMs: 1000
    duration: source
    fps: 30
    loop: false
    posterFrame: 0
    formats:
      - webp
      - mp4
    disableForPresets: []
  titlePosition: bottom-left
sections:
- type: newsletter_masthead
  logoLink:
    href: https://nearfuturelaboratory.com
    label: nfl-dh-w43-y26 | masthead | Near Future Laboratory home
    category: operations
  logo_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/f6918220-7209-42cb-1f35-3207cc1c6b00/w=300?format=webp
  logo_alt: Near Future Laboratory
  logo_width: 300
  title_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/19ab94ad-2a10-4467-911e-14e8783e7a00/full?format=webp
  title_alt: Tomorrow's News Today
  title_width: 300
  dateline: Week 43, Year 26
- type: intro_statement
  label: This week
  statement: |-
    <p>Good morning,</p>

    <p>We begin at Höfði House, where the delegates are preparing for another visitor.</p>
  show_bottom_rule: false
- type: email_footer
  paragraphs:
  - Thank you for reading the Near Future Laboratory newsletter.
  address: Near Future Laboratory
  unsubscribe_label: Unsubscribe
  unsubscribe_href: '[unsubscribe]'
---
```

Use the issue's actual metadata and an approved hosted image. `ogImage` supplies public preview metadata; `socialCard.backgroundImage` supplies the social-card background. For the visible lead image, set `intro_statement.image_src` and `image_alt`; its optional visible caption uses `image_caption`.

## Intro with text, an image, and an ad

Keep a lead image in `image_src`, with accessibility text in `image_alt` and an optional visible `image_caption`. Additional images use `type: image`, `src`, `alt`, and optional `caption` inside `body_blocks`. The two caption field names belong to different levels.

```yaml
- type: intro_statement
  label: Returning to Höfði
  image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/7a04356a-a61b-4da2-7d61-e28ae07eda00/full?format=webp
  image_alt: Delegates pose beside a wheeled computer cart carrying a monitor, keyboard, and speakers.
  image_caption: Delegates at Höfði House in Reykjavík.
  body_blocks:
  - type: text
    html: |-
      <p>Good morning,</p>

      <p>The delegates returned to Höfði with another visitor on the guest list.</p>
  - type: image
    src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/63631f4e-6ba7-4bf0-9b6a-2da39ecaa100/full?format=webp
    alt: Jimmy Kimmel holds a giant yellow pencil beside an announcement of Qwentin's appearance.
    caption: Tonight's guest has already attracted the attention of the late-night hosts.
  - type: ad-block
    show_top_rule: false
    show_bottom_rule: false
    items:
    - adId: interstitial-john-deere-rtx8080
      adRenderMode: snapshot
      adSnapshotPreset: native
  - type: text
    html: |-
      <p>At Höfði, the organizers were still discussing the visitor's pass.</p>
  show_bottom_rule: false
  containerStyles:
    backgroundColor: '#ffffff'
```

The sequence is lead image and caption, label, first text block, additional image and caption, ad, then continuation. `statement` remains supported for a simple intro. If both `statement` and `body_blocks` are present, the statement renders first. When migrating a passage into body blocks, remove its old copy from `statement` to avoid repeating it.

## Article with an interstitial ad and continuation

This is a complete feature section with an opening passage, an inventory ad, more paragraphs, and a final normal text link. Copy the entire section structure when learning the nesting. Keep `body_blocks` aligned with `lede`; keep `kicker` and `articleHeadingStyles` aligned with `headline`.

```yaml
- type: section_article_group
  section_label: Opinion
  articles:
  - article_layout: feature
    image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/2c5c9b94-2c4c-4c8a-f31f-efd111b91800/full?format=webp
    image_alt: AI Nutrition Label for GPT-5.6 Luna, showing the overall evaluation and category grades.
    kicker: AI & Information Design
    headline: The Label Isn't The Problem With the AI Nutrition Label
    articleHeadingStyles:
      fontSize: 28px
      lineHeight: 32px
    lede: |-
      <p>MIT's ImpactBench has given AI models nutrition labels, and I can see why. I already have a way of looking at this familiar object before I have read a line about what the model does.</p>

      <p>And yet I keep getting stuck on that notion of a serving. What is a serving of AI?</p>
    body_blocks:
    - type: ad-block
      show_top_rule: false
      show_bottom_rule: false
      items:
      - adId: interstitial-profasic-hydrolase-breyers-pharmagentic
        adRenderMode: snapshot
        adSnapshotPreset: native
    - type: text
      html: |-
        <p>How about a medical warning label, with its account of dose, interactions, and what one should avoid after taking it?</p>

        <p>I find myself returning to the choices that were made before anyone filled in a single row of the label.</p>
    more_link:
      label: Explore the AI Nutrition Labels →
      link:
        href: https://impactbench.media.mit.edu/nutrition
        label: nfl-dh-w43-y26 | AI Nutrition Label | ImpactBench
        category: design-research
        intent: read
        role: primary
  show_bottom_rule: false
  containerStyles:
    backgroundColor: '#ffffff'
```

`lede` renders before all body blocks. An alternative is to put the opening passage in a first `type: text` block and omit `lede`; the remaining blocks still follow in order. Keep each paragraph in one location.

To insert an ad into an existing long `lede`, leave the opening paragraphs in `lede`, move the remaining paragraphs into a text body block, and put an ad body block immediately before that continuation. The indentation of the moved HTML increases from six spaces to eight in this layout. Preserve its wording and blank paragraph breaks. If the ad is being moved from a standalone placement, remove that old placement unless a repeat is intentional.

The ad is an ordinary `ad-block` using the shared inventory, snapshot handling, image checks, and tracked links. Its source contains an `adId`; do not paste rendered ad HTML into the article text. Top and bottom rules are controlled on the ad block, separately from the article group's bottom rule.

## Two books with covers, an interior image, and follow-up links

Every article has its own cover and destination. The interior photograph belongs only to the second article. Its text resumes after the photograph; its follow-up link appears after the complete body. This example includes the primary and follow-up links explicitly so neither book loses its destination when the section changes.

```yaml
- type: section_article_group
  section_label: Books From An Adjacent Now
  articles:
  - article_layout: feature
    image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/3678d41a-3431-48b9-ea3d-b48e8db4f300/public?format=webp
    image_alt: A hand holds the worn teal cover of Farming in the Age of Intelligent Machines by Manuel DeLanda.
    kicker: Book Review · Manuel DeLanda
    headline: Farming in the Age of Intelligent Machines
    link:
      href: https://nearfuturelaboratory.com/library/2026/10/2026-10-18-war-in-the-age-of-intelligent-machines/
      label: nfl-dh-w43-y26 | Farming in the Age of Intelligent Machines | library | Manuel DeLanda
      category: books-writing
      intent: read
      role: primary
    lede: |-
      <p>DeLanda follows the Agrarian Intelligence Research Unit through its work on autonomous vehicles, farm operations, and earth monitoring.</p>
    more_link:
      label: Read the book review →
      link:
        href: https://nearfuturelaboratory.com/library/2026/10/2026-10-18-war-in-the-age-of-intelligent-machines/
        label: nfl-dh-w43-y26 | Farming in the Age of Intelligent Machines | library | Manuel DeLanda
        category: books-writing
        intent: read
        role: primary
  - article_layout: feature
    image_src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/36481ada-8759-45ad-a7cd-8766d3059000/full?format=webp
    image_alt: Worn cover of The Agricultural Machine by Nicholas Negroponte, arranged as a grid of gray squares.
    kicker: Book Review · Nicholas Negroponte
    headline: The Agricultural Machine
    link:
      href: https://nearfuturelaboratory.com/library/2010/11/the-architecture-machine/
      label: nfl-dh-w43-y26 | The Agricultural Machine | library | Nicholas Negroponte
      category: books-writing
      intent: read
      role: primary
    lede: |-
      <p>Negroponte describes the computational machines being investigated at MIT and their work in agriculture.</p>
    body_blocks:
    - type: text
      html: |-
        <p>The farm equipment is being designed and readied for manufacture.</p>
    - type: image
      src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/eb19c79c-cd36-4d0b-35eb-42ffec7e0400/full?format=webp
      alt: A man uses a light pen beside a CRT showing a combine harvester design.
      caption: A combine harvester design on a CRT.
    - type: text
      html: |-
        <p>The research continues at farm operating bases established on former civil defense and military sites.</p>
    more_link:
      label: Read the book review →
      link:
        href: https://nearfuturelaboratory.com/library/2010/11/the-architecture-machine/
        label: nfl-dh-w43-y26 | The Agricultural Machine | library | Nicholas Negroponte
        category: books-writing
        intent: read
        role: primary
  show_bottom_rule: false
```

These are the established destinations used for these two entries. Their URL paths preserve the library titles; keep the verified destination when the newsletter uses another title. For a different book, verify its actual library URL before replacing the link.

Keep the cover in `image_src` when adding interior images. Body images need `alt`, while the cover uses `image_alt`. A caption is visible copy; alt text describes the image for accessibility. Both article layouts preserve the full supplied image: `feature` places it above the copy; `row` places it beside the copy on desktop and above it on mobile.

## Primary links and normal follow-up links

| Field | Position | Effect |
| --- | --- | --- |
| Article `link` | Alongside `headline` and `lede` | Primary destination for the cover and opening copy. Optional for an unlinked article. |
| Article `more_link` | Alongside that article's `body_blocks` | Underlined text after that article's complete body, before the next article. |
| Section `more_link` | Alongside `articles` and `section_label` | One follow-up after every article in the group. |
| Article `cta_label` | Alongside `headline` | Existing pill-style CTA using the primary destination. |

Use article-level `more_link` for a separate book-review link beneath each book. Use section-level `more_link` for a destination shared by the whole group. An article may have a primary destination and a different follow-up destination; give the two links the corresponding labels and categories. When both links have the same URL and click intent, keep their tracking metadata identical.

A complete section with one shared follow-up looks like this:

```yaml
- type: section_article_group
  section_label: Reading
  articles:
  - headline: Notes from the Laboratory
    lede: |-
      <p>The reading list continues in the library.</p>
  more_link:
    label: Browse the library →
    link:
      href: https://nearfuturelaboratory.com/library/
      label: nfl-dh-w43-y26 | Reading | library
      category: books-writing
      intent: read
      role: primary
  show_bottom_rule: false
```

Each `more_link` needs its own nonempty `label` and `link` or legacy `href`. A second `link:` aligned with an article's existing `link:` creates a duplicate key. Its tracking fields belong beneath `more_link.link`, as in the book examples.

## Inline references and typography

Use inline anchors for citations in prose and preserve their tracking attributes. This complete article leaves the primary card unlinked and places its inline references in a text body block.

```yaml
- type: section_article_group
  section_label: References
  articles:
  - headline: Reading the label
    articleHeadingStyles:
      fontSize: 28px
      lineHeight: 32px
    lede: |-
      <p>The label's history and methodology are available in the following sources.</p>
    body_blocks:
    - type: text
      html: |-
        <p><a href="https://www.fda.gov/important-nlea-dates" data-link-label="nfl-dh-w43-y26 | Nutrition Facts implementation dates | FDA" data-link-category="design-research" data-link-role="secondary" data-link-intent="read">Nutrition labeling history — FDA →</a><br><a href="https://impactbench.media.mit.edu/about" data-link-label="nfl-dh-w43-y26 | AI Nutrition Label methodology | ImpactBench" data-link-category="design-research" data-link-role="secondary" data-link-intent="read">ImpactBench methodology →</a></p>
  show_bottom_rule: false
```

Article prose links inherit the surrounding body font, size, and line height, with normal weight, `#333`, and an underline. Normal article follow-up links use the same typography. Their styling belongs to the template; adding more inline HTML styling to every reference is unnecessary.

Intro prose, article ledes, continuation text, and article follow-up links default to Georgia at 18px with 26px line height on desktop. Up to 599px wide, they share the 17px/1.3 mobile lock. `articleHeadingStyles` changes headings; `articleContentStyles` changes article copy; `articleLinkStyles` changes link styles. Group-level values apply to its articles, and an individual article may override them. Keep approved shared typography unless a particular change is intended.

## Standalone ad

A standalone ad belongs directly in `sections`, aligned with an article group or intro. It uses the same inventory contract as nested ads.

```yaml
- type: ad-block
  title: Track Your Daily Inference Dose
  show_top_rule: false
  show_bottom_rule: false
  items:
  - adId: apple-watch-inframaximal-6502-commerce-01
```

Omitting `adRenderMode` uses the ordinary live card. To request a composed snapshot, add `adRenderMode: snapshot` and `adSnapshotPreset: native` beneath the same `- adId:` item, as in the interstitial example. One ad block contains one item. Use separate blocks for several ads.

The inventory is `/Users/julian/Code/nfl-editorial/src/content/ads.json`. Verify the chosen ID there or through the Editorial tools. The build supplies the image, copy, destination, sponsor, and tracking metadata. A missing ID is a build error. Standalone, intro, and article placements all use the shared card. Section titles and optional divider rules sit outside its frame; snapshots retain their composed presentation.

## Job card

A reference-only job section is sufficient:

```yaml
- type: speculative-job
  title: Tomorrow's Jobs Today
  items:
  - jobRef: fdaa/platform-counter-inference-analyst
  containerStyles:
    backgroundColor: '#ffffff'
```

The build reads `/Users/julian/Code/nfl-editorial/src/content/jobs/<jobRef>.mdx`, expands its newsletter copy, company logo, and media, and resolves the destination through the active publication registry. Preserve `company/role` syntax. A `jobRef` is a source reference, not a public URL.

Markdown builds, JSON builds, and normalized exports resolve bare job references. Missing or draft jobs, unavailable registered destinations, and incomplete cards block output. The renderer and Maizzle test sender reject empty or literal `undefined` job titles or destinations. Do not work around a missing lookup by filling guessed job links into the newsletter.

## Operator commands

Run these commands from `/Users/julian/Code/nfl-backoffice`. The examples use the existing w43 issue; substitute the intended issue ID for another newsletter. A command printed here is an instruction example; it does not itself authorize sending or deployment.

### 1. Check the source layout

```sh
cd /Users/julian/Code/nfl-backoffice
npm run lint:frontmatter-layout -- public/outbox/data/2026/nfl-dh-w43-y26.md
```

This checks source formatting. A clean result does not certify YAML/schema validity, remote links, or rendered output. Preview runs the parsing and template checks as part of rendering.

### 2. Preview while editing

```sh
npm run newsletter:preview -- nfl-dh-w43-y26 --edition full
```

For a public/full split preview:

```sh
npm run newsletter:preview -- nfl-dh-w43-y26 --edition both
```

Review files are written under `/Users/julian/Code/nfl-backoffice/output/newsletter-editions/2026/`. A full preview writes `nfl-dh-w43-y26__full.html`; a split preview also writes `nfl-dh-w43-y26__public.html`. Preview preserves the issue's publication status and deployable archive HTML. Validation failures shown during a preview remain unresolved until a canonical build passes.

### 3. Build and verify the intended edition

For the ordinary full issue:

```sh
npm run newsletter:build -- nfl-dh-w43-y26 --edition full
npm run newsletter:check-build -- nfl-dh-w43-y26 --edition full
```

The shorter `npm run newsletter:build -- nfl-dh-w43-y26` defaults to full for an ordinary issue ID. A public/full split requires `--edition both` explicitly; adding `sourceRef` does not select both editions automatically.

For a split issue:

```sh
npm run newsletter:build -- nfl-dh-w43-y26 --edition both
npm run newsletter:check-build -- nfl-dh-w43-y26 --edition both
```

| Build mode | Main HTML outputs under Backoffice |
| --- | --- |
| Full | `public/outbox/issues/2026/nfl-dh-w43-y26.html` |
| Preview/public edition | `output/newsletter-editions/2026/nfl-dh-w43-y26__public.html`, with the public archive mirror |
| Both | `output/newsletter-editions/2026/nfl-dh-w43-y26__public.html`, `nfl-dh-w43-y26__full.html`, and the public archive mirror |

`preview` is the edition name for public/preview destinations; the output filename uses `__public.html`. The `newsletter:preview` command is the separate private drafting workflow. Select the edition explicitly when the distinction matters.

For edition-sensitive artifact links, use a verified registry `sourceRef` in the tracked link object instead of inventing a destination from the slug. Public and full destinations come from the active registry. Ordinary external links and verified library URLs may use `href`.

The final build prepares web publication and prints `READY FOR SITE DEPLOYMENT`; deploying the site remains a separate action. Read [the completion policy](/Users/julian/Code/nfl-backoffice/docs/newsletter-build-completion-policy.md) for the authoritative gates.

### 4. Send a test only when requested

This command rebuilds the full edition, validates the final HTML and links, then sends the test:

```sh
npm run newsletter:build -- nfl-dh-w43-y26 --edition full --send-test
npm run newsletter:check-build -- nfl-dh-w43-y26 --edition full
```

The recipient is the configured `SES_TO`, or `bleeckerj@gmail.com` when Backoffice has no explicit recipient. Check the effective sender and recipient in the sender configuration and command output. Keep durable configuration in the approved `.env` files; do not add an inline environment override to the command.

The subject comes from an explicit `emailSubject`, `subject`, or `campaignSubject` when supplied; otherwise it uses the title and preheader. For `--edition both --send-test`, both editions build but only the full edition is sent as the test. SES acceptance confirms submission; it does not establish delivery or reading. This workflow does not dispatch the broadcast campaign.

### 5. Finish editing before the final receipt check

Source, schema, or rendered HTML changes invalidate the matching build receipt. Save the intended version, let the build finish, then check its receipt. After another edit, rebuild that version. Do not certify an earlier render as the current newsletter.

Build receipts live under `/Users/julian/Code/nfl-backoffice/output/newsletter-build-receipts/2026/`. Match the edition and any `--force` setting in the checker. `--force` waives supported recurring-content requirements; it does not waive malformed YAML, schema, job, link, or image failures.

## Troubleshooting

| Symptom | Check | Correction |
| --- | --- | --- |
| `bad indentation of a mapping entry` at `kicker` or a style field | The preceding `lede` or body block and the nearest `- type:` | Keep article fields at article indentation. Put ad/text continuations inside that article's `body_blocks`. The reported line may be where the parser noticed the problem. |
| Top-level `type: text` | Whether it was pasted alongside `section_article_group` | Move it into an article or intro `body_blocks`; retain the correct parent. |
| Article text repeats | The same passage in both `lede`/`statement` and a body text block | Keep the passage in one field. |
| The ad appears twice | A nested placement plus its old standalone placement | Remove the old placement when moving the ad. |
| YAML duplicate `link` key | Indentation of `more_link.link` | Nest the follow-up's destination beneath its own `more_link`. |
| A book loses its review destination | The article's `link` and `more_link.link` | Preserve both intended destinations when adding images or splitting the body. |
| A body image or caption disappears | `image_src`/`image_alt` versus body `src`/`alt`/`caption` | Use the field names owned by that image level. Keep images out of prose HTML. |
| An unknown ad or job reference fails | Current inventory or canonical job plus active publication registry | Use the verified ID; repair the source/publication lookup rather than guessing a URL. |
| Job title or link is `undefined` in a received message | Which HTML was sent and whether its canonical build is current | Rebuild through the canonical path. The maintained renderer and test sender reject incomplete job cards. |
| `Source Markdown changed during this build` | Edits saved while rendering | Finish the intended edits and rebuild. Preserve the newer source. |
| `BUILD NOT CURRENT` after a successful build | The receipt's source, schema, output, edition, and force setting | Rebuild the current version and check the same edition/options. |
| Snapshot upload fallback warning | The snapshot result and Photarium namespace configuration | Inspect the rendered fallback and resolve upload configuration before requiring snapshot output. Do not substitute an unchecked local image path. |
| Gmail clipping warning | Final HTML size and rendered footer | Inspect the received test. Shorten or simplify only the intended copy/markup; image bytes themselves are not counted in the HTML size. |

## MCP use and limits

Start with `newsletter_get(issue_id="nfl-dh-w43-y26")`. Inspect the selected template with `newsletter_get_section_schema(section_type="section_article_group", template="near-future-lab-daily-headlines")` before constructing a new payload.

Maizzle's `get_template_authoring_guide(name="near-future-lab-daily-headlines")` returns this file on each call. `get_template_schema(name="near-future-lab-daily-headlines")` returns the full schema.

Generic Backoffice item/image tools target `items`; Daily Headlines article groups use `articles`. Do not use an item mutation to place an article photograph or an article-level follow-up. `newsletter_update_section` can replace an entire `articles` array, but performs a shallow section update and rewrites YAML. It has no expected-source-hash guard. Use a narrow source patch to preserve a hand-edited issue, reading the latest file first.

Maizzle's `build_newsletter` renders through its canonical renderer. It does not run Backoffice's edition selection or issue receipt gate. Maizzle's lint tool has a documented mismatch for reference-only job sections. See the [MCP coverage audit](../../docs/mcp-coverage-audit-2026-10-19.md). The Backoffice final build plus matching receipt check remains the release verification workflow.

## Starter requirements

Daily Headlines and Dense Discovery share the complete social-card controls. The canonical schema generator reads the current shared contract on every invocation and rejects a missing card schema or missing nested controls before returning Markdown. This check also runs for an already-connected Backoffice MCP client. Daily Headlines starters include the publication title, canonical logo, font defaults, logo nudges, image adjustments, footer controls, and animation settings; no background image is selected automatically.

Backoffice checks the resulting card again after starter cleanup and before writing. A null or incomplete card returns `saved: false` and preserves an existing draft when overwrite was requested. Authored optional settings on ordinary saves retain their existing behavior. Run `npm run test:newsletter-contracts` here and `npm run test:newsletter-starters` in Backoffice after changing the schema or generator.
