# Newsletter Workflow Guide

## Quick Start

### Single Command Build (Recommended)
```bash
# Build from Markdown with automatic template detection
node scripts/build-newsletter.mjs content/your-file.md

# Build with specific template and output name
node scripts/build-newsletter.mjs content/your-file.md campaign-name --template=wirecutter

# Build without auto-opening browser
node scripts/build-newsletter.mjs content/your-file.md --no-open
```

### NPM Script Shortcuts
```bash
# Auto-select file with template
npm run quick wirecutter
npm run quick brain-dead  
npm run quick sentiers

# Build specific file with template
npm run quick wirecutter content/your-file.md
npm run quick brain-dead content/your-file.md

# List available content files
npm run quick list

# Full control (original method)
npm run build:newsletter content/your-file.md output-name --template=template-name
```

## Workflow Steps (Automated)

When you run the build command, it automatically:

1. **Converts Markdown → JSON** (`md_to_json.mjs`)
   - Parses YAML frontmatter from your `.md` file
   - Converts to proper JSON structure for the template
   - Saves to `data/newsletter.json`

2. **Builds Newsletter** (`npm run build:data`)
   - Runs Maizzle build process
   - Uses template specified in JSON data
   - Outputs to `build_production/newsletter.html`

3. **Saves Final File** 
   - Copies to your specified output filename
   - Example: `build_production/holiday-guide.html`

4. **Opens in Browser** (unless `--no-open` flag used)

## File Structure

```
📁 content/                    # Markdown source files
  └── wirecutter-20251107-holiday.md
📁 data/                       # JSON data files (auto-generated)
  └── newsletter.json
📁 build_production/           # Built HTML files
  └── holiday-guide.html
📁 templates/                  # Email templates
  ├── wirecutter/
  ├── brain-dead-template/
  └── sentiers-llm/
```

## Available Templates

- `wirecutter` - Clean, article-focused layout
- `brain-dead-template` - Streetwear/product showcase
- `sentiers-llm` - Newsletter/content format

## Creating New Content

### Using Snippets (Recommended)

1. **Generate template snippet**:
```bash
npm run snippet wirecutter my-article-name
npm run snippet brain-dead collection-name  
npm run snippet sentiers newsletter-name
```

2. **Edit the generated file** (automatically named with date):
```bash
code content/my-article-name-20251008.md
```

3. **Build the newsletter**:
```bash
npm run quick wirecutter content/my-article-name-20251008.md
```

### Manual Creation

1. **Create Markdown file** in `content/` folder:
```yaml
---
title: "Your Newsletter Title"
logo:
  href: "https://your-site.com"
  src: "https://dummyimage.com/200x50/007cba/ffffff&text=LOGO"
  alt: "Logo"
hero:
  title: "Main Article Title"
  url: "https://example.com/article"
  image:
    src: "https://picsum.photos/600/300"
    alt: "Hero image description"
  deck: "Article description"
  cta:
    href: "https://example.com/article"
    label: "Read More →"
---

# Optional markdown content here
```

2. **Build newsletter**:
```bash
node scripts/build-newsletter.mjs content/your-file.md
```

## Troubleshooting

### Common Issues:
- **Build fails**: Check that your Markdown file has valid YAML frontmatter
- **Wrong template**: Add `--template=template-name` flag
- **Images broken**: Use `dummyimage.com` or `picsum.photos` for placeholders
- **File not found**: Check file paths are correct

### Debug Mode:
```bash
# Run individual steps to debug
node scripts/md_to_json.mjs content/your-file.md --template=wirecutter
npm run build:data
```

## Template Snippets

Generate pre-filled content files for any template:

```bash
# Available templates
npm run snippet                           # Show usage
npm run snippet wirecutter product-guide  # Tech/product newsletter
npm run snippet brain-dead spring-drop    # Streetwear collection  
npm run snippet sentiers news-roundup     # News/article digest
```

**Generated files include:**
- ✅ Complete YAML frontmatter structure
- ✅ Template-specific fields and examples
- ✅ Working placeholder images
- ✅ Automatic date-based naming
- ✅ Ready-to-edit placeholders

## Examples

### Using Snippets (Fastest)
```bash
# Create → Edit → Build workflow
npm run snippet wirecutter holiday-tech
code content/holiday-tech-20251008.md     # Edit placeholders
npm run quick wirecutter content/holiday-tech-20251008.md
```

### Basic Wirecutter Newsletter
```bash
node scripts/build-newsletter.mjs content/product-review.md product-review --template=wirecutter
```

### Brain Dead Streetwear Campaign  
```bash
node scripts/build-newsletter.mjs content/new-drop.md streetwear-drop --template=brain-dead-template
```

### Quick Holiday Build
```bash
npm run build:holiday
```

---

**Result**: Single command builds complete newsletter from Markdown to HTML with working placeholder images! 🎉