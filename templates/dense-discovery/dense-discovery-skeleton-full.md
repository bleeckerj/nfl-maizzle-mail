---
template: dense-discovery
title: Newsletter Title
preheader: Short preview text that appears in email clients
ogImage: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/b1ae3684-fdc5-4665-95ae-0a66893ff200/w=900?format=webp
ogImageAltText: Open graph preview image for this newsletter
socialCard:
  # Export metadata for newsletter social/platform cards. This does not render in the email itself.
  title: Newsletter Title
  subtitle: Short preview text that appears in email clients
  kicker: Welcome
  backgroundImage: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/b1ae3684-fdc5-4665-95ae-0a66893ff200/w=900?format=webp
  logoUrl: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/2d52e99e-69ae-467c-1e42-8c80b647df00/w=200?format=webp
  titleFont: nfl-title-untitled
  subtitleFont: nfl-subtitle
  kickerFont: nfl-kicker
  backgroundOpacity: 1
  backgroundHueRotate: 0
  backgroundSaturation: 1.08
  overlayStrength: 0.46
  imageBrightness: 0.7
  textColor: '#f5f2eb'
  mutedTextColor: 'rgba(255,255,255,0.82)'
  kickerColor: '#ffb000'
  animation:
    mode: none
    animeModule: deterministic-orbit
    durationMs: 2400
    fps: 8
    loop: true
    posterFrame: 0.5
    disableForPresets:
    - 15x9
sectionStylesFile: templates/dense-discovery/section-styles.json
colorTheme: 'winter'
intro:
  title: Welcome
  viewOnlineLink: https://nearfuturelaboratory.com/newsletters/2026/wxx-yxx
  aside:
    content: <p>Teaser/lede text that sets up the intro content.</p>
    containerStyles:
      backgroundColor: '#f4f1ea'
      borderLeftWidth: 3px
      borderLeftStyle: solid
      borderLeftColor: '#d7d1c6'
      padding: 12px 14px
      borderRadius: 6px
    contentStyles:
      fontFamily: '''Ubuntu'', sans-serif'
      fontSize: 18px
      lineHeight: 23px
      fontStyle: italic
      color: '#3f3f3f'
      textAlign: left
  containerStyles:
    backgroundColor: null
    padding: '0'
    borderRadius: 0px
  contentStyles:
    fontFamily: '''IBM Plex Sans'', sans-serif'
    fontSize: 16px
    lineHeight: 1.2rem
    fontWeight: '400'
    color: '#000000'
    textAlign: left
  content: <p>Introduction paragraph for the newsletter.</p>
header:
  quote: Inspiring header quote
  author: Quote Author
  featuredArtist:
    name: Artist Name
    link: '#'
  featuredImage: https://fpoimg.com/600x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Featured
  logoBottom: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/5240f451-4c17-47c9-6c5a-50e50d22c500/w=200?format=webp
  logoTop: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/80a173f3-1366-4052-5889-5dbcf8f25200/w=200?format=webp
sections:
- type: sponsor
  title: Sponsor Section
  sponsorLink: Example sponsorLink
  sponsorLabel: Example sponsorLabel
  items:
  - title: Sponsor Item 1
    link: https://example.com
    subtitle: Example subtitle for item 1
    description: <p>Example description for sponsor item 1.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
      alt: Alternate text for item 1 image 1
      link: https://example.com/image-destination
    - src: https://fpoimg.com/800x600?text=Preview%20Two&bg_color=f5f5f5&text_color=4FAAAA?text=Second
      alt: Alternate text for item 1 image 2
    readMoreText: Read more →
    readMoreLink: https://example.com
- type: dispatch
  title: Dispatch Section
  dispatchLink: Example dispatchLink
  dispatchLabel: Example dispatchLabel
  items:
  - title: Dispatch Item 1
    signalsLabel: SIGNALS
    tags:
    - TAG1
    - TAG2
    link: https://example.com
    subtitle: Example subtitle for item 1
    description: <p>Example description for dispatch item 1.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
