# coda-email Section Styles

This document describes the visual styling applied to each section type in this template.

## Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary | `#000000` | Headings, CTAs, accents |
| Secondary | `#101010` | Secondary text, borders |
| Background | `#FFFFFF` | Page background |
| Background Alt | `#D6F3FF` | Section backgrounds |
| Text | `#101010` | Body text |
| Accent | `#101010` | Links, highlights |

## Typography

| Element | Font | Size | Line Height |
|---------|------|------|-------------|
| Headings | Helvetica, Arial, sans-serif | 45px | 125% |
| Body | Helvetica, Arial, sans-serif | 18px | 27px |
| Captions | Helvetica, Arial, sans-serif | 14px | 1.4 |

## Section Types

### Header

- **Type**: `header`
- **Component**: `components/Header.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Brand header with logo

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `logo_url` | image | Yes | Company logo image |
| `logo_link` | url | Yes | Link destination for logo |

---

### WelcomeIntro

- **Type**: `welcome-intro`
- **Component**: `components/WelcomeIntro.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Personalized welcome message with user context

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `user_name` | string | Yes | Personalized user name |
| `welcome_message` | html | Yes | Contextual welcome and onboarding text |

---

### FeatureExplanation

- **Type**: `feature-explanation`
- **Component**: `components/FeatureExplanation.html`
- **Repeating**: Yes (loops through items)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Product feature explanation with image and descriptive text in side-by-side or stacked layout

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `feature_title` | string | Yes | Feature or section headline |
| `feature_image` | image | No | Visual demonstration of the feature (static or animated) |
| `feature_description` | html | Yes | Explanatory text about the feature |
| `layout_direction` | string | Yes | Image-left, image-right, or stacked layout |

---

### CtaSection

- **Type**: `cta-section`
- **Component**: `components/CtaSection.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Call-to-action section with icon, text, and button

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `icon_image` | image | No | Small icon or illustration |
| `cta_text` | html | Yes | Call-to-action message |
| `button_text` | string | Yes | Button label |
| `button_url` | url | Yes | Button destination |

---

### Footer

- **Type**: `footer`
- **Component**: `components/Footer.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Footer with social links, address, and legal links

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `social_links` | array | Yes | Social media links and icons |
| `company_address` | string | Yes | Physical company address |
| `unsubscribe_link` | url | Yes | Unsubscribe URL |

---

## Usage Examples

### Basic Content File

```yaml
---
template: coda-email
title: "My Newsletter"
preheader: "Preview text"

sections:
  - type: welcome-intro
    title: "Section Title"
  - type: feature-explanation
    title: "Section Title"
    items:
      - # item data
---
```

### Overriding Styles

You can override section styles in your content file:

```yaml
sections:
  - type: article
    title: "Featured"
    containerStyles:
      backgroundColor: "#f0f0f0"
    headingStylesInline: "color: #ff0000;"
```

## Files Reference

| File | Purpose |
|------|---------|
| `section-styles.json` | Default styles for each section type |
| `sample-data.json` | Complete sample data structure |
| `skeleton.md` | Minimal template for new content |
| `sample-content.md` | Full example with all sections |
| `sample-output.html` | Pre-built HTML output for quick reference |
| `schema.json` | JSON schema for data validation |
