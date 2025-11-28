/**
 * SEO Content Generator
 * Purpose: Generate SEO-optimized content
 */

import OpenAI from 'openai';

export class SEOContentGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateMetaDescription(pageContent: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate SEO meta description (max 160 chars)',
        },
        { role: 'user', content: pageContent },
      ],
      max_tokens: 50,
    });

    return completion.choices[0].message.content || '';
  }

  async generateKeywords(content: string): Promise<string[]> {
    return [];
  }
}

export default SEOContentGenerator;
