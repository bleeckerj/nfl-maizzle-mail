# Novel Section Types

This template contains section types that were not found in reference templates.
These components were created specifically for this email design.

## Summary
1 are variants of known types, 4 are completely new types

## header

- **Description**: Brand logo and navigation area
- **Is Repeating**: No
- **Similar to**: sponsor

### Variables
- `header.logoImage` (image) - Desktop brand logo
- `header.logoImageMobile` (image) - Mobile brand logo
- `header.homepageLink` (url) - Link to main website

### HTML Structure
`table > tr > td with linked image`

---

## featured-article

- **Description**: Main article with large headline, hero image, and detailed content
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `featuredArticle.headline` (string) - Large article title
- `featuredArticle.heroImage` (image) - Main article image
- `featuredArticle.description` (html) - Article content with multiple paragraphs
- `featuredArticle.ctaLink` (url) - Call-to-action link
- `featuredArticle.disclaimer` (html) - Editorial disclaimer box

### HTML Structure
`Large title (46px) + hero image + multi-paragraph content + disclaimer box`

---

## article

- **Description**: Standard article format with title, image, and content
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `article.title` (string) - Article headline
- `article.image` (image) - Article image
- `article.content` (html) - Article body text
- `article.link` (url) - Link to full article

### HTML Structure
`h2 title + image + content paragraphs`

---

## product-showcase

- **Description**: Grid layout showcasing multiple related products with images and descriptions
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `productShowcase.sectionTitle` (string) - Section heading (e.g., 'More outdoor recs')
- `productShowcase.sectionLink` (url) - Link to the product category
- `productShowcase.items` (array) - Product recommendation items
- `productShowcase.items[].image` (image) - Product or category image
- `productShowcase.items[].title` (string) - Product/category title
- `productShowcase.items[].description` (string) - Brief product description
- `productShowcase.items[].link` (url) - Link to product page

### HTML Structure
`Section title + two-column grid with 280px width tables, equal-height containers`

---

## footer

- **Description**: Newsletter footer with unsubscribe, legal links, and company info
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `footer.companyLogo` (image) - Small company logo
- `footer.unsubscribeText` (html) - Unsubscribe instructions
- `footer.companyAddress` (string) - Company physical address
- `footer.legalLinks` (array) - Privacy policy, terms, contact links

### HTML Structure
`Logo + unsubscribe text + address + legal links`

---


## Usage

This template uses top-level data objects that match its static components:

```yaml
template: wirecutter-v2
header:
  # logo fields
featuredArticle:
  # hero article fields
article:
  # secondary article fields
productShowcase:
  # sectionTitle, sectionLink, and items
footer:
  # footer fields
```

If you want to reuse these types in other templates, copy the corresponding 
component files to your shared components directory.
