---
template: dense-discovery
newsletterFormat: discovery
title: Dense Discovery Section Guide
preheader: FPO render guide for dense-discovery newsletter section types
sectionStylesFile: templates/dense-discovery/section-styles.json
colorTheme: winter
intro:
  title: Dense Discovery Section Guide
  content: <p>This source issue renders every dense-discovery section branch through the canonical Maizzle build. The copy is intentionally FPO, but it is sized to show how each component handles real editorial rhythm, line wrapping, captions, links, and repeated content.</p>
header:
  quote: A guide should show the pressure a layout feels when the words become more than labels.
  author: Near Future Laboratory
  featuredArtist:
    name: FPO Featured Artist
    link: mailto:guide@example.com
  featuredImage: https://fpoimg.com/800x600?text=FPO%20Header&bg_color=e6e8e5&text_color=44506a
  logoBottom: https://fpoimg.com/326x80?text=NFL%20Logo&bg_color=111111&text_color=ffffff
  logoTop: https://fpoimg.com/326x80?text=NFL%20Logo&bg_color=111111&text_color=ffffff
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
    description: <p>Feature sections often need enough room for a compact sponsor note, announcement, or editorial aside. This FPO paragraph gives the card a realistic amount of body copy so spacing, link color, and image rhythm can be judged in the rendered email.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Feature%20Image&bg_color=e6e8e5&text_color=44506a
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
    description: <p>This sponsor-style FPO copy uses a moderate paragraph length, close to what a paid placement or partner note might carry. It should reveal whether the title, subtitle, image, and CTA remain readable when the card contains more than a single sentence.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Sponsor%20Image&bg_color=f8eccf&text_color=44506a
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
    description: <p>A dispatch item usually carries a short reported setup; what happened, why it matters now, and what a reader should notice. This placeholder paragraph is long enough to test the section's image-to-copy balance without turning the card into a full essay.</p>
    image:
      src: https://fpoimg.com/800x600?text=Dispatch%20Image&bg_color=f8eccf&text_color=44506a
      alt: Dispatch image alt text
      caption: Dispatch image caption
    readMoreText: Dispatch read more
    readMoreLink: mailto:guide@example.com
