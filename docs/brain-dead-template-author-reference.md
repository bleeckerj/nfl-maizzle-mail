# Brain Dead template author reference

Use this guide to write and operate `brain-dead-template` emails. It covers the complete email, every supported section type, images, links, styling, validation, and output files. The examples and field descriptions were checked against the canonical schema and renderer on October 21, 2026.

**Yes: a `single-column` item supports an image and a link.** Put `image`, `imageAlt`, and `link` inside the item under `items`. The same link is used for its image, title, and button. Start with the first example below.

The authoritative guide is this file, `docs/brain-dead-template-author-reference.md`. The template's [README](../templates/brain-dead-template/README.md) and [MCP authoring entry](../templates/brain-dead-template/AUTHORING.md) link here. The [canonical schema](../templates/brain-dead-template/newsletter.schema.json) defines accepted source fields; the [content renderer](../templates/brain-dead-template/components/ContentSections.html) defines their visible behavior.

## Contents

- [Add an image and link to a single-column item](#add-an-image-and-link-to-a-single-column-item)
- [Where the content goes](#where-the-content-goes)
- [Complete campaign example](#complete-campaign-example)
- [Choose a section](#choose-a-section)
- [Single-column recipes](#single-column-recipes)
- [Every content-item field](#every-content-item-field)
- [Dual-column items](#dual-column-items)
- [Images and image limits](#images-and-image-limits)
- [Tracked links and body links](#tracked-links-and-body-links)
- [Email metadata and publication mode](#email-metadata-and-publication-mode)
- [Header and navigation](#header-and-navigation)
- [Hero](#hero)
- [Closing offer](#closing-offer)
- [Footer](#footer)
- [Ads](#ads)
- [Short Takes](#short-takes)
- [Send-time slots](#send-time-slots)
- [Calendar events](#calendar-events)
- [Inline CTAs](#inline-ctas)
- [Edition visibility](#edition-visibility)
- [Typography and styling](#typography-and-styling)
- [Build and verify](#build-and-verify)
- [Troubleshooting](#troubleshooting)
- [Legacy fields and unsupported features](#legacy-fields-and-unsupported-features)
- [Files and ownership](#files-and-ownership)

## Add an image and link to a single-column item

Copy this **section fragment into your existing `sections:` list**, alongside its other `- type:` entries. Replace the example image and destination URLs with your hosted image and the page readers should open.

```yaml
- type: single-column
  label: Featured
  items:
    - kicker: From the library
      title: The Manual of Design Fiction
      subtitle: A guide to making things from possible futures.
      image: https://example.com/hosted/manual-cover.jpg
      imageAlt: Front cover of The Manual of Design Fiction
      body: |
        <p>A practical reference for creating products, services, and
        documents from possible futures.</p>
      ctaText: See the book
      link:
        href: https://example.com/books/manual
        label: library-campaign | manual
        category: books
        intent: purchase
```

The rendered order is:

1. The section label, with a heavy rule above it.
2. The complete image, up to 576px wide on desktop.
3. The kicker, then the title, subtitle, body, price if supplied, and button.

The image, title, and button all open `link.href`. `imageAlt` describes the image for accessibility; it is not a visible caption. `ctaText` controls the visible button words. `link.label` is tracking metadata and does not supply button text.

Keep the indentation shown. In this template, `image` is a URL string. An object such as `image: {src: ..., alt: ...}` belongs to other templates and fails this item's schema.

The example URLs illustrate the shape. They are not production media or verified publication destinations. Use an existing Photarium delivery URL or another approved hosted image URL; do not copy image files into this repository.

## Where the content goes

The editable email source is a Markdown file with YAML frontmatter between two `---` lines. For this template, visible copy belongs in that frontmatter. Text written after the closing `---` is not inserted into the Brain Dead email layout.

The layout renders in this order:

```text
brand                    Header: logo/name and navigation
hero                     Opening heading, optional image, copy, and button
sections[0]              First authored section
sections[1]              Second authored section
...                      Continue in list order
offer                    Optional closing offer panel
footer                   Footer copy, social links, and unsubscribe
```

`brand`, `hero`, `offer`, and `footer` are top-level objects beside `sections`. They are not section types. A generic section has an `items` list; each item owns its image, title, body, and link. Calendar events and inline CTAs instead put their content directly on the section.

When adding a section to an existing source, extend its existing `sections:` list without introducing a second `sections:` key.

### Frontmatter placement

```yaml
---
template: brain-dead-template
publicationMode: campaign
title: Library update
preheader: A new edition from the library.
hero:
  eyebrow: Library update
  headline: New from the library.
sections:
  - type: single-column
    items:
      - title: The new edition
        body: <p>Write the item here.</p>
footer:
  footerCta:
    enabled: false
  unsubscribeLink: "[unsubscribe]"
---
```

## Complete campaign example

This is a **complete source file**. Save it as a new `.md` file in your established campaign source folder. Replace the illustrative URLs, copy, image description, and footer address before using it for a campaign.

```yaml
---
publicationMode: campaign
template: brain-dead-template
title: From the Near Future Laboratory library
preheader: A printed guide for your next project.
brand:
  name: Near Future Laboratory
  logoLink:
    href: https://nearfuturelaboratory.com
    label: library-campaign | home
    category: site-nav
  navLinks:
    - label: Shop
      url:
        href: https://shop.nearfuturelaboratory.com
        label: library-campaign | shop navigation
        category: site-nav
hero:
  eyebrow: From the library
  headline: A guide for your next project.
  subhead: Books and exercises from Near Future Laboratory.
  body: |
    <p>This edition brings together practical examples for researchers,
    designers, and people developing new services.</p>
sections:
  - type: single-column
    label: Featured book
    items:
      - kicker: Printed edition
        title: The Manual of Design Fiction
        image: https://example.com/hosted/manual-cover.jpg
        imageAlt: Front cover of The Manual of Design Fiction
        subtitle: A working reference for the studio.
        body: |
          <p>Read examples, try an exercise, and return to the guide
          throughout a project.</p>
          <p>The edition includes photographs and workshop prompts.</p>
        price: "$35 plus shipping"
        ctaText: See the book
        link:
          href: https://example.com/books/manual
          label: library-campaign | manual
          category: books
          intent: purchase
offer:
  eyebrow: Library
  headline: Browse the collection.
  body: <p>Find more books from Near Future Laboratory.</p>
  ctaText: Visit the shop
  ctaLink:
    href: https://shop.nearfuturelaboratory.com
    label: library-campaign | shop navigation
    category: site-nav
footer:
  footerCta:
    enabled: false
  paragraphs:
    - You are receiving this because you subscribed to Near Future Laboratory updates.
  address: Replace with the campaign's mailing address.
  unsubscribeLabel: Unsubscribe
  unsubscribeLink: "[unsubscribe]"
---
```

Prices and product details in this guide are illustrative. The header's text name renders when no logo image is supplied. The source's `title` names the email document; the visible opening headline comes from `hero.headline`.

For a small source with no external image dependency, use the [campaign starter](../templates/brain-dead-template/campaign-starter.md). The [single-column image example](../templates/brain-dead-template/examples/single-column-image-and-link.md) provides the complete image/link recipe in an editable source file.

## Choose a section

These are all eight section types in the current template. Use the spelling shown, including hyphens and underscores.

| Type | Appearance or purpose | Where content goes |
| --- | --- | --- |
| `single-column` | Full-width image above copy; items stack vertically. | `items[]`, with a required `title` on each item. |
| `dual-column` | Image on the left and copy on the right; stacks on phones. | The same item fields as `single-column`. |
| `ad-block` | Shared framed advertisement from the Editorial ad inventory. | Exactly one `items[].adId`. |
| `short-take` | Short Take card with image, headline, caption, and optional edge copy. | Exactly one `items[].shortTakeId`. |
| `ad-slot` | Hidden placement for a send-time advertisement. | No authored items needed. |
| `short-take-slot` | Hidden placement for a send-time Short Take. | No authored items needed. |
| `calendar_event` | Event card with date, time, calendar download, and optional event-page link. | Event fields directly on the section. |
| `inline_cta` | Bordered callout with statement and one or two actions. | CTA fields directly on the section. |

Changing a generic section from `dual-column` to `single-column` keeps the same item fields and changes its layout. Each item in a dual-column section is its own image/copy row; the type does not create a two-product grid.

## Single-column recipes

All examples in this section are **section fragments** for your existing `sections:` list. Omit optional fields you do not need.

### Image, copy, and button

Use the [opening recipe](#add-an-image-and-link-to-a-single-column-item). Supplying `link` automatically creates the button. Its default text is `View item` when `ctaText` is omitted.

### Image with no link or button

```yaml
- type: single-column
  label: In the studio
  items:
    - kicker: Photograph
      title: Pages from the new edition
      image: https://example.com/hosted/open-book.jpg
      imageAlt: An open book showing two complete pages
      body: <p>The revised exercise appears on the right-hand page.</p>
```

Omit `link` to keep the image and title unlinked and remove the button. Do not use `link: none`; that special value is supported only by `hero.imageLink`.

### Text and button without an image

```yaml
- type: single-column
  label: Reading
  items:
    - kicker: Essay
      title: Notes from the studio
      body: |
        <p>A short introduction to the week's essay.</p>
        <p>The essay includes photographs from the studio.</p>
      ctaText: Read the essay
      link:
        href: https://example.com/essays/studio-notes
        label: library-campaign | studio notes
        category: editorial
```

An absent image leaves no image row in `single-column`. Use this layout for text-only items; `dual-column` retains its left image cell even when an image is absent.

### Two items under one section heading

```yaml
- type: single-column
  label: New reading
  items:
    - kicker: Essay
      title: Studio notes
      image: https://example.com/hosted/studio.jpg
      imageAlt: A worktable covered with printed pages
      body: <p>An account of the latest studio work.</p>
      ctaText: Read studio notes
      link:
        href: https://example.com/essays/studio-notes
        label: library-campaign | studio notes
        category: editorial
    - kicker: Interview
      title: A conversation about printing
      image: https://example.com/hosted/printing.jpg
      imageAlt: Printed sheets resting beside a press
      body: <p>A conversation with the printer of the new edition.</p>
      ctaText: Read the interview
      link:
        href: https://example.com/interviews/printing
        label: library-campaign | printing interview
        category: editorial
```

The label appears once. Each item has a thin rule above it. Both items get their own full-width image, copy, and destination. Repeat the whole section instead if each item needs a different section label.

### Image and body with an inline text link, without a button

```yaml
- type: single-column
  items:
    - kicker: Photograph
      title: An open spread
      image: https://example.com/hosted/open-book.jpg
      imageAlt: An open book showing a photograph and an exercise
      body: |
        <p>See the <a href="https://example.com/books/manual"
        data-link-label="library-campaign | manual"
        data-link-category="books">book's full description</a>.</p>
```

There is no item-level `link`, so the image and title remain unlinked and no button appears. The authored HTML anchor supplies a separate text link. This is the available recipe when you want a link in the copy without the automatic item button.

## Every content-item field

This table applies to `single-column` and `dual-column`. These item objects reject undeclared fields. A field from another template does not become supported by adding it here.

| Item field | Required | Meaning and visible behavior |
| --- | --- | --- |
| `title` | Yes | Item heading. Becomes a link when `link` is supplied. Use plain text. |
| `kicker` | No | Small uppercase line before the title. Takes precedence over `format`. |
| `format` | No | Fallback for `kicker`. If neither exists, the renderer prints `Item`. |
| `subtitle` | No | Plain-text line below the title. |
| `body` | No | HTML copy below the subtitle. Use `<p>` for paragraphs. |
| `image` | No | Absolute hosted image URL string, not an object. |
| `imageAlt` | No | Accessibility text; falls back to `title`. No visible caption is created. |
| `price` | No | Display string, such as `"$35 plus shipping"`. Quote numeric-looking values. |
| `link` | No | URL string or tracked-link object. One destination for image, title, and button. |
| `ctaText` | No | Visible item button label; default `View item`. Has no visible effect without `link`. |
| `content` | No | Tracking identity object; see [Tracked links](#tracked-links-and-body-links). It is not item body copy. |

Section-level `label` supplies the section heading; `title` is its fallback when `label` is absent. Both are optional for generic sections. If both are supplied, only `label` is shown. A generic section's own `description` is not rendered; put copy in `items[].body`.

### HTML body copy

```yaml
- type: single-column
  items:
    - kicker: Notes
      title: Inside the edition
      body: |
        <p>The edition includes <strong>new exercises</strong> and
        <em>annotated examples</em>.</p>
        <ul>
          <li>Photographs from the studio</li>
          <li>A short printing checklist</li>
          <li>Notes on workshop materials</li>
        </ul>
        <p>Each exercise has a materials list.</p>
```

`body: |` preserves the line breaks in your YAML value. The HTML defines paragraphs and lists in the email. Markdown syntax such as `**bold**` or `[Read more](...)` inside `body` is not a substitute for HTML in this renderer. Plain text works for a single paragraph, but blank lines alone do not produce HTML paragraphs in generic item bodies.

## Dual-column items

Use this when you want an image on the left with the heading and description on the right. This is a **section fragment**.

```yaml
- type: dual-column
  label: In the collection
  items:
    - kicker: Paperback
      title: The Manual of Design Fiction
      subtitle: A guide for the studio.
      image: https://example.com/hosted/manual-cover.jpg
      imageAlt: Complete front cover of The Manual of Design Fiction
      body: |
        <p>Examples and exercises for creating things from possible futures.</p>
      price: "$35"
      ctaText: View the edition
      link:
        href: https://example.com/books/manual
        label: library-campaign | manual
        category: books
```

On desktop, the image is 188px wide with copy alongside it. At viewport widths up to 620px, the image and copy stack; the image can grow to 320px wide while retaining its complete aspect ratio. Item buttons become block-width buttons on mobile. All fields and link behavior match `single-column`.

## Images and image limits

| Location | Source field | Alt-text field | Destination | Desktop sizing |
| --- | --- | --- | --- | --- |
| Header logo | `brand.logoUrl` | `brand.logoAlt` | `brand.logoLink` | Default 96px; maximum 180px. |
| Hero | `hero.image` | `hero.imageAlt` | `hero.imageLink`, then `hero.ctaLink`, then legacy `shopLink`. | Up to 576px wide. |
| Single-column item | `items[].image` | `items[].imageAlt` | `items[].link` | Up to 576px wide. |
| Dual-column item | `items[].image` | `items[].imageAlt` | `items[].link` | 188px wide. |
| Advertisement | Hydrated from `adId` | Hydrated from the ad inventory | Hydrated from the ad inventory | Shared ad card within the content column. |
| Short Take | Hydrated from `shortTakeId` | Hydrated from the Short Take inventory | Optional inventory destination | Full available card width. |

The renderer uses natural image height. It preserves edges, whitespace, embedded text, and the complete composition. Use a hosted image variant that also preserves the whole image. A crop already applied by an image delivery URL cannot be restored by the email template.

An image URL must return the actual image, rather than a gallery page, viewer page, local path, or HTML document. Use an approved Photarium delivery URL when available. The canonical build checks image URLs and fails on invalid images.

There is one dedicated image per generic item. For multiple photographs with their own descriptions, add multiple items or sections. Generic items do not support `images`, `caption`, `imageWidth`, `imageHeight`, `imagePosition`, or separate image and button destinations. `hero.imageLink` is a hero-only control. Alt text provides accessibility text; use `body` for visible image notes.

## Tracked links and body links

Use an explicit tracked-link object for important destinations. The source carries the URL and metadata; the builder normalizes it to an HTML anchor and writes a tracking manifest.

```yaml
link:
  href: https://example.com/books/manual
  label: library-campaign | manual
  category: books
  interest: books
  intent: purchase
```

This is an **item-field fragment**, placed under an item. The same tracked-link shape works at `brand.logoLink`, `hero.ctaLink`, `hero.imageLink`, `offer.ctaLink`, `brand.navLinks[].url`, `footer.socialLinks[].url`, and `inline_cta.primaryAction.url` / `secondaryAction.url`.

| Link field | Required | Meaning |
| --- | --- | --- |
| `href` | Yes for an object | Absolute destination URL. An object containing only `url` does not satisfy this template's tracked-link schema. |
| `label` | No, recommended | Tracking label. Use a stable, descriptive label for this destination and click intent. |
| `category` | No, recommended | Semantic category such as `books`, `editorial`, `events`, or `site-nav`. |
| `role` | No | Link role metadata. Registry ads receive their advertisement role during hydration. |
| `interest` | No | Interest string or array of strings. |
| `interests` | No | Accepted plural form, also a string or array of strings. Prefer one spelling in a source. |
| `intent` | No | Intent string such as `purchase` or `attend-event`. |

A plain URL string is accepted too: `link: https://example.com/books/manual`. It does not supply explicit tracking metadata. For URLs repeated with the same purpose, keep their labels and categories consistent. Differing metadata on one repeated URL can produce conflicts; inspect the manifest after building.

### Visible labels versus tracking labels

| Location | Visible words | Tracking label |
| --- | --- | --- |
| Generic item button | `ctaText` | `link.label` |
| Hero button | `hero.ctaText` | `hero.ctaLink.label` |
| Closing offer button | `offer.ctaText` | `offer.ctaLink.label` |
| Header navigation | `brand.navLinks[].label` | `brand.navLinks[].url.label` |
| Social link | `footer.socialLinks[].label` | `footer.socialLinks[].url.label` |
| Inline CTA action | `primaryAction.label` | `primaryAction.url.label` |

### A separate link inside the body

This **section fragment** uses one destination for the image/title/button and a different destination in the paragraph.

```yaml
- type: single-column
  items:
    - kicker: Book
      title: The Manual of Design Fiction
      image: https://example.com/hosted/manual-cover.jpg
      imageAlt: Front cover of The Manual of Design Fiction
      body: |
        <p>Read the <a href="https://example.com/essays/making-the-manual"
        data-link-label="library-campaign | making the manual"
        data-link-category="editorial">editor's production notes</a>.</p>
      ctaText: View the book
      link:
        href: https://example.com/books/manual
        label: library-campaign | manual
        category: books
```

HTML body links use ordinary `<a>` elements. Include explicit tracking attributes on them when needed. Do not put YAML tracked-link objects inside HTML strings.

### Optional content identity

`items[].content` supplies tracking identity, not visible copy. Its supported keys are `id`, `label`, `category`, and `tags`.

```yaml
- type: single-column
  items:
    - title: Studio notes
      content:
        id: studio-notes-october
        label: Studio notes
        category: editorial
        tags: [studio, printing]
      body: <p>Photographs and notes from the October print run.</p>
      link:
        href: https://example.com/essays/studio-notes
        label: library-campaign | studio notes
        category: editorial
```

The final HTML may contain `data-content-*`, `data-link-role`, `data-section-label`, and compatibility `data-link-label` / `data-link-category` attributes. Keep generated tracking structures out of the source.

## Email metadata and publication mode

| Top-level field | Use |
| --- | --- |
| `template` | Required. Exactly `brain-dead-template`. |
| `title` | Required. Email document title; the delivery platform controls the sent subject. |
| `preheader` | Inbox preview text. Required by the campaign build workflow. |
| `publicationMode` | `campaign` or `public-issue`; defaults to `public-issue` when omitted. Set it explicitly in new campaign sources. |
| `issueId` | Optional issue identifier for issue-oriented processing and generated labels. |
| `sections` | Use this ordered list for new content. Include at least one section. |
| `brand`, `hero`, `offer`, `footer` | Layout objects described below. |

The schema also accepts legacy `books` or `productImages` at the root instead of `sections`. New sources should use `sections` because those legacy inputs do not offer the same authoring behavior; see [Legacy fields](#legacy-fields-and-unsupported-features).

### Campaign mode

Use `publicationMode: campaign` for a source-only campaign. It requires explicit template, title, preheader, and `footer.unsubscribeLink: "[unsubscribe]"`. Keep public issue navigation out of campaign source. Building prepares HTML and manifests; it does not send or schedule the campaign.

### Public-issue mode

Use `publicationMode: public-issue` for an issue in the ordinary newsletter workflow. Brain Dead does not automatically render a View Online link. If you author a public issue link in body copy or navigation, obtain its exact active URL from the publication registry and verify it live. Never derive a publication URL from a filename, slug, or issue ID. Missing/inactive publication entries, HTTP 404/410, and network failures block a public email build. Explicit local-preview URLs must not be sent.

This template has no dedicated `intro`, `header`, or `socialCard` rendering contract. Use `hero.body` for opening copy and `brand` for header fields. Adding `ogImage` does not place an image in the email body; use `hero.image` or an item's `image`.

## Header and navigation

This is a **top-level object fragment**, beside `hero` and `sections`.

```yaml
brand:
  name: Near Future Laboratory
  logoUrl: https://example.com/hosted/nfl-logo.png
  logoAlt: Near Future Laboratory
  logoWidth: 96
  logoLink:
    href: https://nearfuturelaboratory.com
    label: library-campaign | home
    category: site-nav
  navLinks:
    - label: Shop
      url:
        href: https://shop.nearfuturelaboratory.com
        label: library-campaign | shop navigation
        category: site-nav
    - label: Journal
      url:
        href: https://example.com/journal
        label: library-campaign | journal navigation
        category: site-nav
```

| Field | Behavior |
| --- | --- |
| `brand.name` | Text brand name when a logo image is absent; default `Near Future Laboratory`. |
| `brand.logoUrl` | Hosted logo image URL. Omit for the text brand name. |
| `brand.logoAlt` | Logo accessibility text; renderer fallback is `Near Future Laboratory`. |
| `brand.logoWidth` | Number or string; default 96. The logo has a 180px maximum. |
| `brand.logoLink` | Logo/text-brand destination. Without one, legacy `logoLink` and then the template's home destination are fallbacks. |
| `brand.navLinks` | Array of visible header links. Each entry needs `label`; supply `url` as a tracked link. |

Navigation entries also accept `href` instead of `url`, but use one destination field per entry. The header renders `brand.navLinks` right-aligned with slash separators.

## Hero

The hero renders above all body sections. Its order is eyebrow, headline, subhead, image, body, and button. This is a **top-level object fragment**.

```yaml
hero:
  eyebrow: From the library
  headline: A guide for your next project.
  subhead: Printed references from Near Future Laboratory.
  image: https://example.com/hosted/library.jpg
  imageAlt: Four complete book covers arranged on a white table
  body: |
    <p>Read examples from the studio and try the included exercises.</p>
    <p>Each book approaches the work through a different set of materials.</p>
  ctaText: Browse the books
  ctaLink:
    href: https://example.com/books
    label: library-campaign | books
    category: books
```

| Hero field | Behavior |
| --- | --- |
| `headline` | Required when a `hero` object is present. Main heading. |
| `eyebrow` | Small uppercase line above it; renderer fallback `Books from the Lab`. Author it for other subjects. |
| `subhead` | Plain-text opening description. |
| `body` | HTML opening copy. Use `<p>` for paragraphs. |
| `image` | Hosted image URL string; complete image at up to 576px width. |
| `imageAlt` | Accessibility text; falls back to legacy `collectionTitle` or the email `title`. |
| `ctaText` | Visible hero button words; fallback `Shop the set` when no legacy label is supplied. |
| `ctaLink` | Hero button destination; default image destination too. |
| `imageLink` | Optional separate tracked image destination, or the string `none`. |
| `headlineSize` | Deprecated `default` / `compact`; both now use the same 32px desktop and 22px mobile scale. |

The hero component remains in the layout even if the `hero` object is omitted. It then uses legacy collection fields or the email title and a default eyebrow. Supply a deliberate eyebrow and headline for a new email.

### Separate hero image destination

```yaml
hero:
  eyebrow: From the library
  headline: Explore the new edition.
  image: https://example.com/hosted/library.jpg
  imageAlt: Four complete book covers on a white table
  imageLink:
    href: https://example.com/books/photographs
    label: library-campaign | book photographs
    category: editorial
  ctaText: Shop the books
  ctaLink:
    href: https://example.com/books
    label: library-campaign | books
    category: books
```

Here the image opens the photographs page, and the button opens the books page. Generic content items do not have this separate-destination control.

### Unlinked hero image with a linked button

```yaml
hero:
  eyebrow: From the library
  headline: Explore the new edition.
  image: https://example.com/hosted/library.jpg
  imageAlt: Four complete book covers on a white table
  imageLink: none
  ctaText: Shop the books
  ctaLink:
    href: https://example.com/books
    label: library-campaign | books
    category: books
```

If `imageLink` is omitted, the image follows `ctaLink`, then legacy `shopLink`. If all destinations are absent, the canonical build renders an unlinked hero image. Omit `ctaLink` and legacy `shopLink` to omit the hero button.

## Closing offer

The optional closing offer appears after all sections and before the footer, inside a black panel with white heading/copy and a light button. This is a **top-level object fragment**.

```yaml
offer:
  eyebrow: Library offer
  headline: Browse the complete collection.
  body: |
    <p>Books, printed guides, and studio materials from Near Future Laboratory.</p>
  ctaText: Visit the shop
  ctaLink:
    href: https://shop.nearfuturelaboratory.com
    label: library-campaign | shop navigation
    category: site-nav
```

Supported fields are `eyebrow`, `headline`, HTML `body`, `ctaText`, and tracked `ctaLink`. The fallback strings are `Bundle offer`, `Get the set`, and `View offer`. Author these fields when your subject is something else.

Omit `offer`, legacy `bottomCta`, and legacy `shopLink` to remove the panel. An empty `offer: {}` still triggers the panel and its fallback copy. It has no image field and no per-source color controls. Use an item section for a closing image or an `inline_cta` for a configurable callout.

## Footer

This is a **top-level object fragment**. Keep the campaign's approved mailing address and delivery footer copy.

```yaml
footer:
  footerCta:
    enabled: false
  paragraphs:
    - You are receiving this because you subscribed to Near Future Laboratory updates.
    - 'Questions? <a href="https://example.com/contact">Contact the studio</a>.'
  address: 'Near Future Laboratory<br>Replace with the campaign mailing address.'
  socialLinks:
    - label: Website
      url:
        href: https://nearfuturelaboratory.com
        label: library-campaign | home
        category: site-nav
  unsubscribeLabel: Unsubscribe
  unsubscribeLink: "[unsubscribe]"
```

| Footer field | Behavior |
| --- | --- |
| `paragraphs` | Array of strings; each gets its own paragraph wrapper. Inline HTML is accepted. |
| `address` | Address string; `<br>` can separate lines. |
| `socialLinks` | Array; each entry requires a visible `label` and `url` destination. |
| `unsubscribeLabel` | Visible unsubscribe link text; default `Unsubscribe`. |
| `unsubscribeLink` | Keep the literal `"[unsubscribe]"` placeholder for campaign delivery. |
| `footerCta.enabled` | Keep `false` to disable the shared reminder injection for this template. The closing offer is authored separately. |

With no paragraphs, the renderer supplies its standard subscription sentence. An empty paragraph array also triggers that fallback. Footer copy is deliberately small; put editorial paragraphs in `hero.body` or an item. This template does not render a dedicated archive/View Online block.

## Ads

Use an inventory ID for an advertisement. This is a **section fragment**.

```yaml
- type: ad-block
  title: From the shop
  description: <p>A selection from Near Future Laboratory.</p>
  items:
    - adId: four-design-fiction-interstitial-01
```

Choose an existing ID from `nfl-editorial/src/content/ads.json`. The ID above is an example selection; confirm it exists in the current inventory before building. The builder loads the ad's image, accessibility text, title, description, sponsor, and destinations from that inventory.

An ad section takes exactly one source item, containing only `adId`. For two ads, add two `ad-block` sections. The Brain Dead source schema rejects item-level overrides such as `image`, `link`, or `body` alongside `adId`. Update the inventory through its authoring workflow if the ad itself needs changes.

The template uses the shared Dense Discovery ad card: 0.5px gray border, 12px inner padding, subtle shadow, and a monospaced label. Ads that are already composed snapshots keep their own framing. `title` and `description` above are the surrounding section copy. The template does not read `show_top_rule` or `show_bottom_rule` to add its own outer divider, even though those controls appear in shared authoring metadata.

## Short Takes

Use a Short Take inventory ID. This is a **section fragment**.

```yaml
- type: short-take
  items:
    - shortTakeId: foucault-called-it
```

Choose a current ID from `nfl-editorial/src/content/shortTakes.json`. The builder hydrates the image, alt text, headline, caption, optional destination, and optional edge copy. The Short Take's registry settings control its brand rail. The email preserves the whole image at its natural height.

Each section contains exactly one `shortTakeId` item. Add more sections for more cards. Source items accept only `shortTakeId`; do not override `image`, `headline`, `caption`, or `link` in the email source. The Brain Dead Short Take renderer does not print section-level `title` or `description`; the visible copy comes from the inventory.

Short Take inventory lookup uses `NFL_EDITORIAL_SHORT_TAKES_PATH`, then `NFL_EDITORIAL_ROOT`, then the sibling repository fallback. Put any required environment configuration in the approved `.env` or deployment configuration rather than inline on a command. Unknown IDs or invalid inventory fields must be corrected before the build can complete.

## Send-time slots

These **section fragments** reserve placements for the newsletter delivery workflow:

```yaml
- type: ad-slot
- type: short-take-slot
```

They render hidden placement tables, so an ordinary browser preview has no visible ad or Short Take there. They do not provide a visible empty box. Use `ad-block` or `short-take` with an inventory ID when the content must appear in the built HTML.

| Source section | Content slot | Text marker |
| --- | --- | --- |
| `ad-slot` | `ad-slot` | `[[content-slot:ad-slot]]` |
| `ad-block` | `ad-slot` | `[[content-slot:ad-slot]]` |
| `short-take-slot` | `short-take` | `[[content-slot:short-take]]` |
| `short-take` | `short-take` | `[[content-slot:short-take]]` |

The build emits a content-slot manifest for the downstream Soup-to-Nuts import. A slot alone does not select content or authorize a send. See [Campaign emails](CAMPAIGN-EMAILS.md) for the delivery workflow.

## Calendar events

Calendar fields live **directly on the section**, with no `items` wrapper. This example uses an explicit date, offset, and display timezone.

```yaml
- type: calendar_event
  id: library-conversation-october-2026
  eyebrow: Live conversation
  title: Inside the new edition
  subtitle: A conversation about printing and workshop exercises
  startsAt: "2026-10-29T10:00:00-07:00"
  durationMinutes: 60
  timezone: America/Los_Angeles
  location: Online
  description: A conversation about the book's photographs and exercises.
  calendarLabel: Add to calendar
  eventLabel: Event details
  url:
    href: https://example.com/events/library-conversation
    label: library-campaign | library conversation
    category: events
    intent: attend-event
  containerStyles:
    backgroundColor: '#ffffff'
    textColor: '#000000'
    borderColor: '#000000'
    borderWidth: 2px
    buttonBackgroundColor: '#000000'
    buttonTextColor: '#ffffff'
```

| Event field | Required | Meaning |
| --- | --- | --- |
| `title` | Yes | Event heading. |
| `startsAt` | Yes | Parseable timestamp. Quote an ISO timestamp with explicit UTC offset. |
| `id` | No, recommended | Stable event identifier, normalized into the calendar filename. |
| `eyebrow` | No | Small label; fallback `Calendar Event`. |
| `subtitle` | No | Line below the heading; included in calendar event summary. |
| `endsAt` | No | Explicit end timestamp, taking precedence over duration. |
| `durationMinutes` | No | Duration when `endsAt` is absent; default 60 minutes. |
| `timezone` | No, recommended | IANA timezone for displayed time and weekday, such as `America/Los_Angeles`. |
| `location` | No | Display location and calendar location. |
| `description` | No | Event description; HTML is stripped during calendar preparation. Use plain text. |
| `url` | No | Tracked event-page or registration destination. |
| `calendarLabel` | No | Calendar button words; default `Add to calendar`. |
| `eventLabel` | No | Secondary event-page link words; default `Event page`. |
| `displayDate`, `displayTime`, `displayWeekday` | No | Optional display overrides. They do not change calendar timestamps. |

The builder generates an `.ics` file and injects the calendar destination and display labels. For a local output directory, the calendar file lives under `calendar/<year>/<event-id>.ics` beside the output package. The calendar directory year follows the issue identifier or build year, so inspect the emitted path instead of deriving it from the event date. The generated file must be deployed to the location its link uses before a send; a local build alone does not publish it.

The current automatic `displayDate` uses the UTC calendar date, while display time and weekday use `timezone`. Near midnight, verify that the printed date matches the event's intended local date; supply `displayDate` if necessary. Check the `.ics` start and end separately.

### Calendar styling controls

Calendar styling uses camelCase fields inside `containerStyles`; inline CTA colors use the snake_case fields documented in the next section.

| Controls | Meaning |
| --- | --- |
| `backgroundColor` | Card surface; use white or another approved color. |
| `textColor`, `headingColor`, `eyebrowColor` | Main copy, heading, and eyebrow colors. |
| `dateColor`, `timeColor`, `locationColor` | Date, time, and location colors. |
| `borderColor`, `borderWidth` | Outer border. Width is a CSS string such as `2px`. |
| `dividerColor`, `dividerWidth` | Rule beneath the card header. |
| `headerPadding`, `bodyPadding` | CSS padding strings for the two card areas. |
| `buttonBackgroundColor`, `buttonTextColor`, `buttonBorderColor` | Calendar button colors. |
| `buttonBorderWidth`, `buttonPadding` | Calendar button border and padding strings. |
| `secondaryLinkColor` | Event-page link color. |

The calendar renderer reads `contentStyles.color` as a color fallback and hardcodes the card's principal fonts and sizes.

## Inline CTAs

An `inline_cta` appears in the authored `sections` order. It supports a statement and primary action, with an optional secondary action. This is a **section fragment**.

```yaml
- type: inline_cta
  eyebrow: Library updates
  statement: |
    Receive new essays and notes from the studio.

    Each edition includes photographs and links to the latest work.
  font_family: mono
  background: '#000000'
  text_color: '#ffffff'
  eyebrow_color: '#f2ff3d'
  border_color: '#000000'
  border_width: 2
  border_radius: 12
  space_top: 18
  space_bottom: 18
  button_background: '#f2ff3d'
  button_text_color: '#000000'
  button_border_color: '#000000'
  button_border_width: 2
  primaryAction:
    label: Subscribe
    url:
      href: https://example.com/subscribe
      label: library-campaign | subscribe
      category: newsletter
      intent: subscribe
  secondaryAction:
    label: Read an edition
    url:
      href: https://example.com/published-edition
      label: library-campaign | published edition
      category: editorial
```

Use a verified registry URL for an actual published edition; the URL above is illustrative.

| CTA field | Required | Meaning or default |
| --- | --- | --- |
| `statement` | Yes | Main statement. Blank lines in plain text become paragraph breaks; authored block HTML is preserved. |
| `primaryAction` | Yes | Object with visible `label` and tracked/string `url`. |
| `secondaryAction` | No | A second action with the same shape. |
| `eyebrow` | No | Small heading; default `Editorial Note`. |
| `renderFor` | No | Edition visibility; see below. |
| `font_family` | No | `mono` (default), `sans`, or a CSS font-family stack. |
| `background` | No | Panel background; default black. |
| `text_color` | No | Main copy color; default white. |
| `eyebrow_color` | No | Eyebrow color; default acid yellow `#f2ff3d`. |
| `border_color`, `border_width` | No | Full panel border; default black, 2px. |
| `border_radius` | No | Panel corner radius; default 0. |
| `space_top`, `space_bottom` | No | Outer vertical spacing; default 18px each. |
| `button_background`, `button_text_color`, `button_border_color` | No | Primary action colors. Defaults: acid yellow, black, and the button background color. |
| `button_border_width` | No | Primary button border width; default 2px. |
| `secondary_button_background`, `secondary_button_text_color`, `secondary_button_border_color` | No | Secondary action colors; default white, black, white. |
| `secondary_button_border_width` | No | Secondary button border width; default 2px. |

Spacing, radii, and border widths accept nonnegative pixel numbers or pixel strings, including `0`, `7.5`, and `"13.25px"`. Percentages, `em`, and negative lengths are not supported by the presentation helper. Quote hex colors so YAML does not treat `#` as the start of a comment.

An inline CTA has no image field. Use a generic content section before or after it for an image. Its default statement and button settings are independent of the closing `offer` panel.

## Edition visibility

`renderFor` is an optional section-level field. It is used by the edition-aware preparation workflow.

| Value | Intended edition |
| --- | --- |
| Omitted or `both` | Both editions. |
| `public` | Public preview edition only. |
| `preview` | Alias for public preview only. |
| `full` | Full edition only. |

```yaml
- type: inline_cta
  renderFor: public
  eyebrow: Public preview
  statement: Subscribe to receive the complete edition.
  primaryAction:
    label: Subscribe
    url:
      href: https://example.com/subscribe
      label: library-campaign | subscribe
      category: newsletter
```

This setting is not an instruction to publish or send. The Brain Dead component itself does not filter sections by edition; the caller must prepare the correct edition first. For a standalone campaign that has no edition split, omit `renderFor`. Verify both rendered editions when using the public/full workflow.

## Typography and styling

The layout is a white, 640px-wide email with black rules, monospaced copy, and acid-yellow item buttons. Desktop side gutters are 32px; at widths up to 620px they become 18px. Full-width images fit the available content column.

| Element | Desktop | Mobile, up to 620px |
| --- | --- | --- |
| Hero headline | 32px / 36px line height | 22px / 26px |
| Item, event, Short Take, and offer headings | 22px / 26px | 22px / 26px |
| Single-column item body | 15px / 22px | 17px / 24px |
| Dual-column item body | 14px / 21px | 17px / 24px |
| Hero subhead | 18px / 25px | 17px / 24px |

These are the component/layout defaults. The canonical mobile hardening and typography lock verification are part of production builds. Existing mobile typography approvals live in `config/mobile-typography-locks.jsonl`; changes require an explicit approval and a new appended entry. Do not edit old entries.

### Which style controls actually work

| Area | Supported author controls |
| --- | --- |
| Generic item sections | Choose `single-column` or `dual-column`. No supported per-item heading-size, image-width, color, crop, or hide-button controls. |
| Hero | Content/image/link controls above. `headlineSize` is a compatibility field with no scale difference. |
| Calendar | Specific `containerStyles` controls in the calendar table above. |
| Inline CTA | Explicit snake_case font, color, border, and spacing controls above. |
| Offer/header/footer | Authored content and links; their principal styling lives in components. |

The shared preprocessing system adds section style objects, and `section-styles.json` contains template metadata. Many Brain Dead components still use literal inline styles. A schema-accepted style object does not guarantee that every component reads it. Use the documented controls for the chosen section; changing the whole visual system requires a template change and a representative build.

Keep backgrounds white, black, or another approved color. Do not use taupe, beige, greige, or muddy warm off-white surfaces. For calendar cards, explicitly set `containerStyles.backgroundColor: '#ffffff'` as shown above.

## Build and verify

Run commands from `/Users/julian/Code/nfl-maizzle-mail`. These commands build files; they do not send email or start a preview server.

### 1. Validate the source

The Maizzle MCP tools support:

- `get_template_authoring_guide` with `name: brain-dead-template` for the authoring entry point.
- `get_template_schema` with the same name for accepted fields.
- `validate_newsletter_markdown` with an explicit `content_md_path` before building.
- `build_campaign_email` for an explicit campaign source, or `build_newsletter` for an ordinary issue.

Validation catches YAML/schema problems. It does not establish that a hosted image is reachable or that the output looks right. The canonical build performs the additional checks and produces final HTML.

### 2. Build the single-column image example

```sh
node scripts/build-newsletter.mjs \
  templates/brain-dead-template/examples/single-column-image-and-link.md \
  brain-dead-single-column-image-and-link \
  --publication-mode=campaign \
  --no-open
```

The example is an internal template demonstration using hosted placeholder art. Replace its image and destination before adapting it for real content. Its YAML frontmatter shows the exact hierarchy for the item image and link.

For a source-only campaign without images:

```sh
node scripts/build-newsletter.mjs \
  templates/brain-dead-template/campaign-starter.md \
  brain-dead-campaign-example \
  --publication-mode=campaign \
  --no-open
```

For an existing ordinary issue:

```sh
node scripts/build-newsletter.mjs \
  /absolute/path/to/existing-issue.md \
  explicit-output-name \
  --template=brain-dead-template \
  --no-open
```

Use the actual source path and template/publication-mode assertions that match its frontmatter; a conflicting assertion stops the build.

`--no-open` prevents automatic browser opening. Use the canonical builder for production verification with image/link validation enabled; a raw `maizzle build` skips source preparation, tracking, and other checks.

### 3. Find the outputs

By default, the example's outputs are in `/Users/julian/Code/nfl-maizzle-mail/build_production/`:

| Output | Purpose |
| --- | --- |
| `brain-dead-single-column-image-and-link.html` | Rendered email to inspect and import into the delivery workflow. |
| `brain-dead-single-column-image-and-link.link-tracking-manifest.json` | Destinations, tracking metadata, defaults, and conflicts. |
| `brain-dead-single-column-image-and-link.content-slots.json` | Send-time placement information; may contain no slots for a generic item example. |
| `brain-dead-single-column-image-and-link.mobile-typography-verification.json` | Typography verification when the template has an active mobile lock. |
| `calendar/.../*.ics` | Calendar files when the source contains calendar events. |

To place a campaign build beside another established output package, append `--output-dir=/absolute/path/to/the/output-folder`. The source `.md` remains the editable master. HTML and manifests are generated outputs; rebuild them after source changes. `data/newsletter.json` is shared build input, not the campaign's authoritative source.

### 4. Check the result

For the image/link recipe, inspect these specific details:

1. The full image is present, including its edges and any embedded text.
2. The image is above the title, rather than in a left-hand column.
3. The image, title, and button open the intended item URL.
4. The visible button text matches `ctaText`.
5. Paragraphs, lists, and any separate body link render as authored.
6. At desktop and phone widths, the content fits and the image remains complete.
7. The link manifest has zero unexplained conflicts and understood defaults.
8. The footer keeps the unsubscribe placeholder for downstream substitution.

Use the Codex in-app browser for interactive inspection when available. Any development/preview server must first be found or registered through Server Control, then launched through its lifecycle controller. Do not launch an unmanaged `npm run dev`, shell background server, or ad hoc HTTP listener. A schema check or successful build does not verify email-client rendering; use the delivery platform's normal email preview/test workflow when preparing a send.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| My single-column image is missing. | Put `image` under the item, at the same indentation as `title`, not on the section. Use a direct image URL string. Inspect the build's exact field-path error. |
| I used `image.src` and `image.alt`. | Replace that object with `image: https://...` and sibling `imageAlt: ...`. That object shape belongs to other templates. |
| The image shows but does not open a page. | Add the item's `link`, with `href` inside the object. `image` only sets the source image. |
| I set `ctaLink` on the item and nothing works. | Generic items use `link`; `ctaLink` belongs to the hero or closing offer. An item `ctaLink` is undeclared and fails schema validation. |
| The button says `View item`. | Set item `ctaText`. `link.label` supplies tracking metadata. |
| I supplied `ctaText` but no button appears. | A generic item needs `link` to create the button. |
| I want an unlinked image but a linked item button. | Generic items share one link. Use a separate HTML body anchor without item `link`, or request a schema and renderer enhancement. The hero already supports `imageLink: none`. |
| I want the image and button to open different pages. | Generic items have one destination. The hero supports a separate `imageLink`; item sections currently do not. |
| A section heading disappears. | Generic sections use `label`, then `title`. Short Take sections do not print an outer title. |
| My description disappears. | For a generic item use `body`, not `description` or `content`. Generic section-level `description` is not shown. |
| Text below the last `---` disappears. | Put visible Brain Dead copy in `hero.body` or `sections[].items[].body`. The layout does not render `markdownContent`. |
| Markdown asterisks or link syntax appear literally. | Use HTML in `body`: `<strong>`, `<em>`, `<p>`, and `<a href="...">`. |
| I cannot remove the `Item` line. | Supply a meaningful `kicker` or `format`. There is currently no hide-kicker control; blank values trigger the fallback. |
| My image looks too narrow. | `dual-column` uses 188px desktop images. Switch to `single-column` for full-column images. |
| I see an empty left column. | A `dual-column` item without an image retains that cell. Use `single-column` for text-only content. |
| The build says a field is an additional property. | Compare the item's fields with the item table. Remove unsupported fields such as `caption`, `imageLink`, `description`, or `ctaLink`. |
| MCP lint warns that a section title is empty, but I used `label`. | Generic Brain Dead sections render `label` before the `title` fallback. This generic lint warning does not mean the label-only section fails schema validation. |
| A tracked-link object fails validation. | It needs `href`. Keep the visible CTA words in `ctaText` or the action's outer `label`. |
| An ad or Short Take is empty or fails hydration. | Check the current inventory ID and sibling Editorial access. Email source accepts ID-only items. |
| An empty slot is invisible. | `ad-slot` and `short-take-slot` are deliberately hidden. Select inventory content for a visible card. |
| A calendar download fails after a build. | Check the generated `.ics` path and publish that file at its link destination. A successful local build does not deploy it. |
| Calendar date and weekday disagree. | The default date is UTC; time/weekday use `timezone`. Inspect the timestamp and set a display override if needed. |
| An unexpected black offer panel appears. | Remove unused `offer`, `bottomCta`, and `shopLink`. Even an empty offer object triggers the panel. |
| A color or size override has no effect. | The component may use literal inline styles. Use the specific controls documented for that section; inspect the rendered HTML. |
| A color value vanishes in YAML. | Quote hex colors: `background: '#000000'`. An unquoted `#` starts a YAML comment. |
| An issue-publication link fails validation. | Resolve the exact active URL from the publication registry and verify it live. Do not substitute a guessed route. |

## Legacy fields and unsupported features

Existing sources can contain older top-level fields. Prefer the current fields for new work.

| Legacy input | Current authoring choice or behavior |
| --- | --- |
| `books`, `booksLabel` | Use `sections` with `type: dual-column` and `label`. Legacy books render only when `sections` is absent/empty. |
| `collectionTitle` | Use `hero.headline`. |
| `collectionDescription` | Use `hero.subhead`. |
| `collectionDetails` | Use `hero.body`. |
| `mainImage` | Use `hero.image` and `hero.imageAlt`. |
| `shopLink` | Use explicit hero, item, and offer links. Legacy `shopLink` can affect both the hero and closing offer. |
| `bottomCta` | Use `offer`. Avoid mixing both because individual fields fall back independently. |
| Root `logoUrl`, `logoAlt`, `logoWidth`, `logoLink` | Use the corresponding `brand` fields. |
| Root `socialLinks` | Use `footer.socialLinks`. |
| `productImages` | Legacy image-only row, used only when both `sections` and `books` are absent/empty. Use generic items for images with authored alt text, copy, and links. |
| `markdownContent` | Accepted by the schema, but not inserted into the Brain Dead layout. |

Currently unsupported as dedicated source controls:

- Independent image/title/button destinations on a generic item.
- Hiding an item's automatic button while retaining its item-level `link`.
- A generic item's dedicated image caption, multiple-image array, crop, or width setting.
- Removing the generic kicker line entirely through a hide flag.
- A two-product grid, image-on-right switch, gallery, carousel, or background-image section type.
- A dedicated `intro` object, automatic View Online block, or template-specific social-card authoring surface.
- Arbitrary source-driven typography and color overrides on every component.

Use the documented body-link or multiple-item recipes where they fit. Additional behavior requires changes to the canonical schema and its renderer together, followed by focused validation and a representative build. Adding an undeclared field to a source does not implement the feature.

## Files and ownership

| File or folder | Responsibility |
| --- | --- |
| Your campaign or issue `.md` source | Editable content master. Keep it in the established authoring folder. |
| `docs/brain-dead-template-author-reference.md` | This operator guide and copyable recipes. |
| `templates/brain-dead-template/examples/single-column-image-and-link.md` | Complete editable demonstration of a linked single-column image. |
| `templates/brain-dead-template/newsletter.schema.json` | Canonical accepted-field contract. |
| `templates/brain-dead-template/schema.json` | Legacy schema filename; production validation uses `newsletter.schema.json`. |
| `templates/brain-dead-template/newsletter.html` | Component ordering for the email. |
| `templates/brain-dead-template/components/ContentSections.html` | Generic item and specialized section rendering. |
| `templates/brain-dead-template/components/Hero.html` | Opening block and hero image/link behavior. |
| `templates/brain-dead-template/components/InlineCta.html` | Inline CTA rendering. |
| `templates/brain-dead-template/layouts/main.html` | Email shell, CSS, and responsive rules. |
| `templates/brain-dead-template/section-styles.json` | Template section-style metadata/defaults; consult component usage before changing it. |
| `scripts/build-newsletter.mjs` | Canonical production build orchestration. |
| `build_production/` | Generated HTML and sidecars; rebuild after editing the source. |

Template files live only under `templates/brain-dead-template/`; do not create a `src/templates/` mirror. The build's injected style objects and tracking structures do not belong in authored frontmatter. For workflow maintenance, also read the [newsletter template operating process](newsletter-template-operating-process.md).
