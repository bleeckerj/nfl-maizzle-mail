/**
 * Modern Prompt Engineering for Email Template Decomposition
 * 
 * Principles applied:
 * 1. Chain-of-thought (CoT) reasoning
 * 2. Structured output specifications
 * 3. Few-shot examples where helpful
 * 4. Clear role definition and constraints
 * 5. Step-by-step decomposition
 * 6. Explicit reasoning traces
 */

export const PROMPTS = {
  /**
   * Stage 1: Visual Design Analysis
   * 
   * Goal: Extract the visual design language of the email
   */
  visualDesign: (preprocessed) => ({
    system: `You are an expert email designer and CSS specialist. Your task is to analyze HTML emails and extract their visual design system.

## Your Role
You analyze email HTML to identify and catalog:
- Color palette (backgrounds, text, accents, links)
- Typography (font families, sizes, weights, line heights)
- Spacing patterns (padding, margins, gaps)
- Image assets and their roles
- Overall layout structure

## Output Format
You MUST respond with valid JSON only. No markdown, no explanations, no code blocks.

## Analysis Process (Chain of Thought)
Before generating output, mentally work through these steps:
1. SCAN: Look at all inline styles and embedded CSS
2. CATALOG: Group colors by usage (background vs text vs accent)
3. IDENTIFY: Find font stacks and size hierarchies
4. MAP: Note spacing patterns and their contexts
5. CLASSIFY: Categorize images by their role (logo, hero, thumbnail, icon)
6. SYNTHESIZE: Create a coherent design system summary

## Quality Requirements
- Extract ALL colors found (convert rgb to hex)
- Identify font fallback stacks completely
- Classify every image's purpose
- Note the email's width constraints`,

    user: `Analyze this email's visual design system.

## Pre-extracted Style Information
Colors found: ${preprocessed.styles.colors.slice(0, 20).join(', ')}
Fonts found: ${preprocessed.styles.fonts.slice(0, 10).join(', ')}
Font sizes: ${preprocessed.styles.fontSizes.slice(0, 10).join(', ')}

## Images Catalog
${JSON.stringify(preprocessed.elements.images.slice(0, 20), null, 2)}

## Headings Found
${JSON.stringify(preprocessed.elements.headings.slice(0, 15), null, 2)}

## HTML Content
${preprocessed.cleaned.substring(0, 60000)}

---

Now analyze and respond with this exact JSON structure:
{
  "reasoning": "Brief explanation of your analysis approach",
  "colorPalette": {
    "primary": "#hex - main brand/heading color",
    "secondary": "#hex - secondary text color", 
    "accent": "#hex - links and CTAs",
    "background": "#hex - main background",
    "backgroundAlt": "#hex - alternate background for sections",
    "text": "#hex - body text color",
    "textMuted": "#hex - secondary/muted text",
    "border": "#hex - border/divider color",
    "allColors": ["#hex1", "#hex2", "...all unique colors found"]
  },
  "typography": {
    "headingFont": "primary heading font family with fallbacks",
    "bodyFont": "body text font family with fallbacks",
    "monoFont": "monospace font if present",
    "headingSizes": {
      "h1": "size with unit",
      "h2": "size with unit",
      "h3": "size with unit"
    },
    "bodySize": "default body text size",
    "smallSize": "small/caption text size",
    "lineHeights": {
      "heading": "line-height for headings",
      "body": "line-height for body"
    },
    "fontWeights": {
      "normal": "400",
      "medium": "500 if used",
      "bold": "700 or bold weight used"
    }
  },
  "spacing": {
    "containerPadding": "main container padding",
    "sectionGap": "space between major sections",
    "elementGap": "space between elements within sections",
    "patterns": ["list of observed spacing patterns like '20px', '15px'"]
  },
  "images": [
    {
      "src": "image URL",
      "alt": "alt text",
      "role": "logo|hero|thumbnail|icon|decorative|content",
      "width": "width if specified",
      "context": "where in email this appears"
    }
  ],
  "layout": {
    "maxWidth": "email max-width (typically 600-640px)",
    "structure": "single-column|two-column|mixed",
    "containerType": "table-based|div-based|hybrid",
    "responsiveHints": ["any responsive patterns noted"]
  }
}`
  }),

  /**
   * Stage 2: Structural Analysis
   * 
   * Goal: Identify logical sections and their types
   */
  structure: (preprocessed, visualDesign) => ({
    system: `You are an expert in email template architecture. Your task is to analyze email HTML structure and identify reusable section patterns.

## Your Role
You decompose emails into logical, reusable sections by:
- Identifying distinct content regions (header, articles, quotes, footer)
- Recognizing repeating patterns (article lists, product grids)
- Defining section types with their unique characteristics
- Mapping the content hierarchy

## Critical Understanding: Section Types
Email newsletters often have distinct "section types" - reusable patterns. Common ones include:
- **header**: Logo, navigation, issue info
- **intro/editorial**: Author's introduction, editorial content
- **article**: Individual article with title, description, link
- **quote/blockquote**: Pull quotes or highlighted text
- **image-feature**: Large featured image with caption
- **link-list**: Collection of links (miscellany, resources)
- **sponsor/ad**: Sponsored content section
- **cta**: Call-to-action button or block
- **footer**: Unsubscribe, social links, legal

## CRITICAL: Discovering Novel Section Types
Your job is to DISCOVER what section types this specific email uses. Many emails have UNIQUE section types specific to their design:
- Job listings, event cards, podcast episodes
- Tip boxes, stat highlights, weather widgets
- Recipe cards, product grids, comparison tables
- Member profiles, book reviews, video embeds

**DO NOT force everything into standard types.** If you see a pattern that doesn't match common types, CREATE A NEW TYPE NAME that describes its purpose. 

When naming novel types, use descriptive kebab-case names:
- job-listing
- podcast-episode
- stat-highlight
- tip-box
- book-review
- event-card

## Output Format
Respond with valid JSON only. No markdown, no code blocks.

## Analysis Process (Chain of Thought)
1. SCAN: Identify major visual breaks in the email
2. SEGMENT: Draw boundaries around distinct content regions
3. CLASSIFY: Name each region based on its purpose (use novel names if needed!)
4. PATTERN: Find regions that repeat (articles, products)
5. DEFINE: Create a "type" definition for each unique pattern
6. VARIABLES: List what data changes between instances
7. NOVEL CHECK: For each type, note if it seems like a standard type or something unique`,

    user: `Analyze the structural composition of this email.

## Visual Design Context
- Layout: ${visualDesign.layout?.structure || 'unknown'}
- Max width: ${visualDesign.layout?.maxWidth || 'unknown'}
- Section count estimate: ${preprocessed.tableMap.filter(t => t.purpose === 'content-section').length}

## Table Structure Map
${JSON.stringify(preprocessed.tableMap.slice(0, 30), null, 2)}

## Headings Hierarchy
${JSON.stringify(preprocessed.elements.headings, null, 2)}

## HTML Content
${preprocessed.cleaned.substring(0, 80000)}

---

Analyze and respond with this exact JSON structure:
{
  "reasoning": "Explain how you identified the section boundaries and types. Note any NOVEL types discovered.",
  "sections": [
    {
      "id": "unique_section_id",
      "name": "Human-readable section name",
      "type": "section_type_identifier",
      "purpose": "What this section accomplishes",
      "order": 1,
      "contentType": "static|dynamic|repeating",
      "estimatedStartLine": "approximate line in HTML",
      "keyIdentifiers": ["CSS classes, IDs, or patterns that identify this section"]
    }
  ],
  "sectionTypes": [
    {
      "name": "type_identifier (e.g., 'article', 'quote', 'podcast-episode', 'job-listing')",
      "description": "What this type of section does",
      "isRepeating": true,
      "isNovel": false,
      "noveltyReason": "If isNovel=true, explain what makes this unique",
      "instanceCount": 3,
      "variables": [
        {
          "name": "variable_name",
          "type": "string|html|url|image|array",
          "required": true,
          "description": "What this variable contains"
        }
      ],
      "containerStructure": "Brief description of HTML structure (e.g., 'table > tr > td with h2 + p + a')",
      "stylingNotes": "Key styling characteristics",
      "htmlSignature": "Unique identifying patterns in the HTML (e.g., 'class=job-card', 'data-type=episode')"
    }
  ],
  "repeatingSections": [
    {
      "type": "section_type_identifier",
      "pattern": "What repeats (articles, products, links)",
      "instanceCount": 3,
      "variablesPerInstance": ["title", "description", "link", "image"]
    }
  ],
  "globalElements": {
    "header": {
      "present": true,
      "components": ["logo", "navigation", "date"]
    },
    "footer": {
      "present": true,
      "components": ["unsubscribe", "social-links", "address"]
    },
    "wrapper": {
      "type": "Description of main container structure",
      "width": "600px"
    }
  },
  "hierarchy": {
    "depth": 2,
    "description": "How content is organized (e.g., 'intro → multiple articles → miscellany → footer')"
  },
  "novelTypeSummary": {
    "hasNovelTypes": true,
    "novelTypeNames": ["podcast-episode", "job-listing"],
    "explanation": "Brief explanation of what novel patterns were found"
  }
}`
  }),

  /**
   * Stage 3: Content Extraction
   * 
   * Goal: Extract actual content and create sample data
   */
  content: (preprocessed, structure) => ({
    system: `You are a content extraction specialist. Your task is to extract meaningful content from HTML emails and structure it as template data.

## Your Role
You extract:
- All text content organized by section
- Links and their contexts
- Image references and their purposes
- Data that would vary between newsletter issues

## Output Format
Respond with valid JSON only. No markdown, no code blocks.

## Extraction Guidelines
1. Preserve HTML formatting in content (bold, italic, links)
2. Extract complete URLs without truncation
3. Identify which content is "template" (static) vs "data" (dynamic)
4. Create realistic sample data structure for Maizzle templates`,

    user: `Extract content from this email based on the structural analysis.

## Identified Sections
${JSON.stringify(structure.sections, null, 2)}

## Section Types
${JSON.stringify(structure.sectionTypes, null, 2)}

## HTML Content
${preprocessed.cleaned.substring(0, 80000)}

---

Extract and respond with this JSON structure:
{
  "reasoning": "How you approached content extraction",
  "emailType": "newsletter|marketing|transactional|ecommerce",
  "emailSubtype": "More specific type (e.g., 'curated-links', 'weekly-digest', 'product-announcement')",
  "title": "Email title/subject",
  "preheader": "Preview text if found",
  "contentBySectionType": {
    "section_type_name": {
      "instances": [
        {
          "extractedData": {
            "title": "Actual extracted title",
            "description": "Actual extracted description with <a href='...'>HTML</a> preserved",
            "link": "https://actual.url.com",
            "image": "https://image.url.com/image.jpg"
          }
        }
      ]
    }
  },
  "sampleData": {
    "title": "Newsletter Title",
    "preheader": "Preview text",
    "date": "Issue date if found",
    "sections": [
      {
        "type": "section_type",
        "items": [
          {
            "field1": "value1",
            "field2": "value2"
          }
        ]
      }
    ],
    "header": {
      "logoUrl": "https://...",
      "otherHeaderData": "..."
    },
    "footer": {
      "unsubscribeLink": "https://...",
      "socialLinks": {}
    }
  },
  "staticContent": {
    "elements": ["List of content that doesn't change between issues"]
  }
}`
  }),

  /**
   * Stage 4: Component Deep Extraction
   * 
   * Goal: Extract actual HTML components with preserved styles
   * Uses conventions learned from existing templates
   */
  components: (preprocessed, structure, visualDesign, conventionsSummary = '') => ({
    system: `You are a Maizzle email template expert. Your task is to extract HTML email sections and convert them into reusable Maizzle components that follow this project's existing conventions.

## Your Role
You create production-ready Maizzle template code by:
- Extracting actual HTML structure for each section type
- Converting static content to template variables using NESTED OBJECT PATHS
- Preserving ALL inline styles (critical for email clients)
- Using correct Maizzle syntax for loops and conditionals
- Following the existing project conventions EXACTLY

## Maizzle Syntax Reference
- Variables: {{ object.property }} - ALWAYS use nested paths like {{ header.logoUrl }}, {{ intro.title }}
- Raw HTML: {{{ object.htmlField }}} - triple braces for unescaped HTML content
- Loops: <each loop="item in section.items">...</each>
- Conditionals: <if condition="object.field">...</if>

${conventionsSummary}

## Output Format
Respond with valid JSON only. No markdown, no code blocks.

## CRITICAL LOOP ARCHITECTURE RULE
**Loops MUST be INSIDE components, NOT in newsletter.html**

Maizzle components do NOT inherit loop variables from parent templates. If newsletter.html has:
\`\`\`html
<each loop="category in categories">
  <x-lifestyle-category />
</each>
\`\`\`
The component will NOT have access to "category" - it will be undefined!

**CORRECT PATTERN**: Component handles its own loop:
\`\`\`html
<!-- newsletter.html - NO LOOP, just includes component once -->
<x-lifestyle-category />

<!-- LifestyleCategory.html component - CONTAINS the loop -->
<each loop="category in categories">
  <table>
    <tr><td>{{ category.title }}</td></tr>
    <each loop="item in category.items">
      <tr><td>{{ item.name }}</td></tr>
    </each>
  </table>
</each>
\`\`\`

## CRITICAL HTML CONTENT RULE
**Use TRIPLE BRACES {{{ }}} for ANY field containing HTML**

Fields named: description, content, body, html, bio, excerpt, summary, text, blurb, richText
These ALWAYS need triple braces: {{{ item.description }}}, {{{ brand.bio }}}, {{{ section.content }}}

Using {{ }} for HTML will escape it and show raw tags like &lt;p&gt; in output.

## Critical Requirements
1. PRESERVE all inline styles exactly as they appear
2. PRESERVE table structures (email clients need them)
3. USE NESTED OBJECT PATHS for all variables - {{ header.field }} NOT {{ field }}
4. Make components self-contained WITH their loops inside
5. Include MSO conditionals if present in original
6. Match the data structure patterns from the conventions above
7. Use {{{ }}} for ALL fields that contain HTML markup`,

    user: `Generate Maizzle components for this email template.

## Section Types to Generate
${JSON.stringify(structure.sectionTypes, null, 2)}

## Visual Design Reference
${JSON.stringify(visualDesign.colorPalette, null, 2)}
${JSON.stringify(visualDesign.typography, null, 2)}

## Original HTML
${preprocessed.cleaned.substring(0, 100000)}

---

Generate components following the project conventions. All variables MUST use nested object paths.

Example correct variable usage:
- {{ header.logoUrl }} ✓
- {{ header.quote }} ✓
- {{ intro.title }} ✓
- {{{ intro.content }}} ✓ (triple braces for HTML)
- {{ item.title }} ✓ (inside loops)

Example INCORRECT (DO NOT USE):
- {{ logoUrl }} ✗
- {{ quote }} ✗
- {{ title }} ✗

Respond with this JSON structure:
{
  "reasoning": "Your approach to component extraction",
  "components": [
    {
      "name": "Header",
      "type": "header",
      "description": "What this component renders",
      "html": "<table...>{{ header.logoUrl }}...{{ header.quote }}...</table>",
      "dataPath": "header",
      "variables": [
        {
          "path": "header.logoUrl",
          "type": "image",
          "required": true,
          "description": "Logo image URL"
        },
        {
          "path": "header.quote",
          "type": "html",
          "required": false,
          "description": "Optional quote text"
        }
      ]
    },
    {
      "name": "Intro",
      "type": "intro",
      "description": "Introduction section",
      "html": "<table...>{{ intro.title }}{{{ intro.content }}}</table>",
      "dataPath": "intro",
      "variables": [
        {
          "path": "intro.title",
          "type": "string",
          "required": true
        },
        {
          "path": "intro.content",
          "type": "html",
          "required": true
        }
      ]
    },
    {
      "name": "Article",
      "type": "article",
      "description": "Repeating article section",
      "html": "<each loop=\\"item in section.items\\"><table...>{{ item.title }}{{ item.link }}{{{ item.description }}}</table></each>",
      "dataPath": "section.items",
      "isRepeating": true,
      "variables": [
        {
          "path": "item.title",
          "type": "string",
          "required": true
        },
        {
          "path": "item.link",
          "type": "url",
          "required": true
        },
        {
          "path": "item.description",
          "type": "html",
          "required": false
        }
      ]
    }
  ],
  "layout": {
    "name": "main.html",
    "html": "<!DOCTYPE html>... full layout HTML with <block name='template'></block>",
    "description": "Main layout wrapper"
  },
  "globalStyles": {
    "embedded": "CSS to include in <style> tag",
    "critical": "Critical inline styles that must be preserved"
  },
  "templateStructure": {
    "mainTemplate": "newsletter.html content showing component includes",
    "componentOrder": ["Header", "Intro", "Article", "Footer"]
  },
  "sampleData": {
    "header": {
      "logoUrl": "https://...",
      "quote": "Sample quote"
    },
    "intro": {
      "title": "Welcome",
      "content": "<p>HTML content</p>"
    },
    "sections": [
      {
        "type": "article",
        "items": [
          {
            "title": "Article Title",
            "link": "https://...",
            "description": "<p>Description</p>"
          }
        ]
      }
    ]
  }
}`
  })
};
