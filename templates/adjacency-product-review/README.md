# Adjacency Product Review

Wirecutter-like template for the adjacency / nfl-editorial's speculative product reviews.

## Purpose

This template renders product-review emails for speculative products, services, and infrastructure concepts. It is designed for Adjacency and nfl-editorial review formats that need a familiar review structure: a lead review, picks, pros and tradeoffs, editorial body copy, and footer actions.

## Data Shape

- `header`: brand, section name, logo, source label, and homepage link.
- `featuredReview`: category, headline, dek, author/date labels, hero image, disclosure, testing summary, verdict, and primary CTA link.
- `reviewPicks`: repeated picks with label, badge, title, subtitle, price text, image, merchant links, pros, and cons.
- `bodyHtml`: optional long-form review body HTML.
- `footerCta`: optional final callout with eyebrow, text HTML, and primary action.
- `footer`: logo, unsubscribe text, unsubscribe link, address, and legal links.

Use `sample-content.md` as the canonical example for authoring.

Footer navigation links are data-driven from `footer.legalLinks`; edit that array in the source Markdown/JSON to change the visible `The Adjacency`, `Subscribe`, `Contact`, or related footer links. The unsubscribe anchor is separate: set `footer.unsubscribeLink` to `[unsubscribe]` for the soup-to-nuts sender so it can replace the placeholder with the per-recipient `/u/:token` endpoint during campaign preparation.

## Build

```sh
node scripts/build-newsletter.mjs templates/adjacency-product-review/sample-content.md adjacency-product-review-sample --no-open
```

## Mobile Font Lock

This template intentionally uses a locked mobile typography scale that matches Dense Discovery:

- Review body copy: `22px`, line-height `1.3`
- Review titles: `26px`, line-height `1.3`
- Review subtitles and buttons: `23px`, line-height `1.3`
- Review captions: `18px`, line-height `1.2`
- Review metadata labels: `16px`, line-height `1.1`
- Ad copy embedded in product-review body content: `16px`, line-height `19px`
- Ad label, sponsor, metadata, and merchant buttons: `12px`, line-height `1` to `1.1`

Do not remove, lower, or narrow the mobile lock selectors unless the operator explicitly asks for that change and the mobile font lock test is updated in the same change.

The lock depends on mobile stylesheet rules being able to override desktop inline styles. Inline `font-size` and `line-height` declarations for locked review typography must not use `!important`.

Ads embedded in `bodyHtml` should use `review-mobile-ad-copy` for ad prose and `review-mobile-ad-label`, `review-mobile-ad-sponsor`, or `review-mobile-ad-meta` for small ad labels. These classes intentionally override the larger `.review-body p` mobile body copy lock.

The mobile outer gutter is intentionally narrow: `.review-pad` uses `6px` left and right padding at `max-width: 620px`.