- type: signals-adjacent-now
  title: Signals From An Adjacent Now Title
  signalsLabel: SIGNALS LABEL
  description: <p>This FPO section introduction gives the signals block a brief editorial frame before the item content begins. It is meant to show how a section-level description reads above tags, title, image, source summary, story seeds, and strategy questions.</p>
  items:
  - title: Signal item title
    tags:
    - SIGNAL TAG
    - SECOND TAG
    link: mailto:guide@example.com
    subtitle: Signal item subtitle
    image:
      src: https://fpoimg.com/800x600?text=Signal%20Image&bg_color=f8eccf&text_color=44506a
      alt: Signal image alt text
      caption: Signal image caption
    description: <p>The signal body should feel like a concise observation rather than a caption. This FPO copy names a pattern, gives it a little context, and leaves enough length for the template to demonstrate paragraph wrapping inside the colored section surface.</p>
    sourceDigestSummary: <p>This FPO source summary compresses the relevant evidence into a smaller block. In production, this might summarize a linked article, paper, launch, policy note, or cultural artifact before the newsletter moves into interpretation.</p>
    additionalReferences:
    - title: Related reference
      href: mailto:guide@example.com
      label: section guide signal reference
      category: futures
      intent: read-related
      description: A supporting source that gives the signal more context.
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
  description: <p>This optional FPO setup explains why the partner placement belongs in the issue. It is intentionally shorter than the ad body, but long enough to show how contextual copy sits above the hydrated ad card.</p>
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
  description: <p>This FPO event description gives the calendar card enough copy to show the two-column date layout, button placement, and secondary event link. It should still read as a quick invitation rather than a full event page.</p>
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
    src: https://fpoimg.com/112x112?text=JOB&bg_color=111111&text_color=ffffff
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
  summaryHtml: <p>This FPO job summary gives the role card a concise opening paragraph. It should describe the opportunity at a high level, establish the tone of the employer block, and leave the calls to action visible near the top.</p>
  descriptionHtml: <p>The description area can carry a more substantial explanation of the work. This placeholder copy is long enough to test prose styling, divider spacing, and how the job card handles multiple content modules without overwhelming the header.</p>
  lists:
  - title: List title element
    itemsHtml:
    - Lead a focused workstream, coordinate with a small cross-functional group, and maintain a clear record of decisions, tradeoffs, and open questions with an <a href="mailto:guide@example.com">inline link</a>.
  payRangeHtml: <p>This FPO compensation note stands in for a salary band, equity note, benefits summary, or regional pay statement. The length tests the boxed compensation treatment.</p>
  bodyHtml: <p>Additional FPO information can include hiring process notes, equal opportunity language, work authorization details, or context that does not fit cleanly into the summary or description modules.</p>
  originalSourceUrl: mailto:guide@example.com
  footerNotesHtml:
  - <p>Footer note HTML element.</p>
  footerCta:
    eyebrow: Footer CTA eyebrow element
    textHtml: <p>This FPO footer CTA invites the reader to keep going after reviewing the job post. It should be long enough to show how the CTA box wraps before the primary and secondary actions.</p>
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
    dek: A short FPO dek that gives the launch card a little product-world texture before the image and product modules appear.
    image:
      src: https://fpoimg.com/800x600?text=Microdrop%20Hero&bg_color=fb436e&text_color=fff8f5
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
      src: https://fpoimg.com/400x400?text=Product&bg_color=fff8f5&text_color=fb436e
      alt: Product image alt text
  protocol:
    eyebrow: Protocol eyebrow element
    heading: Protocol heading element
    body: This FPO protocol copy describes how the product is meant to be used, collected, or interpreted. It should read as a compact supporting paragraph inside the darker launch module.
    items:
    - label: Protocol item label
      value: Protocol item value
      body: A short FPO note that explains the protocol item without adding another full paragraph.
  finalCta:
    eyebrow: Final CTA eyebrow element
    heading: Final CTA heading element
    body: This FPO final CTA body gives the section a closing beat, with enough text to test the spacing above the action button.
    href: mailto:guide@example.com
    label: Final CTA label
  editorialNote:
    eyebrow: Editorial note eyebrow element
    heading: Editorial note heading element
    body:
    - This FPO editorial note gives the product launch section a quieter explanatory close. It should feel like context from the editor rather than marketing copy.
    notes:
    - label: Editorial note label
      body: FPO note text that names a detail, source, or caveat associated with the launch.
