#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Converts Markdown frontmatter to JSON for Maizzle templates
 * Usage: node scripts/md_to_json.mjs content/2025-10-07.md [data/newsletter.json] [--template=templatename]
 */

function convertMarkdownToJson(inputPath, outputPath = 'data/newsletter.json', templateName = 'wirecutter') {
  try {
    // Read the markdown file
    const markdownContent = fs.readFileSync(inputPath, 'utf8');
    
    // Parse frontmatter
    const { data: frontmatter, content: markdownBody } = matter(markdownContent);
    
    // Convert markdown body to HTML if present (basic conversion)
    // For more complex conversion, you could use marked or another library
    const htmlContent = markdownBody
      .split('\n\n')
      .filter(paragraph => paragraph.trim())
      .map(paragraph => `<p>${paragraph.trim()}</p>`)
      .join('\n');
    
    // Check if template is specified in frontmatter
    const selectedTemplate = frontmatter.template || templateName;
    const schemaPath = `../templates/${selectedTemplate}/schema.json`;
    
    // Build the base JSON structure
    const newsletterData = {
      $schema: fs.existsSync(`templates/${selectedTemplate}/schema.json`) ? schemaPath : "../newsletter.schema.json",
      template: selectedTemplate,
      title: frontmatter.title || "Newsletter"
    };

    // Add template-specific data structure
    if (selectedTemplate === 'wirecutter') {
      // Wirecutter template structure
      Object.assign(newsletterData, {
        logo: {
          href: frontmatter.logo?.href || "https://example.com",
          src: frontmatter.logo?.src || "https://via.placeholder.com/200x50",
          alt: frontmatter.logo?.alt || "Logo"
        },
        hero: {
          title: frontmatter.hero?.title || "Default Hero Title",
          url: frontmatter.hero?.url || "https://example.com",
          image: {
            src: frontmatter.hero?.image?.src || "https://via.placeholder.com/600x300",
            alt: frontmatter.hero?.image?.alt || "Hero image"
          },
          deck: frontmatter.hero?.deck || "Default hero description",
          cta: {
            href: frontmatter.hero?.cta?.href || frontmatter.hero?.url || "https://example.com",
            label: frontmatter.hero?.cta?.label || "Read More →"
          }
        },
        feature: {
          title: frontmatter.feature?.title || "Featured Content",
          url: frontmatter.feature?.url || "https://example.com",
          image: {
            src: frontmatter.feature?.image?.src || "https://via.placeholder.com/300x200",
            alt: frontmatter.feature?.image?.alt || "Feature image"
          },
          html: frontmatter.feature?.html || htmlContent || "<p>Feature content goes here.</p>"
        },
        footer: {
          lockup: {
            src: frontmatter.footer?.lockup?.src || "https://via.placeholder.com/150x40",
            alt: frontmatter.footer?.lockup?.alt || "Footer logo"
          },
          legal: frontmatter.footer?.legal || "<p>You're receiving this email because you subscribed to our newsletter.</p>",
          links: {
            privacy: frontmatter.footer?.links?.privacy || "https://example.com/privacy",
            tos: frontmatter.footer?.links?.tos || "https://example.com/terms",
            contact: frontmatter.footer?.links?.contact || "https://example.com/contact"
          }
        }
      });
      
      // Add moreBlocks if they exist in frontmatter
      if (frontmatter.moreBlocks && Array.isArray(frontmatter.moreBlocks)) {
        newsletterData.moreBlocks = frontmatter.moreBlocks;
      }
    } else {
      // For other templates, copy frontmatter directly (excluding template and title)
      const { template, title, ...templateData } = frontmatter;
      Object.assign(newsletterData, templateData);
      
      // Add markdown content if it exists
      if (markdownBody && markdownBody.trim()) {
        newsletterData.markdownContent = htmlContent;
      }
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON file
    fs.writeFileSync(outputPath, JSON.stringify(newsletterData, null, 2));
    
    console.log(`✅ Converted ${inputPath} → ${outputPath}`);
    console.log(`🎨 Template: "${selectedTemplate}"`);
    console.log(`📊 Newsletter: "${newsletterData.title}"`);
    if (newsletterData.hero) console.log(`🎯 Hero: "${newsletterData.hero.title}"`);
    if (newsletterData.feature) console.log(`⭐ Feature: "${newsletterData.feature.title}"`);
    
  } catch (error) {
    console.error('❌ Error converting markdown to JSON:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (process.argv.length < 3) {
  console.log('Usage: node scripts/md_to_json.mjs <input.md> [output.json] [--template=templatename]');
  console.log('Example: node scripts/md_to_json.mjs content/2025-10-07.md data/newsletter.json --template=wirecutter');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'data/newsletter.json';

// Parse template argument
let templateName = 'wirecutter';
const templateArg = process.argv.find(arg => arg.startsWith('--template='));
if (templateArg) {
  templateName = templateArg.split('=')[1];
}

convertMarkdownToJson(inputPath, outputPath, templateName);