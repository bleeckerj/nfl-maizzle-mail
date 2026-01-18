# palm-report-v2 Section Styles

This document describes the visual styling applied to each section type in this template.

## Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary | `#2664F6` | Headings, CTAs, accents |
| Secondary | `#111111` | Secondary text, borders |
| Background | `#FFFCF2` | Page background |
| Background Alt | `#fffcf2` | Section backgrounds |
| Text | `#000000` | Body text |
| Accent | `#2664F6` | Links, highlights |

## Typography

| Element | Font | Size | Line Height |
|---------|------|------|-------------|
| Headings | Helvetica, sans-serif | 20px | 150% |
| Body | Helvetica, sans-serif | 14px | 150% |
| Captions | Helvetica, sans-serif | 14px | 1.4 |

## Section Types

### Header

- **Type**: `header`
- **Component**: `components/Header.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Brand logo and navigation area

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `logo_image` | image | Yes | Brand logo image |
| `logo_link` | url | No | Link destination for logo |

---

### AnimatedHero

- **Type**: `animated-hero`
- **Component**: `components/AnimatedHero.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Animated GIF hero section for visual engagement

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `hero_gif` | image | Yes | Animated GIF for visual impact |

---

### IssueHeader

- **Type**: `issue-header`
- **Component**: `components/IssueHeader.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Newsletter issue number and identification

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `issue_number` | string | Yes | Issue number or identifier |

---

### LifestyleCategory

- **Type**: `lifestyle-category`
- **Component**: `components/LifestyleCategory.html`
- **Repeating**: Yes (loops through items)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Themed content sections with title, images, and descriptive text

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `category_title` | string | Yes | Category name (e.g., 'SUMMER-ENHANCING PEOPLE') |
| `featured_image` | image | Yes | Main category image |
| `description_text` | html | Yes | Rich text description with links |
| `additional_images` | array | No | Additional supporting images |

---

### BrandDirectory

- **Type**: `brand-directory`
- **Component**: `components/BrandDirectory.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Curated list of lifestyle brands with descriptions

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `intro_text` | html | Yes | Introduction and call-to-action for featuring brands |
| `brand_list` | array | Yes | List of brands with names, links, and descriptions |

---

### Editorial

- **Type**: `editorial`
- **Component**: `components/Editorial.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Editor's introduction and issue overview

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `intro_text` | html | Yes | Editorial introduction content |

---

### LinkList

- **Type**: `link-list`
- **Component**: `components/LinkList.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Curated collection of news links with bullet points

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `link_items` | array | Yes | Array of links with descriptions and URLs |

---

### SocialCta

- **Type**: `social-cta`
- **Component**: `components/SocialCta.html`
- **Repeating**: Yes (loops through items)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Social media handle promotion and call-to-action

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `social_handle` | string | Yes | Social media handle repeated for emphasis |
| `link_url` | url | Yes | Link to social media profile |

---

### Footer

- **Type**: `footer`
- **Component**: `components/Footer.html`
- **Repeating**: No (single instance)
- **Status**: 🆕 Novel type (created for this template)
- **Description**: Standard newsletter footer with social links and unsubscribe

#### Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `social_links` | array | Yes | Array of social media platform links |
| `company_info` | html | Yes | Company name and description |
| `unsubscribe_text` | html | Yes | Unsubscribe information and link |

---

## Usage Examples

### Basic Content File

```yaml
---
template: palm-report-v2
title: "My Newsletter"
preheader: "Preview text"

sections:
  - type: animated-hero
    title: "Section Title"
  - type: issue-header
    title: "Section Title"
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
| `schema.json` | JSON schema for data validation |
