# Add `ad-block` section to `dense-discovery`

## Summary
Add a new `dense-discovery` section type, `ad-block`, that renders a single email-safe static ad card inside the newsletter body. Newsletter content will reference ads by canonical `adId` from `/Users/julian/Code/nfl-editorial/src/content/ads.json`; the mail build will resolve the record, strip web-only concerns, and render only the fields needed for email.

## Key Changes
- **Newsletter interface**
  - Extend the `dense-discovery` schema to allow `sections[].type: "ad-block"`.
  - Keep the existing section-array shape and define `ad-block` as:
    - `type: ad-block`
    - `items: [{ adId: string }]`
    - optional `containerStyles`, `contentStyles`, `linkStyles`
  - No section `title`; the ad card itself carries the small sponsor label.

- **Build-time ad hydration**
  - In `/Users/julian/Code/nfl-maizzle-mail/scripts/build-newsletter.mjs`, load and index `/Users/julian/Code/nfl-editorial/src/content/ads.json` once per build.
  - For each `ad-block`, require exactly one item and resolve `item.adId` to one ad record.
  - Normalize to an email-safe payload using only:
    - `label`
    - `title`
    - `copy` with fallback to `landscapeCopy`
    - `media.src`
    - `media.altText`
    - `link.url`
    - `link.label`
    - `sponsor`
  - Ignore `slot`, `visibility`, `mobile`, responsive variants, carousel/video/embed behavior, and other web-only layout logic.
  - Fail clearly when `adId` is missing or unresolved; do not silently drop the section.

- **Template rendering**
  - Add an `ad-block` branch in `/Users/julian/Code/nfl-maizzle-mail/templates/dense-discovery/newsletter.html`.
  - Render a centered single card modeled on the useful structure of `aside.context-ad`, but rebuilt in table-based email HTML:
    - small label row
    - linked image if present
    - linked/unlinked title
    - copy body
    - footer row with sponsor and CTA link
  - Style it as a static interstitial-like card that fits the 640px dense-discovery content column.
  - Add a matching default style entry in `section-styles.json` so ad-block spacing/typography/background can be tuned like other sections.

## Test Plan
- Build a sample `dense-discovery` markdown with one `ad-block` referencing `fashion-8bit-pants-interstitial`; verify the generated HTML contains the expected label, image, title, copy, sponsor, and CTA.
- Build a sample with an ad that has no sponsor or no link label; verify defaults are stable and email-safe.
- Build a sample with an invalid `adId`; verify the build fails with a precise section/item error.
- Confirm schema validation accepts `ad-block` and still rejects malformed shapes such as multiple `items` or missing `adId`.
- Run the existing newsletter build/check flow to confirm no regressions in other section types.

## Assumptions
- `ad-block` v1 is intentionally **single-ad only**; multiple-ad sections are out of scope.
- The canonical source of truth is `/Users/julian/Code/nfl-editorial/src/content/ads.json`; newsletter markdown stores only `adId`.
- Email rendering uses the base ad record only; mobile/desktop variants and interactive media are ignored.
- The best fallback for missing copy is `landscapeCopy`; the best fallback for missing CTA label is `Learn more`; the best fallback for missing label is `Sponsored`.
