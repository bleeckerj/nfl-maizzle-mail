# Near Future Laboratory Daily Headlines

This template renders compact daily-headline emails from a `sections` array. The canonical machine-readable contract is `newsletter.schema.json`; the canonical example is `sample-data.json`.

## Normal Authoring Shape

Use this order for ordinary issues:

```yaml
template: near-future-lab-daily-headlines
title: Near Future Laboratory Daily Headlines
preheader: Short inbox preview text
sectionStylesFile: templates/near-future-lab-daily-headlines/section-styles.json
sections:
  - type: newsletter_masthead
    logoLink:
      href: https://nearfuturelaboratory.com
      label: Near Future Laboratory home
      category: operations
    logo_src: https://...
    logo_alt: Near Future Laboratory
    logo_width: 300
    title_src: https://...
    title_alt: Daily Headlines
    title_width: 300
    dateline: "June 6, 2026, 6:00 a.m. Pacific time"

  - type: intro_statement
    label: From the Editor
    statement: '<p>A short <em>introductory</em> statement before the headline groups.</p>'
    show_bottom_rule: true

  - type: ad-block
    title: Sponsor
    show_bottom_rule: true
    items:
      - adId: the-manual-pb-interstitial-01

  - type: short-take
    items:
      - shortTakeId: dhl-autonomous-catapult-delivery-trials

  - type: section_article_group
    section_label: Top News
    articles:
      - link:
          href: https://example.com/story
          label: Lead daily headline
          category: editorial
        image_src: https://example.com/image.jpg
        image_alt: Short image description
        # Optional: row is the default; feature makes the image full-width above the article.
        article_layout: feature
        kicker: Optional kicker
        headline: Story headline
        lede: One or two sentence summary.
    show_bottom_rule: true
    more_link:
      link:
        href: https://example.com
        label: Top News section more link
        category: editorial
      label: See more

  - type: share_this
    online_url: https://nearfuturelaboratory.com/newsletters/2026/nfl-dh-w24-y26
    # everything below is optional — these are the defaults:
    # eyebrow: Share this issue
    # statement: "Know someone who&rsquo;d want a peek at their near future? Pass it along."
    # email_label: Forward by email
    # online_label: Open online →
    # email_href: "mailto:?subject=…&body=…"   # auto-built from online_url if omitted
    # background: "#f5f4f0"
    # text_color: "#333"
    # eyebrow_color: "#555"
    # space_top: 28      # gap (px) above the bar
    # space_bottom: 28   # gap (px) below the bar

  - type: inline_cta
    renderFor: public       # public/preview, full, both, or omit for both
    eyebrow: Public preview
    statement: 'You’re reading the public preview. Subscribe for the full issue.'
    font_family: mono       # mono or sans
    background: '#f5f4f0'
    text_color: '#333'
    eyebrow_color: '#555'
    border_color: '#222'
    border_radius: 12    # pixels; omit for square corners
    primaryAction:
      label: Subscribe
      url:
        href: https://nearfuturelaboratory.com/subscribe
        label: Daily Headlines subscribe
        category: subscribe
        intent: subscribe
    # secondaryAction: { label: Read online, url: { href: https://..., label: Read online, category: newsletter } }

  - type: email_footer
    paragraphs:
      - Boilerplate / legal paragraph. Inline <a href> links are allowed.
      - 'Add tracking attributes to footer links, e.g. <a href="https://nearfuturelaboratory.com/contact" data-link-category="site-nav" data-link-label="footer | contact">let''s talk</a>.'
    address: 'A Research Initiative by <a href="https://nearfuturelaboratory.com" data-link-category="site-nav" data-link-label="footer | home">Near Future Laboratory</a>. Venice Beach, CA. (c) 2026.'
    unsubscribe_label: Unsubscribe
    # social_links:                       # optional row of links above the address line
    #   - { label: Website, href: https://nearfuturelaboratory.com, category: social }
    # footer_html: '<tr><td>…</td></tr>'   # legacy fallback, used only if no structured slot is set
```

## Section Types

