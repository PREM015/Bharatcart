/**
 * Technical Assistant
 * Purpose: Help with technical product questions
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export class TechnicalAssistant {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async answerTechnicalQuestion(
    productId: number,
    question: string
  ): Promise<string> {
    logger.info('Answering technical question', { productId, question });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a technical product specialist.',
        },
        { role: 'user', content: question },
      ],
    });

    return completion.choices[0].message.content || '';
  }

  async compareProducts(productIds: number[]): Promise<any> {
    logger.info('Comparing products', { productIds });
    return {};
  }
}

export default TechnicalAssistant;
