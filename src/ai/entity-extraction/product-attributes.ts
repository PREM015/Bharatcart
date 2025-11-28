/**
 * Product Attribute Extractor
 * Purpose: Extract structured attributes from product descriptions
 */

import OpenAI from 'openai';

export class ProductAttributeExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extract(description: string): Promise<Record<string, any>> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extract structured product attributes. Return as JSON.',
        },
        { role: 'user', content: description },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

export default ProductAttributeExtractor;