- type: microdrop-institution-service
  brand: Institution/service brand element
  campaign: Institution-service campaign element
  title: Microdrop Institution Service Title
  summary: A short summary for the institution-service archetype, suitable for the dense-discovery issue payload.
  canonicalUrl: mailto:guide@example.com
  theme:
    backgroundColor: "#f3eee4"
    surfaceColor: "#fff8ea"
    textColor: "#18251f"
    accentColor: "#c05b32"
  hero:
    eyebrow: Neighborhood service technicians available 24/7
    headline: Hero headline element for an institution-service drop
    dek: A short FPO dek that frames the service or institution as an ordinary destination in its world.
    image:
      src: https://fpoimg.com/800x520?text=Institution%20Service%20Hero&bg_color=f3eee4&text_color=18251f
      alt: Institution-service hero image alt text
  serviceStrip:
    eyebrow: Service strip eyebrow element
    heading: Service strip heading element
    body: This FPO service strip explains the operational promise, coverage, mandate, or public role behind the institution-service artifact.
    items:
    - label: Service item label
      value: Service item value
      body: A short FPO service detail that makes the service feel staffed, mundane, and procedural.
  gallery:
  - src: https://fpoimg.com/800x520?text=Field%20Image&bg_color=fff8ea&text_color=c05b32
    alt: Field image alt text
    label: Field image label
    caption: A short FPO caption for a large field image, testimonial scene, service record, or institutional view.
  process:
    eyebrow: Process eyebrow element
    heading: Process heading element
    body: This FPO process block describes common calls, visitor use, public services, or operating procedure.
    items:
    - label: Process item label
      value: Process item value
      body: A short FPO detail that describes what happens in this service moment.
  eligibility:
    eyebrow: Eligibility eyebrow element
    heading: Eligibility heading element
    body: This FPO eligibility block explains who can use the service, what records help, or which systems qualify.
    items:
    - label: Eligibility item label
      value: Eligibility item value
      body: A short FPO eligibility note.
  offerings:
  - badge: Service badge element
    name: Service line name element
    slogan: Service line slogan element
    descriptionText: FPO service line description for a non-transactional institution-service microdrop.
    color: "#c05b32"
    ksp:
    - Service line detail element
  caseFile:
    eyebrow: Case file eyebrow element
    heading: Case file heading element
    body: This FPO case-file block gives the email a paperwork, record, directory, or proof surface.
    items:
    - label: Case file item label
      value: Case file item value
      body: A short FPO record detail that supports the institution-service premise.
  statusBoard:
    eyebrow: Status board eyebrow element
    heading: Status board heading element
    body: This FPO status board shows how the institution tracks cases, calls, records, or service states.
    items:
    - label: Status item label
      value: Status item value
      body: A short FPO status detail.
  intakePreview:
    eyebrow: Intake preview eyebrow element
    heading: Intake preview heading element
    body: This FPO intake preview shows what the service asks for without rendering a transactional form.
    items:
    - label: Intake item label
      value: Intake item value
      body: A short FPO intake detail.
  finalCta:
    eyebrow: Final CTA eyebrow element
    heading: Final CTA heading element
    body: This FPO final CTA points to the microdrop without turning the service into checkout.
    href: mailto:guide@example.com
    label: Final CTA label
  editorialNote:
    eyebrow: Editorial note eyebrow element
    heading: Editorial note heading element
    body:
    - This FPO editorial note gives the institution-service section a quieter explanatory close.
- type: microdrop-institution-service
  brand: Sparse Civic Institution
  campaign: Public desk preview
  title: Sparse Civic Institution Microdrop
  summary: A lighter institution-service payload for a civic desk with only the durable email surfaces supplied.
  canonicalUrl: mailto:guide@example.com
  theme:
    backgroundColor: "#f6f1e7"
    surfaceColor: "#fffaf0"
    textColor: "#1f2f29"
    accentColor: "#8a5a2b"
  hero:
    headline: Public records for complicated residents.
    dek: A sparse FPO civic service card that still renders hero, image, process, case-file, CTA, and note.
    image:
      src: https://fpoimg.com/800x520?text=Sparse%20Civic%20Hero&bg_color=f6f1e7&text_color=1f2f29
      alt: Sparse civic hero image alt text
  gallery:
  - src: https://fpoimg.com/800x520?text=Sparse%20Civic%20Gallery&bg_color=fffaf0&text_color=8a5a2b
    alt: Sparse civic gallery image alt text
  process:
    heading: Bring the record, not the whole story.
  caseFile:
    heading: Case file reviewed at the public desk.
  finalCta:
    heading: Visit the public desk record.
    body: A sparse final CTA still points to the full microdrop without commerce language.
    href: mailto:guide@example.com
    label: View Microdrop
  editorialNote:
    heading: Editorial note heading element
    body:
    - This sparse note verifies the optional editorial surface without requiring every institution-service panel.
