# Scripts Directory

This directory contains automation scripts for the NFL Maizzle Mail newsletter system.

## Newsletter Creation Scripts

### Quick Start: Create a New Newsletter

```bash
# Create a newsletter with today's date
./scripts/new-newsletter.sh

# Create with a custom name
./scripts/new-newsletter.sh my-weekly-update

# Create a minimal version (less boilerplate)
./scripts/new-newsletter.sh --minimal

# Create minimal with custom name
./scripts/new-newsletter.sh --minimal weekly-digest
```

### Advanced: Generate Custom Skeletons

```bash
# Generate with specific section types only
python scripts/generate-newsletter-skeleton.py \
  --sections feature dispatch food-for-thought \
  --output content/custom-newsletter.md

# List all available section types
python scripts/generate-newsletter-skeleton.py --list-sections

# Generate to a specific location
python scripts/generate-newsletter-skeleton.py \
  --output templates/my-custom-skeleton.md
```

## Available Scripts

### `new-newsletter.sh`
**Quick wrapper for creating newsletters**

Creates a new newsletter in the `content/` directory with a generated skeleton.

```bash
Usage: ./scripts/new-newsletter.sh [OPTIONS] [FILENAME]

Options:
  --minimal, -m    Generate minimal skeleton with fewer examples

Arguments:
  FILENAME        Custom filename (default: newsletter-YYYY-MM-DD.md)
```

Examples:
```bash
./scripts/new-newsletter.sh                        # newsletter-2025-11-12.md
./scripts/new-newsletter.sh week-46                # week-46.md
./scripts/new-newsletter.sh --minimal monthly      # monthly.md (minimal)
```

### `generate-newsletter-skeleton.py`
**Python script for generating newsletter skeletons**

More powerful and configurable than the shell wrapper.

```bash
Usage: python scripts/generate-newsletter-skeleton.py [OPTIONS]

Options:
  -h, --help              Show help message
  --minimal               Generate minimal skeleton
  --output FILE, -o FILE  Output filename
  --sections TYPE [TYPE ...]  Only include specific section types
  --list-sections         List all available section types
```

Examples:
```bash
# Full skeleton with all section types
python scripts/generate-newsletter-skeleton.py --output my-newsletter.md

# Only features and articles
python scripts/generate-newsletter-skeleton.py \
  --sections feature food-for-thought \
  --output feature-digest.md

# Minimal skeleton
python scripts/generate-newsletter-skeleton.py --minimal -o minimal.md
```

## Section Types Reference

| Section Type | Description | Common Use |
|--------------|-------------|------------|
| `feature` | Featured content | Project, event, or resource highlights |
| `dispatch` | Announcements | News, updates, signals |
| `apps-sites` | Apps/websites (2-col) | App/site reviews |
| `apps-sites-single-column` | Apps/websites (1-col) | Full-width app features |
| `quote` | Quotes | Inspirational quotes |
| `indie-mag` | Publications (2-col) | Magazine features |
| `indie-mag-single-column` | Publications (1-col) | Full-width articles |
| `books-accessories` | Products | Book/product reviews |
| `food-for-thought` | Articles | Recommended reading |
| `aesthetically-pleasing` | Visual content | Image showcases |
| `classifieds` | Listings | Job posts, classifieds |
| `animated-image` | GIFs/animations | Animated content |

## Workflow Examples

### Weekly Newsletter Workflow

```bash
# 1. Create new newsletter
./scripts/new-newsletter.sh week-46-2025

# 2. Edit the content
code content/week-46-2025.md

# 3. Build the newsletter
npm run build

# 4. Preview
open build_production/week-46-2025.html
```

### Custom Template for Regular Use

Create a custom skeleton for newsletters you send regularly:

```bash
# Create your template once
python scripts/generate-newsletter-skeleton.py \
  --sections feature dispatch food-for-thought quote \
  --output templates/weekly-template.md

# Copy it for each new newsletter
cp templates/weekly-template.md content/week-46.md
```

### Minimal Monthly Digest

For simpler newsletters:

```bash
./scripts/new-newsletter.sh --minimal monthly-digest-nov
```

## Tips

- **Default location**: New newsletters go to `content/` directory
- **Date format**: Default filename is `newsletter-YYYY-MM-DD.md`
- **Overwrite protection**: Script will prompt before overwriting existing files
- **Image placeholders**: Generated files use placeholder images - replace with real URLs
- **Color themes**: Reference `data/color-themes.json` for available themes
- **Section styles**: Point `sectionStylesFile` to custom color configurations

## File Structure

After generation, your markdown file will have this structure:

```yaml
---
template: dense-discovery
title: Newsletter Title
preheader: Preview text
sectionStylesFile: templates/dense-discovery/section-styles.json
intro:
  title: Welcome
  content: <p>Intro text</p>
header:
  quote: Header quote
  author: Author
sections:
  - type: feature
    title: Section Title
    items:
      - title: Item Title
        description: <p>Content</p>
footer:
  # Footer configuration
---
```

## See Also

- [Newsletter Skeleton Guide](../docs/NEWSLETTER-SKELETON-GUIDE.md) - Detailed field reference
- [Workflow Documentation](../WORKFLOW.md) - Complete workflow guide
- [Color Themes](../data/color-themes.json) - Available color themes

## Troubleshooting

**Script not executable:**
```bash
chmod +x scripts/new-newsletter.sh
```

**Python not found:**
Ensure Python 3 is installed:
```bash
python --version  # or python3 --version
```

**Missing PyYAML:**
```bash
pip install pyyaml
```

**Wrong output location:**
Use absolute paths or check your current directory:
```bash
python scripts/generate-newsletter-skeleton.py --output /full/path/to/file.md
```
