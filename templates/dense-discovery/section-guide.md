---
template: dense-discovery
newsletterFormat: discovery
title: Dense Discovery Section Guide
preheader: FPO render guide for dense-discovery newsletter section types
sectionStylesFile: templates/dense-discovery/section-styles.json
colorTheme: winter
intro:
  title: Dense Discovery Section Guide
  content: <p>FPO source issue for rendering every dense-discovery section branch through the canonical Maizzle build.</p>
header:
  quote: FPO header quote for the dense-discovery section guide.
  author: Near Future Laboratory
  featuredArtist:
    name: FPO Featured Artist
    link: mailto:guide@example.com
  featuredImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23e6e8e5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3EFPO header image%3C/text%3E%3C/svg%3E"
  logoBottom: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='326' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23111111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='24' fill='%23ffffff'%3ENFL%3C/text%3E%3C/svg%3E"
  logoTop: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='326' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23111111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='24' fill='%23ffffff'%3ENFL%3C/text%3E%3C/svg%3E"
  logoLink: mailto:guide@example.com
sections:
- type: feature
  title: Feature Section Title
  featureLink: mailto:guide@example.com
  featureLabel: FEATURE LABEL
  contentStyles:
    subtitleColor: "#707070"
    subtitleFontSize: 16px
    subtitleLineHeight: 18px
    subtitleFontWeight: "400"
  items:
  - title: Feature item title
    link: mailto:guide@example.com
    subtitle: Feature item subtitle
    description: <p>Feature item description HTML.</p>
    images:
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23e6e8e5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Efeature image%3C/text%3E%3C/svg%3E"
      alt: Feature image alt text
      link: mailto:guide@example.com
      caption: Feature image caption
    readMoreText: Feature read more
    readMoreLink: mailto:guide@example.com
- type: sponsor
  title: Sponsor Section Title
  sponsorLink: mailto:guide@example.com
  sponsorLabel: SPONSOR LABEL
  items:
  - title: Sponsor item title
    link: mailto:guide@example.com
    subtitle: Sponsor item subtitle
    description: <p>Sponsor item description HTML.</p>
    images:
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f8eccf'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Esponsor image%3C/text%3E%3C/svg%3E"
      alt: Sponsor image alt text
    readMoreText: Sponsor read more
    readMoreLink: mailto:guide@example.com
- type: dispatch
  title: Dispatch Section Title
  dispatchLink: mailto:guide@example.com
  dispatchLabel: DISPATCH LABEL
  signalsLabel: SIGNALS LABEL
  items:
  - title: Dispatch item title
    signalsLabel: ITEM SIGNALS LABEL
    tags:
    - TAG ONE
    - TAG TWO
    link: mailto:guide@example.com
    subtitle: Dispatch item subtitle
    description: <p>Dispatch item description HTML.</p>
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f8eccf'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Edispatch image%3C/text%3E%3C/svg%3E"
      alt: Dispatch image alt text
      caption: Dispatch image caption
    readMoreText: Dispatch read more
    readMoreLink: mailto:guide@example.com
- type: signals-adjacent-now
  title: Signals From An Adjacent Now Title
  signalsLabel: SIGNALS LABEL
  description: <p>Signals section description HTML.</p>
  items:
  - title: Signal item title
    tags:
    - SIGNAL TAG
    - SECOND TAG
    link: mailto:guide@example.com
    subtitle: Signal item subtitle
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f8eccf'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Esignal image%3C/text%3E%3C/svg%3E"
      alt: Signal image alt text
      caption: Signal image caption
    description: <p>Signal item description HTML.</p>
    sourceDigestSummary: <p>Source digest summary HTML.</p>
    storySeeds:
    - Story seed element one
    - Story seed element two
    strategyQuestions:
    - Strategy question element one?
    - Strategy question element two?
    readMoreText: Signal read more
    readMoreLink: mailto:guide@example.com
- type: ad-block
  title: Ad Block Section Title
  show_bottom_rule: true
  description: <p>Ad block section description HTML.</p>
  items:
  - adId: fashion-8bit-pants-interstitial
    link:
      href: mailto:guide@example.com
      label: dense-discovery-section-guide | ad-block | primary
      category: ad-block
    readMoreLink:
      href: mailto:guide@example.com
      label: dense-discovery-section-guide | ad-block | cta
      category: ad-block