- type: adjacency-feature
  rubric: Rubric element
  title: Adjacency Feature Title
  dek: A measured FPO dek for a longer editorial feature, sized to show how the serif italic line wraps below the title.
  author: Author element
  dateLabel: Date label element
  tags:
  - Feature tag
  - Second tag
  explainerHtml: <p>This FPO explainer gives the feature a short orientation before the hero image. It should be enough copy to show the treatment for an opening note, thesis, or context paragraph.</p>
  heroImage:
    src: https://fpoimg.com/800x600?text=Feature%20Hero&bg_color=f5f4f0&text_color=374151
    alt: Feature hero image alt text
    caption: Feature hero caption element
    credit: Feature hero credit element
  bodyHtml: <p>This FPO feature body uses a longer paragraph to test the article-like reading surface inside the email. It should show how serif body copy, margins, and line length behave when the section carries a real editorial passage rather than a label.</p><p>A second paragraph gives the rendered guide a better sense of flow. In production, this space might carry analysis, scene-setting, or a compact argument that leads to the CTA at the bottom of the feature card.</p>
  footerCta:
    eyebrow: Footer CTA eyebrow element
    textHtml: <p>This FPO footer callout gives the feature a related action after the article body. It should show how a supporting prompt wraps before the pair of CTA buttons.</p>
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
    description: <p>Apps and sites items usually need a brisk explanation of what the linked thing does and why it is worth a click. This FPO copy gives the two-column layout enough text to test title, subtitle, description, paywall marker, and CTA spacing.</p>
    image:
      src: https://fpoimg.com/800x600?text=Apps%20Image&bg_color=ffffff&text_color=44506a
      alt: Apps Sites image alt text
      caption: Apps Sites image caption
    readMoreText: Apps Sites read more
    readMoreLink: mailto:guide@example.com
    paywall: true
- type: apps-sites-single-column
  title: Apps Sites Single Column Section Title
  description: <p>This FPO section-level description introduces the single-column apps/sites variant. It is sized to show how introductory copy sits between the section header and the first full-width item.</p>
  items:
  - title: Apps Sites Single Column item title
    link: mailto:guide@example.com
    subtitle: Apps Sites Single Column item subtitle
    description: <p>The single-column item has more horizontal space, so this FPO description is slightly longer. It should show how the full-width image, subtitle, body copy, and CTA stack in a mobile-friendly email layout.</p>
    image:
      src: https://fpoimg.com/800x600?text=Single%20Column%20Image&bg_color=ffffff&text_color=44506a
      alt: Apps Sites Single Column image alt text
      caption: Apps Sites Single Column image caption
    readMoreText: Single Column read more
    readMoreLink: mailto:guide@example.com
- type: callout
  title: Callout Section Title
  items:
  - calloutText: This FPO callout text is deliberately a little emphatic and self-contained. It should show how a highlighted idea, prompt, or editorial aside reads when it occupies the large padded text area below an optional image.
    image:
      src: https://fpoimg.com/800x600?text=Callout%20Image&bg_color=d1eaf4&text_color=44506a
      alt: Callout image alt text
      link: mailto:guide@example.com
      caption: Callout image caption
    readMoreText: Callout read more
    readMoreLink: mailto:guide@example.com
    author: Author element
- type: quote
  title: Quote Section Title
  items:
  - quote: This FPO quote has enough length to test the blockquote line breaks, left rule, and author attribution without becoming a wall of text.
    author: Quote author element
    authorLink: mailto:guide@example.com
- type: indie-mag
  title: Indie Mag Section Title
  items:
  - title: Indie Mag item title
    link: mailto:guide@example.com
    description: <p>This FPO indie-mag description gives the cover image and text column a realistic relationship. It should read like a compact magazine blurb with enough lines to test the two-column layout.</p>
    details: <p>Issue details, format, region, frequency, or ordering notes can live here.</p>
    note: <p>This FPO note adds a small editorial aside, useful for testing italic secondary text.</p>
    image:
      src: https://fpoimg.com/800x1000?text=Indie%20Cover&bg_color=efe2f3&text_color=44506a
      alt: Indie Mag image alt text
      caption: Indie Mag image caption
