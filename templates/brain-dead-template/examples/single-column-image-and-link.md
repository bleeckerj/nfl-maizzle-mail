---
# Complete editable demonstration. Replace the hosted placeholder and destination
# before using this source for a real campaign. The image URL is reused from the
# template's existing four-book sample; no image file is stored in this repo.
publicationMode: campaign
template: brain-dead-template
title: Single-column image and link example
preheader: A complete example of one full-width item with a linked image.
brand:
  name: Near Future Laboratory
  logoLink:
    href: https://nearfuturelaboratory.com
    label: single-column-example | home
    category: site-nav
hero:
  eyebrow: Template example
  headline: A single-column image and link.
  body: |
    <p>The item below shows the complete image above its copy.
    Its image, title, and button share one destination.</p>
sections:
  - type: single-column
    label: Full-width item
    items:
      - kicker: Example book
        title: Book Four Title
        subtitle: Replace with the item's subtitle.
        image: https://dummyimage.com/1200x760/ffffff/000000.png&text=BOOK+04
        imageAlt: Black text reading BOOK 04 on a complete white rectangular image
        body: |
          <p>Replace this paragraph with the item description.</p>
          <p>Keep separate paragraphs inside their own HTML paragraph tags.</p>
        price: "$35 plus shipping"
        ctaText: View the book
        link:
          href: https://example.com/?book=four
          label: single-column-example | book four
          category: books
          intent: purchase
footer:
  footerCta:
    enabled: false
  paragraphs:
    - Internal template example. Replace this with the campaign's footer copy.
  address: Replace with the campaign's mailing address.
  unsubscribeLabel: Unsubscribe
  unsubscribeLink: "[unsubscribe]"
---