- type: calendar_event
  id: section-guide-calendar-event
  eyebrow: Calendar Eyebrow
  title: Calendar Event Section Title
  subtitle: Calendar event subtitle
  startsAt: "2026-07-15T17:00:00Z"
  durationMinutes: 60
  timezone: America/Los_Angeles
  location: Online
  description: <p>Calendar event description HTML.</p>
  calendarLabel: Add calendar FPO
  calendarLink:
    href: mailto:guide@example.com
    label: dense-discovery-section-guide | calendar | add
    category: events
  eventLink:
    href: mailto:guide@example.com
    label: dense-discovery-section-guide | calendar | event
    category: events
  eventLabel: Event page FPO
- type: adjacency-job-posting
  brandVariant: openai
  companyIcon:
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='112'%3E%3Crect width='100%25' height='100%25' fill='%23111111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='22' fill='%23ffffff'%3EJOB%3C/text%3E%3C/svg%3E"
    alt: Company icon alt text
  company: Company Name Element
  companyTagline: Company tagline element
  title: Job posting title element
  tags:
  - Tag element
  - Second tag element
  location: Location element
  team: Team element
  department: Department element
  employmentType: Employment type element
  posted: Posted date element
  roleNumber: Role number element
  weeklyHours: "40"
  applyUrl: mailto:guide@example.com
  applyLabel: Apply label element
  locationPickerUrl: mailto:guide@example.com
  locationPickerLabel: Location picker label element
  summaryHtml: <p>Summary HTML element.</p>
  descriptionHtml: <p>Description HTML element.</p>
  lists:
  - title: List title element
    itemsHtml:
    - List item HTML element with <a href="mailto:guide@example.com">inline link</a>.
  payRangeHtml: <p>Pay range HTML element.</p>
  bodyHtml: <p>Additional body HTML element.</p>
  originalSourceUrl: mailto:guide@example.com
  footerNotesHtml:
  - <p>Footer note HTML element.</p>
  footerCta:
    eyebrow: Footer CTA eyebrow element
    textHtml: <p>Footer CTA text HTML element.</p>
    primaryAction:
      url: mailto:guide@example.com
      label: Primary CTA label
    secondaryAction:
      url: mailto:guide@example.com
      label: Secondary CTA label
- type: microdrop-product-launch
  brand: Brand element
  title: Microdrop Product Launch Title
  canonicalUrl: mailto:guide@example.com
  theme:
    backgroundColor: "#fff8f5"
    surfaceColor: "#fffef8"
    textColor: "#351414"
    accentColor: "#fb436e"
  hero:
    headline: Hero headline element
    dek: Hero dek element
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23fb436e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%23fff8f5'%3Emicrodrop hero%3C/text%3E%3C/svg%3E"
      alt: Microdrop hero image alt text
  products:
  - badge: Product badge element
    catalog: Product catalog element
    name: Product name element
    price: Price element
    ritual: Product ritual element
    descriptionText: Product description text element
    color: "#fb436e"
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23fff8f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' fill='%23fb436e'%3Eproduct%3C/text%3E%3C/svg%3E"
      alt: Product image alt text
  protocol:
    eyebrow: Protocol eyebrow element
    heading: Protocol heading element
    body: Protocol body element
    items:
    - label: Protocol item label
      value: Protocol item value
      body: Protocol item body
  finalCta:
    eyebrow: Final CTA eyebrow element
    heading: Final CTA heading element
    body: Final CTA body element
    href: mailto:guide@example.com
    label: Final CTA label
  editorialNote:
    eyebrow: Editorial note eyebrow element
    heading: Editorial note heading element
    body:
    - Editorial note body paragraph element.
    notes:
    - label: Editorial note label
      body: Editorial note body element
