/**
 * HTML Preprocessor
 * 
 * Cleans and analyzes HTML before LLM processing.
 * Extracts metadata, normalizes structure, and prepares content.
 */

import { JSDOM } from 'jsdom';

export class HTMLPreprocessor {
  constructor() {
    this.dom = null;
    this.document = null;
  }

  process(htmlContent) {
    this.dom = new JSDOM(htmlContent);
    this.document = this.dom.window.document;

    return {
      // Original HTML
      original: htmlContent,
      
      // Cleaned HTML (comments removed, whitespace normalized)
      cleaned: this.cleanHTML(htmlContent),
      
      // Structural metadata
      stats: this.extractStats(),
      
      // Pre-extracted elements for context
      elements: this.extractKeyElements(),
      
      // Style information
      styles: this.extractStyles(),
      
      // Table structure map (important for email layouts)
      tableMap: this.mapTableStructure()
    };
  }

  cleanHTML(html) {
    // Remove HTML comments
    let cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove excessive whitespace while preserving structure
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove MSO conditional comments content but keep structure hints
    cleaned = cleaned.replace(/<!--\[if.*?\]>[\s\S]*?<!\[endif\]-->/gi, '');
    
    return cleaned.trim();
  }

  extractStats() {
    return {
      elements: this.document.querySelectorAll('*').length,
      tables: this.document.querySelectorAll('table').length,
      images: this.document.querySelectorAll('img').length,
      links: this.document.querySelectorAll('a').length,
      headings: this.document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      paragraphs: this.document.querySelectorAll('p').length,
      divs: this.document.querySelectorAll('div').length,
      spans: this.document.querySelectorAll('span').length,
      textLength: this.document.body?.textContent?.length || 0,
      htmlLength: this.dom.serialize().length
    };
  }

  extractKeyElements() {
    const elements = {
      title: this.document.querySelector('title')?.textContent || '',
      headings: [],
      images: [],
      links: [],
      buttons: []
    };

    // Extract headings with context
    this.document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      elements.headings.push({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim() || '',
        style: h.getAttribute('style') || ''
      });
    });

    // Extract images with metadata
    this.document.querySelectorAll('img').forEach(img => {
      elements.images.push({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        width: img.getAttribute('width') || '',
        height: img.getAttribute('height') || '',
        style: img.getAttribute('style') || ''
      });
    });

    // Extract links
    this.document.querySelectorAll('a[href]').forEach(a => {
      const style = a.getAttribute('style') || '';
      const isButton = style.includes('background') || 
                       a.querySelector('table') !== null ||
                       a.classList.contains('button') ||
                       a.classList.contains('btn');
      
      const linkData = {
        href: a.getAttribute('href') || '',
        text: a.textContent?.trim() || '',
        style: style,
        isButton
      };
      
      if (isButton) {
        elements.buttons.push(linkData);
      } else {
        elements.links.push(linkData);
      }
    });

    return elements;
  }

  extractStyles() {
    const styles = {
      inline: new Map(),
      embedded: [],
      colors: new Set(),
      fonts: new Set(),
      fontSizes: new Set()
    };

    // Extract embedded styles
    this.document.querySelectorAll('style').forEach(style => {
      styles.embedded.push(style.textContent || '');
    });

    // Extract inline styles and catalog patterns
    this.document.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style') || '';
      
      // Extract colors
      const colorMatches = style.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
      if (colorMatches) {
        colorMatches.forEach(c => styles.colors.add(c));
      }
      
      // Extract fonts
      const fontMatch = style.match(/font-family:\s*([^;]+)/i);
      if (fontMatch) {
        styles.fonts.add(fontMatch[1].trim());
      }
      
      // Extract font sizes
      const sizeMatch = style.match(/font-size:\s*([^;]+)/i);
      if (sizeMatch) {
        styles.fontSizes.add(sizeMatch[1].trim());
      }
    });

    return {
      embedded: styles.embedded,
      colors: Array.from(styles.colors),
      fonts: Array.from(styles.fonts),
      fontSizes: Array.from(styles.fontSizes)
    };
  }

  mapTableStructure() {
    const tables = [];
    
    // Email layouts are table-based - map the structure
    this.document.querySelectorAll('table').forEach((table, index) => {
      const rows = table.querySelectorAll(':scope > tbody > tr, :scope > tr');
      
      tables.push({
        index,
        width: table.getAttribute('width') || '',
        role: table.getAttribute('role') || '',
        className: table.className || '',
        rowCount: rows.length,
        nestingLevel: this.getTableNestingLevel(table),
        purpose: this.inferTablePurpose(table)
      });
    });

    return tables;
  }

  getTableNestingLevel(table) {
    let level = 0;
    let parent = table.parentElement;
    
    while (parent) {
      if (parent.tagName === 'TABLE') {
        level++;
      }
      parent = parent.parentElement;
    }
    
    return level;
  }

  inferTablePurpose(table) {
    const width = table.getAttribute('width') || '';
    const role = table.getAttribute('role') || '';
    const className = (table.className || '').toLowerCase();
    const content = table.textContent || '';
    
    // Check for presentation table
    if (role === 'presentation') return 'layout';
    
    // Check for wrapper tables
    if (width === '100%' && this.getTableNestingLevel(table) === 0) return 'wrapper';
    
    // Check for content container
    if (width === '600' || width === '640' || width === '580') return 'content-container';
    
    // Check for specific content types
    if (className.includes('header') || content.length < 200 && table.querySelector('img[alt*="logo" i]')) {
      return 'header';
    }
    
    if (className.includes('footer') || content.toLowerCase().includes('unsubscribe')) {
      return 'footer';
    }
    
    if (table.querySelector('h1, h2, h3')) {
      return 'content-section';
    }
    
    return 'unknown';
  }

  /**
   * Get a condensed version of HTML suitable for LLM context
   * Preserves structure while reducing token count
   */
  getCondensedHTML(maxLength = 100000) {
    let html = this.cleaned || this.dom.serialize();
    
    if (html.length <= maxLength) {
      return html;
    }
    
    // Strategy: Keep structure, truncate long text content
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Truncate long text nodes
    const walker = doc.createTreeWalker(
      doc.body,
      4, // NodeFilter.SHOW_TEXT
      null,
      false
    );
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent && node.textContent.length > 500) {
        node.textContent = node.textContent.substring(0, 200) + '...[truncated]...' + 
                          node.textContent.substring(node.textContent.length - 100);
      }
    }
    
    return dom.serialize();
  }
}