- type: signals-adjacent-now
  title: Signals from an Adjacent Now
  signalsLabel: SIGNALS FROM AN ADJACENT NOW
  description: <p>Section introduction for signals-adjacent-now.</p>
  items:
  - title: Signal Item 1
    tags:
    - TAG1
    - TAG2
    link: https://example.com
    subtitle: Signal from the observation post
    image: https://fpoimg.com/800x600?text=Adjacent+Now&bg_color=e6e6e6&text_color=4FAAAA
    description: <p>Example description for signals-adjacent-now item 1.</p>
    sourceDigestSummary: <p>Example source digest summary for item 1.</p>
    storySeeds:
    - Story seed 1
    - Story seed 2
    strategyQuestions:
    - What changes if this signal spreads?
    - What quiet assumptions does this expose?
    readMoreText: Read source →
    readMoreLink: https://example.com
- type: ad-block
  title: This Week's Partner
  description: <p>Optional framing copy for the ad slot.</p>
  items:
  - adId: fashion-8bit-pants-interstitial
- type: apps-sites
  title: Apps Sites Section
  items:
  - title: Apps Sites Item 1
    link: https://example.com
    subtitle: Example subtitle for item 1
    description: <p>Example description for apps-sites item 1.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
  - title: Apps Sites Item 2
    link: https://example.com
    subtitle: Example subtitle for item 2
    description: <p>Example description for apps-sites item 2.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
- type: apps-sites-single-column
  title: Apps Sites Single Column Section
  description: <p>Description for apps-sites-single-column section.</p>
  items:
  - title: Apps Sites Single Column Item 1
    link: https://example.com
    subtitle: Example subtitle for item 1
    description: <p>Example description for apps-sites-single-column item 1.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
- type: callout
  title: Callout Section
  items:
  - calloutText: Callout Item 1
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    imageAlt: Alternate text for callout item 1 image
    imageLink: https://example.com
    readMoreText: Read more →
    readMoreLink: https://example.com
    author: Example author
- type: quote
  title: Quote Section
  items:
  - quote: Example quote text for item 1
    author: Example author
    authorLink: https://example.com
- type: indie-mag
  title: Indie Mag Section
  items:
  - title: Indie Mag Item 1
    link: https://example.com
    description: <p>Example description for indie-mag item 1.</p>
    details: <p>Example details for indie-mag item 1.</p>
    note: <p>Example note for indie-mag item 1.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
  - title: Indie Mag Item 2
    link: https://example.com
    description: <p>Example description for indie-mag item 2.</p>
    details: <p>Example details for indie-mag item 2.</p>
    note: <p>Example note for indie-mag item 2.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
- type: indie-mag-single-column
  title: Indie Mag Single Column Section
  items:
  - title: Indie Mag Single Column Item 1
    link: https://example.com
    subtitle: Example subtitle for indie-mag-single-column item 1
    description: <p>Example description for indie-mag-single-column item 1.</p>
    details: <p>Example details for indie-mag-single-column item 1.</p>
    note: <p>Example note for indie-mag-single-column item 1.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
      alt: Alternate text for item 1 image 1
      link: https://example.com/image-destination
    - src: https://fpoimg.com/800x600?text=Preview%20Two&bg_color=f5f5f5&text_color=4FAAAA?text=Second
      alt: Alternate text for item 1 image 2
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
  - title: Indie Mag Single Column Item 2
    link: https://example.com
    subtitle: Example subtitle for indie-mag-single-column item 2
    description: <p>Example description for indie-mag-single-column item 2.</p>
    details: <p>Example details for indie-mag-single-column item 2.</p>
    note: <p>Example note for indie-mag-single-column item 2.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
      alt: Alternate text for item 2 image 1
      link: https://example.com/image-destination
    - src: https://fpoimg.com/800x600?text=Preview%20Two&bg_color=f5f5f5&text_color=4FAAAA?text=Second
      alt: Alternate text for item 2 image 2
    readMoreText: Read more →
    readMoreLink: https://example.com
    paywall: true
- type: books-accessories
  title: Books Accessories Section
  byline: Example byline
  bylineLink: Example bylineLink
  authorLabel: Author
  items:
  - title: Books Accessories Item 1
    link: https://example.com
    subtitle: Example subtitle for item 1
    description: <p>Example description for books-accessories item 1.</p>
    images:
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
      alt: Alternate text for item 1 image 1
      link: https://example.com/image-destination
    - src: https://fpoimg.com/800x600?text=Preview%20Two&bg_color=f5f5f5&text_color=4FAAAA?text=Second
      alt: Alternate text for item 1 image 2
    authorName: Example authorName for item 1
    authorLabel: Author
    authorLink: https://example.com
    isbn: 978-1-23456-789-7
    linkText: Example linkText for item 1
