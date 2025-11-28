/**
 * Product Title Generator
 * Purpose: Generate SEO-optimized product titles
 */

import OpenAI from 'openai';

export class ProductTitleGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateTitle(
    category: string,
    attributes: Record<string, any>
  ): Promise<string> {
    const prompt = `Generate an SEO-optimized product title for:
Category: ${category}
Attributes: ${JSON.stringify(attributes)}

Make it compelling and include key features.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
    });

    return completion.choices[0].message.content || '';
  }
}

export default ProductTitleGenerator;
