/**
 * Section Type Reconciler
 * 
 * Compares discovered section types from email analysis with known types
 * from reference templates. Identifies novel section types and generates
 * component definitions for them.
 * 
 * This enables the factory to handle ANY email template, not just those
 * matching existing patterns.
 */

export class SectionTypeReconciler {
  constructor() {
    this.knownTypes = [];
    this.discoveredTypes = [];
    this.novelTypes = [];
    this.mappedTypes = [];
  }

  /**
   * Initialize with known types from reference templates
   */
  setKnownTypes(conventions) {
    this.knownTypes = conventions?.sectionTypes || [];
    return this;
  }

  /**
   * Reconcile discovered section types against known types
   * 
   * @param {Object} structure - Structure analysis from Stage 2
   * @returns {Object} Reconciliation result with novel types identified
   */
  reconcile(structure) {
    this.discoveredTypes = structure.sectionTypes || [];
    this.novelTypes = [];
    this.mappedTypes = [];

    for (const discovered of this.discoveredTypes) {
      const match = this.findBestMatch(discovered);
      
      if (match.confidence >= 0.7) {
        // High confidence match - use existing type
        this.mappedTypes.push({
          discovered: discovered.name,
          knownType: match.knownType,
          confidence: match.confidence,
          isNovel: false,
          mappingReason: match.reason
        });
      } else if (match.confidence >= 0.4) {
        // Partial match - might be a variant
        this.mappedTypes.push({
          discovered: discovered.name,
          knownType: match.knownType,
          confidence: match.confidence,
          isNovel: true,
          isVariant: true,
          variantOf: match.knownType,
          mappingReason: match.reason
        });
        this.novelTypes.push({
          ...discovered,
          isVariant: true,
          variantOf: match.knownType
        });
      } else {
        // Novel type - no good match found
        this.mappedTypes.push({
          discovered: discovered.name,
          knownType: null,
          confidence: 0,
          isNovel: true,
          mappingReason: 'No matching type found in reference templates'
        });
        this.novelTypes.push({
          ...discovered,
          isNovel: true
        });
      }
    }

    return {
      summary: this.generateSummary(),
      discoveredTypes: this.discoveredTypes,
      novelTypes: this.novelTypes,
      mappedTypes: this.mappedTypes,
      allTypes: this.mergeTypes()
    };
  }

