(# Dense Discovery — Template Notes)

💛 Gratitude

This email template is a tuned up fork within this repo, a Markdown-JSON-Python-Maizzle based production workflow. It's a work-in-progress building on a refactor of the <a href="https://densediscovery.com">Dense Discovery</a> newsletter's look and vibe, created by <a href="https://www.brizk.com">Kai Brach</a>. I have been a paid ‘friend of Dense Discovery’ for, well… I'm not sure how many years now. It's a great newsletter and I would encourage you to subscribe and become a paid member.

## `ad-block` section

`ad-block` renders a single, email-safe ad card in `dense-discovery`.

### Frontmatter shape

```yaml
sections:
- type: ad-block
  title: This Week's Partner
  description: <p>A short note explaining why this ad is relevant to this issue.</p>
  items:
  - adId: fashion-8bit-pants-interstitial
```

### How it resolves data

- `adId` is looked up in `../nfl-editorial/src/content/ads.json` during `build-newsletter.mjs`.
- Exactly one item is allowed in an `ad-block` section.
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
- Wrapper styling: `sectionHeaderBackgroundColor`, `sectionHeaderPadding`, `sectionHeaderBorderRadius`, `sectionHeaderGap`, `sectionDescriptionPadding`
- Sponsor label typography: `labelStyles`
- Title typography: `headingStyles`
- Copy typography: `contentStyles`
- CTA typography: `linkStyles`
- Layout spacing: `labelPadding`, `imagePadding`, `titlePadding`, `copyPadding`, `ctaPadding`

Font defaults for this section use:

- `Geist, ui-sans-serif, sans-serif` for label, title, copy, and CTA

### Sample

Use `content/test-ads.md` as the working sample file for `ad-block` validation and visual QA.

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
    readMoreLinks:
    - text: Listen to podcast →
      link: https://example.com/podcast
    - text: View references →
      link: https://example.com/references
```

- `readMoreText` + `readMoreLink` renders first.
- `readMoreLinks` renders one additional row per entry.
- Existing content without `readMoreLinks` remains valid.

## `indie-mag-single-column` image precedence

`indie-mag-single-column` supports either:

- `images` for one or more images
- `image` for a single fallback image

When `images` is present, the template renders that array and ignores `image`. Under strict schema validation, do not supply both fields on the same item.