- type: adjacency-feature
  rubric: Rubric element
  title: Adjacency Feature Title
  dek: Dek element for the adjacency feature.
  author: Author element
  dateLabel: Date label element
  tags:
  - Feature tag
  - Second tag
  explainerHtml: <p>Explainer HTML element.</p>
  heroImage:
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f5f4f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%23374151'%3Efeature hero%3C/text%3E%3C/svg%3E"
    alt: Feature hero image alt text
    caption: Feature hero caption element
    credit: Feature hero credit element
  bodyHtml: <p>Body HTML element for an adjacency feature.</p>
  footerCta:
    eyebrow: Footer CTA eyebrow element
    textHtml: <p>Footer CTA text HTML element.</p>
    primaryAction:
      url: mailto:guide@example.com
      label: Primary CTA label
    secondaryAction:
      url: mailto:guide@example.com
      label: Secondary CTA label
  ctaText: CTA text element
  ctaLink: mailto:guide@example.com
- type: apps-sites
  title: Apps Sites Section Title
  items:
  - title: Apps Sites item title
    link: mailto:guide@example.com
    subtitle: Apps Sites item subtitle
    description: <p>Apps Sites item description HTML.</p>
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23ffffff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eapps image%3C/text%3E%3C/svg%3E"
      alt: Apps Sites image alt text
      caption: Apps Sites image caption
    readMoreText: Apps Sites read more
    readMoreLink: mailto:guide@example.com
    paywall: true
- type: apps-sites-single-column
  title: Apps Sites Single Column Section Title
  description: <p>Apps Sites Single Column section description HTML.</p>
  items:
  - title: Apps Sites Single Column item title
    link: mailto:guide@example.com
    subtitle: Apps Sites Single Column item subtitle
    description: <p>Apps Sites Single Column item description HTML.</p>
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23ffffff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Esingle column image%3C/text%3E%3C/svg%3E"
      alt: Apps Sites Single Column image alt text
      caption: Apps Sites Single Column image caption
    readMoreText: Single Column read more
    readMoreLink: mailto:guide@example.com
- type: callout
  title: Callout Section Title
  items:
  - calloutText: Callout text element.
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23d1eaf4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Ecallout image%3C/text%3E%3C/svg%3E"
      alt: Callout image alt text
      link: mailto:guide@example.com
      caption: Callout image caption
    readMoreText: Callout read more
    readMoreLink: mailto:guide@example.com
    author: Author element
- type: quote
  title: Quote Section Title
  items:
  - quote: Quote text element.
    author: Quote author element
    authorLink: mailto:guide@example.com
- type: indie-mag
  title: Indie Mag Section Title
  items:
  - title: Indie Mag item title
    link: mailto:guide@example.com
    description: <p>Indie Mag item description HTML.</p>
    details: <p>Details HTML element.</p>
    note: <p>Note HTML element.</p>
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'%3E%3Crect width='100%25' height='100%25' fill='%23efe2f3'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eindie cover%3C/text%3E%3C/svg%3E"
      alt: Indie Mag image alt text
      caption: Indie Mag image caption
- type: indie-mag-single-column
  title: Indie Mag Single Column Section Title
  items:
  - title: Indie Mag Single Column item title
    link: mailto:guide@example.com
    subtitle: Indie Mag Single Column subtitle
    description: <p>Indie Mag Single Column description HTML.</p>
    details: <p>Details HTML element.</p>
    note: <p>Note HTML element.</p>
    images:
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23efe2f3'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eimage one%3C/text%3E%3C/svg%3E"
      alt: Indie Mag Single Column image one alt text
      link: mailto:guide@example.com
      caption: Image one caption
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eimage two%3C/text%3E%3C/svg%3E"
      alt: Indie Mag Single Column image two alt text
    readMoreText: Indie Mag Single Column read more
    readMoreLink: mailto:guide@example.com
    paywall: true
- type: books-accessories
  title: Books Accessories Section Title
  byline: Byline element
  bylineLink: mailto:guide@example.com
  authorLabel: Author label element
  items:
  - title: Books Accessories item title
    link: mailto:guide@example.com
    subtitle: Books Accessories subtitle
    description: <p>Books Accessories description HTML.</p>
    images:
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23ffffff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Ebook image%3C/text%3E%3C/svg%3E"
      alt: Books Accessories image alt text
      link: mailto:guide@example.com
      caption: Books Accessories image caption
    authorName: Author name element
    authorLabel: Author
    authorLink: mailto:guide@example.com
    isbn: 978-1-23456-789-7
    linkText: Link text element