`newsletter_masthead`
: Required for normal issues. Renders the publication/logo image, newsletter title image, dateline, and the build-injected `View/share online` link at the top of the email.

`intro_statement`
: Optional author note below the masthead. Use `statement` for plain text or simple HTML with `<p>`, `<em>`, `<strong>`, and `<a href="">`. `statement_html` remains available as an explicit rich-text override. Unsupported tags and attributes are stripped during the build. `label` and `show_bottom_rule` are optional. Its mobile scale (`.intro-statement-label` / `.intro-statement-copy`) is tuned independently of the generic `.mob-text` body-copy lock.

`section_article_group`
: Main content section. Renders a section heading and one or more article rows. Each article requires `headline`; `link` (preferred) or legacy `href` is optional. When both are omitted, the card keeps its image, copy, and any `cta_label` but has no anchors or link-tracking metadata. `image_src`, `image_alt`, `kicker`, and `lede` are optional but recommended. An image-bearing `row` article (the default) places the image on the right at wide widths and first in the mobile reading order. Set `article_layout: feature` for longer editorial copy; it renders the complete image full-width above the article at every width. Prefer `more_link` on this section for a section-level follow-up link.

`ad-block`
: Inventory-backed ad card. Author only `items[0].adId`; the build looks up the ad in `/Users/julian/Code/nfl-editorial/src/content/ads.json` and hydrates URL, media, copy, sponsor, and tracking metadata. Exactly one item is allowed. Set `show_bottom_rule: false` to suppress the light divider after the ad.

`short-take`
: Inventory-backed editorial card. Author only `items[0].shortTakeId`; the build resolves headline, caption, Photarium image, alt text, optional destination, and optional edge metadata from `/Users/julian/Code/nfl-editorial/src/content/shortTakes.json`. Exactly one item is allowed, and multiple cards use multiple ordered sections. Linked records use tracking category `short-take`; records without a destination render without anchors. Images remain complete within the 600px column.

`section_more_link`
: Legacy standalone follow-up link. Prefer `section_article_group.more_link` for new content.

`share_this`
: Slim, tinted "share this issue" CTA bar (same look as the footer CTA). Drop it anywhere — typically right before `email_footer`. Renders a configurable eyebrow + statement, a primary **Forward by email** button, and an optional outline **Open online** button. Every slot is optional with a default, so a bare `share_this` with just `online_url` renders the full thing. Set `background`, `text_color`, and `eyebrow_color` to recolor the bar; `eyebrow`, `statement`, `email_label`, and `online_label` to retitle it. `online_url` must be a **plain URL string** (not a tracked-link object) — use the issue's archive URL so the build auto-stamps link tracking. If `email_href` is omitted, the build composes a `mailto:` from `online_url`. The outline button is omitted entirely when `online_url` is absent. Its mobile scale (`.share-cta-eyebrow` / `.share-cta-copy` / `.share-cta-button`) is tuned independently of `.mob-text`. The bar ships with a 28px gap above and below (override via `space_top` / `space_bottom`) so it reads as its own section instead of fusing with the neighbour below. Reference markup + full slot docs live in `components/ShareThis.html`.

`email_footer`
: The full footer below the footer CTA bar. Author it with structured slots — `paragraphs` (boilerplate/legal body paragraphs, each may contain inline `<a href>` links), `address` (the lighter legal line: organization, location, copyright, with an optional inline `<a>`), `unsubscribe_label` (+ optional `unsubscribe_href`, default `[unsubscribe]`), and optional `social_links` (`{ label, href, category }`). The component supplies all the table-row + paragraph chrome. `footer_html` (the complete inner table-row HTML) is kept as a legacy fallback and is used verbatim only when no structured slot is set, so existing issues keep rendering unchanged. Reference markup + full slot docs live in `components/FooterBody.html`.

