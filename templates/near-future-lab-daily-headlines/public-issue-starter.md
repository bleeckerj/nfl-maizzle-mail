---
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
    logo_src: https://example.com/near-future-laboratory-logo.png
    logo_alt: Near Future Laboratory
    title_src: https://example.com/daily-headlines-title.png
    title_alt: Daily Headlines
    dateline: "June 6, 2026, 6:00 a.m. Pacific time"

  - type: intro_statement
    label: From the Editor
    statement: '<p>A short editorial statement before the headline groups.</p>'
    show_bottom_rule: true

  - type: section_article_group
    section_label: Top News
    articles:
      - link:
          href: https://nearfuturelaboratory.com
          label: Daily Headlines example story
          category: editorial
        headline: Example headline
        lede: One or two sentences summarizing the story.

  - type: share_this
    online_url: https://nearfuturelaboratory.com/newsletters/2026/example

  - type: email_footer
    paragraphs:
      - Boilerplate or legal paragraph.
    address: A Research Initiative by Near Future Laboratory. Venice Beach, CA.
    unsubscribe_label: Unsubscribe
---
