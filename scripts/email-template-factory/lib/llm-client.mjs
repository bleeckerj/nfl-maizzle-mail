/**
 * LLM Client - Multi-provider support with modern prompt engineering
 * 
 * Supports:
 * - OpenAI (GPT-4o, GPT-4-turbo)
 * - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
 * 
 * Features:
 * - Structured outputs with JSON schemas
 * - Chain-of-thought prompting
 * - Automatic retry with exponential backoff
 * - Response validation
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { PROMPTS } from './prompts.mjs';
import { SCHEMAS } from './schemas.mjs';

dotenv.config();

export class LLMClient {
  constructor(provider = 'anthropic', model = null) {
    this.provider = provider;
    this.client = null;
    this.modelName = model;
    
    // Default models per provider
    // Claude models: claude-opus-4-20250514, claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-opus-20240229
    // OpenAI models: gpt-4o, gpt-4-turbo, gpt-4o-mini
    // 
    // Priority: CLI --model flag > env var (ANTHROPIC_MODEL/OPENAI_MODEL) > hardcoded default
    this.defaultModels = {
      openai: process.env.OPENAI_MODEL || 'gpt-4o',
      anthropic: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    };
    
    // Provider-specific configurations
    // Claude Sonnet 4 supports up to 64k output tokens
    this.providerConfig = {
      openai: {
        maxTokens: 16000,
        temperature: 0.1
      },
      anthropic: {
        maxTokens: 32000,
        temperature: 0.1
      }
    };
  }

  async initialize() {
    if (this.provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.modelName = this.modelName || this.defaultModels.openai;
      
    } else if (this.provider === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.modelName = this.modelName || this.defaultModels.anthropic;
      
    } else {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }

    console.log(`   🤖 Initialized ${this.provider} client with model: ${this.modelName}`);
  }

  /**
   * Stage 1: Visual Design Analysis
   */
  async analyzeVisualDesign(preprocessed) {
    const prompt = PROMPTS.visualDesign(preprocessed);
    const schema = SCHEMAS.visualDesign;
    
    return await this.executeWithRetry(prompt, schema, 'Visual Design Analysis');
  }

  /**
   * Stage 2: Structural Analysis
   */
  async analyzeStructure(preprocessed, visualDesign) {
    const prompt = PROMPTS.structure(preprocessed, visualDesign);
    const schema = SCHEMAS.structure;
    
    return await this.executeWithRetry(prompt, schema, 'Structural Analysis');
  }

  /**
   * Stage 3: Content Extraction
   */
  async extractContent(preprocessed, structure) {
    const prompt = PROMPTS.content(preprocessed, structure);
    const schema = SCHEMAS.content;
    
    return await this.executeWithRetry(prompt, schema, 'Content Extraction');
  }

  /**
   * Stage 4: Component Deep Extraction
   */
  async extractComponents(preprocessed, structure, visualDesign, conventionsSummary = '') {
    const prompt = PROMPTS.components(preprocessed, structure, visualDesign, conventionsSummary);
    const schema = SCHEMAS.components;
    
    return await this.executeWithRetry(prompt, schema, 'Component Extraction');
  }

  /**
   * Execute LLM call with retry logic
   */
  async executeWithRetry(prompt, schema, stageName, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.callLLM(prompt, schema);
        const parsed = this.parseAndValidate(response, schema, stageName);
        return parsed;
        
      } catch (error) {
        lastError = error;
        console.log(`   ⚠️  ${stageName} attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`   ⏳ Retrying in ${delay/1000}s...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`${stageName} failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Call the appropriate LLM based on provider
   */
  async callLLM(prompt, schema) {
    if (this.provider === 'openai') {
      return await this.callOpenAI(prompt, schema);
    } else if (this.provider === 'anthropic') {
      return await this.callAnthropic(prompt, schema);
    }
  }

  /**
   * OpenAI API call with structured output
   */
  async callOpenAI(prompt, schema) {
    const config = this.providerConfig.openai;
    
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' }
    });

    return response.choices[0].message.content;
  }

  /**
   * Anthropic API call with structured output
   * 
   * Claude best practices:
   * - Put detailed instructions in system prompt
   * - Use explicit JSON formatting instructions
   * - Leverage Claude's strong reasoning capabilities
   * - Use streaming for large max_tokens to avoid timeout errors
   */
  async callAnthropic(prompt, schema) {
    const config = this.providerConfig.anthropic;
    
    // Enhance system prompt for Claude's JSON mode
    const enhancedSystem = `${prompt.system}

CRITICAL OUTPUT REQUIREMENT:
You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations before or after.
Start your response with { and end with }. This is mandatory.`;

    try {
      // Use streaming to avoid timeout errors for large requests
      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;
      
      const stream = this.client.messages.stream({
        model: this.modelName,
        max_tokens: config.maxTokens,
        system: enhancedSystem,
        messages: [
          { role: 'user', content: prompt.user }
        ]
      });

      // Collect streamed response
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          fullText += event.delta.text;
        }
        if (event.type === 'message_delta' && event.usage) {
          outputTokens = event.usage.output_tokens;
        }
        if (event.type === 'message_start' && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens;
        }
      }

      // Log token usage
      if (inputTokens || outputTokens) {
        console.log(`   📊 Tokens: ${inputTokens} in / ${outputTokens} out`);
      }
      
      if (!fullText) {
        throw new Error('Empty response from Claude');
      }
      
      return fullText;
      
    } catch (error) {
      // Handle Anthropic-specific errors
      if (error.status === 429) {
        throw new Error('Rate limit exceeded - please wait and retry');
      }
      if (error.status === 401) {
        throw new Error('Invalid ANTHROPIC_API_KEY - please check your API key');
      }
      if (error.status === 400) {
        throw new Error(`Bad request to Claude: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse and validate LLM response
   */
  parseAndValidate(response, schema, stageName) {
    // Clean response if wrapped in markdown
    let cleanText = response.trim();
    
    // Remove markdown code blocks
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseError) {
      // Attempt to repair truncated JSON
      parsed = this.repairJSON(cleanText, stageName);
    }

    // Validate against schema expectations
    this.validateResponse(parsed, schema, stageName);

    return parsed;
  }

  /**
   * Attempt to repair truncated or malformed JSON
   */
  repairJSON(text, stageName) {
    console.log(`   🔧 Attempting JSON repair for ${stageName}...`);
    
    // First, try to find a complete JSON object by tracking braces
    let braceCount = 0;
    let bracketCount = 0;
    let lastValidIndex = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0 && bracketCount === 0) {
            lastValidIndex = i;
          }
        }
        if (char === '[') bracketCount++;
        if (char === ']') {
          bracketCount--;
          if (braceCount === 0 && bracketCount === 0) {
            lastValidIndex = i;
          }
        }
      }
    }
    
    // Try parsing from the last complete position
    if (lastValidIndex > 0) {
      const repaired = text.substring(0, lastValidIndex + 1);
      try {
        const parsed = JSON.parse(repaired);
        console.log(`   ✓ JSON repair successful (complete object found)`);
        return parsed;
      } catch (e) {
        // Continue to try other repair methods
      }
    }
    
    // Try to close unclosed braces/brackets
    let repairedText = text.trim();
    
    // Count unclosed braces/brackets
    braceCount = 0;
    bracketCount = 0;
    inString = false;
    escapeNext = false;
    
    for (let i = 0; i < repairedText.length; i++) {
      const char = repairedText[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }
    
    // If we're in a string, try to close it
    if (inString) {
      // Find last meaningful content and close the string
      repairedText = repairedText.replace(/,?\s*"[^"]*$/, '');
      if (!repairedText.endsWith('"')) {
        repairedText += '"';
      }
    }
    
    // Close missing brackets and braces
    while (bracketCount > 0) {
      repairedText += ']';
      bracketCount--;
    }
    while (braceCount > 0) {
      repairedText += '}';
      braceCount--;
    }
    
    try {
      const parsed = JSON.parse(repairedText);
      console.log(`   ✓ JSON repair successful (braces closed)`);
      return parsed;
    } catch (e) {
      // Final attempt: remove trailing incomplete content
      const lastCompletePattern = /}(?:\s*,\s*)?(?:"[^"]*"?\s*:\s*)?(?:\{[^}]*|\[[^\]]*|"[^"]*)?$/;
      repairedText = text.replace(lastCompletePattern, '}');
      
      try {
        const parsed = JSON.parse(repairedText);
        console.log(`   ✓ JSON repair successful (trailing content removed)`);
        return parsed;
      } catch (e2) {
        // Give up
      }
    }
    
    throw new Error(`Unable to parse JSON response: ${text.substring(0, 200)}...`);
  }

  /**
   * Validate response has required fields
   */
  validateResponse(parsed, schema, stageName) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`${stageName} returned invalid response type`);
    }
    
    // Check for required top-level fields based on schema expectations
    const requiredFields = schema.required || [];
    const missingFields = requiredFields.filter(field => !(field in parsed));
    
    if (missingFields.length > 0) {
      console.log(`   ⚠️  Missing fields in ${stageName}: ${missingFields.join(', ')}`);
      // Don't throw - just warn, as partial results can still be useful
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available model options for the current provider
   */
  getAvailableModels() {
    const models = {
      openai: [
        { id: 'gpt-4o', description: 'Most capable, best for complex analysis' },
        { id: 'gpt-4o-mini', description: 'Faster and cheaper, good for simpler tasks' },
        { id: 'gpt-4-turbo', description: 'Previous generation, 128K context' }
      ],
      anthropic: [
        { id: 'claude-sonnet-4-20250514', description: 'Latest Sonnet, excellent reasoning' },
        { id: 'claude-3-5-sonnet-20241022', description: 'Previous Sonnet, very capable' },
        { id: 'claude-3-opus-20240229', description: 'Most powerful, best for complex tasks' },
        { id: 'claude-3-haiku-20240307', description: 'Fastest and cheapest' }
      ]
    };
    return models[this.provider] || [];
  }

  /**
   * Verify API connection with a simple test
   */
  async verifyConnection() {
    try {
      if (this.provider === 'openai') {
        // Simple test with minimal tokens
        await this.client.chat.completions.create({
          model: this.modelName,
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 5
        });
      } else if (this.provider === 'anthropic') {
        await this.client.messages.create({
          model: this.modelName,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Say "ok"' }]
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.modelName,
      config: this.providerConfig[this.provider],
      availableModels: this.getAvailableModels()
    };
  }
}