- type: food-for-thought
  title: Food For Thought Section Title
  items:
  - title: Food For Thought item title
    link: mailto:guide@example.com
    description: <p>Food For Thought description HTML.</p>
    image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f2f2f2'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Efood image%3C/text%3E%3C/svg%3E"
      alt: Food For Thought image alt text
      caption: Food For Thought image caption
    channel: Channel element
    category: Category element
    sharedBy: Shared by element
    readMoreText: Food For Thought read more
    readMoreLink: mailto:guide@example.com
    readMoreLinks:
    - text: Secondary CTA text element
      link: mailto:guide@example.com
      podcast: true
    - text: Tertiary CTA text element
      link: mailto:guide@example.com
      paywall: true
    paywall: true
- type: aesthetically-pleasing
  title: Aesthetically Pleasing Section Title
  description: <p>Aesthetically Pleasing section description HTML.</p>
  items:
  - image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f6eadf'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eaesthetic image%3C/text%3E%3C/svg%3E"
      alt: Aesthetically Pleasing image alt text
      caption: Aesthetically Pleasing image caption
    title: Aesthetically Pleasing item title
    imageLink: mailto:guide@example.com
    link: mailto:guide@example.com
    description: <p>Aesthetically Pleasing item description HTML.</p>
    readMoreText: Aesthetically Pleasing read more
- type: classifieds
  title: Classifieds Section Title
  description: <p>Classifieds section description HTML.</p>
  bookingLink: mailto:guide@example.com
  bookingText: Booking text element
  items:
  - content: <p>Classified content HTML element.</p>
    title: Classified item title
    link: mailto:guide@example.com
    linkText: Classified link text
    images:
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23def1ef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' fill='%2344506a'%3Eclassified one%3C/text%3E%3C/svg%3E"
      alt: Classified image one alt text
      caption: Classified image one caption
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23def1ef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' fill='%2344506a'%3Eclassified two%3C/text%3E%3C/svg%3E"
      alt: Classified image two alt text
    - src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23def1ef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' fill='%2344506a'%3Eclassified three%3C/text%3E%3C/svg%3E"
      alt: Classified image three alt text
- type: animated-image
  title: Animated Image Section Title
  items:
  - image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23fafafa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eanimated image%3C/text%3E%3C/svg%3E"
      alt: Animated image alt text
      caption: Animated image caption
    title: Animated image item title
    description: <p>Animated Image description HTML.</p>
    link: mailto:guide@example.com
- type: image
  title: Image Section Title
  items:
  - image:
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23fafafa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='42' fill='%2344506a'%3Eimage alias%3C/text%3E%3C/svg%3E"
      alt: Image alias alt text
      caption: Image alias caption
    title: Image alias item title
    description: <p>Image alias description HTML.</p>
    link: mailto:guide@example.com
footer:
  shareUrl: mailto:guide@example.com
  newsletterSubscribeLink:
    href: mailto:guide@example.com
    label: dense-discovery-section-guide | newsletter subscribe
    category: subscribe
  footerCta:
    variant: default
    primaryAction:
      label: Primary footer CTA
      url:
        href: mailto:guide@example.com
        label: dense-discovery-section-guide | footer CTA | primary
        category: services
    secondaryAction:
      label: Secondary footer CTA
      url:
        href: mailto:guide@example.com
        label: dense-discovery-section-guide | footer CTA | secondary
        category: services
  aboutLabel: About
  aboutUrl:
    href: mailto:guide@example.com
    label: dense-discovery-section-guide | about
    category: site-nav
  logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23111111'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='%23ffffff'%3ENFL%3C/text%3E%3C/svg%3E"
  logoLink:
    href: mailto:guide@example.com
    label: dense-discovery-section-guide | home
    category: site-nav
  unsubscribeLink: mailto:guide@example.com
  archiveUrl: mailto:guide@example.com
  address: Near Future Laboratory
  colophon: FPO colophon for the dense-discovery section guide.
---

This file is frontmatter-only source for the dense-discovery section guide.
