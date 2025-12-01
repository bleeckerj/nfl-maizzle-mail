# 🧭 Reusable Email Template Project (Maizzle-based)

This project is a modular, reusable HTML email system built with [**Maizzle**](https://maizzle.com/).  
It's designed to make creating and maintaining professional, responsive newsletters easy — especially those like *Wirecutter* or *The New York Times Recommendation* series — by separating **content**, **layout**, and **style**.

The goal is to author newsletters in **Markdown** (with YAML frontmatter), convert them into **JSON data**, and compile everything into bulletproof, table-based HTML emails ready for delivery via Sendy, Mailchimp, or any ESP.

---

## 🧱 Project Concept

Maizzle is the build system — it handles templating, inlining CSS, and making the final HTML compatible with Outlook, Gmail, and Apple Mail.

The workflow looks like this:

| Layer | Role | Example File |
|-------|------|---------------|
| **Authoring** | Where I write copy and configure each issue. | `content/2025-10-07.md` |
| **Conversion** | Converts Markdown → JSON. | `scripts/md_to_json.mjs` |
| **Schema** | Defines the structure for validation/autocomplete. | `newsletter.schema.json` |
| **Templating** | Defines layout and components. | `src/components/*.html`, `src/templates/newsletter.html` |
| **Build** | Combines templates + data → HTML. | `maizzle build production --data data/newsletter.json --inline` |

The system allows quick iteration:
1. Write Markdown.
2. Convert it to JSON.
3. Build and preview HTML.
4. Publish or paste it into your ESP.

---

## 🧩 Architecture Overview

**Authoring (Markdown)**  
Each issue starts as a Markdown file with YAML frontmatter, e.g.:

```markdown
---
title: The Recommendation — Patio Edition
hero:
  title: The best patio furniture
  url: https://example.com/patio
  image:
    src: https://cdn.com/hero.jpg
    alt: Patio set
  deck: Turn your patio into a comfortable, good-looking space.
  cta:
    href: https://example.com/patio
    label: Deck out your patio →
feature:
  title: Keep mosquitoes away
  url: https://example.com/mosquito
  image:
    src: https://cdn.com/mosquito.jpg
    alt: Thermacell repeller
---
```

**Conversion Script**
A Node script (using `gray-matter`) reads the Markdown frontmatter, converts it into structured JSON, and saves it as `data/newsletter.json`.

**Schema (optional)**
A JSON Schema (`newsletter.schema.json`) defines the structure so VS Code provides IntelliSense and validation when editing JSON.

**Templating**
Maizzle templates (using Nunjucks-like syntax) define reusable components:

* `HeaderLogo.html`
* `Hero.html`
* `Feature.html`
* `TwoUp.html`
* `Footer.html`

Each section maps directly to keys in the JSON data.

## 🎨 Section styles and injection order

Templates may include a `section-styles.json` file (located at `templates/<template>/section-styles.json`) that provides sane defaults for every section type the template supports. This file allows templates to declare:

- containerStyles: backgroundColor, padding, borderRadius (applied to the outer table/container)
- contentStyles: paragraph/font/color styles used when injecting HTML fragments
- linkStyles: inline styles applied to links inside injected HTML
- headingStyles: heading font/size/color defaults

**Implementation note:** Some keys in `section-styles.json` were added as forward-looking options and are not fully wired into every template yet. The current build pipeline and templates primarily consume `containerStyles` (backgroundColor, padding, borderRadius) and use `contentStyles`/`linkStyles` when preprocessing HTML fragments for inline styling. Other fields (for example, richer `headingStyles` variants or experimental properties) may be present in `section-styles.json` for future use; if you need a value applied now, provide it in the newsletter's frontmatter (per-section override) or update the template/build script to read that key.

Actively applied keys

The following keys from `section-styles.json` are actively applied by the build pipeline and templates today:

- `containerStyles.backgroundColor` — used by templates to set section/table background; if null, templates fall back to `themeColors.<section>` or a hardcoded default.
- `containerStyles.borderRadius` — used by templates to set border-radius (templates also include VML fallbacks for Outlook when non-zero).
- `contentStyles` (properties consumed):
  - `fontFamily`
  - `fontSize`
  - `lineHeight`
  - `color`
  - `textAlign`
  These are applied during preprocessing to injected HTML (item descriptions) and inserted into `<p>` tags as inline styles.
- `linkStyles` (properties consumed):
  - `fontFamily`
  - `fontSize`
  - `fontWeight`
  - `textDecoration`
  - `color` (supports the sentinel value `'inherit'`, which maps to the newsletter theme's `linkAccent`)
  These are applied to `<a>` tags in injected HTML; if absent the build falls back to `theme.linkAccent`.

Notes:
- `containerStyles.padding` is normalized and written into `section.containerStyles` by the build script, but templates in this project currently hard-code padding in their TDs (so `padding` is prepared but not yet consumed by dense templates).
- `headingStyles` is defined in `section-styles.json` and the build contains a CSS generator for it, but that generator is not invoked in the current pipeline — so heading-specific keys are not applied today.

How styles are applied (merge & precedence)

1. Template defaults — `templates/<template>/section-styles.json` provide the base values for each section type.
2. Color theme — the build process then applies colors from `data/color-themes.json` (the selected `colorTheme` for the newsletter) where `backgroundColor` or other color values are intentionally left `null` in the template defaults.
3. Issue-level frontmatter / JSON — values supplied in the newsletter's frontmatter (or already-converted `data/newsletter.json`) can override template defaults. You can provide global `sectionStyles` or per-section overrides in YAML/frontmatter.
4. Per-section / per-item overrides — explicit fields on a section or item in the frontmatter take highest precedence and will be applied on top of the merged defaults.

After merging, the build script (`scripts/build-newsletter.mjs`) writes the resolved style object into each section as `section.containerStyles` (and other merged fields) inside `data/newsletter.json`. Maizzle templates then read `section.containerStyles` directly when rendering, so templates can safely output inline styles and conditional MSO VML fallbacks for Outlook.

Note about Outlook (MSO) fallbacks

Because some email clients (Outlook) don't support CSS border-radius consistently, the templates include conditional VML fallbacks (e.g. `v:roundrect`) when a `borderRadius` is requested. The VML wrapper is emitted only when rounding is non-zero.

Quick-build template discovery

The `scripts/quick-build.mjs` helper now discovers available templates automatically by enumerating directories under `templates/`. Use the directory name as the template argument:

```
node scripts/quick-build.mjs dense-discovery content/my-issue.md
```

If a template directory is missing or you want to debug discovery set `DEBUG_QUICK_BUILD=1` to print what the script found.

**Build Process**
The command:

```bash
npx maizzle build production --data data/newsletter.json --inline
```

combines templates + data, inlines CSS, and outputs:

```
build_production/newsletter.html
```

That HTML file is the final, production-ready email.

---

## 🎯 Project Goals

* **Reusability:** one design system, many issues.
* **Ease of authoring:** write in Markdown, not HTML tables.
* **Robust output:** inline CSS, responsive tables, Outlook-safe.
* **AI-assisted editing:** Copilot or other LLMs can help draft content safely within the schema.
* **Extensibility:** support add-ons later (UTM tagging, dark mode, image optimization).

---

## 🚀 How to Operate This System

### **Quick Start (First Time Setup)**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test the complete workflow:**
   ```bash
   npm run test
   ```
   This converts the example `content/2025-10-07.md` → JSON → final HTML

3. **Check your output:**
   ```bash
   open build_production/newsletter.html
   ```

### **Daily Workflow (Creating New Newsletters)**

#### **Step 1: Create New Content**
```bash
# Duplicate the example file
cp content/2025-10-07.md content/2025-10-14.md

# Edit in VS Code (IntelliSense will help with YAML structure)
code content/2025-10-14.md
```

#### **Step 2: Edit Newsletter Content**
Edit the YAML frontmatter in your new `.md` file:

```yaml
---
title: "Your Newsletter Title"
hero:
  title: "Main headline"
  url: "https://your-link.com"
  image:
    src: "https://your-image-url.com/hero.jpg"
    alt: "Alt text for image"
  deck: "Subheading description"
  cta:
    href: "https://your-cta-link.com"
    label: "Your CTA Text →"
feature:
  title: "Featured article title"
  url: "https://feature-link.com"
  image:
    src: "https://feature-image.com/image.jpg"
    alt: "Feature image alt text"
  html: |
    <p>Your feature content with <strong>HTML formatting</strong>.</p>
    <p>Multiple paragraphs supported.</p>
# ... more sections
---
```

#### **Step 2.5: Lint Your Content (Optional but recommended)**

Run the new linter before building a template to catch missing sections, malformed items, or schema violations up front:

```bash
npm run lint:content content/2025-10-14.md
npm run lint:content data/newsletter.json
```

The script parses your Markdown/JSON frontmatter, validates section/item structure, checks any referenced `section-styles` file, and runs the template-specific schema (when available). It prints the problematic path for each issue and exits with a non-zero status when the file cannot be safely rendered.

#### **Step 3: Build Your Email**


**Option A: Use the quick workflow script**
```bash
# Usage: ./workflow.sh [--content <path>] [--template <name>] [--output <path>] [--send-test|send-test]
./workflow.sh content/2025-10-14.md dense-discovery
# Short-form flags are also available:
./workflow.sh --content content/2025-10-14.md --template dense-discovery --output build_production/custom-output.html
./workflow.sh content/2025-10-14.md dense-discovery --send-test
```

**Option B: Run individual commands**
```bash
# Convert Markdown → JSON
node scripts/md_to_json.mjs content/2025-10-14.md

# Build HTML from JSON
npm run build:data
```

**Option C: Use npm scripts**
```bash
# This is basically what you want to do
node ./scripts/quick-build.mjs dense-discovery ./data/2025/w43-y25.md

# Test with example content
npm run test

# Preview (builds and opens in browser)
npm run preview
```

#### **Step 4: Get Your Final HTML**
Your production-ready HTML email is now at:
```
build_production/newsletter.html
```

**Copy this entire HTML file and paste it into:**
- Sendy
- Mailchimp
- Campaign Monitor
- Any other email service provider

### Send a Test Email via AWS SES

If you already use **AWS SES** (for example with Sendy), you can fire off a device-ready test directly from this repo and skip the copy/paste step until you are ready for the final blast.

1. **Verify and authorize**
  - In the SES console, verify your sender identity (domain or explicit email). While still in the sandbox, also verify the one or two inboxes you use for tests.
  - Create an IAM user with programmatic access. Grant it `ses:SendEmail` and `ses:SendRawEmail` (the managed `AmazonSESFullAccess` policy is fine for testing) and capture the access key + secret.
2. **Configure environment variables** (inside `.env` or your shell):
  ```bash
  AWS_REGION=us-west-2
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=supersecret
  SES_FROM=you@yourdomain.com
  SES_TO=test1@example.com,test2@example.com
  SES_SUBJECT=Newsletter rendering test
  ```
  The script also respects the default AWS credential chain (`~/.aws/credentials`, `AWS_PROFILE`, etc.), so the `AWS_*` lines are optional if you already have a profile configured.
3. **Send the compiled HTML** (defaults to `workflow-test.html` when no path is supplied):
  ```bash
  npm run send:test -- build_production/w48-y25.html
  ```
  or run the script directly:
  ```bash
  node scripts/send-ses-test.mjs build_production/w48-y25.html
  ```

Chain it to the workflow for one-touch previews:

```bash
./workflow.sh content/2025-10-14.md dense-discovery workflow-test.html \
  && npm run send:test -- workflow-test.html
```

### **File Structure Guide**

```
nfl-maizzle-mail/
├── content/                    # Your newsletter content (Markdown)
│   └── 2025-10-07.md          # Example newsletter
├── data/                       # Generated JSON data
│   └── newsletter.json         # Auto-generated from Markdown
├── build_production/           # Final HTML output
│   └── newsletter.html         # Copy this into your ESP!
├── src/
│   ├── components/            # Reusable email components
│   ├── templates/             # Main newsletter template
│   └── layouts/               # Base HTML layout
├── scripts/
│   └── md_to_json.mjs         # Markdown → JSON converter
└── newsletter.schema.json     # VS Code IntelliSense schema
```

### **Available Commands**

| Command | Purpose |
|---------|---------|
| `npm run test` | Convert example content → build HTML |
| `npm run build:data` | Build HTML from existing JSON |
| `npm run convert <file.md>` | Convert specific Markdown file to JSON |
| `npm run lint:content <file>` | Validate Markdown/JSON frontmatter before building (sections, section-styles, schema) |
| `npm run preview` | Build and open in browser |
| `./workflow.sh <file.md> [template] [output-file]` | Complete workflow for specific file, template, and (optionally) output path |

## 🔧 Generator: create canonical Markdown samples

This repository includes a small utility to generate a canonical Markdown sample for a template. It is useful when you want a quick FPO (for-position-only) newsletter that exercises a template's sections and layout.

- Script path: `scripts/generate_md_from_template.mjs`
- Purpose: inspect a template (or its `section-styles.json`) and emit a Markdown file with YAML frontmatter containing `intro`, `header`, `sections`, and `footer` populated with FPO content and placeholder images.

Usage:

```bash
# Generate a sample for one template (defaults to 1 item per section)
node scripts/generate_md_from_template.mjs dense-discovery

# Generate 2 items per section
node scripts/generate_md_from_template.mjs dense-discovery --items 2

# Generate samples for every template in the `templates/` folder (batch)
node scripts/generate_md_from_template.mjs --batch --items 2

# Specify an output path
node scripts/generate_md_from_template.mjs dense-discovery --output generated/my-sample.md
```

What it does
- Detects section types by scanning `templates/<template>/newsletter.html` for `section.type` checks, falling back to `templates/<template>/section-styles.json` keys or sensible defaults.
- Emits semantically consistent English FPO copy (no Latin) tailored to each section type; useful for layout testing. You can control how many items a section contains with `--items`.
- Alternates supplied placeholder images (4x5 and 1x1) to help evaluate different image aspect ratios in the template layout.
- Emits YAML frontmatter using `js-yaml` so HTML block scalars are formatted correctly. The generated file default location is `generated/<template>-sample.md` unless `--output` is provided.

Footer and extras
- The generator injects a `footer` block into the frontmatter (email share link, subscribe link, social links, gratitude, address, colophon). If you want the `address` field emitted as an explicit YAML block scalar with `|`, say so and the generator can be adjusted to force block-style output.

Dependencies
- The generator uses `js-yaml` for robust YAML serialization. If you haven't already installed dependencies after pulling changes, run:

```bash
npm install
```

Notes
- This tool is intentionally heuristic and designed to provide a fast, usable sample. If a template contains a `schema.json`, the generator can be extended to prefer that authoritative schema (PR welcome).


### **Pro Tips**

✅ **Use VS Code** - The JSON schema provides autocomplete and validation  
✅ **Test early, test often** - Run `npm run test` frequently to catch issues  
✅ **Preview in browser** - Use `npm run preview` to see your email before sending  
✅ **Keep images optimized** - Use appropriately sized images for email  
✅ **Test with placeholders** - Use placeholder images during development  

### **Troubleshooting**

**Q: My title shows "undefined"**  
A: Make sure your Markdown file has proper YAML frontmatter with a `title:` field

**Q: Images aren't showing**  
A: Check that your image URLs are publicly accessible and use HTTPS

**Q: Components aren't rendering**  
A: Run `npm run build:data` after making changes to ensure fresh build

**Q: JSON schema validation errors**  
A: Check that all required fields are present in your YAML frontmatter

---

## 🎨 Multi-Template System

This system supports multiple email templates that you can switch between or experiment with.

### **Template Structure**

```
templates/
├── wirecutter/              # Current "recommendation" style template
│   ├── components/          # Template-specific components
│   │   ├── HeaderLogo.html
│   │   ├── Hero.html
│   │   ├── Feature.html
│   │   ├── TwoUp.html
│   │   └── Footer.html
│   ├── layouts/
│   │   └── main.html
│   ├── newsletter.html      # Main template file
│   └── schema.json         # Template-specific schema
├── newsletter/              # Traditional newsletter template
│   ├── components/
│   ├── layouts/
│   ├── newsletter.html
│   └── schema.json
└── digest/                  # News digest template
    ├── components/
    ├── layouts/
    ├── newsletter.html
    └── schema.json
```

### **Using Different Templates**

#### **Method 1: Template-Specific Build Commands**
```bash
# Build with Wirecutter template (current default)
npm run build:wirecutter

# Build with Newsletter template
npm run build:newsletter  

# Build with Digest template
npm run build:digest
```

#### **Method 2: Template Parameter**
```bash
# Convert content with specific template
node scripts/md_to_json.mjs content/my-issue.md --template=newsletter

# Build with specific template
npm run build -- --template=newsletter
```

#### **Method 3: Specify in Content Frontmatter**
```yaml
---
template: "newsletter"  # Override default template
title: "My Newsletter"
# ... rest of content
---
```

### **Creating New Templates**

#### **Option A: From Scratch**
```bash
# Create new template structure
node scripts/create_template.mjs mynewtemplate

# This creates:
# templates/mynewtemplate/
# ├── components/
# ├── layouts/
# ├── newsletter.html
# └── schema.json
```

#### **Option B: From Existing Email HTML**
```bash
# Decompose existing email into template
node scripts/decompose_email.mjs existing-email.html mynewtemplate

# This analyzes the HTML and creates:
# 1. Component files for reusable sections
# 2. Schema definition based on content structure  
# 3. Sample content file showing expected data
```

### **Reliable Email Decomposition System**

A consistently reliable workflow for decomposing HTML emails into reusable components using multi-strategy analysis:

#### **🚀 Recommended Commands**

```bash
# Reliable workflow (enhanced heuristics + validation)
npm run decompose:reliable input.html template-name

# Automatic AI analysis (requires OPENAI_API_KEY)  
npm run decompose:auto input.html template-name

# Comprehensive analysis (all methods)
npm run decompose:comprehensive input.html template-name
```

#### **🔧 Legacy Workflows**

```bash
# List available workflows
npm run decompose:workflows

# Quick heuristic analysis (basic)
npm run decompose:quick input.html template-name

# Smart AI-powered analysis (manual GPT)  
npm run decompose:smart input.html template-name

# Interactive step-by-step analysis
npm run decompose:interactive input.html template-name

# Compare multiple analysis methods
npm run decompose:compare input.html template-name
```

#### **🎯 Reliable Workflow Features**

- **Multi-Strategy Analysis**: Combines enhanced heuristics + semantic analysis + newsletter-specific patterns
- **Email Type Detection**: Automatically detects newsletter, marketing, transactional, or ecommerce emails  
- **Confidence Scoring**: Provides reliability scores and validation metrics
- **Automatic API Integration**: Uses GPT-4o when `OPENAI_API_KEY` is set
- **Validation System**: Quality checks and recommendations for each decomposition
- **Fallback Support**: Works without API keys, gracefully handles failures

#### **📊 Workflow Comparison**

| Workflow | Speed | Accuracy | Reliability | AI Required |
|----------|-------|----------|-------------|-------------|
| **Reliable** | ⚡⚡ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Optional |
| **Auto** | ⚡ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Yes (GPT-4o) |
| **Quick** | ⚡⚡⚡ | ⭐⭐⭐ | ⭐⭐ | No |
| **Smart** | ⚡⚡ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Manual GPT |

#### **🤖 Automatic AI Integration**

Set up OpenAI API for automatic GPT-4o analysis:

```bash
# Set your API key (get from https://platform.openai.com/api-keys)
export OPENAI_API_KEY="your-api-key-here"

# Run automatic analysis 
npm run decompose:auto emails/newsletter.html my-template

# Or comprehensive analysis (all methods)
npm run decompose:comprehensive emails/newsletter.html my-template
```

The system automatically:
- Detects email complexity and chooses appropriate analysis
- Falls back to heuristics if API fails
- Combines multiple analysis methods for maximum accuracy
- Provides confidence and reliability scores

#### **Example Decomposition**

```bash
# Real-world examples:
npm run decompose:quick emails/morning-brew.html morningbrew
npm run decompose:smart emails/hacker-news.html hackernews  
npm run decompose:compare emails/product-hunt.html producthunt
```

All workflows produce:
- **Component files** (Header, Hero, Content, Footer)
- **Template structure** (main template + layout)
- **JSON schema** (data validation)
- **Sample data** (example content)
- **Analysis report** (confidence scores)

### **Template Management Commands**

| Command | Purpose |
|---------|---------|
| `npm run templates:list` | Show all available templates |
| `npm run templates:create <name>` | Create new blank template |
| `npm run templates:copy <from> <to>` | Duplicate existing template |
| `npm run templates:set-default <name>` | Set default template |
| `node scripts/decompose_email.mjs <html> <name>` | Create template from existing email |

### **Template Switching in Content**

Your Markdown files can specify which template to use:

```yaml
---
template: "newsletter"           # Use newsletter template
title: "Weekly Update"
layout: "sidebar"               # Optional: layout variant
theme: "dark"                   # Optional: theme variant

# Newsletter-specific structure
sections:
  - type: "header"
    logo: "..."
  - type: "article-list"
    articles: [...]
  - type: "footer"
---
```

### **Advanced Features**

#### **Template Inheritance**
```yaml
# In template config
extends: "wirecutter"           # Inherit from wirecutter template
overrides:
  hero: "custom-hero.html"      # Override specific components
  colors:
    primary: "#ff6b35"          # Override theme colors
```

#### **Component Mixins**
```bash
# Mix components from different templates
npm run build -- --template=newsletter --hero=wirecutter --footer=digest
```

#### **Template Variants**
```
templates/wirecutter/
├── variants/
│   ├── dark-mode/
│   ├── holiday/
│   └── minimal/
```

---

## 🧠 How Copilot Should Help

When assisting in VS Code, GitHub Copilot should:

1. Understand this is a **static email generation pipeline** (not a web app).
2. Generate or refactor **Maizzle components** using email-safe table markup.
3. Suggest **copywriting** (headlines, blurbs, CTAs) in Markdown/YAML.
4. Help write or maintain the **Markdown → JSON converter** script.
5. Help define or extend the **JSON Schema** for content validation.
6. Maintain Maizzle syntax (`{% include %}`, `{{ variable }}`) without breaking the pipeline.
7. Keep output HTML **simple, light, and robust** for all email clients.

---

## ✍️ Typical Workflow

1. Create or duplicate a Markdown file in `content/`:

   ```bash
   cp content/2025-10-07.md content/2025-10-14.md
   ```
2. Edit text, images, and links inside the YAML frontmatter.
3. Run the converter:

   ```bash
   node scripts/md_to_json.mjs content/2025-10-14.md data/newsletter.json
   ```
4. Build the email:

   ```bash
   npx maizzle build production --data data/newsletter.json --inline
   ```
5. Preview or paste `build_production/newsletter.html` into your ESP.

---

## 🧰 Tools Involved

* **Maizzle** — email templating, build pipeline, inline CSS.
* **gray-matter** — parse Markdown frontmatter.
* **Node.js** — conversion and build scripts.
* **JSON Schema + VS Code** — validation and autocomplete.
* **GitHub Copilot** — writing assistant for copy, scripts, and component creation.

---

## 🪄 Copilot Prompts You Can Use

Here are a few examples you can paste directly into Copilot Chat:

> "I'm building a Markdown-authored, Maizzle-rendered HTML email system.
> Help me write a Node script that converts Markdown frontmatter into JSON for Maizzle."

> "Draft a JSON Schema for my newsletter data model based on this YAML frontmatter structure."

> "Write a new Maizzle component for a testimonial quote block that fits into my email's table-based system."

> "Suggest alternate headline and subhead copy for my `hero` section in a friendly, conversational tone."

> "Ensure my Maizzle build command also appends UTM tracking parameters to all URLs."

---

## 🚫 What Not to Do

Copilot (and I) should avoid:

* Using CSS grid, flexbox, or modern web layout in emails.
* Generating JavaScript for the email client.
* Inserting external fonts that aren't email-safe (unless properly embedded).
* Breaking the JSON structure that feeds Maizzle.

---

## 🔮 Future Enhancements

* Dark-mode image swap pattern.
* Automated UTM tagging.
* RSS-to-Markdown ingestion (for newsletters that mirror blog content).
* "Issue generator" script that bootstraps a new Markdown file with placeholder content.
