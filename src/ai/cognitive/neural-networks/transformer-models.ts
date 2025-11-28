/**
 * Transformer Models
 * Purpose: State-of-the-art NLP using transformer architecture
 * Models: GPT, BERT, T5
 * Use Cases:
 * - Product description generation
 * - Question answering
 * - Text summarization
 * - Translation
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export class TransformerModels {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate text using GPT-4
   */
  async generateText(prompt: string, maxTokens: number = 500): Promise<string> {
    logger.info('Generating text with transformer', { prompt });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Summarize text
   */
  async summarize(text: string, maxLength: number = 100): Promise<string> {
    const prompt = `Summarize the following text in ${maxLength} words or less:

${text}`;
    return this.generateText(prompt, maxLength);
  }

  /**
   * Answer question based on context
   */
  async answerQuestion(context: string, question: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Answer questions based on the following context:

${context}` },
        { role: 'user', content: question },
      ],
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text: string): Promise<{
    people: string[];
    organizations: string[];
    locations: string[];
    products: string[];
  }> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extract named entities. Return JSON with arrays: people, organizations, locations, products',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  /**
   * Classify text into categories
   */
  async classify(text: string, categories: string[]): Promise<{
    category: string;
    confidence: number;
  }> {
    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}

Text: ${text}

Return JSON with: category, confidence (0-1)`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

export default TransformerModels;
