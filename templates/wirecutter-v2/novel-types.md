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
- `logo_image` (image) - Brand logo with mobile/desktop variants
- `homepage_link` (url) - Link to main website

### HTML Structure
`table > tr > td with linked image`

---

## featured-article

- **Description**: Main article with large headline, hero image, and detailed content
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `headline` (string) - Large article title
- `hero_image` (image) - Main article image
- `description` (html) - Article content with multiple paragraphs
- `cta_link` (url) - Call-to-action link
- `disclaimer` (html) - Editorial disclaimer box

### HTML Structure
`Large title (46px) + hero image + multi-paragraph content + disclaimer box`

---

## article

- **Description**: Standard article format with title, image, and content
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `title` (string) - Article headline
- `image` (image) - Article image
- `content` (html) - Article body text
- `link` (url) - Link to full article

### HTML Structure
`h2 title + image + content paragraphs`

---

## product-showcase

- **Description**: Grid layout showcasing multiple related products with images and descriptions
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `section_title` (string) - Section heading (e.g., 'More outdoor recs')
- `product_items` (array) - Array of product recommendation items
- `item_image` (image) - Product or category image
- `item_title` (string) - Product/category title
- `item_description` (string) - Brief product description
- `item_link` (url) - Link to product page

### HTML Structure
`Section title + two-column grid with 280px width tables, equal-height containers`

---

## footer

- **Description**: Newsletter footer with unsubscribe, legal links, and company info
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `company_logo` (image) - Small company logo
- `unsubscribe_text` (html) - Unsubscribe instructions
- `company_address` (string) - Company physical address
- `legal_links` (array) - Privacy policy, terms, contact links

### HTML Structure
`Logo + unsubscribe text + address + legal links`

---


## Usage

These novel types work the same as standard types in your content files:

```yaml
sections:
- type: header
  # ... section data
```

If you want to reuse these types in other templates, copy the corresponding 
component files to your shared components directory.