  /**
   * Find the best matching known type for a discovered type
   */
  findBestMatch(discovered) {
    if (this.knownTypes.length === 0) {
      return { confidence: 0, knownType: null, reason: 'No reference types available' };
    }

    let bestMatch = { confidence: 0, knownType: null, reason: '' };

    for (const known of this.knownTypes) {
      const score = this.calculateSimilarity(discovered, known);
      if (score.confidence > bestMatch.confidence) {
        bestMatch = { ...score, knownType: known };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between discovered and known type
   */
  calculateSimilarity(discovered, known) {
    let confidence = 0;
    const reasons = [];

    const discoveredName = this.normalizeName(discovered.name);
    const knownName = this.normalizeName(known);

    // Exact name match
    if (discoveredName === knownName) {
      return { confidence: 1.0, reason: 'Exact name match' };
    }

    // Name contains known type
    if (discoveredName.includes(knownName) || knownName.includes(discoveredName)) {
      confidence += 0.6;
      reasons.push('Name similarity');
    }

    // Semantic similarity based on common patterns
    const semanticGroups = {
      header: ['header', 'top', 'banner', 'masthead', 'logo', 'nav'],
      footer: ['footer', 'bottom', 'legal', 'unsubscribe', 'social'],
      article: ['article', 'story', 'post', 'news', 'feature', 'item'],
      quote: ['quote', 'blockquote', 'pullquote', 'testimonial', 'highlight'],
      intro: ['intro', 'editorial', 'welcome', 'greeting', 'letter', 'opening'],
      cta: ['cta', 'button', 'action', 'subscribe', 'signup', 'call-to-action'],
      list: ['list', 'links', 'collection', 'items', 'miscellany', 'resources'],
      sponsor: ['sponsor', 'ad', 'advertisement', 'promo', 'partner'],
      image: ['image', 'hero', 'photo', 'banner-image', 'featured-image'],
      divider: ['divider', 'separator', 'spacer', 'break', 'hr'],
      product: ['product', 'item', 'card', 'shop', 'deal', 'offer']
    };

    for (const [group, keywords] of Object.entries(semanticGroups)) {
      const discoveredInGroup = keywords.some(k => discoveredName.includes(k));
      const knownInGroup = keywords.some(k => knownName.includes(k));
      
      if (discoveredInGroup && knownInGroup) {
        confidence = Math.max(confidence, 0.5);
        reasons.push(`Semantic group: ${group}`);
        break;
      }
    }

    // Check variable patterns (if available)
    if (discovered.variables?.length > 0) {
      const varNames = discovered.variables.map(v => v.name.toLowerCase());
      
      // Common variable patterns indicate type
      if (varNames.includes('title') && varNames.includes('link')) {
        if (knownName.includes('article') || knownName.includes('link')) {
          confidence = Math.max(confidence, 0.4);
          reasons.push('Variable pattern: article-like');
        }
      }
      
      if (varNames.includes('quote') || varNames.includes('author')) {
        if (knownName.includes('quote')) {
          confidence = Math.max(confidence, 0.4);
          reasons.push('Variable pattern: quote-like');
        }
      }
    }

    return {
      confidence: Math.min(confidence, 1.0),
      reason: reasons.join(', ') || 'No strong similarity found'
    };
  }

  /**
   * Normalize type name for comparison
   */
  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[-_\s]+/g, '')
      .replace(/section$/, '')
      .replace(/component$/, '');
  }

  /**
   * Merge known and novel types into unified list
   */
  mergeTypes() {
    const allTypes = [];
    
    // Add mapped types that matched known types
    for (const mapped of this.mappedTypes) {
      if (!mapped.isNovel) {
        const discovered = this.discoveredTypes.find(d => d.name === mapped.discovered);
        allTypes.push({
          name: mapped.discovered,
          originalName: mapped.knownType,
          source: 'matched',
          ...discovered
        });
      }
    }

    // Add novel types
    for (const novel of this.novelTypes) {
      allTypes.push({
        ...novel,
        source: novel.isVariant ? 'variant' : 'novel'
      });
    }

    return allTypes;
  }

  /**
   * Generate human-readable summary
   */
  generateSummary() {
    const matched = this.mappedTypes.filter(m => !m.isNovel).length;
    const variants = this.novelTypes.filter(n => n.isVariant).length;
    const novel = this.novelTypes.filter(n => !n.isVariant).length;

    return {
      totalDiscovered: this.discoveredTypes.length,
      matchedToKnown: matched,
      variants: variants,
      completelyNovel: novel,
      requiresNewComponents: this.novelTypes.length,
      message: this.generateSummaryMessage(matched, variants, novel)
    };
  }

  generateSummaryMessage(matched, variants, novel) {
    const parts = [];
    
    if (matched > 0) {
      parts.push(`${matched} matched existing types`);
    }
    if (variants > 0) {
      parts.push(`${variants} are variants of known types`);
    }
    if (novel > 0) {
      parts.push(`${novel} are completely new types`);
    }

    if (parts.length === 0) {
      return 'No section types discovered';
    }

    return parts.join(', ');
  }

  /**
   * Generate component definitions for novel types
   * This creates the minimal component structure for types
   * that don't exist in reference templates
   */
  generateNovelComponentDefinitions() {
    return this.novelTypes.map(type => ({
      name: this.pascalCase(type.name),
      type: type.name,
      isNovel: true,
      isVariant: type.isVariant || false,
      variantOf: type.variantOf || null,
      description: type.description || `Novel section type: ${type.name}`,
      isRepeating: type.isRepeating || false,
      variables: type.variables || [],
      containerStructure: type.containerStructure || 'table > tr > td',
      stylingNotes: type.stylingNotes || 'Extracted from source email'
    }));
  }

  pascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Generate prompt context for novel types
   * Used to inform Stage 4 about new types it needs to create
   */
  generateNovelTypesContext() {
    if (this.novelTypes.length === 0) {
      return '';
    }

    let context = `
## Novel Section Types Discovered

The following section types were NOT found in reference templates.
You MUST create components for these from scratch, extracting the exact HTML patterns from the source.

`;

    for (const type of this.novelTypes) {
      context += `### ${type.name}
- Description: ${type.description || 'To be determined from source'}
- Is repeating: ${type.isRepeating ? 'Yes' : 'No'}
- Variables: ${type.variables?.map(v => v.name).join(', ') || 'To be determined'}
${type.isVariant ? `- Similar to: ${type.variantOf} (but with differences)` : '- Completely new pattern'}

`;
    }

    context += `
For each novel type:
1. Find the exact HTML pattern in the source
2. Extract complete styles (preserve all inline styles)
3. Identify all variable data points
4. Create a self-contained component

`;

    return context;
  }
}
