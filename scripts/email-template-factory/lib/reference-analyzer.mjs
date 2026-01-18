/**
 * Reference Template Analyzer
 * 
 * Analyzes existing templates in the workspace to learn:
 * - Variable naming conventions (nested object paths)
 * - Data structure patterns
 * - Component organization
 * 
 * This ensures generated templates are compatible with the existing system.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export class ReferenceAnalyzer {
  constructor(workspaceRoot = '.') {
    this.workspaceRoot = workspaceRoot;
    this.conventions = null;
  }

  /**
   * Analyze existing templates to extract conventions
   */
  async analyze() {
    console.log('   📚 Analyzing existing templates for conventions...');
    
    const templatesDir = path.join(this.workspaceRoot, 'templates');
    const contentDir = path.join(this.workspaceRoot, 'content');
    
    // Find reference template (dense-discovery is the primary one)
    const referenceTemplate = await this.findReferenceTemplate(templatesDir);
    
    this.conventions = {
      variablePatterns: await this.extractVariablePatterns(referenceTemplate),
      dataStructure: await this.extractDataStructure(contentDir),
      componentNaming: await this.extractComponentNaming(referenceTemplate),
      sectionTypes: await this.extractSectionTypes(referenceTemplate)
    };
    
    console.log(`   ✓ Found ${Object.keys(this.conventions.variablePatterns).length} variable patterns`);
    console.log(`   ✓ Found ${this.conventions.sectionTypes.length} section types`);
    
    return this.conventions;
  }

  async findReferenceTemplate(templatesDir) {
    // Prefer dense-discovery as reference, then any other template
    const preferredOrder = ['dense-discovery', 'wirecutter', 'the-atlantic'];
    
    for (const name of preferredOrder) {
      const templatePath = path.join(templatesDir, name);
      if (fs.existsSync(templatePath)) {
        console.log(`   📂 Using "${name}" as reference template`);
        return templatePath;
      }
    }
    
    // Find any template directory
    const dirs = fs.readdirSync(templatesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    if (dirs.length > 0) {
      console.log(`   📂 Using "${dirs[0]}" as reference template`);
      return path.join(templatesDir, dirs[0]);
    }
    
    return null;
  }

  /**
   * Extract variable naming patterns from template components
   */
  async extractVariablePatterns(templatePath) {
    const patterns = {};
    
    if (!templatePath) return patterns;
    
    const componentsDir = path.join(templatePath, 'components');
    if (!fs.existsSync(componentsDir)) return patterns;
    
    const componentFiles = fs.readdirSync(componentsDir)
      .filter(f => f.endsWith('.html'));
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
      
      // Extract {{ variable.path }} patterns
      const variableMatches = content.matchAll(/\{\{[\s]*([a-zA-Z_][\w.]*?)[\s]*\}\}/g);
      for (const match of variableMatches) {
        const varPath = match[1];
        if (varPath.includes('.')) {
          const [root, ...rest] = varPath.split('.');
          if (!patterns[root]) {
            patterns[root] = new Set();
          }
          patterns[root].add(rest.join('.'));
        }
      }
      
      // Extract {{{ variable.path }}} patterns (raw HTML)
      const rawMatches = content.matchAll(/\{\{\{[\s]*([a-zA-Z_][\w.]*?)[\s]*\}\}\}/g);
      for (const match of rawMatches) {
        const varPath = match[1];
        if (varPath.includes('.')) {
          const [root, ...rest] = varPath.split('.');
          if (!patterns[root]) {
            patterns[root] = new Set();
          }
          patterns[root].add(rest.join('.'));
        }
      }
    }
    
    // Convert Sets to Arrays for serialization
    const result = {};
    for (const [key, value] of Object.entries(patterns)) {
      result[key] = Array.from(value);
    }
    
    return result;
  }

  /**
   * Extract data structure from content markdown files
   */
  async extractDataStructure(contentDir) {
    const structure = {
      topLevelFields: new Set(),
      nestedObjects: {},
      sectionItemFields: new Set()
    };
    
    if (!fs.existsSync(contentDir)) return this.serializeStructure(structure);
    
    const mdFiles = fs.readdirSync(contentDir)
      .filter(f => f.endsWith('.md'))
      .slice(0, 5); // Sample first 5 files
    
    for (const file of mdFiles) {
      const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
      
      // Parse YAML front matter
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatterMatch) continue;
      
      const yaml = frontMatterMatch[1];
      
      // Extract top-level fields
      const topLevelMatches = yaml.matchAll(/^([a-zA-Z_][\w]*):/gm);
      for (const match of topLevelMatches) {
        structure.topLevelFields.add(match[1]);
      }
      
      // Extract nested object patterns (e.g., header:, footer:, intro:)
      const nestedMatches = yaml.matchAll(/^([a-zA-Z_][\w]*):\n((?:  [\w]+:.*\n?)+)/gm);
      for (const match of nestedMatches) {
        const objName = match[1];
        const objContent = match[2];
        
        if (!structure.nestedObjects[objName]) {
          structure.nestedObjects[objName] = new Set();
        }
        
        const fieldMatches = objContent.matchAll(/^  ([a-zA-Z_][\w]*):/gm);
        for (const fieldMatch of fieldMatches) {
          structure.nestedObjects[objName].add(fieldMatch[1]);
        }
      }
      
      // Extract section item fields
      const itemMatches = yaml.matchAll(/^  - ([a-zA-Z_][\w]*):/gm);
      for (const match of itemMatches) {
        structure.sectionItemFields.add(match[1]);
      }
    }
    
    return this.serializeStructure(structure);
  }

  serializeStructure(structure) {
    return {
      topLevelFields: Array.from(structure.topLevelFields),
      nestedObjects: Object.fromEntries(
        Object.entries(structure.nestedObjects).map(([k, v]) => [k, Array.from(v)])
      ),
      sectionItemFields: Array.from(structure.sectionItemFields)
    };
  }

  /**
   * Extract component naming conventions
   */
  async extractComponentNaming(templatePath) {
    const naming = {
      componentFiles: [],
      namingStyle: 'PascalCase', // or 'kebab-case'
      layoutName: 'main.html'
    };
    
    if (!templatePath) return naming;
    
    const componentsDir = path.join(templatePath, 'components');
    if (fs.existsSync(componentsDir)) {
      naming.componentFiles = fs.readdirSync(componentsDir)
        .filter(f => f.endsWith('.html'));
    }
    
    const layoutsDir = path.join(templatePath, 'layouts');
    if (fs.existsSync(layoutsDir)) {
      const layouts = fs.readdirSync(layoutsDir).filter(f => f.endsWith('.html'));
      if (layouts.length > 0) {
        naming.layoutName = layouts[0];
      }
    }
    
    return naming;
  }

  /**
   * Extract section types from template newsletter.html
   */
  async extractSectionTypes(templatePath) {
    const sectionTypes = [];
    
    if (!templatePath) return sectionTypes;
    
    const newsletterPath = path.join(templatePath, 'newsletter.html');
    if (!fs.existsSync(newsletterPath)) return sectionTypes;
    
    const content = fs.readFileSync(newsletterPath, 'utf8');
    
    // Look for section type references in conditionals and loops
    const typeMatches = content.matchAll(/section\.type\s*===?\s*['"]([^'"]+)['"]/g);
    for (const match of typeMatches) {
      if (!sectionTypes.includes(match[1])) {
        sectionTypes.push(match[1]);
      }
    }
    
    // Also check section-styles.json
    const stylesPath = path.join(templatePath, 'section-styles.json');
    if (fs.existsSync(stylesPath)) {
      try {
        const styles = JSON.parse(fs.readFileSync(stylesPath, 'utf8'));
        for (const key of Object.keys(styles)) {
          if (!sectionTypes.includes(key)) {
            sectionTypes.push(key);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return sectionTypes;
  }

  /**
   * Generate a conventions summary for inclusion in prompts
   */
  generateConventionsSummary() {
    if (!this.conventions) {
      return 'No reference templates found - use standard conventions.';
    }
    
    let summary = `
## Existing Template Conventions (MUST FOLLOW)

This project uses a specific data structure. You MUST follow these patterns:

### Variable Naming (Nested Object Paths)
Components use nested object paths like \`{{ header.logoUrl }}\`, NOT flat names like \`{{ logo_url }}\`.
`;

    // Document each top-level object and its fields
    for (const [obj, fields] of Object.entries(this.conventions.variablePatterns)) {
      if (fields.length > 0) {
        summary += `
**${obj}** object fields:
${fields.map(f => `- {{ ${obj}.${f} }}`).join('\n')}
`;
      }
    }

    // Document data structure
    if (this.conventions.dataStructure.topLevelFields?.length > 0) {
      summary += `
### Top-level Content Fields
${this.conventions.dataStructure.topLevelFields.map(f => `- ${f}`).join('\n')}
`;
    }

    // Document section item fields
    if (this.conventions.dataStructure.sectionItemFields?.length > 0) {
      summary += `
### Common Section Item Fields
Items in sections typically have these fields:
${this.conventions.dataStructure.sectionItemFields.map(f => `- ${f}`).join('\n')}
`;
    }

    // Document section types
    if (this.conventions.sectionTypes?.length > 0) {
      summary += `
### Known Section Types
${this.conventions.sectionTypes.map(t => `- ${t}`).join('\n')}
`;
    }

    summary += `
### Data Structure Pattern
Content files use this structure:
\`\`\`yaml
---
template: template-name
title: Newsletter Title
preheader: Preview text

header:
  logoUrl: https://...
  quote: "..."
  author: "..."

intro:
  title: Welcome
  content: <p>HTML content</p>

sections:
- type: section-type-name
  title: Section Title
  items:
  - title: Item Title
    description: <p>HTML</p>
    link: https://...
    image: https://...

footer:
  unsubscribeLink: https://...
  socialLinks:
    twitter: https://...
---
\`\`\`

### CRITICAL: Loop Architecture Rule
**Loops MUST be INSIDE components, NOT in newsletter.html**

Maizzle components do NOT inherit loop variables from parent templates!

WRONG (will cause undefined variables):
\`\`\`html
<!-- newsletter.html -->
<each loop="category in categories">
  <x-category-card />   <!-- FAILS: category is undefined inside component -->
</each>
\`\`\`

CORRECT (component handles its own loop):
\`\`\`html
<!-- newsletter.html -->
<x-category-card />   <!-- Include once, no loop -->

<!-- CategoryCard.html component -->
<each loop="category in categories">
  <table>{{ category.title }}</table>
</each>
\`\`\`

### Critical Rules
1. ALWAYS use nested paths: \`{{ header.logoUrl }}\` not \`{{ logoUrl }}\`
2. ALWAYS use \`{{{ field }}}\` (triple braces) for HTML content fields (description, content, body, bio, excerpt, summary, text, blurb)
3. Sections have a \`type\` field that determines which component renders them
4. Items within sections are accessed via \`item.fieldName\` in loops
5. Use \`<if condition="field">...\` for conditionals
6. Use \`<each loop="item in section.items">...\` for loops
7. **Loops over arrays go INSIDE the component that renders them, NOT in newsletter.html**
`;

    return summary;
  }
}
