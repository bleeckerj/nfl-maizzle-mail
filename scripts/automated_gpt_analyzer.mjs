#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs';

/**
 * Automated GPT-4o Email Analysis
 * Provides automatic AI analysis without manual copy/paste
 */

class AutomatedGPTAnalyzer {
  constructor() {
    this.openai = null;
    this.initializeAPI();
  }

  initializeAPI() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️  OpenAI API key not found in environment variables.');
      console.log('📝 To enable automatic GPT analysis:');
      console.log('   export OPENAI_API_KEY="your-api-key-here"');
      console.log('🔗 Get API key: https://platform.openai.com/api-keys');
      return false;
    }

    try {
      this.openai = new OpenAI({ apiKey });
      console.log('✅ OpenAI API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI API:', error.message);
      return false;
    }
  }

  async analyzeEmail(htmlContent, emailInfo = {}) {
    if (!this.openai) {
      throw new Error('OpenAI API not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt(htmlContent, emailInfo);

    console.log('🤖 Sending email to GPT-4o for analysis...');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 4000
      });

      const analysis = response.choices[0].message.content;
      
      console.log('✅ GPT-4o analysis completed');
      console.log(`📊 Tokens used: ${response.usage?.total_tokens || 'unknown'}`);
      
      // Try to parse as JSON
      try {
        return JSON.parse(analysis);
      } catch (e) {
        console.log('⚠️  GPT response was not valid JSON, returning as text');
        return { rawAnalysis: analysis, parsed: false };
      }
      
    } catch (error) {
      console.error('❌ GPT-4o analysis failed:', error.message);
      
      if (error.code === 'insufficient_quota') {
        console.log('💳 API quota exceeded. Check your OpenAI billing.');
      }
      
      throw error;
    }
  }

  getSystemPrompt() {
    return `You are an expert email template analyst. Analyze HTML email code and identify reusable components for a template system.

Your task is to:
1. **Identify email type** (newsletter, marketing, transactional, ecommerce)
2. **Break down structure** into logical components
3. **Extract template variables** for dynamic content
4. **Generate component schema** for each section
5. **Provide confidence assessment** for your analysis

Respond with a JSON structure containing:
{
  "emailType": "newsletter|marketing|transactional|ecommerce",
  "confidence": 0.0-1.0,
  "components": {
    "componentName": {
      "element": "description of the element",
      "purpose": "what this component does",
      "variables": ["list", "of", "template", "variables"],
      "styling": "key styling characteristics",
      "confidence": 0.0-1.0
    }
  },
  "schema": {
    "properties": {
      // JSON schema for the template data
    }
  },
  "recommendations": ["specific", "actionable", "recommendations"],
  "challenges": ["potential", "issues", "or", "complexities"]
}

Focus on creating reusable, maintainable components. Be specific about template variables and data structure.`;
  }

  getUserPrompt(htmlContent, emailInfo) {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const stats = {
      totalElements: doc.querySelectorAll('*').length,
      tables: doc.querySelectorAll('table').length,
      images: doc.querySelectorAll('img').length,
      links: doc.querySelectorAll('a').length,
      headings: doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      textBlocks: doc.querySelectorAll('p,div').length
    };

    return `Please analyze this HTML email and create a reusable template structure.

**Email Statistics:**
- Total elements: ${stats.totalElements}
- Tables: ${stats.tables}
- Images: ${stats.images}  
- Links: ${stats.links}
- Headings: ${stats.headings}
- Text blocks: ${stats.textBlocks}

**Additional Context:**
${emailInfo.source ? `- Source: ${emailInfo.source}` : ''}
${emailInfo.purpose ? `- Purpose: ${emailInfo.purpose}` : ''}

**HTML Content:**
\`\`\`html
${htmlContent.length > 15000 ? htmlContent.substring(0, 15000) + '...[truncated]' : htmlContent}
\`\`\`

Provide a comprehensive analysis that will help create a reliable, reusable email template.`;
  }

  async checkAPIStatus() {
    if (!this.openai) {
      return { available: false, reason: 'API key not configured' };
    }

    try {
      // Test with a minimal request
      await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1
      });
      
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        reason: error.message,
        code: error.code 
      };
    }
  }
}

export default AutomatedGPTAnalyzer;