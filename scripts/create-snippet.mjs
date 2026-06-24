#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Content Snippet Generator
 * Creates template-specific Markdown files with proper frontmatter structure
 * Usage: node scripts/create-snippet.mjs <template> <name>
 */

// Template snippets
const snippets = {
  wirecutter: {
    extension: 'md',
    content: `---
title: "The Recommendation — [Your Title Here]"
logo:
  href: "https://example.com"
  src: "https://dummyimage.com/200x50/007cba/ffffff&text=NEWSLETTER"
  alt: "Newsletter Logo"
hero:
  title: "[Main Article Title]"
  url: "https://example.com/article"
  image:
    src: "https://picsum.photos/600/300"
    alt: "[Hero image description]"
  deck: "[Article description/deck text]"
  cta:
    href: "https://example.com/article"
    label: "Read More →"
feature:
  title: "[Featured Article Title]"
  url: "https://example.com/feature"
  image:
    src: "https://picsum.photos/300/200"
    alt: "[Feature image description]"
  html: |
    <p>Your <strong>featured content</strong> goes here with HTML formatting.</p>
    <p>Add multiple paragraphs as needed for your featured story.</p>
moreBlocks:
  - title: "More [Category] essentials"
    url: "https://example.com/category"
    items:
      - title: "First recommendation"
        url: "https://example.com/item1"
        image:
          src: "https://picsum.photos/120/120"
          alt: "Item 1 description"
        copy: "Brief description of this recommendation."
      - title: "Second recommendation"
        url: "https://example.com/item2"
        image:
          src: "https://picsum.photos/120/120"
          alt: "Item 2 description"
        copy: "Brief description of this recommendation."
---

# Optional Markdown Content

Add any additional content here that will be converted to HTML.
`
  },

  'brain-dead': {
    extension: 'md',
    content: `---
title: "[Collection Name]"
logoUrl: "https://dummyimage.com/150x60/000000/ffffff&text=LOGO"
logoLink: "https://example.com"
collectionTitle: "[Collection Name]"
collectionDescription: "[Brief collection description]"
collectionDetails: "[Detailed description of the collection, materials, inspiration, etc.]"
mainImage: "https://picsum.photos/800/600"
sections:
  - type: dual-column
    label: "[Dual-column section]"
    items:
      - kicker: "[Item kicker]"
        title: "[Item title]"
        subtitle: "[Short subtitle]"
        body: "[Brief item description]"
        image: "https://picsum.photos/400/400"
        imageAlt: "[Image description]"
        link:
          href: "https://example.com/item"
          label: "[Tracked item label]"
          category: "commerce"
        ctaText: "View item"
  - type: single-column
    label: "[Single-column section]"
    items:
      - kicker: "[Feature kicker]"
        title: "[Full-width item title]"
        body: "[Longer description for a full-width item]"
        image: "https://picsum.photos/800/600"
        imageAlt: "[Feature image description]"
        link:
          href: "https://example.com/feature"
          label: "[Tracked feature label]"
          category: "commerce"
        ctaText: "View feature"
shopLink: "https://example.com/shop"
articles:
  - title: "[Article Title]"
    description: "[Article description]"
    imageUrl: "https://picsum.photos/400/300"
socialLinks:
  - url: "https://instagram.com/yourhandle"
    text: "Instagram"
  - url: "https://twitter.com/yourhandle"
    text: "Twitter"
  - url: "https://facebook.com/yourpage"
    text: "Facebook"
template: "brain-dead-template"
---

# [Collection Name]

Add any additional markdown content about the collection here.
`
  },

  'sentiers': {
    extension: 'md',
    content: `---
title: "[Newsletter Title]"
subtitle: "[Newsletter Subtitle]"
logo:
  src: "https://dummyimage.com/200x50/4a90e2/ffffff&text=SENTIERS"
  alt: "Sentiers Logo"
  href: "https://example.com"
hero:
  title: "[Main Story Title]"
  subtitle: "[Story subtitle or deck]"
  image:
    src: "https://picsum.photos/600/400"
    alt: "[Hero image description]"
  url: "https://example.com/story"
articles:
  - title: "[Article 1 Title]"
    summary: "[Brief article summary]"
    url: "https://example.com/article1"
    image:
      src: "https://picsum.photos/300/200"
      alt: "[Article 1 image description]"
  - title: "[Article 2 Title]"
    summary: "[Brief article summary]"
    url: "https://example.com/article2"
    image:
      src: "https://picsum.photos/300/200"
      alt: "[Article 2 image description]"
  - title: "[Article 3 Title]"
    summary: "[Brief article summary]"
    url: "https://example.com/article3"
    image:
      src: "https://picsum.photos/300/200"
      alt: "[Article 3 image description]"
footer:
  unsubscribe: "https://example.com/unsubscribe"
  preferences: "https://example.com/preferences"
  website: "https://example.com"
template: "sentiers-llm"
---

# [Newsletter Content]

Add your newsletter content here in Markdown format.
`
  }
};

// Get command line arguments
const args = process.argv.slice(2);
const template = args[0];
const name = args[1];

function showUsage() {
  console.log('📝 Content Snippet Generator');
  console.log('Usage: node scripts/create-snippet.mjs <template> <name>');
  console.log('');
  console.log('Available templates:');
  Object.keys(snippets).forEach(t => {
    console.log(`  - ${t}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/create-snippet.mjs wirecutter holiday-tech-guide');
  console.log('  node scripts/create-snippet.mjs brain-dead summer-collection');
  console.log('  node scripts/create-snippet.mjs sentiers weekly-roundup');
  console.log('');
}

function createSnippet(templateName, fileName) {
  if (!snippets[templateName]) {
    console.error(`❌ Unknown template: ${templateName}`);
    console.log('Available templates:', Object.keys(snippets).join(', '));
    process.exit(1);
  }

  const snippet = snippets[templateName];
  const contentDir = 'content';
  
  // Ensure content directory exists
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  // Generate filename with date
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fullFileName = `${fileName}-${today}.${snippet.extension}`;
  const filePath = path.join(contentDir, fullFileName);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.error(`❌ File already exists: ${filePath}`);
    process.exit(1);
  }

  // Write the snippet
  fs.writeFileSync(filePath, snippet.content);

  console.log('✅ Snippet created successfully!');
  console.log('════════════════════════════');
  console.log(`📄 File: ${filePath}`);
  console.log(`🎨 Template: ${templateName}`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. Edit the file: code ${filePath}`);
  console.log(`2. Build newsletter: npm run quick ${templateName} ${filePath}`);
}

// Main execution
if (args.length < 2) {
  showUsage();
  process.exit(1);
}

createSnippet(template, name);
