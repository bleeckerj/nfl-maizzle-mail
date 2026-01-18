# Novel Section Types

This template contains section types that were not found in reference templates.
These components were created specifically for this email design.

## Summary
1 are variants of known types, 4 are completely new types

## header

- **Description**: Brand header with logo
- **Is Repeating**: No
- **Similar to**: sponsor

### Variables
- `logo_url` (image) - Company logo image
- `logo_link` (url) - Link destination for logo

### HTML Structure
`table > tr > td with rounded top corners`

---

## welcome-intro

- **Description**: Personalized welcome message with user context
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `user_name` (string) - Personalized user name
- `welcome_message` (html) - Contextual welcome and onboarding text

### HTML Structure
`Multiple table rows with h1, h2, and paragraph content`

---

## feature-explanation

- **Description**: Product feature explanation with image and descriptive text in side-by-side or stacked layout
- **Is Repeating**: Yes
- **Status**: Completely new pattern

### Variables
- `feature_title` (string) - Feature or section headline
- `feature_image` (image) - Visual demonstration of the feature (static or animated)
- `feature_description` (html) - Explanatory text about the feature
- `layout_direction` (string) - Image-left, image-right, or stacked layout

### HTML Structure
`Two-column layout with dys-column-per-50 or single column with centered content`

---

## cta-section

- **Description**: Call-to-action section with icon, text, and button
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `icon_image` (image) - Small icon or illustration
- `cta_text` (html) - Call-to-action message
- `button_text` (string) - Button label
- `button_url` (url) - Button destination

### HTML Structure
`Two-column layout with 27%/73% split`

---

## footer

- **Description**: Footer with social links, address, and legal links
- **Is Repeating**: No
- **Status**: Completely new pattern

### Variables
- `social_links` (array) - Social media links and icons
- `company_address` (string) - Physical company address
- `unsubscribe_link` (url) - Unsubscribe URL

### HTML Structure
`Three-column layout with responsive mobile stacking`

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
