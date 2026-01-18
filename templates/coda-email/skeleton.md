---
# coda-email Newsletter Skeleton
# This is a minimal template for starting new content.
# Copy this file to content/ and fill in your data.

template: coda-email
title: "Your Newsletter Title"
preheader: "Preview text for email clients"

header:
  logoUrl: "" # URL to logo image
  logoLink: "" # logoLink

intro:
  welcomeTitle: ""
  subtitle: ""
  welcomeMessage: ""

sections:
  - type: welcome-intro
    title: ""

  - type: feature-explanation
    title: ""
    items:
      - # Add item fields based on component requirements
        feature_title: "" # string (required)
        feature_image: "" # image
        feature_description: "" # html (required)
        layout_direction: "" # string (required)

  - type: cta-section
    title: ""

cta:
  iconImage: "" # iconImage
  ctaText: "" # Call-to-action text
  buttonText: "" # Button label
  buttonUrl: "" # buttonUrl

footer:
  logoUrl: "" # URL to logo image
  mobileLogoUrl: "" # mobileLogoUrl
  logoLink: "" # logoLink
  logoAlt: "" # logoAlt
  socialLinks:
    - # Add items
  companyAddress: "" # companyAddress
  addressLink: "" # addressLink
  unsubscribeLink: "" # unsubscribeLink

---

<!-- Remove this markdown section in production -->
# coda-email Newsletter

Replace the frontmatter above with your actual content.
