#!/usr/bin/env node

import fs from 'fs';
import { JSDOM } from 'jsdom';

/**
 * Reliable Email Decomposer
 * Multi-strategy approach for consistent email decomposition
 */

class ReliableEmailDecomposer {
  constructor(htmlFile) {
    this.htmlFile = htmlFile;
    this.htmlContent = fs.readFileSync(htmlFile, 'utf8');
    this.dom = new JSDOM(this.htmlContent);
    this.document = this.dom.window.document;
    this.components = new Map();
    this.emailType = null;
    this.confidence = 0;
  }

  /**
   * Main decomposition method - tries multiple strategies
   */
  async decompose() {
    console.log('🔍 Starting reliable email decomposition...');
    
    // Step 1: Detect email type and structure
    this.emailType = this.detectEmailType();
    console.log(`📧 Detected email type: ${this.emailType}`);
    
    // Step 2: Apply type-specific analysis
    const results = [];
    
    // Strategy 1: Enhanced heuristic analysis
    const heuristicResult = this.enhancedHeuristicAnalysis();
    results.push(heuristicResult);
    
    // Strategy 2: Content semantic analysis  
    const semanticResult = this.semanticContentAnalysis();
    results.push(semanticResult);
    
    // Strategy 3: Newsletter-specific patterns
    if (this.emailType === 'newsletter') {
      const newsletterResult = this.newsletterSpecificAnalysis();
      results.push(newsletterResult);
    }
    
    // Step 3: Combine and validate results
    const combinedResult = this.combineAnalysisResults(results);
    
    // Step 4: Quality assessment
    this.confidence = this.calculateConfidence(combinedResult);
    
    console.log(`📊 Analysis confidence: ${Math.round(this.confidence * 100)}%`);
    
    return {
      emailType: this.emailType,
      confidence: this.confidence,
      components: combinedResult,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Detect the type of email for targeted analysis
   */
  detectEmailType() {
    const indicators = {
      newsletter: 0,
      marketing: 0,
      transactional: 0,
      ecommerce: 0
    };

    // Newsletter indicators
    if (this.document.querySelector('h2')) indicators.newsletter += 2;
    if (this.document.querySelectorAll('h2').length > 2) indicators.newsletter += 3;
    if (this.document.querySelector('blockquote')) indicators.newsletter += 2;
    if (this.document.querySelector('ul li')) indicators.newsletter += 1;
    if (this.textIncludes(['newsletter', 'issue', 'weekly', 'monthly'])) indicators.newsletter += 2;
    if (this.textIncludes(['unsubscribe', 'manage preferences'])) indicators.newsletter += 1;

    // Marketing indicators  
    if (this.document.querySelector('a[style*="background"]')) indicators.marketing += 2;
    if (this.textIncludes(['sale', 'discount', 'offer', 'deal'])) indicators.marketing += 2;
    if (this.document.querySelectorAll('img').length > 3) indicators.marketing += 1;

    // Transactional indicators
    if (this.textIncludes(['receipt', 'confirmation', 'order', 'invoice'])) indicators.transactional += 3;
    if (this.textIncludes(['thank you', 'welcome'])) indicators.transactional += 1;

    // Ecommerce indicators
    if (this.textIncludes(['product', 'cart', 'checkout', 'price'])) indicators.ecommerce += 2;
    if (this.document.querySelector('table[style*="border"]')) indicators.ecommerce += 1;

    // Return the type with highest score
    return Object.entries(indicators).reduce((a, b) => indicators[a[0]] > indicators[b[0]] ? a : b)[0];
  }

  /**
   * Enhanced heuristic analysis with better patterns
   */
  enhancedHeuristicAnalysis() {
    const patterns = {
      newsletter: {
        header: [
          '#header', '.header', 'header',
          'div:has(img):first-child',
          'table:first-child:has(img)'
        ],
        headerContent: [
          'div:has(h1) + div p',
          'p:contains("This week")',
          'p:contains("In this issue")'
        ],
        articles: [
          'h2:not(:last-child)',
          'div:has(h2)',
          'section'
        ],
        blockquotes: [
          'blockquote',
          'div[style*="border-left"]',
          'p[style*="font-style:italic"]'
        ],
        miscellany: [
          'ul:last-of-type',
          'div:contains("miscellany")',
          'li:has(a)'
        ],
        footer: [
          'table:last-child',
          'div:contains("unsubscribe")',
          'p:contains("copyright")'
        ]
      },
      marketing: {
        hero: [
          'h1', '.hero', '#hero',
          'td[style*="font-size:24px"]'
        ],
        cta: [
          'a[style*="background-color"]',
          '.button', '.cta'
        ],
        features: [
          '.feature', 'div:has(img)',
          'table[width="50%"]'
        ]
      }
    };

    const emailPatterns = patterns[this.emailType] || patterns.newsletter;
    const components = {};

    for (const [componentName, selectors] of Object.entries(emailPatterns)) {
      let bestMatch = null;
      let bestScore = 0;

      for (const selector of selectors) {
        try {
          const elements = this.queryWithFallback(selector);
          if (elements.length > 0) {
            const score = this.scoreElement(elements[0], componentName);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = {
                element: elements[0],
                selector: selector,
                confidence: score
              };
            }
          }
        } catch (e) {
          // Skip invalid selectors
        }
      }

      if (bestMatch && bestScore > 0.3) {
        components[componentName] = bestMatch;
      }
    }

    return {
      strategy: 'enhanced-heuristic',
      components,
      confidence: Object.keys(components).length / Object.keys(emailPatterns).length
    };
  }

  /**
   * Semantic content analysis based on text and structure
   */
  semanticContentAnalysis() {
    const components = {};
    const allElements = this.document.querySelectorAll('*');
    
    // Analyze each element for semantic meaning
    allElements.forEach(element => {
      const text = element.textContent?.trim() || '';
      const style = element.getAttribute('style') || '';
      const tag = element.tagName.toLowerCase();
      
      // Header detection
      if (this.isLikelyHeader(element, text, style)) {
        if (!components.header || this.scoreElement(element, 'header') > components.header.confidence) {
          components.header = {
            element,
            confidence: this.scoreElement(element, 'header'),
            reason: 'semantic-header-detection'
          };
        }
      }
      
      // Article detection
      if (this.isLikelyArticle(element, text, style, tag)) {
        if (!components.articles) components.articles = [];
        components.articles.push({
          element,
          confidence: this.scoreElement(element, 'article'),
          reason: 'semantic-article-detection'
        });
      }
      
      // Quote detection
      if (this.isLikelyQuote(element, text, style, tag)) {
        if (!components.quotes) components.quotes = [];
        components.quotes.push({
          element,
          confidence: this.scoreElement(element, 'quote'),
          reason: 'semantic-quote-detection'
        });
      }
    });

    return {
      strategy: 'semantic-analysis',
      components,
      confidence: Math.min(Object.keys(components).length / 4, 1)
    };
  }

  /**
   * Newsletter-specific pattern recognition
   */
  newsletterSpecificAnalysis() {
    const components = {};
    
    // Look for newsletter-specific patterns
    const h2Elements = this.document.querySelectorAll('h2');
    if (h2Elements.length > 0) {
      components.articles = Array.from(h2Elements).map(h2 => {
        // Find the content block containing this h2
        let contentBlock = h2.closest('div, td, section') || h2.parentNode;
        return {
          element: contentBlock,
          title: h2.textContent.trim(),
          confidence: 0.9,
          reason: 'newsletter-h2-pattern'
        };
      });
    }

    // Look for blockquotes
    const blockquotes = this.document.querySelectorAll('blockquote, div[style*="border-left"]');
    if (blockquotes.length > 0) {
      components.blockquotes = Array.from(blockquotes).map(quote => ({
        element: quote,
        confidence: 0.8,
        reason: 'newsletter-quote-pattern'
      }));
    }

    // Look for miscellany/list sections
    const lists = this.document.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const listItems = list.querySelectorAll('li');
      if (listItems.length > 2 && listItems[0].querySelector('a')) {
        components.miscellany = {
          element: list,
          confidence: 0.7,
          reason: 'newsletter-list-pattern'
        };
      }
    });

