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

#### **Step 3: Build Your Email**

**Option A: Use the quick workflow script**
```bash
./workflow.sh content/2025-10-14.md
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
| `npm run preview` | Build and open in browser |
| `./workflow.sh <file.md>` | Complete workflow for specific file |

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