# Novel Section Types

This template contains section types that were not found in reference templates.
These components were created specifically for this email design.

## Summary
3 are variants of known types, 6 are completely new types

## header

- **Description**: Brand logo and navigation area
- **Is Repeating**: No
- **Similar to**: sponsor

### Variables
- `logo_image` (image) - Brand logo image
- `logo_link` (url) - Link destination for logo

### HTML Structure
`table > tr > td with centered image/link`

---

## animated-hero

- **Description**: Animated GIF hero section for visual engagement
- **Is Repeating**: No
- **Similar to**: animated-image

### Variables
- `hero_gif` (image) - Animated GIF for visual impact

### HTML Structure
`table > tr > td with full-width image`

---

## issue-header

- **Description**: Newsletter issue number and identification
- **Is Repeating**: No
- **Similar to**: sponsor

### Variables
- `issue_number` (string) - Issue number or identifier

### HTML Structure
`table > tr > td with centered text`

---

## lifestyle-category

- **Description**: Themed content sections with title, images, and descriptive text
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `category_title` (string) - Category name (e.g., 'SUMMER-ENHANCING PEOPLE')
- `featured_image` (image) - Main category image
- `description_text` (html) - Rich text description with links
- `additional_images` (array) - Additional supporting images

### HTML Structure
`table sections with title, image blocks, and text content`

---

## brand-directory

- **Description**: Curated list of lifestyle brands with descriptions
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `intro_text` (html) - Introduction and call-to-action for featuring brands
- `brand_list` (array) - List of brands with names, links, and descriptions

### HTML Structure
`table > tr > td with paragraph list of linked brands`

---

## editorial

- **Description**: Editor's introduction and issue overview
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `intro_text` (html) - Editorial introduction content

### HTML Structure
`table > tr > td with centered paragraph text`

---

## link-list

- **Description**: Curated collection of news links with bullet points
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `link_items` (array) - Array of links with descriptions and URLs

### HTML Structure
`table > tr > td with paragraph list using ☼ bullets`

---

## social-cta

- **Description**: Social media handle promotion and call-to-action
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `social_handle` (string) - Social media handle repeated for emphasis
- `link_url` (url) - Link to social media profile

### HTML Structure
`table > tr > td with centered linked text`

---

## footer

- **Description**: Standard newsletter footer with social links and unsubscribe
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `social_links` (array) - Array of social media platform links
- `company_info` (html) - Company name and description
- `unsubscribe_text` (html) - Unsubscribe information and link

### HTML Structure
`table with social icons, company info, and legal text`

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