    return {
      strategy: 'newsletter-specific',
      components,
      confidence: Object.keys(components).length > 0 ? 0.8 : 0.3
    };
  }

  /**
   * Helper methods for element analysis
   */
  queryWithFallback(selector) {
    try {
      // Handle pseudo-selectors that JSDOM doesn't support
      if (selector.includes(':contains')) {
        const [baseSelector, text] = selector.split(':contains');
        const textToFind = text.replace(/[()'"]/g, '');
        const elements = this.document.querySelectorAll(baseSelector || '*');
        return Array.from(elements).filter(el => 
          el.textContent?.toLowerCase().includes(textToFind.toLowerCase())
        );
      }
      return this.document.querySelectorAll(selector);
    } catch (e) {
      return [];
    }
  }

  isLikelyHeader(element, text, style) {
    const hasLogo = element.querySelector('img');
    const hasTitle = /h[1-6]/i.test(element.tagName) || style.includes('font-size');
    const isTopLevel = element.offsetTop < 200;
    const hasHeaderText = /header|logo|brand/i.test(element.className || element.id || text);
    
    return (hasLogo && (hasTitle || isTopLevel)) || hasHeaderText;
  }

  isLikelyArticle(element, text, style, tag) {
    const hasHeading = element.querySelector('h1, h2, h3, h4, h5, h6');
    const hasContent = text.length > 100;
    const hasLink = element.querySelector('a[href]');
    const isContentBlock = tag === 'div' || tag === 'section' || tag === 'article';
    
    return hasHeading && hasContent && isContentBlock;
  }

  isLikelyQuote(element, text, style, tag) {
    const isBlockquote = tag === 'blockquote';
    const hasBorder = style.includes('border-left') || style.includes('border:');
    const hasQuoteStyle = style.includes('italic') || style.includes('serif');
    const hasQuoteContent = text.length > 50 && /[.!?]$/.test(text.trim());
    
    return isBlockquote || (hasBorder && (hasQuoteStyle || hasQuoteContent));
  }

  scoreElement(element, componentType) {
    let score = 0.5; // Base score
    
    // Add scoring logic based on element characteristics
    const style = element.getAttribute('style') || '';
    const className = element.className || '';
    const id = element.id || '';
    const text = element.textContent || '';
    
    // Position-based scoring
    if (componentType === 'header' && element.offsetTop < 100) score += 0.2;
    if (componentType === 'footer' && element.offsetTop > 500) score += 0.2;
    
    // Content-based scoring
    if (componentType === 'article' && element.querySelector('h2, h3')) score += 0.3;
    if (componentType === 'quote' && element.tagName === 'BLOCKQUOTE') score += 0.4;
    
    // Style-based scoring
    if (style.includes('font-size') && componentType === 'header') score += 0.1;
    if (style.includes('background') && componentType === 'cta') score += 0.3;
    
    return Math.min(score, 1.0);
  }

  combineAnalysisResults(results) {
    const combinedComponents = {};
    
    // Merge results from all strategies, weighting by confidence
    results.forEach(result => {
      const weight = result.confidence;
      
      Object.entries(result.components).forEach(([name, component]) => {
        if (!combinedComponents[name]) {
          combinedComponents[name] = [];
        }
        
        if (Array.isArray(component)) {
          combinedComponents[name].push(...component.map(c => ({...c, weight})));
        } else {
          combinedComponents[name].push({...component, weight});
        }
      });
    });
    
    // Select best candidate for each component
    const finalComponents = {};
    Object.entries(combinedComponents).forEach(([name, candidates]) => {
      if (candidates.length > 0) {
        // Sort by weighted confidence
        candidates.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
        finalComponents[name] = candidates[0];
      }
    });
    
    return finalComponents;
  }

  calculateConfidence(components) {
    const requiredComponents = ['header', 'content', 'footer'];
    const foundRequired = requiredComponents.filter(name => components[name]).length;
    const totalFound = Object.keys(components).length;
    
    const coverageScore = foundRequired / requiredComponents.length;
    const richnessScore = Math.min(totalFound / 6, 1); // 6 is a good number of components
    
    return (coverageScore * 0.7) + (richnessScore * 0.3);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.confidence < 0.6) {
      recommendations.push('🔍 Low confidence detected. Consider using GPT-4o analysis for better results.');
    }
    
    if (this.emailType === 'newsletter' && this.confidence < 0.8) {
      recommendations.push('📧 Newsletter structure is complex. Manual review recommended.');
    }
    
    recommendations.push(`📊 Template type: ${this.emailType}`);
    recommendations.push(`🎯 Confidence: ${Math.round(this.confidence * 100)}%`);
    
    return recommendations;
  }

  textIncludes(keywords) {
    const text = this.document.body.textContent.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }
}

export default ReliableEmailDecomposer;