- type: food-for-thought
  title: Food For Thought Section
  items:
  - title: Food For Thought Item 1
    link: https://example.com
    description: <p>Example description for food-for-thought item 1.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    channel: Example channel
    category: Example category
    sharedBy: Example sharedBy for item 1
    readMoreText: Read more →
    readMoreLink: https://example.com
    readMoreLinks:
    - text: Listen to podcast →
      link: https://example.com/podcast
    - text: View references →
      link: https://example.com/references
      paywall: true
    paywall: true
  - title: Food For Thought Item 2
    link: https://example.com
    description: <p>Example description for food-for-thought item 2.</p>
    image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    channel: Example channel
    category: Example category
    sharedBy: Example sharedBy for item 2
    readMoreText: Read more →
    readMoreLink: https://example.com
    readMoreLinks:
    - text: Listen to podcast →
      link: https://example.com/podcast
    - text: View references →
      link: https://example.com/references
      paywall: true
    paywall: true
- type: aesthetically-pleasing
  title: Aesthetically Pleasing Section
  description: <p>Description for aesthetically-pleasing section.</p>
  items:
  - image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    title: Example title
    imageLink: https://example.com
    link: https://example.com
    description: <p>Example description for aesthetically-pleasing item 1.</p>
    readMoreText: Read more →
- type: classifieds
  title: Classifieds Section
  description: <p>Description for classifieds section.</p>
  bookingLink: Example bookingLink
  bookingText: Example bookingText
  items:
  - content: <p>Example classified content for item 1.</p>
    title: Example title
    link: https://example.com
    linkText: Example linkText for item 1
    images:
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+1
      alt: Alternate text for classified 1 image 1
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+2
      alt: Alternate text for classified 1 image 2
    - src: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+3
      alt: Alternate text for classified 1 image 3
- type: animated-image
  title: Animated Image Section
  items:
  - image: https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image
    title: Example title
    description: <p>Example description for animated-image item 1.</p>
    link: https://example.com
footer:
  emailShare: mailto:?subject=Newsletter%20Issue&body=Check%20out%20this%20issue%20of%20the%20Near%20Future%20Laboratory%20newsletter:%20https://nearfuturelaboratory.com/newsletters/2026/w50-y25/
  newsletterSubscribeLink: https://nearfuturelaboratory.com/newsletter/
  footerCta:
    variant: default
  aboutLabel: About Julian Bleecker
  aboutUrl: https://julianbleecker.com/
  logo: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/2d52e99e-69ae-467c-1e42-8c80b647df00/w=200?format=webp
  logoLink: https://nearfuturelaboratory.com
  socialLinks:
    applepodcasts:
    - url: https://podcasts.apple.com/us/podcast/near-future-laboratory-podcast/id1546452193
      title: Near Future Laboratory on Apple Podcasts
    spotify:
    - url: https://open.spotify.com/show/1vHzwGE5J19LvXSo8M93MM
      title: Near Future Laboratory on Spotify
    github:
    - url: https://github.com/bleeckerj
      title: Personal GitHub
    - url: https://github.com/nearfuturelaboratory
      title: Near Future Laboratory GitHub
    - url: https://github.com/nearfuturelaboratory
      title: Near Future Laboratory GitHub
    instagram:
    - url: https://instagram.com/darthjulian
      title: Personal Instagram
    - url: https://instagram.com/nearfuturelaboratory
      title: Company Instagram
    linkedin:
    - url: https://linkedin.com/in/julianbleecker
      title: Personal LinkedIn
    - url: https://www.linkedin.com/company/near-future-laboratory/
      title: Near Future Laboratory LinkedIn
    youtube:
    - url: https://youtube.com/@nearfuturelaboratory
      title: YouTube Channel
    discord:
    - url: https://patreon.com/nearfuturelaboratory
      title: Join Patreon to join the Discord Community
    patreon:
    - url: https://patreon.com/nearfuturelaboratory
      title: Support me on Patreon
    substack:
    - url: https://newsletter.substack.com
      title: Newsletter on Substack
  unsubscribeLink: '[unsubscribe]'
  shareUrl: https://nearfuturelaboratory.com/newsletters/2026/w50-y25
  archiveUrl: https://nearfuturelaboratory.com/newsletters
  address: © 2026 Near Future Laboratory<br>Venice Beach, California<br>United States
  colophon: Imagination is not a luxury. It’s an early-warning system for possibility.
---
