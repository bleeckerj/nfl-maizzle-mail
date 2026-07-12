(# Dense Discovery — Template Notes)

💛 Gratitude

This email template is a tuned up fork within this repo, a Markdown-JSON-Python-Maizzle based production workflow. It's a work-in-progress building on a refactor of the <a href="https://densediscovery.com">Dense Discovery</a> newsletter's look and vibe, created by <a href="https://www.brizk.com">Kai Brach</a>. I have been a paid ‘friend of Dense Discovery’ for, well… I'm not sure how many years now. It's a great newsletter and I would encourage you to subscribe and become a paid member.

## `feature` subtitle styling

Feature item subtitles inherit explicit section text color overrides by default. Use subtitle-specific keys inside `contentStyles` when the subtitle needs its own color or type treatment.

The legacy section type `sponsor` still renders through this same branch for backward compatibility. New issues should use `type: feature` and, when needed, `featureLink` / `featureLabel` for the small heading-side link.

```yaml
sections:
- type: feature
  title: UPCOMING
  featureLink: https://example.com/calendar
  featureLabel: CALENDAR
  contentStyles:
    color: "#f0f0f0"
    subtitleColor: "#f0f0f0"
    subtitleFontSize: "16px"
    subtitleLineHeight: "18px"
    subtitleFontWeight: "400"
  items:
  - title: Denver Premiere of BLKNWS Terms and Conditions
    subtitle: May 29, 2026, at the MCA Denver Holiday Theater
```

## `ad-block` section

`ad-block` renders a single, email-safe ad card in `dense-discovery`.

### Frontmatter shape

```yaml
sections:
- type: ad-block
  title: This Week's Partner
  show_bottom_rule: true
  description: <p>A short note explaining why this ad is relevant to this issue.</p>
  items:
  - adId: fashion-8bit-pants-interstitial
```

By default, the hydrated link is tracked with category `ad-block`. That category is emitted as `data-link-category` in the final HTML and appears as `ad-block` in click-category analytics. To choose the analytics category for one placement, author the item link as a tracked-link object:

```yaml
sections:
- type: ad-block
  title: This Week's Partner
  items:
  - adId: fashion-8bit-pants-interstitial
    link:
      href: https://example.com/speculative-product
      label: fashion-8bit-pants-interstitial
      category: speculative-products
```

Use `readMoreLink` with the same `{ href, label, category }` shape when the CTA should use a different destination from the primary ad link.

### How it resolves data

- `adId` is looked up in `../nfl-editorial/src/content/ads.json` during `build-newsletter.mjs`.
- Exactly one item is allowed in an `ad-block` section.
- Set `show_bottom_rule: false` when a template renders a light divider after the ad and this placement should omit it.
- Unknown or missing `adId` fails the build with a clear error.
- Email rendering ignores web-only variants (`mobile`, slot behavior, responsive layout, carousel/video/embed handling).
- Commerce ads with `commerce.presentation: overlay-lockup` render from canonical editorial snapshots by default. Use `adRenderMode: legacy` for the layered email fallback, and reserve `commerce.lockup.snapshotSrc` for emergency manual overrides.

### Rendered hierarchy

- Section title in a separate header block; if omitted, the inventory ad title is promoted into this header
- Optional section description/context
- Optional top disclosure row from `item.label`
- Optional image
- Optional ad title inside the card when the author also supplied a separate section title
- Optional ad copy
- Optional footer with `item.sponsor` and CTA

Commerce overlay lockups use the ad inventory `media.src` as the full-bleed image, `commerce.priceText` as the price, and `commerce.icon.src` as the transparent commerce brand mark.

### Defaults and style tuning

Defaults are defined in `templates/dense-discovery/section-styles.json` under `sectionStyles["ad-block"]`.

- Card surface: `backgroundColor: #f5f4f0`
- Border: `borderWidth`, `borderStyle`, `borderColor`
- Corners: `borderRadius` (default `0px`)
- Wrapper styling: `sectionHeaderBackgroundColor`, `sectionHeaderPadding`, `sectionHeaderBorderRadius`, `sectionHeaderGap`, `sectionDescriptionPadding`, `firstAdItemGap`
- Sponsor label typography: `labelStyles`
- Title typography: `headingStyles`
- Copy typography: `contentStyles`
- CTA typography: `linkStyles`
- Layout spacing: `labelPadding`, `imagePadding`, `titlePadding`, `copyPadding`, `ctaPadding`

Font defaults for this section use:

- `Geist, ui-sans-serif, sans-serif` for label, title, copy, and CTA

### Sample

Use `content/test-ads.md` as the working sample file for `ad-block` validation and visual QA.

## `short-take` section

`short-take` renders one editorial registry card at its exact position in `sections[]`:

```yaml
sections:
- type: short-take
  items:
  - shortTakeId: dhl-autonomous-catapult-delivery-trials
```

The build resolves `shortTakeId` from `../nfl-editorial/src/content/shortTakes.json`. Exactly one item is required. Headline, caption, Photarium image, alt text, destination, edge metadata, and width metadata remain registry-owned; issue-level overrides fail validation. Multiple cards use multiple ordered sections.

Linked records emit separate image and copy anchors with the registry id as the tracking label and `short-take` as the category. Records without a destination render without anchors. The complete image remains visible within the 640px Dense Discovery column; responsive web `maxWidth` variants are retained in normalized data and are not applied to email layout.

Defaults are defined under `sectionStyles["short-take"]` and use Dense Discovery’s Ubuntu headline, IBM Plex Sans caption, and Share Tech Mono edge metadata treatment.

## `food-for-thought` multi-CTA rows

`food-for-thought` items support one primary CTA row plus optional extra CTA rows.

```yaml
sections:
- type: food-for-thought
  title: Food For Thought Section
  items:
  - title: Example item
    readMoreText: Read more →
    readMoreLink: https://example.com/article
    podcast: true
    readMoreLinks:
    - text: Listen to podcast →
      link: https://example.com/podcast
      podcast: true
    - text: View references →
      link: https://example.com/references
```

- `readMoreText` + `readMoreLink` renders first.
- `readMoreLinks` renders one additional row per entry.
- `podcast: true` renders the Photarium podcast icon before the corresponding link.
- Existing content without `readMoreLinks` remains valid.

## `signals-adjacent-now` additional references

`signals-adjacent-now` items support a structured `additionalReferences` list for source links that support the main signal without replacing the primary CTA.

```yaml
sections:
- type: signals-adjacent-now
  title: Signals from an Adjacent Now
  items:
  - title: Example signal
    readMoreText: Read source →
    readMoreLink: https://example.com/source
    additionalReferences:
    - title: Related paper
      href: https://example.com/paper
      label: example signal related paper
      category: futures
      intent: read-related
      description: A supporting source that gives the signal more context.
```

- `title` and `href` are required for each reference.
- `label`, `category`, and `intent` preserve link metadata for analytics.
- `description` renders after the link as short context.

## `single-column` image precedence

`single-column` supports either:

- `images` for one or more images
- `image` for a single fallback image

When `images` is present, the template renders that array and ignores `image`. Under strict schema validation, do not supply both fields on the same item.

The legacy `indie-mag-single-column` section type remains supported as an alias for older newsletters.

## `inline_cta`

An inline CTA can appear anywhere in `sections`; place it immediately before the footer when it should read as the final editorial block. Use `renderFor: public` or `renderFor: preview` for the public edition only, `renderFor: full` for the full edition only, or omit it / use `both` for both editions. The required `primaryAction` and optional `secondaryAction` use tracked-link objects. `font_family` accepts `mono` or `sans`, and the appearance fields mirror the Daily Headlines inline CTA contract. The block has a full border on all four edges; set `border_radius` in pixels for rounded corners (for example, `12`), or omit it for square corners.

```yaml
sections:
- type: inline_cta
  renderFor: public
  eyebrow: Public preview
  statement: "You’re reading the public preview. Subscribe for the full issue."
  font_family: mono
  background: '#f5f4f0'
  text_color: '#333333'
  eyebrow_color: '#555555'
  border_color: '#222222'
  border_radius: 12
  primaryAction:
    label: Subscribe
    url:
      href: https://theadjacency.com/subscribe
      label: issue | inline CTA | subscribe
      category: newsletter
      intent: subscribe
```