`inline_cta`
: Edition-aware CTA bar rendered at the authored position. Place it immediately before `email_footer`. Use `renderFor: public` or `renderFor: preview` for the public preview only, `renderFor: full` for the full edition only, or omit `renderFor` / use `both` to render it in both. The required `primaryAction` and optional `secondaryAction` use the tracked-link shape. `statement` accepts simple inline HTML. `font_family` is `mono` by default and can be set to `sans`; appearance fields include `background`, `text_color`, `eyebrow_color`, `border_color`, `border_width`, `border_radius`, button colors, `space_top`, and `space_bottom`. The block has a full border on all four edges; `border_radius` is specified in pixels and defaults to square corners. It uses the same dark-mode flatten classes as `share_this`.

`masthead_ad_bar`
: Legacy ad/view-in-browser bar above the masthead. New ad placements should use `ad-block` so ad URLs and media come from the editorial ads inventory.

`inline_ad_block`
: Optional mid-issue or end-of-issue ad block with desktop/mobile image variants.

`tracking_pixel_row`
: Legacy hidden tracking-pixel row. Use only when recreating a source email that needs these pixels.

## Notes

- This template does not use a top-level `header` field. Its visible header is the `newsletter_masthead` section.
- Backoffice publishing metadata such as `ogImage`, `ogImageAltText`, and `socialCard` may exist on outbox issues, but those fields are not part of this email template’s render path.
- New editorial content should use the evolved tracked link object shape on fields named `link`, `logoLink`, or top-level CTA `url`: `{ href, label, category }`. The build emits those labels/categories as `data-link-label` and `data-link-category` for `nfl-newsletter-email-soup-to-nuts`.
- The build computes `viewOnlineLink` from `issueId` as `https://nearfuturelaboratory.com/newsletters/<year>/<issueId>` and injects it into the masthead before rendering. Public starters may carry a placeholder so the required field remains visible to authoring tools.
- Short Take content is registry-owned. Newsletter drafts carry only `shortTakeId`; issue-level headline, caption, image, URL, edge metadata, width, and style overrides are rejected.
- New ad content should use `ad-block` with `adId`; do not hand-author ad destination URLs or ad image URLs in the newsletter draft. Hydrated ad links default to tracking category `ad-block`. When a placement needs a more specific click-category analytics label, set the item `link` or `readMoreLink` to `{ href, label, category }`, for example:

```yaml
- type: ad-block
  title: "Tomorrow's Ads Today"
  items:
    - adId: fashion-8bit-pants-interstitial
      link:
        href: https://example.com/speculative-product
        label: fashion-8bit-pants-interstitial
        category: speculative-products
```

- The footer CTA bar (`footer.footerCta`, rendered automatically with `email_footer`) accepts the same appearance overrides as `share_this`: `background`, `text_color`, and `eyebrow_color`. Set `heavy_top_border: true` to use the heavy 9px black top rule (like `section_article_group`) instead of the default 1px hairline. Set them under `footer.footerCta`. They are resolved in `lib/newsletter-core/footer-cta.mjs` (which rebuilds the object, so any new field must be added there to survive normalization) and honored in light mode only.
- `share_this` colors (`background`, `text_color`, `eyebrow_color`) are honored in light mode only. When dark-mode flatten is enabled (the default), `.dm-surface` / `.dm-text` override the bar background and statement color in clients that honor `prefers-color-scheme`. The black/white buttons are intentional brand pills and are not configurable; the outline button keeps dark text on the flattened-dark bar, matching the footer CTA.
- Legacy fields such as `href`, `logo_href`, `view_in_browser_href`, `ad_href`, and `link_href` still render as fallbacks, but they do not carry explicit tracking metadata.
- `email_footer` inline links (inside `paragraphs` and `address`) carry their own `data-link-category` / `data-link-label` attributes, exactly like the legacy `footer_html` did. The post-render link-tracking enricher only auto-stamps anchors whose `href` matches a tracked link used elsewhere in the issue, and it never overwrites attributes you set — so add the `data-link-*` attributes directly on footer anchors, and keep footer hrefs real or `mailto:` so the live-link check passes (`[unsubscribe]` is left unvalidated). `social_links` emit `data-link-*` from their `label` and `category` (default `social`) automatically.
- Keep template-specific examples in `sample-data.json` aligned with `newsletter.schema.json`.