- type: single-column
  title: Single Column Section Title
  items:
  - title: Single Column item title
    link: mailto:guide@example.com
    subtitle: Single Column subtitle
    description: <p>This FPO single-column magazine copy can be a little more expansive because the layout gives the image and prose separate vertical space. It should show how a stacked editorial item handles a full paragraph before details, note, and CTA.</p>
    details: <p>FPO details might include publisher, format, page count, release cadence, or availability.</p>
    note: <p>This FPO note gives the section a secondary voice after the primary description.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Image%20One&bg_color=efe2f3&text_color=44506a
      alt: Single Column image one alt text
      link: mailto:guide@example.com
      caption: Image one caption
    - src: https://fpoimg.com/800x600?text=Image%20Two&bg_color=f5f5f5&text_color=44506a
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
    description: <p>This FPO books/accessories description gives the product or publication enough context to feel like a recommendation. It should test the full-width image, author metadata, ISBN line, body copy, and link text as a complete item.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Book%20Image&bg_color=ffffff&text_color=44506a
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
    description: <p>Food for Thought items often carry a conversational summary, a source note, or a reason the item belongs in a channel. This FPO paragraph is sized to test the metadata stack, image, title, body copy, primary CTA, and extra CTA rows.</p>
    image:
      src: https://fpoimg.com/800x600?text=Food%20Image&bg_color=f2f2f2&text_color=44506a
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
  description: <p>This FPO section description introduces the visual item with a short curatorial note. It should show whether the header, intro, image, and item copy have enough breathing room.</p>
  items:
  - image:
      src: https://fpoimg.com/800x600?text=Aesthetic%20Image&bg_color=f6eadf&text_color=44506a
      alt: Aesthetically Pleasing image alt text
      caption: Aesthetically Pleasing image caption
    title: Aesthetically Pleasing item title
    imageLink: mailto:guide@example.com
    link: mailto:guide@example.com
    description: <p>This FPO item description gives the image a little interpretive context, close to what a visual recommendation or design note might contain. The length is meant to test the centered image treatment and supporting body copy.</p>
    readMoreText: Aesthetically Pleasing read more
- type: classifieds
  title: Classifieds Section Title
  description: <p>This FPO classifieds introduction gives readers a short setup before the listings. It should be enough text to show the section-level body style without distracting from the individual classified card.</p>
  bookingLink: mailto:guide@example.com
  bookingText: Booking text element
  items:
  - content: <p>This FPO classified has enough copy to resemble a real short listing; a project, offer, opening, or request with a clear next step. It should show how the boxed content, title, image grid, and link work together.</p>
    title: Classified item title
    link: mailto:guide@example.com
    linkText: Classified link text
    images:
    - src: https://fpoimg.com/600x400?text=Classified%20One&bg_color=def1ef&text_color=44506a
      alt: Classified image one alt text
      caption: Classified image one caption
    - src: https://fpoimg.com/600x400?text=Classified%20Two&bg_color=def1ef&text_color=44506a
      alt: Classified image two alt text
    - src: https://fpoimg.com/600x400?text=Classified%20Three&bg_color=def1ef&text_color=44506a
      alt: Classified image three alt text
- type: animated-image
  title: Animated Image Section Title
  itemTitlePlacement: below-image-before-description
  items:
  - image:
      src: https://fpoimg.com/800x600?text=Animated%20Image&bg_color=fafafa&text_color=44506a
      alt: Animated image alt text
      caption: Animated image caption
    title: Animated image item title
    description: <p>This FPO image caption-body gives the animated image section a brief note below the media. It is short enough to keep the image dominant while still testing text wrapping.</p>
    link: mailto:guide@example.com
- type: image
  title: Image Section Title
  itemTitlePlacement: below-image-before-description
  items:
  - image:
      src: https://fpoimg.com/800x600?text=Image%20Alias&bg_color=fafafa&text_color=44506a
      alt: Image alias alt text
      caption: Image alias caption
    title: Image alias item title
    description: <p>This FPO image alias description confirms that the plain image section renders through the same branch as animated-image, with <strong>bold</strong>, <em>italic</em>, and <a href="mailto:guide@example.com">linked</a> text below the media.</p>
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
  logo: https://fpoimg.com/200x80?text=NFL%20Logo&bg_color=111111&text_color=ffffff
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
