# Novel Section Types

This template contains section types that were not found in reference templates.
These components were created specifically for this email design.

## Summary
3 are variants of known types, 4 are completely new types

## header

- **Description**: Brand header with logo and navigation elements
- **Is Repeating**: No
- **Similar to**: sponsor

### Variables
- `logo_url` (url) - Link destination for logo
- `logo_image` (image) - Logo image source

### HTML Structure
`table > tr > td with centered logo link and image`

---

## hero

- **Description**: Large title section introducing the email theme
- **Is Repeating**: No
- **Similar to**: animated-image

### Variables
- `collection_title` (string) - Main collection title
- `collection_subtitle` (string) - Descriptive subtitle

### HTML Structure
`table > tr > td with centered text and styling`

---

## intro

- **Description**: Editorial introduction explaining the content theme
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `intro_text` (html) - Editorial introduction content
- `archive_link` (url) - Link to full archive

### HTML Structure
`table > tr > td with left-aligned text content`

---

## article-pair

- **Description**: Two-column layout featuring a pair of articles side by side
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `left_article` (object) - Complete article object for left column
- `right_article` (object) - Complete article object for right column

### HTML Structure
`table > tr > td containing two 325px width tables side by side`

---

## article

- **Description**: Individual article card with image, metadata, and call-to-action
- **Is Repeating**: Yes
- **Similar to**: quote

### Variables
- `category` (string) - Article category (e.g., 'A CRITIC AT LARGE', 'PROFILES')
- `image` (image) - Article featured image
- `image_alt` (string) - Alt text for article image
- `issue_date` (string) - Publication date
- `title` (string) - Article headline
- `description` (string) - Article summary
- `author` (string) - Article author name
- `article_url` (url) - Link to full article

### HTML Structure
`nested tables with category, image, date, title, description, author, and CTA button`

---

## cta

- **Description**: Call-to-action section promoting additional content
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `cta_text` (string) - Call-to-action message
- `button_text` (string) - Button label
- `cta_url` (url) - Destination URL

### HTML Structure
`table > tr > td with centered text and button`

---

## footer

- **Description**: Standard email footer with legal and unsubscribe information
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `unsubscribe_url` (url) - Unsubscribe link
- `privacy_url` (url) - Privacy policy link
- `customer_care_url` (url) - Customer service link

### HTML Structure
`table > tr > td with centered text and links`

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
