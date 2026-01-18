---
applyTo: '**/**'
---



# NFL Maizzle Mail - Copilot Instructions

## Architecture Overview

This is a **Maizzle-based HTML email system** that separates content (Markdown), data (JSON), and templates (HTML components). The workflow converts Markdown → JSON → HTML emails compatible with all email clients.

### Core Data Flow
```
content/*.md → scripts/md_to_json.mjs → data/newsletter.json → Maizzle build → build_production/*.html
```

### Key Directories
- `content/` - Markdown files with YAML frontmatter (author source files)
- `data/` - Generated JSON consumed by templates
- `templates/<name>/` - Maizzle template systems with layouts, components, section-styles.json
- `scripts/` - Build automation and LLM-powered template generation tools
- `build_production/` - Final HTML output

## Essential Commands

```bash
# Build newsletter from Markdown (primary workflow)
node scripts/build-newsletter.mjs content/your-file.md

# Quick build with template auto-detection
npm run quick wirecutter content/your-file.md

# Generate new template from HTML email using LLM
node scripts/email-template-factory/index.mjs emails-to-templatize/source.html new-template-name --provider anthropic

# Create newsletter skeleton
./scripts/new-newsletter.sh my-newsletter
```

## Template System Patterns

### Content File Structure (Markdown + YAML)
```yaml
---
template: dense-discovery  # Must match templates/<name>/ directory
title: "Newsletter Title"
preheader: "Preview text"
header:
  logoUrl: "https://..."
  quote: "Quote text"
sections:
  - type: "article"       # Determines which component renders
    title: "Section Title"
    items:
      - title: "Item"
        link: "https://..."
        description: "<p>HTML content</p>"
---
```

### Template Variables (Maizzle/Nunjucks syntax)
- **Always use nested paths**: `{{ header.logoUrl }}`, `{{ intro.title }}`
- **Triple braces for HTML**: `{{{ item.description }}}`
- **Loops**: `<each loop="item in section.items">...</each>`
- **Conditionals**: `<if condition="section.type === 'article'">...</if>`

### Section Types
Each template defines section types in `section-styles.json`. Common types:
- `sponsor`, `article`, `quote`, `link-list`, `header`, `footer`
- Novel types are auto-discovered by the email-template-factory

## Email Template Factory (LLM Pipeline)

Located in `scripts/email-template-factory/`. Transforms HTML emails into Maizzle templates.

### Pipeline Stages
1. **Visual Design Analysis** - Extract colors, typography, images
2. **Structural Analysis** - Identify sections and patterns
3. **Section Type Reconciliation** - Match vs reference templates, flag novel types
4. **Content Extraction** - Extract sample data
5. **Component Deep Extraction** - Generate Maizzle components

### Key Files
- `lib/factory.mjs` - Pipeline orchestrator
- `lib/reference-analyzer.mjs` - Learns conventions from existing templates
- `lib/section-type-reconciler.mjs` - Compares discovered vs known section types
- `lib/prompts.mjs` - LLM prompt templates

## Conventions to Follow

1. **Preserve inline styles** - Email clients require inline CSS; never move to external stylesheets
2. **Use table-based layouts** - Required for Outlook compatibility
3. **Section styles override hierarchy**: YAML frontmatter > `section-styles.json` > theme defaults
4. **Image validation** - Build script validates all image URLs are accessible
5. **Component naming** - PascalCase for component files (e.g., `Header.html`, `ArticleCard.html`)

## Placeholder Images

**Always use fpoimg.com** for placeholder images in templates, skeletons, and sample data. This ensures no broken images and allows evaluation of layout structure.

```
https://fpoimg.com/{width}x{height}?text={caption}&bg_color={bg_color}&text_color={text_color}
```

Examples:
- Basic: `https://fpoimg.com/600x400` (600×400 with defaults)
- With caption: `https://fpoimg.com/600x400?text=Hero+Image`
- Custom colors: `https://fpoimg.com/200x150?bg_color=4361ee&text_color=ffffff`
- Square: `https://fpoimg.com/200` (200×200 square)
- Logo placeholder: `https://fpoimg.com/200x50?text=Logo`
- Thumbnail: `https://fpoimg.com/120x120?text=Thumb`

Use appropriate dimensions for each context (hero images ~600px wide, thumbnails ~120px, logos ~200x50).

## Testing Generated Templates

```bash
# After generating a template, create test content and build
node scripts/build-newsletter.mjs content/template-test.md

# Output appears in build_production/template-test.html
# Build script auto-opens in browser unless --no-open flag
```

Every template should have a corresponding test content file in `content/` to verify rendering, as well as the generated HTML output for that sample content.

Every template should also have a sample content file in `templates/<name>/sample-content.md` demonstrating all features.

Every template should also have a skeleton generator script in `scripts/generate-<name>-skeleton.sh` to create new newsletters quickly.

Every template should have a section-styles.json defining available section types and styles.

Every template should have a README.md documenting its structure, variables, and usage.

Every template should also have a generated sample HTML email in `templates/<name>/sample-output.html` for quick reference and review.

## Environment Setup

Requires `.env` file with:
```
ANTHROPIC_API_KEY=sk-...   # For Claude-based template generation
OPENAI_API_KEY=sk-...      # Alternative LLM provider
```
