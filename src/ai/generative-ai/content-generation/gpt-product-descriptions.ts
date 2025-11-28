/**
 * GPT Product Description Generator
 * Purpose: Generate compelling product descriptions using GPT-4
 * Features:
 * - SEO-optimized content
 * - Multiple tone variations (professional, casual, luxury)
 * - Bullet point generation
 * - Feature highlighting
 * - Multi-language support
 * 
 * @example
 * ```typescript
 * const generator = new GPTProductDescriptionGenerator();
 * const description = await generator.generate({
 *   name: 'Wireless Headphones',
 *   features: ['Noise Cancelling', '30h Battery', 'Bluetooth 5.0'],
 *   category: 'Electronics',
 *   targetAudience: 'professionals'
 * });
 * ```
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export interface ProductDescriptionRequest {
  name: string;
  category: string;
  features: string[];
  specifications?: Record<string, string>;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'luxury' | 'technical' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  keywords?: string[];
}

export interface ProductDescription {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  seoMetaDescription: string;
  tags: string[];
  variations: {
    professional?: string;
    casual?: string;
    luxury?: string;
  };
}

export class GPTProductDescriptionGenerator {
  private openai: OpenAI;
  private model = 'gpt-4-turbo-preview';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate comprehensive product description
   */
  async generate(request: ProductDescriptionRequest): Promise<ProductDescription> {
    logger.info('Generating product description', { product: request.name });

    try {
      // Check cache first
      const cached = await this.getCached(request);
      if (cached) {
        logger.info('Returning cached description');
        return cached;
      }

      // Generate main description
      const mainDescription = await this.generateMainDescription(request);

      // Generate SEO content
      const seoContent = await this.generateSEOContent(request);

      // Generate bullet points
      const bulletPoints = await this.generateBulletPoints(request);

      // Generate variations
      const variations = await this.generateVariations(request);

      const result: ProductDescription = {
        title: this.generateTitle(request),
        shortDescription: mainDescription.short,
        longDescription: mainDescription.long,
        bulletPoints,
        seoMetaDescription: seoContent.metaDescription,
        tags: seoContent.tags,
        variations,
      };

      // Cache result
      await this.cacheResult(request, result);

      logger.info('Product description generated successfully');
      return result;
    } catch (error) {
      logger.error('Failed to generate product description', { error });
      throw error;
    }
  }

  /**
   * Generate main product description
   */
  private async generateMainDescription(
    request: ProductDescriptionRequest
  ): Promise<{ short: string; long: string }> {
    const toneInstructions = this.getToneInstructions(request.tone || 'professional');
    const lengthInstructions = this.getLengthInstructions(request.length || 'medium');

    const prompt = `Generate compelling product descriptions for an e-commerce listing.

Product Name: ${request.name}
Category: ${request.category}
Key Features: ${request.features.join(', ')}
${request.specifications ? `Specifications: ${JSON.stringify(request.specifications)}` : ''}
Target Audience: ${request.targetAudience || 'general consumers'}
${request.keywords ? `SEO Keywords: ${request.keywords.join(', ')}` : ''}

${toneInstructions}
${lengthInstructions}

Generate:
1. Short Description (2-3 sentences, 50-80 words)
2. Long Description (3-5 paragraphs, compelling and detailed)

Return as JSON:
{
  "short": "...",
  "long": "..."
}`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert e-commerce copywriter specializing in compelling product descriptions.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Generate SEO-optimized content
   */
  private async generateSEOContent(
    request: ProductDescriptionRequest
  ): Promise<{ metaDescription: string; tags: string[] }> {
    const prompt = `Generate SEO content for this product:

Product: ${request.name}
Category: ${request.category}
Features: ${request.features.join(', ')}
${request.keywords ? `Target Keywords: ${request.keywords.join(', ')}` : ''}

Generate:
1. Meta Description (155-160 characters, compelling, includes keywords)
2. Product Tags (10-15 relevant tags for search/filtering)

Return as JSON:
{
  "metaDescription": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Generate bullet points
   */
  private async generateBulletPoints(request: ProductDescriptionRequest): Promise<string[]> {
    const prompt = `Generate 5-7 compelling bullet points for this product.
Each bullet should be concise, benefit-focused, and start with a strong action word.

Product: ${request.name}
Features: ${request.features.join(', ')}
${request.specifications ? `Specs: ${JSON.stringify(request.specifications)}` : ''}

Return as JSON array: ["bullet1", "bullet2", ...]`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result.bullets || [];
  }

  /**
   * Generate tone variations
   */
  private async generateVariations(
    request: ProductDescriptionRequest
  ): Promise<{ professional?: string; casual?: string; luxury?: string }> {
    const variations: any = {};

    const tones: Array<'professional' | 'casual' | 'luxury'> = ['professional', 'casual', 'luxury'];

    for (const tone of tones) {
      if (tone === request.tone) continue; // Skip the main tone

      const toneInstructions = this.getToneInstructions(tone);

      const prompt = `Write a ${tone} product description for:

Product: ${request.name}
Features: ${request.features.join(', ')}

${toneInstructions}

Write 2-3 compelling sentences.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.8,
      });

      variations[tone] = completion.choices[0].message.content?.trim();
    }

    return variations;
  }

  /**
   * Generate optimized title
   */
  private generateTitle(request: ProductDescriptionRequest): string {
    // Simple title generation - in production, might use GPT
    const keyFeatures = request.features.slice(0, 2).join(' | ');
    return `${request.name} - ${keyFeatures}`;
  }

  /**
   * Get tone-specific instructions
   */
  private getToneInstructions(tone: string): string {
    const toneMap: Record<string, string> = {
      professional: 'Use professional, authoritative language. Focus on quality, performance, and reliability.',
      casual: 'Use friendly, conversational language. Be relatable and enthusiastic.',
      luxury: 'Use sophisticated, premium language. Emphasize exclusivity, craftsmanship, and prestige.',
      technical: 'Use precise, technical language. Focus on specifications and technical details.',
      friendly: 'Use warm, approachable language. Be helpful and encouraging.',
    };

    return toneMap[tone] || toneMap.professional;
  }

  /**
   * Get length-specific instructions
   */
  private getLengthInstructions(length: string): string {
    const lengthMap: Record<string, string> = {
      short: 'Keep it concise and punchy. Focus on key benefits.',
      medium: 'Provide good detail while remaining engaging.',
      long: 'Be comprehensive. Cover all features, benefits, and use cases.',
    };

    return lengthMap[length] || lengthMap.medium;
  }

  /**
   * Generate multi-language description
   */
  async generateMultiLanguage(
    request: ProductDescriptionRequest,
    languages: string[]
  ): Promise<Record<string, ProductDescription>> {
    const results: Record<string, ProductDescription> = {};

    for (const language of languages) {
      const localizedRequest = { ...request, language };
      results[language] = await this.generate(localizedRequest);
    }

    return results;
  }

  /**
   * Batch generate descriptions
   */
  async generateBatch(requests: ProductDescriptionRequest[]): Promise<ProductDescription[]> {
    logger.info('Batch generating descriptions', { count: requests.length });

    return Promise.all(requests.map((req) => this.generate(req)));
  }

  /**
   * Cache result
   */
  private async cacheResult(
    request: ProductDescriptionRequest,
    result: ProductDescription
  ): Promise<void> {
    const cacheKey = `product-desc:${JSON.stringify(request)}`;
    await redis.setex(cacheKey, 86400 * 7, JSON.stringify(result)); // 7 days
  }

  /**
   * Get cached result
   */
  private async getCached(request: ProductDescriptionRequest): Promise<ProductDescription | null> {
    const cacheKey = `product-desc:${JSON.stringify(request)}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
}

export default GPTProductDescriptionGenerator;
